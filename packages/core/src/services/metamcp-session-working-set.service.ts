export interface SessionToolWorkingSetOptions {
    maxLoadedTools?: number;
    maxHydratedSchemas?: number;
}

export interface LoadedToolState {
    name: string;
    hydrated: boolean;
    lastLoadedAt: number;
    lastHydratedAt: number | null;
}

const DEFAULT_MAX_LOADED_TOOLS = 24;
const DEFAULT_MAX_HYDRATED_SCHEMAS = 8;

export class SessionToolWorkingSet {
    private readonly maxLoadedTools: number;
    private readonly maxHydratedSchemas: number;
    private readonly loadedTools = new Map<string, number>();
    private readonly hydratedTools = new Map<string, number>();

    constructor(options: SessionToolWorkingSetOptions = {}) {
        this.maxLoadedTools = options.maxLoadedTools ?? DEFAULT_MAX_LOADED_TOOLS;
        this.maxHydratedSchemas = options.maxHydratedSchemas ?? DEFAULT_MAX_HYDRATED_SCHEMAS;
    }

    loadTool(name: string): string[] {
        const evicted: string[] = [];
        const timestamp = Date.now();

        if (this.loadedTools.has(name)) {
            this.loadedTools.delete(name);
        }

        while (this.loadedTools.size >= this.maxLoadedTools) {
            const oldest = this.loadedTools.keys().next().value;
            if (!oldest) {
                break;
            }

            this.loadedTools.delete(oldest);
            this.hydratedTools.delete(oldest);
            evicted.push(oldest);
        }

        this.loadedTools.set(name, timestamp);
        return evicted;
    }

    hydrateTool(name: string): string[] {
        this.loadTool(name);

        const evicted: string[] = [];
        const timestamp = Date.now();

        if (this.hydratedTools.has(name)) {
            this.hydratedTools.delete(name);
        }

        while (this.hydratedTools.size >= this.maxHydratedSchemas) {
            const oldest = this.hydratedTools.keys().next().value;
            if (!oldest) {
                break;
            }

            this.hydratedTools.delete(oldest);
            evicted.push(oldest);
        }

        this.hydratedTools.set(name, timestamp);
        return evicted;
    }

    unloadTool(name: string): boolean {
        const removedLoaded = this.loadedTools.delete(name);
        const removedHydrated = this.hydratedTools.delete(name);
        return removedLoaded || removedHydrated;
    }

    isLoaded(name: string): boolean {
        return this.loadedTools.has(name);
    }

    isHydrated(name: string): boolean {
        return this.hydratedTools.has(name);
    }

    getLoadedToolNames(): string[] {
        return Array.from(this.loadedTools.keys());
    }

    listLoadedTools(): LoadedToolState[] {
        return this.getLoadedToolNames().map((name) => ({
            name,
            hydrated: this.isHydrated(name),
            lastLoadedAt: this.loadedTools.get(name) ?? 0,
            lastHydratedAt: this.hydratedTools.get(name) ?? null,
        }));
    }

    getLimits(): { maxLoadedTools: number; maxHydratedSchemas: number } {
        return {
            maxLoadedTools: this.maxLoadedTools,
            maxHydratedSchemas: this.maxHydratedSchemas,
        };
    }
}
