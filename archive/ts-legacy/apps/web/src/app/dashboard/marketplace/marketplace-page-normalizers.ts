export type MarketplaceEntryType = 'agent' | 'tool' | 'skill';

export interface MarketplaceEntryRow {
    id: string;
    name: string;
    type: MarketplaceEntryType;
    source: string;
    installed: boolean;
    description: string;
    tags: string[];
    verified: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeType(value: unknown): MarketplaceEntryType {
    return value === 'agent' || value === 'tool' || value === 'skill' ? value : 'tool';
}

export function normalizeMarketplaceEntries(payload: unknown): MarketplaceEntryRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<MarketplaceEntryRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawId = typeof item.id === 'string' ? item.id.trim() : '';
        const rawName = typeof item.name === 'string' ? item.name.trim() : '';
        const rawSource = typeof item.source === 'string' ? item.source.trim() : '';
        const rawDescription = typeof item.description === 'string' ? item.description.trim() : '';
        const rawTags = Array.isArray(item.tags)
            ? item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
            : [];

        acc.push({
            id: rawId.length > 0 ? rawId : `marketplace-${index}`,
            name: rawName.length > 0 ? rawName : 'Unnamed entry',
            type: normalizeType(item.type),
            source: rawSource.length > 0 ? rawSource : 'unknown',
            installed: item.installed === true,
            description: rawDescription,
            tags: rawTags,
            verified: item.verified === true,
        });

        return acc;
    }, []);
}