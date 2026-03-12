import { ModelSelector, type ModelSelectionRequest, type SelectedModel } from '@borg/ai';

import { ProviderRegistry } from './ProviderRegistry.js';
import { NormalizedQuotaService } from './NormalizedQuotaService.js';
import {
    type FallbackCandidateSnapshot,
    type ProviderModelDefinition,
    type ProviderRoutingStrategy,
    type ProviderTaskType,
    type RoutingSelectionRequest,
} from './types.js';

const DEFAULT_TASK_STRATEGIES: Record<ProviderTaskType, ProviderRoutingStrategy> = {
    coding: 'cheapest',
    planning: 'best',
    research: 'best',
    general: 'round-robin',
    worker: 'cheapest',
    supervisor: 'best',
};

const DEFAULT_PROVIDER_LIMITS: Record<string, number> = {
    google: 5,
    anthropic: 10,
    openai: 10,
    deepseek: 5,
};

interface SelectorOptions {
    registry?: ProviderRegistry;
    quotaService?: NormalizedQuotaService;
    routingStrategy?: ProviderRoutingStrategy;
    taskStrategies?: Partial<Record<ProviderTaskType, ProviderRoutingStrategy>>;
}

export class CoreModelSelector extends ModelSelector {
    private readonly registry: ProviderRegistry;
    private readonly quotaTracker: NormalizedQuotaService;
    private readonly taskStrategies: Record<ProviderTaskType, ProviderRoutingStrategy>;
    private defaultRoutingStrategy: ProviderRoutingStrategy;
    private readonly candidateCooldowns = new Map<string, number>();
    private readonly roundRobinOffsets = new Map<ProviderTaskType, number>();

    constructor(options: SelectorOptions = {}) {
        super();
        this.registry = options.registry ?? new ProviderRegistry();
        this.quotaTracker = options.quotaService ?? new NormalizedQuotaService(this.registry);
        this.quotaTracker.setConfig({
            dailyBudgetUsd: 5,
            monthlyBudgetUsd: 100,
            providerLimits: DEFAULT_PROVIDER_LIMITS,
        });
        this.defaultRoutingStrategy = options.routingStrategy ?? 'best';
        this.taskStrategies = {
            ...DEFAULT_TASK_STRATEGIES,
            ...(options.taskStrategies ?? {}),
        };
    }

    public override getQuotaService(): NormalizedQuotaService {
        this.quotaTracker.refreshAuthStates();
        return this.quotaTracker;
    }

    public setRoutingStrategy(strategy: ProviderRoutingStrategy) {
        this.defaultRoutingStrategy = strategy;
    }

    public getRoutingStrategy(): ProviderRoutingStrategy {
        return this.defaultRoutingStrategy;
    }

    public setTaskRoutingStrategy(taskType: ProviderTaskType, strategy: ProviderRoutingStrategy) {
        this.taskStrategies[taskType] = strategy;
    }

    public resetTaskRoutingStrategy(taskType: ProviderTaskType) {
        this.taskStrategies[taskType] = DEFAULT_TASK_STRATEGIES[taskType];
    }

    public getTaskRoutingRules(): Record<ProviderTaskType, ProviderRoutingStrategy> {
        return { ...this.taskStrategies };
    }

    public getProviderSnapshots() {
        return this.quotaTracker.getAllQuotas();
    }

    public getAvailableModels(): FallbackCandidateSnapshot[] {
        return this.registry.buildSnapshots('general').map((candidate) => ({
            ...candidate,
            reason: candidate.recommended ? 'recommended' : 'available',
        }));
    }

    public getFallbackChain(request: Partial<RoutingSelectionRequest> = {}): FallbackCandidateSnapshot[] {
        const taskType = this.resolveTaskType(request);
        const strategy = request.routingStrategy ?? this.taskStrategies[taskType] ?? this.defaultRoutingStrategy;
        return this.rankCandidates(taskType, strategy, request.provider, new Set(request.exclude ?? []), false).map((candidate) => ({
            id: candidate.id,
            provider: candidate.provider,
            model: candidate.id,
            name: candidate.name,
            inputPrice: candidate.inputPrice,
            outputPrice: candidate.outputPrice,
            contextWindow: candidate.contextWindow,
            tier: candidate.tier,
            recommended: this.registry.isRecommendedForTask(candidate, taskType),
            reason: this.buildReason(candidate, taskType, strategy, request.provider),
        }));
    }

    public override async selectModel(request: ModelSelectionRequest & Partial<RoutingSelectionRequest> = {}): Promise<SelectedModel> {
        const taskType = this.resolveTaskType(request);
        const strategy = request.routingStrategy ?? this.taskStrategies[taskType] ?? this.defaultRoutingStrategy;

        if (this.quotaTracker.isBudgetExceeded()) {
            const forcedLocal = this.rankCandidates(taskType, 'cheapest', undefined, new Set(), false)
                .find((candidate) => candidate.provider === 'lmstudio' || candidate.provider === 'ollama');
            if (forcedLocal) {
                return {
                    provider: forcedLocal.provider,
                    modelId: forcedLocal.id,
                    reason: 'BUDGET_EXCEEDED_FORCED_LOCAL',
                };
            }
        }

        const candidates = this.rankCandidates(taskType, strategy, request.provider, new Set(request.exclude ?? []), true);
        const selected = candidates[0];

        if (!selected) {
            return {
                provider: 'lmstudio',
                modelId: 'local',
                reason: 'EMERGENCY_FALLBACK',
            };
        }

        this.quotaTracker.markProviderHealthy(selected.provider);
        return {
            provider: selected.provider,
            modelId: selected.id,
            reason: request.provider === selected.provider ? 'PROVIDER_PREFERENCE' : this.buildReason(selected, taskType, strategy, request.provider),
        };
    }

    public override reportFailure(provider: string, modelId: string, cause?: unknown) {
        const cooldownUntil = Date.now() + 60_000;
        this.candidateCooldowns.set(this.getCooldownKey(provider, modelId), cooldownUntil);

        const message = this.getFailureMessage(cause);
        const status = this.getFailureStatus(cause);

        if (status === 429 || message.includes('rate limit')) {
            this.quotaTracker.markRateLimited(provider, cooldownUntil, undefined, message || 'Provider rate limited.');
            return;
        }

        if (message.includes('quota') || message.includes('insufficient_quota') || message.includes('resource_exhausted')) {
            this.quotaTracker.markQuotaExceeded(provider, cooldownUntil, message || 'Provider quota exhausted.');
            return;
        }

        this.quotaTracker.markRateLimited(provider, cooldownUntil, undefined, message || 'Provider temporarily unavailable.');
    }

    private rankCandidates(
        taskType: ProviderTaskType,
        strategy: ProviderRoutingStrategy,
        preferredProvider: string | undefined,
        excluded: Set<string>,
        advanceRoundRobin: boolean,
    ): ProviderModelDefinition[] {
        const available = this.registry.listExecutableModels().filter((candidate) => {
            const candidateKey = this.getCooldownKey(candidate.provider, candidate.id);
            if (excluded.has(candidateKey)) {
                return false;
            }
            if (!this.isCandidateReady(candidate.provider, candidate.id)) {
                return false;
            }
            return true;
        });

        const withPreferred = [...available].sort((left, right) => {
            const preferredLeft = preferredProvider && left.provider === preferredProvider ? 1 : 0;
            const preferredRight = preferredProvider && right.provider === preferredProvider ? 1 : 0;
            if (preferredLeft !== preferredRight) {
                return preferredRight - preferredLeft;
            }
            return 0;
        });

        if (strategy === 'round-robin') {
            const ordered = withPreferred.sort((left, right) => this.compareByTaskFit(left, right, taskType) || left.provider.localeCompare(right.provider) || left.id.localeCompare(right.id));
            const offset = this.roundRobinOffsets.get(taskType) ?? 0;
            const rotated = ordered.length === 0 ? [] : ordered.slice(offset).concat(ordered.slice(0, offset));
            if (advanceRoundRobin && ordered.length > 0) {
                this.roundRobinOffsets.set(taskType, (offset + 1) % ordered.length);
            }
            return rotated;
        }

        const comparator = strategy === 'cheapest'
            ? (left: ProviderModelDefinition, right: ProviderModelDefinition) => this.compareByTaskFit(left, right, taskType) || this.compareByPrice(left, right) || this.compareByQuality(right, left) || left.provider.localeCompare(right.provider) || left.id.localeCompare(right.id)
            : (left: ProviderModelDefinition, right: ProviderModelDefinition) => this.compareByTaskFit(left, right, taskType) || this.compareByQuality(left, right) || this.compareByContext(left, right) || this.compareByPrice(left, right) || left.provider.localeCompare(right.provider) || left.id.localeCompare(right.id);

        return withPreferred.sort(comparator);
    }

    private resolveTaskType(request: Partial<RoutingSelectionRequest>): ProviderTaskType {
        if (request.routingTaskType) {
            return request.routingTaskType;
        }
        if (request.taskType === 'supervisor') {
            return 'planning';
        }
        if (request.taskComplexity === 'high') {
            return 'planning';
        }
        if (request.taskComplexity === 'low') {
            return 'coding';
        }
        return 'general';
    }

    private isCandidateReady(provider: string, modelId: string): boolean {
        const candidateKey = this.getCooldownKey(provider, modelId);
        const cooldown = this.candidateCooldowns.get(candidateKey);
        if (cooldown && cooldown > Date.now()) {
            return false;
        }
        if (cooldown && cooldown <= Date.now()) {
            this.candidateCooldowns.delete(candidateKey);
            this.quotaTracker.markProviderHealthy(provider);
        }
        return this.quotaTracker.isProviderReady(provider);
    }

    private compareByTaskFit(left: ProviderModelDefinition, right: ProviderModelDefinition, taskType: ProviderTaskType): number {
        const leftFit = this.registry.isRecommendedForTask(left, taskType) ? 1 : 0;
        const rightFit = this.registry.isRecommendedForTask(right, taskType) ? 1 : 0;
        return rightFit - leftFit;
    }

    private compareByPrice(left: ProviderModelDefinition, right: ProviderModelDefinition): number {
        const leftPrice = (left.inputPrice ?? 0) + (left.outputPrice ?? 0);
        const rightPrice = (right.inputPrice ?? 0) + (right.outputPrice ?? 0);
        return leftPrice - rightPrice;
    }

    private compareByQuality(left: ProviderModelDefinition, right: ProviderModelDefinition): number {
        return (right.qualityScore ?? 0) - (left.qualityScore ?? 0);
    }

    private compareByContext(left: ProviderModelDefinition, right: ProviderModelDefinition): number {
        return (right.contextWindow ?? 0) - (left.contextWindow ?? 0);
    }

    private buildReason(candidate: ProviderModelDefinition, taskType: ProviderTaskType, strategy: ProviderRoutingStrategy, preferredProvider?: string): string {
        if (preferredProvider && candidate.provider === preferredProvider) {
            return 'PROVIDER_PREFERENCE';
        }
        if (this.registry.isRecommendedForTask(candidate, taskType)) {
            return `TASK_TYPE_${taskType.toUpperCase()}`;
        }
        return strategy.toUpperCase().replace('-', '_');
    }

    private getCooldownKey(provider: string, modelId: string): string {
        return `${provider}:${modelId}`;
    }

    private getFailureStatus(cause: unknown): number | undefined {
        if (cause && typeof cause === 'object' && 'status' in cause && typeof (cause as { status?: unknown }).status === 'number') {
            return (cause as { status: number }).status;
        }
        return undefined;
    }

    private getFailureMessage(cause: unknown): string {
        if (cause instanceof Error) {
            return cause.message.toLowerCase();
        }
        if (typeof cause === 'string') {
            return cause.toLowerCase();
        }
        if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
            return (cause as { message: string }).message.toLowerCase();
        }
        return '';
    }
}
