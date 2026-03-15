import fs from 'fs';
import path from 'path';
import { QuotaService } from './services/QuotaService.js';

export interface ModelSelectionRequest {
    provider?: string;
    taskComplexity?: 'low' | 'medium' | 'high';
    taskType?: 'worker' | 'supervisor'; // explicit role override
    routingTaskType?: 'coding' | 'planning' | 'research' | 'general' | 'worker' | 'supervisor'; // New: Task-specific routing
    exclude?: string[];
}

export interface SelectedModel {
    provider: string;
    modelId: string;
    reason: string;
    systemPrompt?: string; // New: Persona Support
}

interface ModelStatus {
    isDepleted: boolean;
    depletedAt?: number;
    retryAfter?: number; // timestamp
}

interface ChainCandidate {
    provider: string;
    modelId: string;
    systemPrompt?: string;
}

// Default Fallback - Robust Chain
// Defines the priority order for model selection based on task type.
// The selector iterates through this list, checking for API keys and depletion status.
const DEFAULT_CHAINS: Record<'worker' | 'supervisor', ChainCandidate[]> = {
    worker: [
        { provider: 'google', modelId: 'gemini-2.0-flash' },
        { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
        { provider: 'openai', modelId: 'gpt-4o' },
        { provider: 'deepseek', modelId: 'deepseek-chat' },
        { provider: 'lmstudio', modelId: 'local' },
        { provider: 'ollama', modelId: 'gemma:2b' }
    ],
    supervisor: [
        { provider: 'openai', modelId: 'gpt-4o' },
        { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
        { provider: 'google', modelId: 'gemini-1.5-pro' },
        { provider: 'lmstudio', modelId: 'local' }
    ]
};

const COOL_DOWN_MS = 60 * 1000;

/**
 * ModelSelector Class
 * Responsible for choosing the best LLM for a given task.
 * Features:
 * - Dynamic Chain Selection: Defaults to hardcoded robust chains but can load overrides from `council.json`.
 * - Quota Management: Integrates with QuotaService to detect budget limits.
 * - Failure Handling: Marks models as depleted upon failure and rotates to the next available provider.
 * - Local Fallback: Gracefully degrades to local models (LM Studio/Ollama) if cloud quotas are hit.
 */
export class ModelSelector {
    private modelStates: Map<string, ModelStatus> = new Map();
    private configPath: string;
    private quotaService: QuotaService;

    constructor() {
        this.quotaService = new QuotaService();
        this.configPath = path.resolve(process.cwd(), 'packages/core/config/council.json');
        console.log("ModelSelector initialized. Config Path:", this.configPath);
    }

    public getQuotaService() { return this.quotaService; }

    /** Returns a snapshot of currently depleted/cooling-down models for dashboard display. */
    public getDepletedModels(): Array<{
        key: string;
        provider: string;
        modelId: string;
        depletedAt: number;
        retryAfter: number; // Infinity means permanent for this session
        isPermanent: boolean;
        coolsDownAt: string; // human-readable
    }> {
        const now = Date.now();
        const result: Array<ReturnType<ModelSelector['getDepletedModels']>[number]> = [];
        for (const [key, status] of this.modelStates.entries()) {
            if (!status.isDepleted) continue;
            // Skip entries that have already naturally expired
            if (status.retryAfter !== Infinity && now > (status.retryAfter ?? 0)) continue;
            const [provider, ...modelParts] = key.split(':');
            const isPermanent = status.retryAfter === Infinity;
            result.push({
                key,
                provider: provider ?? key,
                modelId: modelParts.join(':'),
                depletedAt: status.depletedAt ?? now,
                retryAfter: status.retryAfter ?? 0,
                isPermanent,
                coolsDownAt: isPermanent ? 'session end' : new Date(status.retryAfter ?? 0).toLocaleTimeString(),
            });
        }
        return result;
    }

    private getCandidateKey(provider: string, modelId: string): string {
        return `${provider}:${modelId}`;
    }

    public reportFailure(provider: string, modelId: string, cause?: unknown) {
        const candidateKey = this.getCandidateKey(provider, modelId);

        // Permanent failures (bad key, auth, model-not-found): block for the full session.
        // Transient failures (429, 5xx, network): use the normal COOL_DOWN_MS backoff.
        const isPermanent = this.isPermanentFailure(cause);
        const cooldown = isPermanent ? Number.MAX_SAFE_INTEGER : COOL_DOWN_MS;
        const label = isPermanent ? 'PERMANENT (auth/key)' : `TRANSIENT (${COOL_DOWN_MS / 1000}s backoff)`;
        console.warn(`[ModelSelector] Reporting failure for ${candidateKey}. Mode: ${label}.`);

        this.modelStates.set(candidateKey, {
            isDepleted: true,
            depletedAt: Date.now(),
            retryAfter: isPermanent ? Infinity : Date.now() + COOL_DOWN_MS,
        });
    }

    /** Returns true when the error indicates a permanent configuration failure (bad key / auth / not found). */
    private isPermanentFailure(cause: unknown): boolean {
        if (!cause) return false;
        const err = cause as { status?: number; message?: string; code?: string };
        const status = err.status;
        const code = String(err.code ?? '').toLowerCase();
        const message = (err.message ?? '').toLowerCase();
        if (status === 401 || status === 403 || status === 404) return true;
        if (code === 'invalid_api_key' || code === 'authentication_error' || code === 'permission_denied') return true;
        return (
            message.includes('api key not configured') ||
            message.includes('unauthorized') ||
            message.includes('invalid api key') ||
            message.includes('forbidden') ||
            message.includes('authentication') ||
            message.includes('model not found') ||
            message.includes('unsupported model')
        );
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error("Failed to load council config:", e);
        }
        return null;
    }

    private getConfiguredChain(): ChainCandidate[] | null {
        const config = this.loadConfig();

        if (config && Array.isArray(config.members)) {
            return config.members.map((member: any) => ({
                provider: member.provider,
                modelId: member.modelId,
                systemPrompt: member.systemPrompt
            }));
        }

        return null;
    }

    private buildChain(req: ModelSelectionRequest): ChainCandidate[] {
        const configuredChain = this.getConfiguredChain();

        let chain: ChainCandidate[] = configuredChain
            ? configuredChain
            : (req.taskType === 'supervisor' || req.taskComplexity === 'high'
                ? DEFAULT_CHAINS.supervisor
                : DEFAULT_CHAINS.worker);

        if (req.provider) {
            const preferred = chain.filter(candidate => candidate.provider === req.provider);
            const remaining = chain.filter(candidate => candidate.provider !== req.provider);
            chain = [...preferred, ...remaining];
        }

        return chain;
    }

    private isCoolingDown(provider: string, modelId: string): boolean {
        const candidateKey = this.getCandidateKey(provider, modelId);
        const status = this.modelStates.get(candidateKey);

        if (!status || !status.isDepleted) {
            return false;
        }

        if (Date.now() > (status.retryAfter || 0)) {
            this.modelStates.delete(candidateKey);
            return false;
        }

        return true;
    }

    private hasKey(provider: string): boolean {
        if (provider === 'google') return !!process.env.GOOGLE_API_KEY;
        if (provider === 'openai') return !!process.env.OPENAI_API_KEY;
        if (provider === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
        if (provider === 'deepseek') return !!process.env.DEEPSEEK_API_KEY;
        return true; // Local/No-Auth
    }

    public async selectModel(req: ModelSelectionRequest): Promise<SelectedModel> {
        const isBudgetExceeded = this.quotaService.isBudgetExceeded();

        if (isBudgetExceeded) {
            console.warn("[ModelSelector] Budget exceeded! Forcing FREE local models.");
            return {
                provider: 'lmstudio',
                modelId: 'local',
                reason: 'BUDGET_EXCEEDED_FORCED_LOCAL'
            };
        }

        const chain = this.buildChain(req);
        const excludedCandidates = new Set(req.exclude || []);

        // Iterate
        for (const candidate of chain) {
            const candidateKey = this.getCandidateKey(candidate.provider, candidate.modelId);

            if (excludedCandidates.has(candidateKey)) {
                continue;
            }

            // 1. Check API Key
            if (!this.hasKey(candidate.provider)) {
                // console.warn(`[ModelSelector] Skipping ${candidate.provider} (No Key)`);
                continue;
            }

            // 2. Check Depletion
            if (this.isCoolingDown(candidate.provider, candidate.modelId)) {
                continue;
            }

            return {
                provider: candidate.provider,
                modelId: candidate.modelId,
                reason: req.provider === candidate.provider ? 'PROVIDER_PREFERENCE' : 'PRIMARY_CHOICE',
                systemPrompt: candidate.systemPrompt
            };
        }

        console.error("[ModelSelector] ALL MODELS DEPLETED! Returning default fallback.");
        return {
            provider: 'lmstudio',
            modelId: 'local',
            reason: 'EMERGENCY_FALLBACK'
        };
    }
}
