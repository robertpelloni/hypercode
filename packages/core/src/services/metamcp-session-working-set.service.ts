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

const DEFAULT_MAX_LOADED_TOOLS = 16;
const DEFAULT_MAX_HYDRATED_SCHEMAS = 8;

export class SessionToolWorkingSet {
    private readonly maxLoadedTools: number;
    private readonly maxHydratedSchemas: number;
    private readonly loadedTools = new Map<string, number>();
    private readonly hydratedTools = new Map<string, number>();
    private readonly alwaysLoadedTools = new Set<string>();

    constructor(options: SessionToolWorkingSetOptions = {}) {
        this.maxLoadedTools = options.maxLoadedTools ?? DEFAULT_MAX_LOADED_TOOLS;
        this.maxHydratedSchemas = options.maxHydratedSchemas ?? DEFAULT_MAX_HYDRATED_SCHEMAS;
    }

    private touch(map: Map<string, number>, name: string, timestamp: number): boolean {
        if (!map.has(name)) {
            return false;
        }

        map.delete(name);
        map.set(name, timestamp);
        return true;
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
