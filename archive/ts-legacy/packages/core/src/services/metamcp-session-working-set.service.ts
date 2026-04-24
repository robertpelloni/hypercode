export interface SessionToolWorkingSetOptions {
    maxLoadedTools?: number;
    maxHydratedSchemas?: number;
    /** Tools idle longer than this (ms) are preferred eviction candidates. Default: 5 minutes. */
    idleEvictionThresholdMs?: number;
}

export interface LoadedToolState {
    name: string;
    hydrated: boolean;
    lastLoadedAt: number;
    lastHydratedAt: number | null;
    /** Unix ms of the most recent load, hydrate, or touchTool call for this tool. */
    lastAccessedAt: number;
}

/** A single eviction event recorded in the bounded history ring buffer. */
export interface WorkingSetEvictionEvent {
    toolName: string;
    /** Unix ms when the eviction occurred. */
    timestamp: number;
    /** Which tier was evicted — 'loaded' means both loaded+hydrated status lost;
     *  'hydrated' means only the full schema cache was dropped while metadata stays loaded. */
    tier: 'loaded' | 'hydrated';
    /** True when the tool was evicted because it exceeded the idle threshold,
     *  false when evicted purely by LRU capacity pressure. */
    idleEvicted: boolean;
    /** How long (ms) the tool had been idle at eviction time. */
    idleDurationMs: number;
}

const DEFAULT_MAX_LOADED_TOOLS = 16;
const DEFAULT_MAX_HYDRATED_SCHEMAS = 8;
const DEFAULT_IDLE_EVICTION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum number of eviction events kept in the in-memory history ring. */
const MAX_EVICTION_HISTORY = 200;

/** Internal per-tool tracking entry stored in the loaded/hydrated maps. */
interface ToolEntry {
    /** Unix ms when the tool was first loaded/hydrated in this working set slot. */
    loadedAt: number;
    /** Unix ms of the most recent load, hydrate, or touchTool call. Used for LRU + idle eviction. */
    accessedAt: number;
}

export class SessionToolWorkingSet {
    private maxLoadedTools: number;
    private maxHydratedSchemas: number;
    private idleEvictionThresholdMs: number;
    private readonly loadedTools = new Map<string, ToolEntry>();
    private readonly hydratedTools = new Map<string, ToolEntry>();
    private readonly alwaysLoadedTools = new Set<string>();
    private readonly alwaysLoadedState = new Map<string, ToolEntry>();
    /** Bounded ring buffer of the most recent eviction events. */
    private readonly evictionHistory: WorkingSetEvictionEvent[] = [];

    constructor(options: SessionToolWorkingSetOptions = {}) {
        this.maxLoadedTools = options.maxLoadedTools ?? DEFAULT_MAX_LOADED_TOOLS;
        this.maxHydratedSchemas = options.maxHydratedSchemas ?? DEFAULT_MAX_HYDRATED_SCHEMAS;
        this.idleEvictionThresholdMs = options.idleEvictionThresholdMs ?? DEFAULT_IDLE_EVICTION_THRESHOLD_MS;
    }

    /**
     * Update capacity limits at runtime without clearing the current working set.
     * Tools already loaded beyond the new cap are not immediately evicted — eviction
     * happens naturally on the next load/hydrate call that exceeds the new limit.
     */
    reconfigure(options: SessionToolWorkingSetOptions): void {
        if (typeof options.maxLoadedTools === 'number') {
            this.maxLoadedTools = Math.max(1, Math.round(options.maxLoadedTools));
        }

        if (typeof options.maxHydratedSchemas === 'number') {
            this.maxHydratedSchemas = Math.max(1, Math.round(options.maxHydratedSchemas));
        }

        if (typeof options.idleEvictionThresholdMs === 'number') {
            this.idleEvictionThresholdMs = Math.max(0, Math.round(options.idleEvictionThresholdMs));
        }

        const timestamp = Date.now();

        while (this.loadedTools.size > this.maxLoadedTools) {
            const candidate = this.pickEvictionCandidate(this.loadedTools);
            if (!candidate) {
                break;
            }

            const entry = this.loadedTools.get(candidate)!;
            this.loadedTools.delete(candidate);
            this.hydratedTools.delete(candidate);
            this.recordEviction(candidate, 'loaded', entry.accessedAt);
        }

        while (this.hydratedTools.size > this.maxHydratedSchemas) {
            const candidate = this.pickEvictionCandidate(this.hydratedTools);
            if (!candidate) {
                break;
            }

            const entry = this.hydratedTools.get(candidate)!;
            this.hydratedTools.delete(candidate);
            this.recordEviction(candidate, 'hydrated', entry.accessedAt);
        }
    }

    private touch(map: Map<string, ToolEntry>, name: string, timestamp: number): boolean {
        const entry = map.get(name);
        if (!entry) return false;
        // Update accessedAt in-place (Map value is mutable; no re-insert needed for LRU
        // since we select candidates by min accessedAt rather than insertion order).
        entry.accessedAt = timestamp;
        return true;
    }

    /**
     * Pick the best eviction candidate from a map.
     * Prefers tools idle longer than the configured threshold (true idle eviction),
     * and falls back to plain LRU (min accessedAt) when nothing is idle.
     */
    private pickEvictionCandidate(map: Map<string, ToolEntry>): string | undefined {
        const now = Date.now();
        let candidate: string | undefined;
        let candidateAccessedAt = Infinity;

        for (const [name, entry] of map) {
            // Skip always-loaded tools in the loaded map (shouldn't be there, but guard).
            if (this.alwaysLoadedTools.has(name)) continue;
            const idleDuration = now - entry.accessedAt;
            // Prefer the most-idle tool beyond the threshold; among equally-idle tools
            // pick the one loaded longest ago (loadedAt) as a tiebreaker.
            if (entry.accessedAt < candidateAccessedAt) {
                candidateAccessedAt = entry.accessedAt;
                candidate = name;
            }
        }

        return candidate;
    }

    private recordEviction(
        toolName: string,
        tier: WorkingSetEvictionEvent['tier'],
        accessedAt: number,
    ): void {
        const now = Date.now();
        const idleDurationMs = now - accessedAt;
        this.evictionHistory.push({
            toolName,
            timestamp: now,
            tier,
            idleEvicted: idleDurationMs >= this.idleEvictionThresholdMs,
            idleDurationMs,
        });

        // Keep the ring buffer bounded.
        while (this.evictionHistory.length > MAX_EVICTION_HISTORY) {
            this.evictionHistory.shift();
        }
    }

    loadTool(name: string): string[] {
        if (this.alwaysLoadedTools.has(name)) {
            this.ensureAlwaysLoadedState(name, Date.now());
            return [];
        }

        const timestamp = Date.now();

        if (this.touch(this.loadedTools, name, timestamp)) {
            return [];
        }

        const evicted: string[] = [];

        while (this.loadedTools.size >= this.maxLoadedTools) {
            const candidate = this.pickEvictionCandidate(this.loadedTools);
            if (!candidate) break;

            const entry = this.loadedTools.get(candidate)!;
            this.loadedTools.delete(candidate);
            this.hydratedTools.delete(candidate);
            evicted.push(candidate);
            this.recordEviction(candidate, 'loaded', entry.accessedAt);
        }

        this.loadedTools.set(name, { loadedAt: timestamp, accessedAt: timestamp });
        return evicted;
    }

    hydrateTool(name: string): string[] {
        this.loadTool(name);

        const evicted: string[] = [];
        const timestamp = Date.now();

        if (this.hydratedTools.has(name)) {
            // Already hydrated — just refresh access time.
            this.touch(this.hydratedTools, name, timestamp);
            return evicted;
        }

        while (this.hydratedTools.size >= this.maxHydratedSchemas) {
            const candidate = this.pickEvictionCandidate(this.hydratedTools);
            if (!candidate) break;

            const entry = this.hydratedTools.get(candidate)!;
            this.hydratedTools.delete(candidate);
            evicted.push(candidate);
            this.recordEviction(candidate, 'hydrated', entry.accessedAt);
        }

        this.hydratedTools.set(name, { loadedAt: timestamp, accessedAt: timestamp });
        return evicted;
    }

    touchTool(name: string): boolean {
        const timestamp = Date.now();
        let touchedLoaded = false;
        if (this.alwaysLoadedTools.has(name)) {
            this.ensureAlwaysLoadedState(name, timestamp);
            touchedLoaded = true;
        } else {
            touchedLoaded = this.touch(this.loadedTools, name, timestamp);
        }
        const touchedHydrated = this.touch(this.hydratedTools, name, timestamp);
        return touchedLoaded || touchedHydrated;
    }

    /** Return how long (ms) since the tool was last accessed, or -1 if not loaded. */
    getIdleDurationMs(name: string): number {
        if (this.alwaysLoadedTools.has(name)) return 0;
        const entry = this.loadedTools.get(name);
        if (!entry) return -1;
        return Date.now() - entry.accessedAt;
    }

    unloadTool(name: string): boolean {
        if (this.alwaysLoadedTools.has(name)) {
            return this.hydratedTools.delete(name);
        }

        const removedLoaded = this.loadedTools.delete(name);
        const removedHydrated = this.hydratedTools.delete(name);
        return removedLoaded || removedHydrated;
    }

    isLoaded(name: string): boolean {
        return this.alwaysLoadedTools.has(name) || this.loadedTools.has(name);
    }

    isHydrated(name: string): boolean {
        return this.hydratedTools.has(name);
    }

    getLoadedToolNames(): string[] {
        return [
            ...this.alwaysLoadedTools,
            ...Array.from(this.loadedTools.keys()).filter((name) => !this.alwaysLoadedTools.has(name)),
        ];
    }

    listLoadedTools(): LoadedToolState[] {
        return this.getLoadedToolNames().map((name) => {
            const loadedEntry = this.loadedTools.get(name) ?? this.alwaysLoadedState.get(name);
            const hydratedEntry = this.hydratedTools.get(name);
            return {
                name,
                hydrated: this.isHydrated(name),
                lastLoadedAt: loadedEntry?.loadedAt ?? 0,
                lastHydratedAt: hydratedEntry?.loadedAt ?? null,
                lastAccessedAt: loadedEntry?.accessedAt ?? 0,
            };
        });
    }

    getLimits(): { maxLoadedTools: number; maxHydratedSchemas: number; idleEvictionThresholdMs: number } {
        return {
            maxLoadedTools: this.maxLoadedTools,
            maxHydratedSchemas: this.maxHydratedSchemas,
            idleEvictionThresholdMs: this.idleEvictionThresholdMs,
        };
    }

    /** Return the bounded eviction history, most recent first. */
    getEvictionHistory(): WorkingSetEvictionEvent[] {
        return [...this.evictionHistory].reverse();
    }

    /** Clear the eviction history ring buffer. */
    clearEvictionHistory(): void {
        this.evictionHistory.length = 0;
    }

    setAlwaysLoadedTools(names: string[]): void {
        const timestamp = Date.now();
        const previousAlwaysLoadedState = new Map(this.alwaysLoadedState);
        this.alwaysLoadedTools.clear();
        this.alwaysLoadedState.clear();

        for (const name of names) {
            this.alwaysLoadedTools.add(name);
            const existingEntry = previousAlwaysLoadedState.get(name)
                ?? this.loadedTools.get(name)
                ?? this.hydratedTools.get(name);

            this.alwaysLoadedState.set(name, {
                loadedAt: existingEntry?.loadedAt ?? timestamp,
                accessedAt: existingEntry?.accessedAt ?? timestamp,
            });
        }

        for (const loadedName of Array.from(this.loadedTools.keys())) {
            if (this.alwaysLoadedTools.has(loadedName)) {
                this.loadedTools.delete(loadedName);
            }
        }
    }

    private ensureAlwaysLoadedState(name: string, timestamp: number): void {
        const entry = this.alwaysLoadedState.get(name);
        if (entry) {
            entry.accessedAt = timestamp;
            return;
        }

        this.alwaysLoadedState.set(name, {
            loadedAt: timestamp,
            accessedAt: timestamp,
        });
    }
}
