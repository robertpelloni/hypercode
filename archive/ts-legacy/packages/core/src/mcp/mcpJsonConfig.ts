import fs from 'node:fs/promises';
import path from 'node:path';

import type { SavedScriptConfig, SavedToolSetConfig } from '../interfaces/IConfigProvider.js';

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
export type HyperCodeMcpToolMetadata = {
=======
export type BorgMcpToolMetadata = {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    name: string;
    title?: string | null;
    description?: string | null;
    advertisedName?: string | null;
    serverDisplayName?: string | null;
    serverTags?: string[];
    toolTags?: string[];
    semanticGroup?: string | null;
    semanticGroupLabel?: string | null;
    keywords?: string[];
    alwaysOn?: boolean;
    inputSchema?: Record<string, unknown> | null;
    outputSchema?: Record<string, unknown> | null;
    annotations?: Record<string, unknown> | null;
    raw?: Record<string, unknown> | null;
};

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
export type HyperCodeMcpServerDiscoveryMetadata = {
=======
export type BorgMcpServerDiscoveryMetadata = {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    status: 'ready' | 'failed' | 'unsupported' | 'pending';
    metadataVersion?: number;
    metadataSource?: 'binary' | 'cache' | 'derived';
    discoveredAt?: string;
    lastAttemptedBinaryLoadAt?: string;
    lastSuccessfulBinaryLoadAt?: string;
    cacheHydratedAt?: string;
    configFingerprint?: string;
    transportType?: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
    serverName?: string;
    displayName?: string;
    description?: string | null;
    serverTags?: string[];
    alwaysOn?: boolean;
    command?: string | null;
    args?: string[];
    envKeys?: string[];
    url?: string | null;
    headerKeys?: string[];
    reloadableFromCache?: boolean;
    toolCount: number;
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
    tools: HyperCodeMcpToolMetadata[];
    error?: string;
};

export type HyperCodeMcpServerEntry = {
=======
    tools: BorgMcpToolMetadata[];
    error?: string;
};

export type BorgMcpServerEntry = {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    disabled?: boolean;
    description?: string | null;
    type?: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
    _meta?: HyperCodeMcpServerDiscoveryMetadata;
};

export type HyperCodeMcpJsonConfig = {
    mcpServers: Record<string, HyperCodeMcpServerEntry>;
=======
    _meta?: BorgMcpServerDiscoveryMetadata;
};

export type BorgMcpJsonConfig = {
    mcpServers: Record<string, BorgMcpServerEntry>;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    alwaysVisibleTools?: string[];
    scripts?: SavedScriptConfig[];
    toolSets?: SavedToolSetConfig[];
    settings?: Record<string, any>;
    [key: string]: unknown;
};

import os from 'node:os';

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
const JSONC_HEADER = `// HyperCode MCP configuration\n// This file is HyperCode-owned and may include cached server metadata under mcpServers.<name>._meta.\n`;

export function getHyperCodeConfigDir(): string {
    // If there is an mcp.jsonc in the current working directory, use it
    // This allows project-level config to be the source of truth if intended.
    if (process.env.HYPERCODE_CONFIG_DIR) {
        return process.env.HYPERCODE_CONFIG_DIR;
=======
const JSONC_HEADER = `// borg MCP configuration\n// This file is borg-owned and may include cached server metadata under mcpServers.<name>._meta.\n`;

export function getBorgConfigDir(): string {
    // If there is an mcp.jsonc in the current working directory, use it
    // This allows project-level config to be the source of truth if intended.
    if (process.env.BORG_CONFIG_DIR) {
        return process.env.BORG_CONFIG_DIR;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    }
    const cwdPath = process.cwd();
    try {
        const cwdStat = require('node:fs').statSync(path.join(cwdPath, 'mcp.jsonc'));
        if (cwdStat.isFile()) {
            return cwdPath;
        }
    } catch {
        // Fall back
    }
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
    return path.join(os.homedir(), '.hypercode');
}

export function getHyperCodeMcpJsoncPath(configDir: string = getHyperCodeConfigDir()): string {
    return path.join(configDir, 'mcp.jsonc');
}

export function getHyperCodeMcpJsonPath(configDir: string = getHyperCodeConfigDir()): string {
    return path.join(configDir, 'mcp.json');
}

export function getHyperCodeToolCachePath(configDir: string = getHyperCodeConfigDir()): string {
=======
    return path.join(os.homedir(), '.borg');
}

export function getBorgMcpJsoncPath(configDir: string = getBorgConfigDir()): string {
    return path.join(configDir, 'mcp.jsonc');
}

export function getBorgMcpJsonPath(configDir: string = getBorgConfigDir()): string {
    return path.join(configDir, 'mcp.json');
}

export function getBorgToolCachePath(configDir: string = getBorgConfigDir()): string {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    return path.join(configDir, 'mcp-cache.json');
}

export function stripJsonComments(content: string): string {
    let result = '';
    let inString = false;
    let stringDelimiter = '"';
    let isEscaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let index = 0; index < content.length; index += 1) {
        const current = content[index];
        const next = content[index + 1];

        if (inLineComment) {
            if (current === '\n' || current === '\r') {
                inLineComment = false;
                result += current;
            }
            continue;
        }

        if (inBlockComment) {
            if (current === '*' && next === '/') {
                inBlockComment = false;
                index += 1;
                continue;
            }

            if (current === '\n' || current === '\r') {
                result += current;
            }
            continue;
        }

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

        if (current === '"' || current === "'") {
            inString = true;
            stringDelimiter = current;
            result += current;
            continue;
        }

        if (current === '/' && next === '/') {
            inLineComment = true;
            index += 1;
            continue;
        }

        if (current === '/' && next === '*') {
            inBlockComment = true;
            index += 1;
            continue;
        }

        result += current;
    }

    return result;
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
function normalizeConfigShape(config: unknown): HyperCodeMcpJsonConfig {
=======
function normalizeConfigShape(config: unknown): BorgMcpJsonConfig {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    if (!config || typeof config !== 'object') {
        return { mcpServers: {} };
    }

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
    const candidate = config as HyperCodeMcpJsonConfig;
=======
    const candidate = config as BorgMcpJsonConfig;
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    return {
        ...candidate,
        mcpServers: candidate.mcpServers && typeof candidate.mcpServers === 'object'
            ? candidate.mcpServers
            : {},
        alwaysVisibleTools: Array.isArray(candidate.alwaysVisibleTools)
            ? candidate.alwaysVisibleTools.filter((toolName): toolName is string => typeof toolName === 'string')
            : undefined,
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

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
function toCompatibilityConfig(config: HyperCodeMcpJsonConfig): Record<string, unknown> {
=======
function toCompatibilityConfig(config: BorgMcpJsonConfig): Record<string, unknown> {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    const compatibilityServers = Object.fromEntries(
        Object.entries(config.mcpServers || {}).map(([name, server]) => {
            const { _meta: _ignoredMeta, ...serverWithoutMeta } = server;
            return [name, serverWithoutMeta];
        }),
    );

    const compatibilityConfig: Record<string, unknown> = {
        ...config,
        mcpServers: compatibilityServers,
    };

    delete compatibilityConfig.settings;

    return compatibilityConfig;
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
export async function loadHyperCodeMcpConfig(configDir?: string): Promise<HyperCodeMcpJsonConfig> {
    const jsoncPath = getHyperCodeMcpJsoncPath(configDir);
=======
export async function loadBorgMcpConfig(configDir?: string): Promise<BorgMcpJsonConfig> {
    const jsoncPath = getBorgMcpJsoncPath(configDir);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts

    try {
        const raw = await fs.readFile(jsoncPath, 'utf-8');
        return normalizeConfigShape(JSON.parse(stripJsonComments(raw)));
    } catch (error) {
        const errorCode = (error as NodeJS.ErrnoException).code;
        if (errorCode !== 'ENOENT') {
            throw error;
        }
    }

    return { mcpServers: {} };
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
export async function writeHyperCodeMcpConfig(config: HyperCodeMcpJsonConfig, configDir?: string): Promise<void> {
    const normalized = normalizeConfigShape(config);
    const jsoncPath = getHyperCodeMcpJsoncPath(configDir);
    const jsonPath = getHyperCodeMcpJsonPath(configDir);
=======
export async function writeBorgMcpConfig(config: BorgMcpJsonConfig, configDir?: string): Promise<void> {
    const normalized = normalizeConfigShape(config);
    const jsoncPath = getBorgMcpJsoncPath(configDir);
    const jsonPath = getBorgMcpJsonPath(configDir);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts

    await fs.mkdir(path.dirname(jsoncPath), { recursive: true });

    const jsoncBody = `${JSONC_HEADER}${JSON.stringify(normalized, null, 2)}\n`;
    const jsonBody = `${JSON.stringify(toCompatibilityConfig(normalized), null, 2)}\n`;
    await fs.writeFile(jsoncPath, jsoncBody, 'utf-8');
    await fs.writeFile(jsonPath, jsonBody, 'utf-8');
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
export async function writeToolCache(config: HyperCodeMcpJsonConfig, configDir?: string): Promise<void> {
    const cachePath = getHyperCodeToolCachePath(configDir);
=======
export async function writeToolCache(config: BorgMcpJsonConfig, configDir?: string): Promise<void> {
    const cachePath = getBorgToolCachePath(configDir);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(config, null, 2), 'utf-8');
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcp/mcpJsonConfig.ts
export async function loadToolCache(configDir?: string): Promise<HyperCodeMcpJsonConfig | null> {
    try {
        const raw = await fs.readFile(getHyperCodeToolCachePath(configDir), 'utf-8');
=======
export async function loadToolCache(configDir?: string): Promise<BorgMcpJsonConfig | null> {
    try {
        const raw = await fs.readFile(getBorgToolCachePath(configDir), 'utf-8');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcp/mcpJsonConfig.ts
        return normalizeConfigShape(JSON.parse(raw));
    } catch {
        return null;
    }
}

