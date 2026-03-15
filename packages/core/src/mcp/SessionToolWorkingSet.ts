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

export const DEFAULT_MAX_LOADED_TOOLS = 16;
export const DEFAULT_MAX_HYDRATED_SCHEMAS = 8;
const DEFAULT_IDLE_EVICTION_THRESHOLD_MS = 5 * 60 * 1000;

/** Internal per-tool tracking entry. */
interface ToolEntry {
    loadedAt: number;
    accessedAt: number;
}

export class SessionToolWorkingSet {
    private readonly maxLoadedTools: number;
    private readonly maxHydratedSchemas: number;
    private readonly idleEvictionThresholdMs: number;
    private readonly loadedTools = new Map<string, ToolEntry>();
    private readonly hydratedTools = new Map<string, ToolEntry>();
    private readonly alwaysLoadedTools = new Set<string>();

    constructor(options: SessionToolWorkingSetOptions = {}) {
        this.maxLoadedTools = options.maxLoadedTools ?? DEFAULT_MAX_LOADED_TOOLS;
        this.maxHydratedSchemas = options.maxHydratedSchemas ?? DEFAULT_MAX_HYDRATED_SCHEMAS;
        this.idleEvictionThresholdMs = options.idleEvictionThresholdMs ?? DEFAULT_IDLE_EVICTION_THRESHOLD_MS;
    }

    private touch(map: Map<string, ToolEntry>, name: string, timestamp: number): boolean {
        const entry = map.get(name);
        if (!entry) return false;
        entry.accessedAt = timestamp;
        return true;
    }

    /** Returns the name of the tool least recently accessed (idle-aware LRU candidate). */
    private pickEvictionCandidate(map: Map<string, ToolEntry>): string | undefined {
        let candidate: string | undefined;
        let minAccessedAt = Infinity;
        for (const [name, entry] of map) {
            if (this.alwaysLoadedTools.has(name)) continue;
            if (entry.accessedAt < minAccessedAt) {
                minAccessedAt = entry.accessedAt;
                candidate = name;
            }
        }
        return candidate;
    }

    loadTool(name: string): string[] {
        if (this.alwaysLoadedTools.has(name)) {
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
            this.loadedTools.delete(candidate);
            this.hydratedTools.delete(candidate);
            evicted.push(candidate);
        }

        this.loadedTools.set(name, { loadedAt: timestamp, accessedAt: timestamp });
        return evicted;
    }

    hydrateTool(name: string): string[] {
        this.loadTool(name);

        const evicted: string[] = [];
        const timestamp = Date.now();

        if (this.hydratedTools.has(name)) {
            this.touch(this.hydratedTools, name, timestamp);
            return evicted;
        }

        while (this.hydratedTools.size >= this.maxHydratedSchemas) {
            const candidate = this.pickEvictionCandidate(this.hydratedTools);
            if (!candidate) break;
            this.hydratedTools.delete(candidate);
            evicted.push(candidate);
        }

        this.hydratedTools.set(name, { loadedAt: timestamp, accessedAt: timestamp });
        return evicted;
    }

    touchTool(name: string): boolean {
        const timestamp = Date.now();
        const touchedLoaded = this.alwaysLoadedTools.has(name)
            ? true
            : this.touch(this.loadedTools, name, timestamp);
        const touchedHydrated = this.touch(this.hydratedTools, name, timestamp);
        return touchedLoaded || touchedHydrated;
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
            const loadedEntry = this.loadedTools.get(name);
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

    setAlwaysLoadedTools(names: string[]): void {
        this.alwaysLoadedTools.clear();
        for (const name of names) {
            this.alwaysLoadedTools.add(name);
        }

        for (const loadedName of Array.from(this.loadedTools.keys())) {
            if (this.alwaysLoadedTools.has(loadedName)) {
                this.loadedTools.delete(loadedName);
            }
        }
    }
}