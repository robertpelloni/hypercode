export type ToolSelectionEventType = 'search' | 'load' | 'hydrate' | 'unload';

export interface ToolSelectionTelemetryEvent {
    id: string;
    type: ToolSelectionEventType;
    timestamp: number;
    sessionId?: string;
    query?: string;
    profile?: string;
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/toolSelectionTelemetry.ts
    source?: 'runtime-search' | 'cached-ranking' | 'live-aggregator' | 'manual-action';
=======
    source?: 'runtime-search' | 'cached-ranking' | 'live-aggregator';
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/mcp/toolSelectionTelemetry.ts
    resultCount?: number;
    topResultName?: string;
    topMatchReason?: string;
    topScore?: number;
    secondResultName?: string;
    secondMatchReason?: string;
    secondScore?: number;
    scoreGap?: number;
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/toolSelectionTelemetry.ts
    ignoredResultCount?: number;
    ignoredResultNames?: string[];
=======
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/mcp/toolSelectionTelemetry.ts
    toolName?: string;
    status: 'success' | 'error';
    message?: string;
    evictedTools?: string[];
    latencyMs?: number;
    autoLoadReason?: string;
    autoLoadConfidence?: number;
    autoLoadEvaluated?: boolean;
    autoLoadOutcome?: 'loaded' | 'skipped' | 'not-applicable';
    autoLoadSkipReason?: string;
    autoLoadMinConfidence?: number;
    autoLoadExecutionStatus?: 'success' | 'error' | 'not-attempted';
    autoLoadExecutionError?: string;
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/toolSelectionTelemetry.ts
    loadedToolCount?: number;
    hydratedSchemaCount?: number;
    maxLoadedTools?: number;
    maxHydratedSchemas?: number;
    idleEvictionThresholdMs?: number;
    loadedUtilizationPct?: number;
    hydratedUtilizationPct?: number;
=======
>>>>>>> origin/rewrite/main-sanitized:packages/core/src/mcp/toolSelectionTelemetry.ts
}

const MAX_TELEMETRY_EVENTS = 100;

class ToolSelectionTelemetryStore {
    private readonly events: ToolSelectionTelemetryEvent[] = [];

    record(event: Omit<ToolSelectionTelemetryEvent, 'id' | 'timestamp'> & Partial<Pick<ToolSelectionTelemetryEvent, 'id' | 'timestamp'>>): ToolSelectionTelemetryEvent {
        const nextEvent: ToolSelectionTelemetryEvent = {
            id: event.id ?? `${event.type}-${event.toolName ?? event.query ?? 'event'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: event.timestamp ?? Date.now(),
            ...event,
        };

        this.events.unshift(nextEvent);
        if (this.events.length > MAX_TELEMETRY_EVENTS) {
            this.events.length = MAX_TELEMETRY_EVENTS;
        }

        return nextEvent;
    }

    list(): ToolSelectionTelemetryEvent[] {
        return [...this.events];
    }

    clear(): void {
        this.events.length = 0;
    }
}

export const toolSelectionTelemetry = new ToolSelectionTelemetryStore();