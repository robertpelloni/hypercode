export type NormalizedMcpServerType = 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';

export type ImportableServerConfig = {
    type?: string;
    transportType?: string;
    transport?: string;
    description?: string;
    command?: string;
    args?: string[];
    env?: Record<string, unknown>;
    url?: string;
    bearerToken?: string;
    headers?: Record<string, unknown>;
};

export type BulkImportInput = {
    mcpServers?: Record<string, ImportableServerConfig>;
};

export type BulkImportServerDefinition = {
    name: string;
    description: string | null;
    type: NormalizedMcpServerType;
    command: string | null;
    args: string[];
    env?: Record<string, string>;
    url: string | null;
    bearerToken: string | null;
    headers?: Record<string, string>;
    metadataStrategy: 'auto';
};

export type BulkImportPreview = {
    servers: BulkImportServerDefinition[];
    importedNames: string[];
};

const MCP_SERVER_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function normalizeStringRecord(record?: Record<string, unknown>): Record<string, string> | undefined {
    if (!record || typeof record !== 'object') {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(record)
            .filter(([key, value]) => key.trim().length > 0 && value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]),
    );
}

function stripJsonComments(source: string): string {
    let result = '';
    let inString = false;
    let stringDelimiter = '"';
    let isEscaped = false;

    for (let index = 0; index < source.length; index += 1) {
        const current = source[index];
        const next = source[index + 1];

        if (inString) {
            result += current;

            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (current === '\\') {
                isEscaped = true;
                continue;
            }

            if (current === stringDelimiter) {
                inString = false;
            }

            continue;
        }

        if ((current === '"' || current === "'") && !inString) {
            inString = true;
            stringDelimiter = current;
            result += current;
            continue;
        }

        if (current === '/' && next === '/') {
            while (index < source.length && source[index] !== '\n') {
                index += 1;
            }

            if (index < source.length) {
                result += source[index];
            }

            continue;
        }

        if (current === '/' && next === '*') {
            index += 2;

            while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
                index += 1;
            }

            index += 1;
            continue;
        }

        result += current;
    }

    return result;
}

function stripTrailingCommas(source: string): string {
    return source.replace(/,\s*([}\]])/g, '$1');
}

function isImportableServerMap(value: unknown): value is Record<string, ImportableServerConfig> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isImportableServerConfig(value: unknown): value is ImportableServerConfig {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeImportedServerName(rawName: string, usedNames: Set<string>): string {
    const trimmedName = rawName.trim();

    if (!trimmedName) {
        throw new Error('Imported MCP server names cannot be empty');
    }

    const baseName = trimmedName
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/_+/g, '_')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '');

    if (!baseName || !MCP_SERVER_NAME_PATTERN.test(baseName)) {
        throw new Error(`Imported MCP server name '${rawName}' cannot be normalized into a HyperCode-safe server name`);
    }

    let candidate = baseName;
    let suffix = 2;

    while (usedNames.has(candidate)) {
        candidate = `${baseName}-${suffix}`;
        suffix += 1;
    }

    usedNames.add(candidate);
    return candidate;
}

function extractBulkImportServerMap(parsed: unknown): Record<string, ImportableServerConfig> {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Import must be a JSON object');
    }

    const candidate = parsed as BulkImportInput & Record<string, unknown>;

    if (isImportableServerMap(candidate.mcpServers)) {
        return candidate.mcpServers;
    }

    const topLevelEntries = Object.entries(candidate).filter(([key]) => key.trim().length > 0);
    if (topLevelEntries.length > 0 && topLevelEntries.every(([, value]) => isImportableServerConfig(value))) {
        return Object.fromEntries(topLevelEntries) as Record<string, ImportableServerConfig>;
    }

    throw new Error("Missing 'mcpServers' object or top-level server map");
}

function inferRemoteTransportFromUrl(url: string): Exclude<NormalizedMcpServerType, 'STDIO'> {
    try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname.toLowerCase();
        const transport = parsedUrl.searchParams.get('transport')?.toLowerCase();

        if (pathname.endsWith('/sse') || pathname.includes('/sse/') || transport === 'sse') {
            return 'SSE';
        }
    } catch {
        if (url.toLowerCase().includes('/sse')) {
            return 'SSE';
        }
    }

    return 'STREAMABLE_HTTP';
}

export function normalizeImportedServerType(config: Pick<ImportableServerConfig, 'type' | 'transportType' | 'transport' | 'url'>): NormalizedMcpServerType {
    const rawType = String(config.type ?? config.transportType ?? config.transport ?? '').trim().toLowerCase();

    if (!rawType) {
        return config.url ? inferRemoteTransportFromUrl(config.url) : 'STDIO';
    }

    if (['stdio', 'std', 'process', 'local'].includes(rawType)) {
        return 'STDIO';
    }

    if (rawType === 'sse') {
        return 'SSE';
    }

    if (['http', 'https', 'streamable-http', 'streamable_http', 'streamablehttp'].includes(rawType)) {
        return 'STREAMABLE_HTTP';
    }

    return config.url ? inferRemoteTransportFromUrl(config.url) : 'STDIO';
}

export function buildBulkImportServers(jsonConfig: string): BulkImportPreview {
    const sanitized = stripTrailingCommas(stripJsonComments(jsonConfig)).trim();

    if (!sanitized) {
        throw new Error('Paste an MCP config to preview and import');
    }

    let parsed: BulkImportInput | Record<string, ImportableServerConfig>;

    try {
        parsed = JSON.parse(sanitized) as BulkImportInput | Record<string, ImportableServerConfig>;
    } catch (error) {
        try {
            parsed = JSON.parse(`{${sanitized}}`) as BulkImportInput | Record<string, ImportableServerConfig>;
        } catch {
            throw error;
        }
    }

    const serverMap = extractBulkImportServerMap(parsed);
    const usedNames = new Set<string>();

    const servers = Object.entries(serverMap)
        .filter(([name, config]) => name.trim().length > 0 && typeof config === 'object' && config !== null)
        .map(([name, config]) => ({
            name: normalizeImportedServerName(name, usedNames),
            description: config.description ?? null,
            type: normalizeImportedServerType(config),
            command: config.command ?? null,
            args: Array.isArray(config.args) ? config.args.filter((arg): arg is string => typeof arg === 'string') : [],
            env: normalizeStringRecord(config.env),
            url: config.url ?? null,
            bearerToken: config.bearerToken ?? null,
            headers: normalizeStringRecord(config.headers),
            metadataStrategy: 'auto' as const,
        }));

    if (servers.length === 0) {
        throw new Error('No MCP servers found in the pasted config');
    }

    return {
        servers,
        importedNames: servers.map((server) => server.name),
    };
}
