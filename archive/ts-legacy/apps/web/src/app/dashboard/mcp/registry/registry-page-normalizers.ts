interface RecordLike {
    [key: string]: unknown;
}

export interface RegistryListItem {
    id?: string;
    name: string;
    description: string;
    author?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    tags: string[];
    url?: string;
    category?: string;
}

function asRecord(value: unknown): RecordLike | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as RecordLike)
        : null;
}

function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : fallback;
}

function normalizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export function normalizeRegistryItems(registry: unknown): RegistryListItem[] {
    if (!Array.isArray(registry)) {
        return [];
    }

    return registry.reduce<RegistryListItem[]>((acc, entry, index) => {
        const row = asRecord(entry);
        if (!row) {
            return acc;
        }

        const name = toStringValue(row.name, `unknown-registry-item-${index + 1}`);
        acc.push({
            id: toStringValue(row.id) || undefined,
            name,
            description: toStringValue(row.description, 'No description provided.'),
            author: toStringValue(row.author) || undefined,
            command: toStringValue(row.command) || undefined,
            args: Array.isArray(row.args)
                ? row.args.filter((arg): arg is string => typeof arg === 'string')
                : undefined,
            env: asRecord(row.env)
                ? Object.fromEntries(Object.entries(row.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
                : undefined,
            tags: normalizeTags(row.tags),
            url: toStringValue(row.url) || undefined,
            category: toStringValue(row.category) || undefined,
        });

        return acc;
    }, []);
}

export function getInstalledServerNames(installedServers: unknown): Set<string> {
    if (!Array.isArray(installedServers)) {
        return new Set<string>();
    }

    return new Set(
        installedServers
            .map((entry) => {
                const row = asRecord(entry);
                return row ? toStringValue(row.name) : '';
            })
            .filter(Boolean),
    );
}
