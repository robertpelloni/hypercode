export type ToolPreferences = {
    importantTools: string[];
    alwaysLoadedTools: string[];
};

type ToolSelectionSettings = {
    importantTools?: unknown;
    alwaysLoadedTools?: unknown;
};

type ToolPreferenceDisplayFields = {
    name: string;
    description: string;
    server: string;
    matchReason?: string;
    score?: number;
    rank?: number;
};

function normalizeToolNames(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(new Set(value
        .filter((item): item is string => typeof item === 'string')
        .map((name) => name.trim())
        .filter(Boolean)));
}

export function normalizeToolPreferences(value: { importantTools?: unknown; alwaysLoadedTools?: unknown } | null | undefined): ToolPreferences {
    return {
        importantTools: normalizeToolNames(value?.importantTools),
        alwaysLoadedTools: normalizeToolNames(value?.alwaysLoadedTools),
    };
}

export function readToolPreferencesFromSettings(settings: ToolSelectionSettings | null | undefined): ToolPreferences {
    return normalizeToolPreferences({
        importantTools: settings?.importantTools,
        alwaysLoadedTools: settings?.alwaysLoadedTools,
    });
}

export function buildToolPreferenceSettings(
    existingSettings: Record<string, unknown>,
    nextPreferences: ToolPreferences,
): Record<string, unknown> {
    const normalized = normalizeToolPreferences(nextPreferences);

    return {
        ...existingSettings,
        toolSelection: {
            ...(existingSettings.toolSelection && typeof existingSettings.toolSelection === 'object'
                ? existingSettings.toolSelection as Record<string, unknown>
                : {}),
            importantTools: normalized.importantTools,
            alwaysLoadedTools: normalized.alwaysLoadedTools,
        },
    };
}

export function mergeToolPreferences<T extends ToolPreferenceDisplayFields>(
    results: T[],
    preferences: ToolPreferences,
    catalog: Array<{ name: string; description: string; server: string }>,
): Array<T & { important: boolean; alwaysShow: boolean; alwaysLoaded: boolean }> {
    const importantSet = new Set(preferences.importantTools);
    const alwaysLoadedSet = new Set(preferences.alwaysLoadedTools);
    const merged = new Map<string, T & { important: boolean; alwaysShow: boolean; alwaysLoaded: boolean }>();

    for (const item of results) {
        merged.set(item.name, {
            ...item,
            important: importantSet.has(item.name),
            alwaysShow: importantSet.has(item.name),
            alwaysLoaded: alwaysLoadedSet.has(item.name),
        });
    }

    for (const toolName of preferences.importantTools) {
        if (merged.has(toolName)) {
            continue;
        }

        const catalogTool = catalog.find((tool) => tool.name === toolName);
        if (!catalogTool) {
            continue;
        }

        merged.set(toolName, {
            ...(catalogTool as T),
            matchReason: 'pinned as important (always shown)',
            score: 10_000,
            rank: 0,
            important: true,
            alwaysShow: true,
            alwaysLoaded: alwaysLoadedSet.has(toolName),
        });
    }

    const values = Array.from(merged.values());
    values.sort((left, right) => {
        if (left.alwaysLoaded !== right.alwaysLoaded) {
            return left.alwaysLoaded ? -1 : 1;
        }

        if (left.important !== right.important) {
            return left.important ? -1 : 1;
        }

        return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
    });

    return values.map((item, index) => ({
        ...item,
        rank: item.rank && item.rank > 0 ? item.rank : index + 1,
    }));
}
