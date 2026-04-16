export interface ArchitectureSubmoduleRow {
    name: string;
    path: string;
    url: string;
}

export interface ArchitectureDependencyGraph {
    dependencies: Record<string, string[]>;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function normalizeArchitectureSubmodules(payload: unknown): ArchitectureSubmoduleRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<ArchitectureSubmoduleRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawPath = typeof item.path === 'string' ? item.path.trim() : '';
        const rawName = typeof item.name === 'string' ? item.name.trim() : '';
        const rawUrl = typeof item.url === 'string' ? item.url.trim() : '';
        const fallbackPath = rawPath.length > 0 ? rawPath : `submodule-${index}`;
        const fallbackName = fallbackPath.split('/').pop() || fallbackPath;

        acc.push({
            name: rawName.length > 0 ? rawName : fallbackName,
            path: fallbackPath,
            url: rawUrl,
        });

        return acc;
    }, []);
}

export function normalizeDependencyGraph(payload: unknown): ArchitectureDependencyGraph {
    if (!isObject(payload) || !isObject(payload.dependencies)) {
        return { dependencies: {} };
    }

    const dependencies = Object.entries(payload.dependencies).reduce<Record<string, string[]>>((acc, [node, rawDeps]) => {
        const normalizedNode = node.trim();
        if (normalizedNode.length === 0) {
            return acc;
        }

        const normalizedDeps = Array.isArray(rawDeps)
            ? rawDeps.filter((dep): dep is string => typeof dep === 'string' && dep.trim().length > 0).map((dep) => dep.trim())
            : [];

        acc[normalizedNode] = normalizedDeps;
        return acc;
    }, {});

    return { dependencies };
}