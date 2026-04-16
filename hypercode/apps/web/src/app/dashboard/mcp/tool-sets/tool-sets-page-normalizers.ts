export interface ToolSetRow {
    uuid: string;
    name: string;
    description: string;
    tools: string[];
}

export interface SelectableTool {
    uuid: string;
    name: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function normalizeToolSets(payload: unknown): ToolSetRow[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<ToolSetRow[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawUuid = typeof item.uuid === 'string' ? item.uuid.trim() : '';
        const rawName = typeof item.name === 'string' ? item.name.trim() : '';
        const rawDescription = typeof item.description === 'string' ? item.description.trim() : '';
        const rawTools = Array.isArray(item.tools)
            ? item.tools.filter((tool): tool is string => typeof tool === 'string' && tool.trim().length > 0).map((tool) => tool.trim())
            : [];

        acc.push({
            uuid: rawUuid.length > 0 ? rawUuid : `tool-set-${index}`,
            name: rawName.length > 0 ? rawName : 'Unnamed tool set',
            description: rawDescription,
            tools: rawTools,
        });

        return acc;
    }, []);
}

export function normalizeSelectableTools(payload: unknown): SelectableTool[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.reduce<SelectableTool[]>((acc, item, index) => {
        if (!isObject(item)) {
            return acc;
        }

        const rawUuid = typeof item.uuid === 'string' ? item.uuid.trim() : '';
        const rawName = typeof item.name === 'string' ? item.name.trim() : '';

        acc.push({
            uuid: rawUuid.length > 0 ? rawUuid : `tool-${index}`,
            name: rawName.length > 0 ? rawName : 'Unknown tool',
        });

        return acc;
    }, []);
}