import fs from 'node:fs/promises';
import path from 'node:path';

import type { SavedScriptConfig, SavedToolSetConfig } from '../interfaces/IConfigProvider.js';

export type BorgMcpToolMetadata = {
    name: string;
    description?: string | null;
    inputSchema?: {
        properties?: Record<string, unknown>;
        required?: string[];
    } | null;
};

export type BorgMcpServerDiscoveryMetadata = {
    status: 'ready' | 'failed' | 'unsupported' | 'pending';
    discoveredAt?: string;
    toolCount: number;
    tools: BorgMcpToolMetadata[];
    error?: string;
};

export type BorgMcpServerEntry = {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    disabled?: boolean;
    description?: string | null;
    type?: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
    _meta?: BorgMcpServerDiscoveryMetadata;
};

export type BorgMcpJsonConfig = {
    mcpServers: Record<string, BorgMcpServerEntry>;
    scripts?: SavedScriptConfig[];
    toolSets?: SavedToolSetConfig[];
    settings?: Record<string, any>;
    [key: string]: unknown;
};

const JSONC_HEADER = `// Borg MCP configuration\n// This file is Borg-owned and may include cached server metadata under mcpServers.<name>._meta.\n`;

export function getBorgMcpJsoncPath(workspaceRoot: string = process.cwd()): string {
    return path.join(workspaceRoot, 'mcp.jsonc');
}

export function getCompatibilityMcpJsonPath(workspaceRoot: string = process.cwd()): string {
    return path.join(workspaceRoot, 'mcp.json');
}

export function stripJsonComments(content: string): string {
    return content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match, group) => group ? '' : match);
}

function normalizeConfigShape(config: unknown): BorgMcpJsonConfig {
    if (!config || typeof config !== 'object') {
        return { mcpServers: {} };
    }

    const candidate = config as BorgMcpJsonConfig;
    return {
        ...candidate,
        mcpServers: candidate.mcpServers && typeof candidate.mcpServers === 'object'
            ? candidate.mcpServers
            : {},
        scripts: Array.isArray(candidate.scripts)
            ? candidate.scripts as SavedScriptConfig[]
            : undefined,
        toolSets: Array.isArray(candidate.toolSets)
            ? candidate.toolSets as SavedToolSetConfig[]
            : undefined,
        settings: candidate.settings && typeof candidate.settings === 'object'
            ? candidate.settings
            : undefined,
    };
}

export async function loadBorgMcpConfig(workspaceRoot: string = process.cwd()): Promise<BorgMcpJsonConfig> {
    const jsoncPath = getBorgMcpJsoncPath(workspaceRoot);
    const jsonPath = getCompatibilityMcpJsonPath(workspaceRoot);

    for (const filePath of [jsoncPath, jsonPath]) {
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            return normalizeConfigShape(JSON.parse(stripJsonComments(raw)));
        } catch (error) {
            const errorCode = (error as NodeJS.ErrnoException).code;
            if (errorCode === 'ENOENT') {
                continue;
            }
            throw error;
        }
    }

    return { mcpServers: {} };
}

export function toCompatibilityMcpJson(config: BorgMcpJsonConfig): { mcpServers: Record<string, Record<string, unknown>> } {
    const plainServers: Record<string, Record<string, unknown>> = {};

    for (const [name, server] of Object.entries(config.mcpServers ?? {})) {
        const plainEntry: Record<string, unknown> = {};

        if (server.command) {
            plainEntry.command = server.command;
        }
        if (server.args && server.args.length > 0) {
            plainEntry.args = server.args;
        }
        if (server.env && Object.keys(server.env).length > 0) {
            plainEntry.env = server.env;
        }
        if (server.url) {
            plainEntry.url = server.url;
        }
        if (server.disabled !== undefined) {
            plainEntry.disabled = server.disabled;
        }

        plainServers[name] = plainEntry;
    }

    return { mcpServers: plainServers };
}

export async function writeBorgMcpConfig(config: BorgMcpJsonConfig, workspaceRoot: string = process.cwd()): Promise<void> {
    const normalized = normalizeConfigShape(config);
    const jsoncPath = getBorgMcpJsoncPath(workspaceRoot);
    const jsonPath = getCompatibilityMcpJsonPath(workspaceRoot);

    await fs.mkdir(path.dirname(jsoncPath), { recursive: true });

    const jsoncBody = `${JSONC_HEADER}${JSON.stringify(normalized, null, 2)}\n`;
    const jsonBody = `${JSON.stringify(toCompatibilityMcpJson(normalized), null, 2)}\n`;

    await Promise.all([
        fs.writeFile(jsoncPath, jsoncBody, 'utf-8'),
        fs.writeFile(jsonPath, jsonBody, 'utf-8'),
    ]);
}