export interface ApiKeyListItem {
    uuid: string;
    name: string;
    key_prefix: string;
    created_at: string;
    is_active: boolean;
    key?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function normalizeApiKeyList(payload: unknown): ApiKeyListItem[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<ApiKeyListItem[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const uuid = typeof item.uuid === 'string' && item.uuid.trim().length > 0
            ? item.uuid.trim()
            : `api-key-${index}`;

        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const keyPrefix = typeof item.key_prefix === 'string' ? item.key_prefix.trim() : '';
        const createdAt = typeof item.created_at === 'string' ? item.created_at.trim() : '';

        acc.push({
            uuid,
            name: name.length > 0 ? name : 'Unnamed key',
            key_prefix: keyPrefix.length > 0 ? keyPrefix : 'sk-...',
            created_at: createdAt.length > 0 ? createdAt : new Date(0).toISOString(),
            is_active: item.is_active === true,
            key: typeof item.key === 'string' ? item.key.trim() : undefined,
        });

        return acc;
    }, []);
}