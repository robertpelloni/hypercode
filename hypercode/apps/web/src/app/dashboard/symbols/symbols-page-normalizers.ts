export type SymbolType = 'function' | 'class' | 'interface' | 'variable' | 'unknown';

export interface NormalizedSymbol {
    id: string;
    name: string;
    file: string;
    type: SymbolType;
    priority: number;
    lineStart?: number;
    notes?: string;
}

const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
);

const asTrimmedString = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
};

const asOptionalTrimmedString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const asPositiveInt = (value: unknown, fallback: number): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : fallback;
};

const normalizeSymbolType = (value: unknown): SymbolType => {
    switch (value) {
        case 'function':
        case 'class':
        case 'interface':
        case 'variable':
            return value;
        default:
            return 'unknown';
    }
};

export const normalizeSymbols = (payload: unknown): NormalizedSymbol[] => {
    if (!Array.isArray(payload)) return [];

    return payload.map((row, index) => {
        const symbol = asRecord(row);
        return {
            id: asTrimmedString(symbol.id, `unknown:${index + 1}`),
            name: asTrimmedString(symbol.name, 'UnnamedSymbol'),
            file: asTrimmedString(symbol.file, 'unknown-file'),
            type: normalizeSymbolType(symbol.type),
            priority: Math.min(3, asPositiveInt(symbol.priority, 1)),
            lineStart: typeof symbol.lineStart === 'number' && Number.isFinite(symbol.lineStart) && symbol.lineStart > 0
                ? Math.floor(symbol.lineStart)
                : undefined,
            notes: asOptionalTrimmedString(symbol.notes),
        };
    });
};

export const filterSymbols = (symbols: NormalizedSymbol[], query: string): NormalizedSymbol[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return symbols;

    return symbols.filter((symbol) =>
        symbol.name.toLowerCase().includes(trimmed)
        || symbol.file.toLowerCase().includes(trimmed),
    );
};
