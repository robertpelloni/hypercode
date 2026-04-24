export interface PolicyRow {
    uuid: string;
    name: string;
    description: string;
    rules: {
        allow: string[];
        deny: string[];
    };
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
}

export function normalizePolicies(payload: unknown): PolicyRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<PolicyRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawUuid = typeof item.uuid === 'string' ? item.uuid.trim() : '';
        const rawName = typeof item.name === 'string' ? item.name.trim() : '';
        const rawDescription = typeof item.description === 'string' ? item.description.trim() : '';
        const rawRules = isObject(item.rules) ? item.rules : {};

        acc.push({
            uuid: rawUuid.length > 0 ? rawUuid : `policy-${index}`,
            name: rawName.length > 0 ? rawName : 'Unnamed policy',
            description: rawDescription,
            rules: {
                allow: normalizeStringList(rawRules.allow),
                deny: normalizeStringList(rawRules.deny),
            },
        });

        return acc;
    }, []);
}