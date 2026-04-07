import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readLocalStartupProvenance } from '../../../../lib/hypercode-runtime';
import { normalizeImportedServerType } from '../../../../lib/mcp-import';
import { resolveUpstreamBases } from '../../../../lib/trpc-upstream';

export const runtime = 'nodejs';

function resolveRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'mcp.jsonc')) || existsSync(path.join(candidate, 'mcp.json'))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'pnpm-workspace.yaml'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), '..', '..');
}

const LEGACY_REPO_ROOT = resolveRepoRoot();
const LEGACY_MCP_JSONC_PATH = path.join(LEGACY_REPO_ROOT, 'mcp.jsonc');
const LEGACY_MCP_JSON_PATH = path.join(LEGACY_REPO_ROOT, 'mcp.json');
const JSONC_HEADER = `// HyperCode MCP configuration\n// This file is HyperCode-owned and may include cached server metadata under mcpServers.<name>._meta.\n`;

function resolveHypercodeConfigDir(): string {
  const configuredDir = process.env.HYPERCODE_CONFIG_DIR?.trim();
  if (configuredDir) {
    return configuredDir;
  }

  return path.join(os.homedir(), '.hypercode');
}

function resolvePrimaryMcpPaths(): { jsoncPath: string; jsonPath: string } {
  const configDir = resolveHypercodeConfigDir();
  return {
    jsoncPath: path.join(configDir, 'mcp.jsonc'),
    jsonPath: path.join(configDir, 'mcp.json'),
  };
}

function resolveMcpReadCandidates(): Array<{ filePath: string; allowComments: boolean }> {
  const primaryPaths = resolvePrimaryMcpPaths();
  return [
    { filePath: primaryPaths.jsoncPath, allowComments: true },
    { filePath: primaryPaths.jsonPath, allowComments: false },
    { filePath: LEGACY_MCP_JSONC_PATH, allowComments: true },
    { filePath: LEGACY_MCP_JSON_PATH, allowComments: false },
  ];
}

type LocalMcpServerEntry = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  disabled?: boolean;
  description?: string | null;
  type?: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
  bearerToken?: string;
  headers?: Record<string, string>;
  _meta?: {
    uuid?: string;
    status?: string;
    metadataSource?: string;
    toolCount?: number;
    lastSuccessfulBinaryLoadAt?: string | null;
    crashCount?: number;
    maxAttempts?: number;
  } | null;
};

type LocalMcpConfig = {
  mcpServers: Record<string, LocalMcpServerEntry>;
};

type LocalManagedServerRecord = {
  uuid: string;
  name: string;
  description: string | null;
  type: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
  command: string | null;
  args: string[];
  env: Record<string, string>;
  url: string | null;
  bearerToken: string | null;
  headers: Record<string, string>;
  _meta: {
    uuid: string;
    status: string;
    metadataSource: string;
    toolCount: number;
    lastSuccessfulBinaryLoadAt: string | null;
    crashCount: number;
    maxAttempts: number;
  };
};

const LOCAL_COMPAT_METADATA_SOURCE = 'local-config-fallback';

const LEGACY_COMPAT_RESPONSE_KEYS = {
  'mcpServers.list': 'mcpServers.list',
  'mcp.listServers': 'mcpServers.list',
  'tools.list': 'tools.list',
  'mcp.listTools': 'tools.list',
  'mcp.getStatus': 'mcp.getStatus',
  'mcp.traffic': 'mcp.traffic',
  'session.list': 'session.list',
  'billing.getProviderQuotas': 'billing.getProviderQuotas',
  'billing.getFallbackChain': 'billing.getFallbackChain',
} as const;

type LegacyCompatProcedure = keyof typeof LEGACY_COMPAT_RESPONSE_KEYS;
type LegacyCompatResponseKey = typeof LEGACY_COMPAT_RESPONSE_KEYS[LegacyCompatProcedure];

const LOCAL_COMPAT_RESPONSE_KEYS = {
  ...LEGACY_COMPAT_RESPONSE_KEYS,
  startupStatus: 'startupStatus',
  'mcp.getWorkingSet': 'mcp.getWorkingSet',
  'mcp.getToolSelectionTelemetry': 'mcp.getToolSelectionTelemetry',
  'mcp.searchTools': 'mcp.searchTools',
  'mcp.getToolPreferences': 'mcp.getToolPreferences',
  'mcp.getJsoncEditor': 'mcp.getJsoncEditor',
  'mcpServers.get': 'mcpServers.get',
  'mcpServers.syncTargets': 'mcpServers.syncTargets',
  'mcpServers.exportClientConfig': 'mcpServers.exportClientConfig',
  'apiKeys.list': 'apiKeys.list',
  'secrets.list': 'secrets.list',
  'policies.list': 'policies.list',
  'savedScripts.list': 'savedScripts.list',
  'config.list': 'config.list',
  'tools.detectCliHarnesses': 'tools.detectCliHarnesses',
  'tools.detectExecutionEnvironment': 'tools.detectExecutionEnvironment',
  'tools.detectInstallSurfaces': 'tools.detectInstallSurfaces',
  'expert.getStatus': 'expert.getStatus',
  'session.catalog': 'session.catalog',
  'session.importedMaintenanceStats': 'session.importedMaintenanceStats',
  'session.getState': 'session.getState',
  'session.get': 'session.get',
  'session.logs': 'session.logs',
  'session.attachInfo': 'session.attachInfo',
  'session.health': 'session.health',
  'toolSets.list': 'toolSets.list',
  'agentMemory.search': 'agentMemory.search',
  'agentMemory.add': 'agentMemory.add',
  'agentMemory.getRecent': 'agentMemory.getRecent',
  'agentMemory.getByType': 'agentMemory.getByType',
  'agentMemory.getByNamespace': 'agentMemory.getByNamespace',
  'agentMemory.delete': 'agentMemory.delete',
  'agentMemory.clearSession': 'agentMemory.clearSession',
  'agentMemory.export': 'agentMemory.export',
  'agentMemory.handoff': 'agentMemory.handoff',
  'agentMemory.pickup': 'agentMemory.pickup',
  'agentMemory.stats': 'agentMemory.stats',
  'memory.getAgentStats': 'memory.getAgentStats',
  'memory.getRecentObservations': 'memory.getRecentObservations',
  'memory.searchObservations': 'memory.searchObservations',
  'memory.getRecentUserPrompts': 'memory.getRecentUserPrompts',
  'memory.searchUserPrompts': 'memory.searchUserPrompts',
  'memory.getRecentSessionSummaries': 'memory.getRecentSessionSummaries',
  'memory.searchSessionSummaries': 'memory.searchSessionSummaries',
  'memory.searchAgentMemory': 'memory.searchAgentMemory',
  'memory.searchMemoryPivot': 'memory.searchMemoryPivot',
  'memory.getMemoryTimelineWindow': 'memory.getMemoryTimelineWindow',
  'memory.getCrossSessionMemoryLinks': 'memory.getCrossSessionMemoryLinks',
  'memory.listInterchangeFormats': 'memory.listInterchangeFormats',
  'memory.exportMemories': 'memory.exportMemories',
  'shell.getSystemHistory': 'shell.getSystemHistory',
  'serverHealth.check': 'serverHealth.check',
  'project.getContext': 'project.getContext',
  'project.getHandoffs': 'project.getHandoffs',
  'skills.list': 'skills.list',
  'skills.read': 'skills.read',
  'submodule.list': 'submodule.list',
  'submodule.detectCapabilities': 'submodule.detectCapabilities',
  'git.getModules': 'git.getModules',
  'git.getLog': 'git.getLog',
  'git.getStatus': 'git.getStatus',
  'catalog.list': 'catalog.list',
  'catalog.get': 'catalog.get',
  'catalog.listRuns': 'catalog.listRuns',
  'catalog.stats': 'catalog.stats',
  'catalog.listLinkedServers': 'catalog.listLinkedServers',
  'browser.status': 'browser.status',
  'browser.searchHistory': 'browser.searchHistory',
  'browser.scrapePage': 'browser.scrapePage',
  'browser.proxyFetch': 'browser.proxyFetch',
  'browser.screenshot': 'browser.screenshot',
  'browser.debug': 'browser.debug',
  'browser.closePage': 'browser.closePage',
  'browser.closeAll': 'browser.closeAll',
  'council.base.status': 'council.base.status',
  'council.members': 'council.members',
  'council.updateMembers': 'council.updateMembers',
  'council.sessions.list': 'council.sessions.list',
  'council.sessions.stats': 'council.sessions.stats',
  'council.history.list': 'council.history.list',
  'council.quota.allStats': 'council.quota.allStats',
  'council.smartPilot.status': 'council.smartPilot.status',
  'council.visual.systemDiagram': 'council.visual.systemDiagram',
  'director.chat': 'director.chat',
  'directorConfig.get': 'directorConfig.get',
  'directorConfig.update': 'directorConfig.update',
  'suggestions.list': 'suggestions.list',
  'suggestions.resolve': 'suggestions.resolve',
  'suggestions.clearAll': 'suggestions.clearAll',
  'squad.list': 'squad.list',
  'squad.spawn': 'squad.spawn',
  'squad.kill': 'squad.kill',
  'expert.research': 'expert.research',
  'expert.code': 'expert.code',
  'marketplace.list': 'marketplace.list',
  'marketplace.get': 'marketplace.get',
  'marketplace.install': 'marketplace.install',
  'marketplace.publish': 'marketplace.publish',
  'swarm.startSwarm': 'swarm.startSwarm',
  'swarm.resumeMission': 'swarm.resumeMission',
  'swarm.listMissions': 'swarm.listMissions',
  'swarm.getMission': 'swarm.getMission',
  'swarm.stopMission': 'swarm.stopMission',
  'swarm.deleteMission': 'swarm.deleteMission',
  'swarm.getLogs': 'swarm.getLogs',
  'swarm.getAnalytics': 'swarm.getAnalytics',
  'swarm.decomposeTask': 'swarm.decomposeTask',
  'swarm.approveTask': 'swarm.approveTask',
  'swarm.updateTaskPriority': 'swarm.updateTaskPriority',
  'swarm.seekConsensus': 'swarm.consensus',
  'swarm.executeDebate': 'swarm.debate',
  'swarm.sendDirectMessage': 'swarm.sendDirectMessage',
  'infrastructure.runDoctor': 'infrastructure.runDoctor',
  'infrastructure.applyConfigurations': 'infrastructure.applyConfigurations',
  'linksBacklog.stats': 'linksBacklog.stats',
  'linksBacklog.list': 'linksBacklog.list',
  'linksBacklog.syncFromBobbyBookmarks': 'linksBacklog.syncFromBobbyBookmarks',
  'unifiedDirectory.stats': 'unifiedDirectory.stats',
  'unifiedDirectory.list': 'unifiedDirectory.list',
  'workspace.list': 'workspace.list',
} as const;

type LocalCompatProcedure = keyof typeof LOCAL_COMPAT_RESPONSE_KEYS;
type LocalCompatResponseKey = typeof LOCAL_COMPAT_RESPONSE_KEYS[LocalCompatProcedure];

const LEGACY_COMPAT_RESPONSES: Record<LegacyCompatResponseKey, unknown> = {
  'mcpServers.list': [],
  'tools.list': [],
  'mcp.getStatus': {
    initialized: false,
    serverCount: 0,
    toolCount: 0,
    connectedCount: 0,
  },
  'mcp.traffic': [],
  'session.list': [],
  'billing.getProviderQuotas': [],
  'billing.getFallbackChain': { chain: [] },
};

const LEGACY_MCP_PROCEDURES = new Set(Object.keys(LEGACY_COMPAT_RESPONSE_KEYS));
const LOCAL_COMPAT_PROCEDURES = new Set(Object.keys(LOCAL_COMPAT_RESPONSE_KEYS));
const LOCAL_OPERATOR_MUTATION_PROCEDURES = new Set([
  'apiKeys.create',
  'apiKeys.delete',
  'secrets.set',
  'secrets.delete',
  'policies.create',
  'policies.update',
  'policies.delete',
  'toolSets.create',
  'toolSets.delete',
  'savedScripts.create',
  'savedScripts.update',
  'savedScripts.delete',
  'savedScripts.execute',
]);
const LOCAL_CONFIG_MUTATION_PROCEDURES = new Set([
  'config.update',
]);
const LOCAL_TOOL_MUTATION_PROCEDURES = new Set([
  'tools.setAlwaysOn',
]);
const LOCAL_MEMORY_MUTATION_PROCEDURES = new Set([
  'memory.addFact',
  'memory.importMemories',
  'memory.convertMemories',
]);
const LOCAL_AGENT_MEMORY_MUTATION_PROCEDURES = new Set([
  'agentMemory.add',
  'agentMemory.delete',
  'agentMemory.clearSession',
  'agentMemory.handoff',
  'agentMemory.pickup',
]);
const LOCAL_MCP_CONFIG_MUTATION_PROCEDURES = new Set([
  'mcpServers.create',
  'mcpServers.update',
  'mcpServers.delete',
  'mcpServers.reloadMetadata',
  'mcpServers.clearMetadataCache',
  'mcpServers.syncClientConfig',
  'serverHealth.reset',
]);
const LOCAL_MCP_RUNTIME_MUTATION_PROCEDURES = new Set([
  'mcp.setToolPreferences',
  'mcp.loadTool',
  'mcp.unloadTool',
  'mcp.clearToolSelectionTelemetry',
  'mcp.clearWorkingSetEvictionHistory',
  'mcp.setLifecycleModes',
]);
const LOCAL_SESSION_MUTATION_PROCEDURES = new Set([
  'session.create',
  'session.start',
  'session.stop',
  'session.restart',
  'session.executeShell',
  'session.updateState',
  'session.clear',
]);
const LOCAL_PROJECT_MUTATION_PROCEDURES = new Set([
  'project.updateContext',
]);
const LOCAL_SKILL_MUTATION_PROCEDURES = new Set([
  'skills.assimilate',
]);
const LOCAL_SUGGESTIONS_MUTATION_PROCEDURES = new Set([
  'suggestions.resolve',
  'suggestions.clearAll',
]);
const LOCAL_SQUAD_MUTATION_PROCEDURES = new Set([
  'squad.spawn',
  'squad.kill',
]);
const LOCAL_EXPERT_MUTATION_PROCEDURES = new Set([
  'expert.research',
  'expert.code',
]);
const LOCAL_MARKETPLACE_MUTATION_PROCEDURES = new Set([
  'marketplace.install',
  'marketplace.publish',
]);
const LOCAL_SWARM_MUTATION_PROCEDURES = new Set([
  'swarm.startSwarm',
  'swarm.resumeMission',
  'swarm.stopMission',
  'swarm.deleteMission',
  'swarm.decomposeTask',
  'swarm.approveTask',
  'swarm.updateTaskPriority',
  'swarm.seekConsensus',
  'swarm.executeDebate',
  'swarm.sendDirectMessage',
]);
const LOCAL_INFRASTRUCTURE_MUTATION_PROCEDURES = new Set([
  'infrastructure.runDoctor',
  'infrastructure.applyConfigurations',
]);
const LOCAL_LINKS_BACKLOG_MUTATION_PROCEDURES = new Set([
  'linksBacklog.syncFromBobbyBookmarks',
]);
const LOCAL_SUBMODULE_MUTATION_PROCEDURES = new Set([
  'submodule.updateAll',
  'submodule.installDependencies',
  'submodule.build',
  'submodule.enable',
  'git.revert',
]);
const LOCAL_CATALOG_MUTATION_PROCEDURES = new Set([
  'catalog.triggerIngestion',
  'catalog.triggerValidation',
  'catalog.installFromRecipe',
  'catalog.triggerBatchValidation',
]);
const LOCAL_COMPAT_MUTATION_PROCEDURES = new Set([
  ...LOCAL_OPERATOR_MUTATION_PROCEDURES,
  ...LOCAL_CONFIG_MUTATION_PROCEDURES,
  ...LOCAL_TOOL_MUTATION_PROCEDURES,
  ...LOCAL_MEMORY_MUTATION_PROCEDURES,
  ...LOCAL_AGENT_MEMORY_MUTATION_PROCEDURES,
  ...LOCAL_MCP_CONFIG_MUTATION_PROCEDURES,
  ...LOCAL_MCP_RUNTIME_MUTATION_PROCEDURES,
  ...LOCAL_SESSION_MUTATION_PROCEDURES,
  ...LOCAL_PROJECT_MUTATION_PROCEDURES,
  ...LOCAL_SKILL_MUTATION_PROCEDURES,
  ...LOCAL_SUGGESTIONS_MUTATION_PROCEDURES,
  ...LOCAL_SQUAD_MUTATION_PROCEDURES,
  ...LOCAL_EXPERT_MUTATION_PROCEDURES,
  ...LOCAL_MARKETPLACE_MUTATION_PROCEDURES,
  ...LOCAL_SWARM_MUTATION_PROCEDURES,
  ...LOCAL_INFRASTRUCTURE_MUTATION_PROCEDURES,
  ...LOCAL_LINKS_BACKLOG_MUTATION_PROCEDURES,
  ...LOCAL_SUBMODULE_MUTATION_PROCEDURES,
  ...LOCAL_CATALOG_MUTATION_PROCEDURES,
]);

const LEGACY_MCP_SERVERS_LIST_PROCEDURES = [
  'mcpServers.list',
  'frontend.mcpServers.list',
  'frontend.frontend.mcpServers.list',
] as const;

const LEGACY_MCP_BULK_IMPORT_PROCEDURES = [
  'mcpServers.bulkImport',
  'frontend.mcpServers.bulkImport',
  'frontend.frontend.mcpServers.bulkImport',
] as const;

function getLegacyCompatResponseKey(procedureName: string): LegacyCompatResponseKey | null {
  return LEGACY_COMPAT_RESPONSE_KEYS[procedureName as LegacyCompatProcedure] ?? null;
}

function getLocalCompatResponseKey(procedureName: string): LocalCompatResponseKey | null {
  return LOCAL_COMPAT_RESPONSE_KEYS[procedureName as LocalCompatProcedure] ?? null;
}

function buildUpstreamUrl(req: Request, upstreamBase: string): URL {
  const incomingUrl = new URL(req.url);
  const normalizedBase = upstreamBase.replace(/\/$/, '');
  const pathMatch = incomingUrl.pathname.match(/\/api\/trpc\/?(.*)$/);
  const procedurePath = pathMatch?.[1] ? `/${pathMatch[1]}` : '';
  const upstreamUrl = new URL(`${normalizedBase}${procedurePath}`);
  upstreamUrl.search = incomingUrl.search;

  if (isBulkImportRequest(req)) {
    upstreamUrl.searchParams.delete('batch');
  }

  return upstreamUrl;
}

function getProcedureNames(req: Request): string[] {
  const incomingUrl = new URL(req.url);
  const pathMatch = incomingUrl.pathname.match(/\/api\/trpc\/?(.*)$/);
  const procedureSegment = pathMatch?.[1] ?? '';

  if (!procedureSegment) {
    return [];
  }

  return procedureSegment
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function isLegacyMcpRequest(req: Request): boolean {
  const procedures = getProcedureNames(req);
  return procedures.length > 0 && procedures.every((name) => LEGACY_MCP_PROCEDURES.has(name));
}

function canFallbackLocally(req: Request): boolean {
  const procedures = getProcedureNames(req);
  return procedures.length > 0 && procedures.every((name) =>
    LOCAL_COMPAT_PROCEDURES.has(name) || LOCAL_COMPAT_MUTATION_PROCEDURES.has(name) || name === 'mcpServers.bulkImport',
  );
}

function buildLocalServerUuid(name: string, persistedUuid?: string | null): string {
  const normalizedPersistedUuid = persistedUuid?.trim();
  if (normalizedPersistedUuid) {
    return normalizedPersistedUuid;
  }

  return `local-${createHash('sha256').update(name.trim().toLowerCase()).digest('hex').slice(0, 24)}`;
}

function sanitizeNumericMetadata(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function buildLocalServerMeta(
  name: string,
  server: LocalMcpServerEntry,
  overrides?: Partial<LocalManagedServerRecord['_meta']>,
): LocalManagedServerRecord['_meta'] {
  const existing = server._meta ?? {};
  const uuid = buildLocalServerUuid(name, overrides?.uuid ?? existing.uuid ?? null);
  const nextStatus = typeof (overrides?.status ?? existing.status) === 'string'
    ? String(overrides?.status ?? existing.status).trim() || (server.disabled ? 'disabled' : 'pending')
    : (server.disabled ? 'disabled' : 'pending');

  return {
    uuid,
    status: nextStatus,
    metadataSource: typeof (overrides?.metadataSource ?? existing.metadataSource) === 'string'
      ? String(overrides?.metadataSource ?? existing.metadataSource).trim() || LOCAL_COMPAT_METADATA_SOURCE
      : LOCAL_COMPAT_METADATA_SOURCE,
    toolCount: sanitizeNumericMetadata(overrides?.toolCount ?? existing.toolCount, 0),
    lastSuccessfulBinaryLoadAt: overrides?.lastSuccessfulBinaryLoadAt ?? existing.lastSuccessfulBinaryLoadAt ?? null,
    crashCount: sanitizeNumericMetadata(overrides?.crashCount ?? existing.crashCount, 0),
    maxAttempts: sanitizeNumericMetadata(overrides?.maxAttempts ?? existing.maxAttempts, 0),
  };
}

function buildLocalManagedServerRecord(name: string, server: LocalMcpServerEntry): LocalManagedServerRecord {
  const type = server.type ?? normalizeImportedServerType({
    type: undefined,
    url: typeof server.url === 'string' ? server.url : undefined,
  });
  const meta = buildLocalServerMeta(name, server);

  return {
    uuid: meta.uuid,
    name,
    description: server.description ?? null,
    type,
    command: server.command ?? null,
    args: Array.isArray(server.args) ? server.args.filter((arg): arg is string => typeof arg === 'string') : [],
    env: server.env ?? {},
    url: server.url ?? null,
    bearerToken: server.bearerToken ?? null,
    headers: server.headers ?? {},
    _meta: meta,
  };
}

function findLocalServerByUuid(config: LocalMcpConfig, uuid: string): { name: string; server: LocalMcpServerEntry } | null {
  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (buildLocalServerUuid(name, server._meta?.uuid ?? null) === uuid) {
      return { name, server }; 
    }
  }

  return null;
}

function upsertLocalServerMeta(
  config: LocalMcpConfig,
  name: string,
  overrides?: Partial<LocalManagedServerRecord['_meta']>,
): LocalManagedServerRecord['_meta'] {
  const server = config.mcpServers[name];
  const meta = buildLocalServerMeta(name, server, overrides);
  server._meta = meta;
  return meta;
}

function extractTrpcData(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const maybeResult = (payload as { result?: { data?: unknown } }).result;
  const data = maybeResult?.data;
  if (!data || typeof data !== 'object') {
    return data;
  }

  const maybeJson = (data as { json?: unknown }).json;
  return maybeJson ?? data;
}

function normalizeServerList(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    const maybeEnvelope = data as { success?: boolean; data?: unknown[] };
    if (Array.isArray(maybeEnvelope.data) && maybeEnvelope.success !== false) {
      return maybeEnvelope.data;
    }
  }

  return [];
}

function buildStatusFromServers(servers: unknown[]): {
  initialized: boolean;
  serverCount: number;
  toolCount: number;
  connectedCount: number;
} {
  const connectedCount = servers.filter((server) => {
    if (!server || typeof server !== 'object') {
      return false;
    }

    const row = server as { error_status?: unknown; status?: unknown };
    if (typeof row.status === 'string' && row.status.toLowerCase() === 'connected') {
      return true;
    }

    return row.error_status === 'NONE';
  }).length;

  return {
    initialized: true,
    serverCount: servers.length,
    toolCount: 0,
    connectedCount,
  };
}

function stripJsonComments(content: string): string {
  let result = '';
  let inString = false;
  let stringDelimiter = '"';
  let isEscaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const current = content[index];
    const next = content[index + 1];

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
      while (index < content.length && content[index] !== '\n') {
        index += 1;
      }

      if (index < content.length) {
        result += content[index];
      }

      continue;
    }

    if (current === '/' && next === '*') {
      index += 2;

      while (index < content.length && !(content[index] === '*' && content[index + 1] === '/')) {
        index += 1;
      }

      index += 1;
      continue;
    }

    result += current;
  }

  return result;
}

function stripTrailingCommas(content: string): string {
  return content.replace(/,\s*([}\]])/g, '$1');
}

function parseLocalMcpConfig(raw: string, allowComments: boolean): LocalMcpConfig {
  const source = allowComments ? stripTrailingCommas(stripJsonComments(raw)) : raw;
  const parsed = JSON.parse(source) as LocalMcpConfig;

  return {
    mcpServers: parsed?.mcpServers && typeof parsed.mcpServers === 'object' ? parsed.mcpServers : {},
  };
}

async function loadLocalMcpConfig(): Promise<LocalMcpConfig> {
  let lastParseError: unknown;

  for (const { filePath, allowComments } of resolveMcpReadCandidates()) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return parseLocalMcpConfig(raw, allowComments);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        continue;
      }

      if (error instanceof SyntaxError) {
        lastParseError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastParseError) {
    console.warn('[trpc route] Falling back to empty/local MCP config after parse failure:', lastParseError);
  }

  return { mcpServers: {} };
}

async function writeLocalMcpConfig(config: LocalMcpConfig): Promise<void> {
  const { jsoncPath, jsonPath } = resolvePrimaryMcpPaths();
  await fs.mkdir(path.dirname(jsoncPath), { recursive: true });

  await Promise.all([
    fs.writeFile(jsoncPath, `${JSONC_HEADER}${JSON.stringify(config, null, 2)}\n`, 'utf-8'),
    fs.writeFile(jsonPath, `${JSON.stringify({ mcpServers: config.mcpServers }, null, 2)}\n`, 'utf-8'),
  ]);
}

async function readLocalMcpSource(): Promise<{ path: string; content: string }> {
  const primaryPaths = resolvePrimaryMcpPaths();

  for (const { filePath } of resolveMcpReadCandidates()) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { path: filePath, content };
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  return {
    path: primaryPaths.jsoncPath,
    content: `${JSONC_HEADER}${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
  };
}

function mapConfigToServerList(config: LocalMcpConfig): unknown[] {
  return Object.entries(config.mcpServers).map(([name, server]) => {
    const managedServer = buildLocalManagedServerRecord(name, server);

    return {
      uuid: managedServer.uuid,
      name,
      status: server.disabled ? 'disabled' : 'configured',
      toolCount: managedServer._meta.toolCount,
      config: {
        command: server.command ?? server.url ?? 'configured',
        args: server.args ?? [],
        env: Object.keys(server.env ?? {}),
      },
      _meta: managedServer._meta,
    };
  });
}

function buildLocalCompatStartupStatusBase(servers: unknown[]) {
  const status = buildStatusFromServers(servers);
  const serverCount = status.serverCount;
  const connectedCount = status.connectedCount;
  const startupMode = readLocalStartupProvenance();

  return {
    status: serverCount > 0 ? 'degraded' : 'starting',
    ready: false,
    uptime: 0,
    summary: serverCount > 0
      ? `Using local MCP config fallback for ${serverCount} configured server(s); live startup telemetry is unavailable.`
      : 'No live HyperCode core upstream is available yet; showing local compatibility fallback.',
    startupMode,
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? null,
      platform: process.platform,
      version: null,
    },
    checks: {
      mcpAggregator: {
        ready: serverCount > 0,
        liveReady: serverCount > 0,
        initialization: 'compat-fallback',
        serverCount,
        connectedCount,
        persistedServerCount: serverCount,
        persistedToolCount: 0,
        configuredServerCount: serverCount,
        advertisedServerCount: serverCount,
        advertisedToolCount: 0,
        advertisedAlwaysOnServerCount: 0,
        advertisedAlwaysOnToolCount: 0,
        inventoryReady: false,
        warmupInProgress: true,
      },
      configSync: {
        ready: serverCount > 0,
        status: {
          inProgress: false,
          lastCompletedAt: null,
          lastServerCount: serverCount,
          lastToolCount: 0,
        },
      },
      sessionSupervisor: {
        ready: false,
        sessionCount: 0,
        restore: null,
      },
      browser: {
        ready: false,
        active: false,
        pageCount: 0,
      },
      memory: {
        ready: false,
        initialized: false,
        agentMemory: false,
      },
      extensionBridge: {
        ready: false,
        acceptingConnections: false,
        clientCount: 0,
        hasConnectedClients: false,
        clients: [],
        supportedCapabilities: [],
        supportedHookPhases: [],
      },
      executionEnvironment: {
        ready: false,
        preferredShellId: null,
        preferredShellLabel: null,
        shellCount: 0,
        verifiedShellCount: 0,
        toolCount: 0,
        verifiedToolCount: 0,
        harnessCount: 0,
        verifiedHarnessCount: 0,
        supportsPowerShell: false,
        supportsPosixShell: false,
        notes: [],
      },
    },
  };
}

type LocalCompatStartupStatus = Omit<ReturnType<typeof buildLocalCompatStartupStatusBase>, 'checks'> & {
  blockingReasons?: Array<{ code: string; detail: string }>;
  checks: ReturnType<typeof buildLocalCompatStartupStatusBase>['checks'] & {
    memory: ReturnType<typeof buildLocalCompatStartupStatusBase>['checks']['memory'] & {
      sectionedMemory?: {
        ready?: boolean;
        enabled?: boolean;
        storeExists?: boolean;
        storePath?: string | null;
        totalEntries?: number;
        defaultSectionCount?: number;
        presentDefaultSectionCount?: number;
        missingSections?: string[];
      };
    };
    importedSessions?: {
      totalSessions: number;
      inlineTranscriptCount: number;
      archivedTranscriptCount: number;
      missingRetentionSummaryCount: number;
    };
    mainControlPlane?: {
      ready: boolean;
      baseUrl: string | null;
    };
    config?: {
      workspaceRootAvailable: boolean;
      goConfigDirAvailable: boolean;
      mainConfigDirAvailable: boolean;
      repoConfigAvailable: boolean;
      mcpConfigAvailable: boolean;
    };
    mesh?: {
      nodeId: string | null;
      peersCount: number;
    };
  } & Record<string, unknown>;
};

type NativeStartupStatusPayload = {
  status?: unknown;
  ready?: unknown;
  summary?: unknown;
  blockingReasons?: unknown;
  checks?: unknown;
};

type NativeRuntimeStatusPayload = {
  uptimeSec?: unknown;
  version?: unknown;
  startupMode?: unknown;
};

type NativeMcpStatusPayload = {
  initialized?: unknown;
  connected?: unknown;
  toolCount?: unknown;
  serverCount?: unknown;
  connectedCount?: unknown;
  sourceBackedHarnessCount?: unknown;
  source?: unknown;
  lazySessionMode?: unknown;
  singleActiveServerMode?: unknown;
  lifecycle?: unknown;
  pool?: unknown;
  aggregatorStatus?: unknown;
};

type NativeProviderQuotaPayload = {
  provider?: unknown;
  name?: unknown;
  configured?: unknown;
  authenticated?: unknown;
  authMethod?: unknown;
  tier?: unknown;
  limit?: unknown;
  used?: unknown;
  remaining?: unknown;
  resetDate?: unknown;
  rateLimitRpm?: unknown;
  availability?: unknown;
  lastError?: unknown;
};

type NativeFallbackChainPayload = {
  selectedTaskType?: unknown;
  chain?: unknown;
};

type NativeHarnessPayload = {
  id?: unknown;
  description?: unknown;
  runtime?: unknown;
  launchCommand?: unknown;
  parityNotes?: unknown;
  installed?: unknown;
  maturity?: unknown;
  primary?: unknown;
  upstream?: unknown;
};

type NativeSessionPayload = {
  id?: unknown;
  cliType?: unknown;
  status?: unknown;
  task?: unknown;
  startedAt?: unknown;
  sourcePath?: unknown;
  sessionFormat?: unknown;
  valid?: unknown;
  detectedModels?: unknown;
};

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : [];
}

function resolveNativeStatusBases(): string[] {
  return Array.from(new Set(
    resolveUpstreamBases()
      .map((base) => base.replace(/\/trpc\/?$/i, '').trim())
      .filter(Boolean),
  ));
}

async function fetchNativeStatusPayload<T extends Record<string, unknown>>(endpointPath: string): Promise<T | null> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}${endpointPath}`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true) {
        continue;
      }

      const data = asObjectRecord(payload.data);
      if (data) {
        return data as T;
      }
    } catch {
      // Try the next native control-plane base.
    }
  }

  return null;
}

async function fetchNativeControlPlaneData<T>(
  endpointPath: string,
  init?: RequestInit,
): Promise<T | null> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}${endpointPath}`, {
        cache: 'no-store',
        ...init,
      });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true) {
        continue;
      }

      return (payload.data as T | undefined) ?? null;
    } catch {
      // Try the next native control-plane base.
    }
  }

  return null;
}

function readTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeNativeSessionStatus(value: unknown): string {
  const normalized = readString(value)?.toLowerCase();
  if (normalized === 'running' || normalized === 'starting' || normalized === 'stopping' || normalized === 'stopped' || normalized === 'restarting' || normalized === 'error' || normalized === 'created') {
    return normalized;
  }
  if (normalized === 'active') {
    return 'running';
  }
  if (normalized === 'idle' || normalized === 'ready') {
    return 'stopped';
  }
  return 'created';
}

function normalizeCliHarnessDetection(entry: unknown): Record<string, unknown> | null {
  const record = asObjectRecord(entry);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  const runtime = readString(record.runtime);
  const launchCommand = readString(record.launchCommand);
  const description = readString(record.description);
  const parityNotes = readString(record.parityNotes);
  const maturity = readString(record.maturity);
  const upstream = readString(record.upstream);
  const installed = readBoolean(record.installed);
  const primary = readBoolean(record.primary) === true;

  return {
    id,
    name: id,
    command: launchCommand ?? '',
    homepage: upstream ?? '#',
    docsUrl: upstream ?? '#',
    installHint: parityNotes ?? description ?? runtime ?? 'CLI harness metadata available from native Go inventory.',
    sessionCapable: true,
    installed: installed ?? false,
    resolvedPath: installed ? (launchCommand ?? null) : null,
    version: maturity,
    detectionError: installed ? null : 'Not detected in current environment',
    primary,
  };
}

async function buildPreferredCliHarnessDetections(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/cli/harnesses`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry) => normalizeCliHarnessDetection(entry))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return [];
}

function buildFallbackExecutionEnvironment(cliHarnessDetections: unknown[]): Record<string, unknown> {
  const harnesses = (Array.isArray(cliHarnessDetections) ? cliHarnessDetections : [])
    .map((entry) => asObjectRecord(entry))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const verifiedHarnessCount = harnesses.filter((entry) => readBoolean(entry.installed) === true && !readString(entry.detectionError)).length;

  return {
    os: 'unknown',
    summary: {
      ready: false,
      preferredShellId: null,
      preferredShellLabel: null,
      shellCount: 0,
      verifiedShellCount: 0,
      toolCount: 0,
      verifiedToolCount: 0,
      harnessCount: harnesses.length,
      verifiedHarnessCount,
      supportsPowerShell: false,
      supportsPosixShell: false,
      notes: [],
    },
    shells: [],
    tools: [],
    harnesses,
  };
}

async function buildPreferredExecutionEnvironment(cliHarnessDetections: unknown[]): Promise<Record<string, unknown>> {
  const nativeExecutionEnvironment = await fetchNativeStatusPayload<Record<string, unknown>>('/api/tools/detect-execution-environment');
  if (!nativeExecutionEnvironment) {
    return buildFallbackExecutionEnvironment(cliHarnessDetections);
  }

  const nativeSummary = asObjectRecord(nativeExecutionEnvironment.summary);
  const normalizedShells = Array.isArray(nativeExecutionEnvironment.shells)
    ? nativeExecutionEnvironment.shells
      .map((entry, index) => {
        const record = asObjectRecord(entry);
        if (!record) {
          return null;
        }

        return {
          id: readString(record.id) ?? `shell-${index}`,
          name: readString(record.name) ?? 'Unknown shell',
          installed: readBoolean(record.installed) ?? false,
          verified: readBoolean(record.verified) ?? false,
          preferred: readBoolean(record.preferred) ?? false,
          resolvedPath: readString(record.resolvedPath),
          family: readString(record.family) ?? 'unknown',
          version: readString(record.version),
          notes: readStringArray(record.notes),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];
  const normalizedTools = Array.isArray(nativeExecutionEnvironment.tools)
    ? nativeExecutionEnvironment.tools
      .map((entry, index) => {
        const record = asObjectRecord(entry);
        if (!record) {
          return null;
        }

        return {
          id: readString(record.id) ?? `tool-${index}`,
          name: readString(record.name) ?? 'Unknown tool',
          installed: readBoolean(record.installed) ?? false,
          verified: readBoolean(record.verified) ?? false,
          resolvedPath: readString(record.resolvedPath),
          version: readString(record.version),
          capabilities: readStringArray(record.capabilities),
          notes: readStringArray(record.notes),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];
  const normalizedHarnesses = Array.isArray(nativeExecutionEnvironment.harnesses)
    ? nativeExecutionEnvironment.harnesses
      .map((entry) => normalizeCliHarnessDetection(entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];
  const effectiveHarnesses = normalizedHarnesses.length > 0
    ? normalizedHarnesses
    : (Array.isArray(cliHarnessDetections) ? cliHarnessDetections : []).filter((entry): entry is Record<string, unknown> => asObjectRecord(entry) !== null);

  const verifiedShellCount = normalizedShells.filter((entry) => entry.verified).length;
  const verifiedToolCount = normalizedTools.filter((entry) => entry.verified).length;
  const verifiedHarnessCount = effectiveHarnesses.filter((entry) => readBoolean(entry.installed) === true && !readString(entry.detectionError)).length;

  return {
    os: readString(nativeExecutionEnvironment.os) ?? 'unknown',
    summary: {
      ready: readBoolean(nativeSummary?.ready) ?? (verifiedShellCount > 0),
      preferredShellId: readString(nativeSummary?.preferredShellId),
      preferredShellLabel: readString(nativeSummary?.preferredShellLabel),
      shellCount: readNumber(nativeSummary?.shellCount) ?? normalizedShells.length,
      verifiedShellCount: readNumber(nativeSummary?.verifiedShellCount) ?? verifiedShellCount,
      toolCount: readNumber(nativeSummary?.toolCount) ?? normalizedTools.length,
      verifiedToolCount: readNumber(nativeSummary?.verifiedToolCount) ?? verifiedToolCount,
      harnessCount: readNumber(nativeSummary?.harnessCount) ?? effectiveHarnesses.length,
      verifiedHarnessCount: readNumber(nativeSummary?.verifiedHarnessCount) ?? verifiedHarnessCount,
      supportsPowerShell: readBoolean(nativeSummary?.supportsPowerShell) ?? false,
      supportsPosixShell: readBoolean(nativeSummary?.supportsPosixShell) ?? false,
      notes: readStringArray(nativeSummary?.notes),
    },
    shells: normalizedShells,
    tools: normalizedTools,
    harnesses: effectiveHarnesses,
  };
}

async function buildPreferredToolsList(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/tools`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry) => {
          const record = asObjectRecord(entry);
          const uuid = readString(record?.uuid);
          const name = readString(record?.name);
          const server = readString(record?.server);
          if (!uuid || !name || !server) {
            return null;
          }

          return {
            uuid,
            name,
            description: readString(record?.description) ?? '',
            server,
            inputSchema: asObjectRecord(record?.inputSchema),
            isDeferred: readBoolean(record?.isDeferred) ?? false,
            schemaParamCount: readNumber(record?.schemaParamCount) ?? 0,
            mcpServerUuid: readString(record?.mcpServerUuid) ?? server,
            always_on: readBoolean(record?.always_on) ?? false,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return LEGACY_COMPAT_RESPONSES['tools.list'] as unknown[];
}

async function buildPreferredMcpTraffic(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/mcp/traffic`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (!Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry) => {
          const record = asObjectRecord(entry);
          const server = readString(record?.server);
          const method = readString(record?.method);
          const paramsSummary = readString(record?.paramsSummary);
          const latencyMs = readNumber(record?.latencyMs);
          const success = readBoolean(record?.success);
          const timestamp = readNumber(record?.timestamp);
          if (!server || !method || !paramsSummary || latencyMs === null || success === null || timestamp === null) {
            return null;
          }

          return {
            server,
            method,
            paramsSummary,
            latencyMs,
            success,
            timestamp,
            ...(readString(record?.toolName) ? { toolName: readString(record?.toolName) } : {}),
            ...(readString(record?.error) ? { error: readString(record?.error) } : {}),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return LEGACY_COMPAT_RESPONSES['mcp.traffic'] as unknown[];
}

async function buildPreferredToolSearch(query?: string | null, limit?: number | null): Promise<unknown[]> {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) {
    return [];
  }

  for (const base of resolveNativeStatusBases()) {
    try {
      const endpoint = new URL(`${base}/api/tools/search`);
      endpoint.searchParams.set('query', normalizedQuery);
      if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        endpoint.searchParams.set('limit', String(limit));
      }

      const response = await fetch(endpoint.toString(), { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry) => {
          const record = asObjectRecord(entry);
          const name = readString(record?.name);
          const server = readString(record?.server);
          if (!name || !server) {
            return null;
          }

          return {
            name,
            description: readString(record?.description) ?? '',
            server,
            inputSchema: asObjectRecord(record?.inputSchema),
            ...(readString(record?.serverDisplayName) ? { serverDisplayName: readString(record?.serverDisplayName) } : {}),
            ...(readStringArray(record?.serverTags).length > 0 ? { serverTags: readStringArray(record?.serverTags) } : {}),
            ...(readStringArray(record?.toolTags).length > 0 ? { toolTags: readStringArray(record?.toolTags) } : {}),
            ...(readString(record?.semanticGroup) ? { semanticGroup: readString(record?.semanticGroup) } : {}),
            ...(readString(record?.semanticGroupLabel) ? { semanticGroupLabel: readString(record?.semanticGroupLabel) } : {}),
            ...(readString(record?.advertisedName) ? { advertisedName: readString(record?.advertisedName) } : {}),
            ...(readStringArray(record?.keywords).length > 0 ? { keywords: readStringArray(record?.keywords) } : {}),
            ...(readBoolean(record?.alwaysOn) !== null ? { alwaysOn: readBoolean(record?.alwaysOn) } : {}),
            ...(readString(record?.originalName) ? { originalName: readString(record?.originalName) } : {}),
            ...(readBoolean(record?.loaded) !== null ? { loaded: readBoolean(record?.loaded) } : {}),
            ...(readBoolean(record?.hydrated) !== null ? { hydrated: readBoolean(record?.hydrated) } : {}),
            ...(readBoolean(record?.deferred) !== null ? { deferred: readBoolean(record?.deferred) } : {}),
            ...(readBoolean(record?.requiresSchemaHydration) !== null ? { requiresSchemaHydration: readBoolean(record?.requiresSchemaHydration) } : {}),
            ...(readString(record?.matchReason) ? { matchReason: readString(record?.matchReason) } : {}),
            ...(readNumber(record?.score) !== null ? { score: readNumber(record?.score) } : {}),
            ...(readNumber(record?.rank) !== null ? { rank: readNumber(record?.rank) } : {}),
            ...(readBoolean(record?.important) !== null ? { important: readBoolean(record?.important) } : {}),
            ...(readBoolean(record?.alwaysShow) !== null ? { alwaysShow: readBoolean(record?.alwaysShow) } : {}),
            ...(readBoolean(record?.alwaysLoaded) !== null ? { alwaysLoaded: readBoolean(record?.alwaysLoaded) } : {}),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return [];
}

async function buildPreferredWorkingSet(): Promise<Record<string, unknown>> {
  const nativeWorkingSet = await fetchNativeStatusPayload<Record<string, unknown>>('/api/mcp/working-set');
  if (!nativeWorkingSet) {
    return {
      tools: [],
      limits: {
        maxLoadedTools: 24,
        maxHydratedSchemas: 8,
      },
    };
  }

  const normalizedTools = Array.isArray(nativeWorkingSet.tools)
    ? nativeWorkingSet.tools
      .map((entry) => {
        const record = asObjectRecord(entry);
        const name = readString(record?.name);
        if (!name) {
          return null;
        }

        return {
          name,
          hydrated: readBoolean(record?.hydrated) ?? false,
          lastLoadedAt: readNumber(record?.lastLoadedAt) ?? 0,
          lastHydratedAt: readNumber(record?.lastHydratedAt),
          lastAccessedAt: readNumber(record?.lastAccessedAt) ?? 0,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];
  const limits = asObjectRecord(nativeWorkingSet.limits);

  return {
    tools: normalizedTools,
    limits: {
      maxLoadedTools: readNumber(limits?.maxLoadedTools) ?? 24,
      maxHydratedSchemas: readNumber(limits?.maxHydratedSchemas) ?? 8,
      ...(readNumber(limits?.idleEvictionThresholdMs) !== null ? { idleEvictionThresholdMs: readNumber(limits?.idleEvictionThresholdMs) } : {}),
    },
  };
}

async function buildPreferredToolSelectionTelemetry(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/mcp/tool-selection-telemetry`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry, index) => {
          const record = asObjectRecord(entry);
          const type = readString(record?.type);
          const status = readString(record?.status);
          const timestamp = readNumber(record?.timestamp);
          if (!record || !type || !status || timestamp === null) {
            return null;
          }

          return {
            id: readString(record.id) ?? `telemetry-${index}`,
            type,
            timestamp,
            ...(readString(record.query) ? { query: readString(record.query) } : {}),
            ...(readString(record.profile) ? { profile: readString(record.profile) } : {}),
            ...(readString(record.source) ? { source: readString(record.source) } : {}),
            ...(readNumber(record.resultCount) !== null ? { resultCount: readNumber(record.resultCount) } : {}),
            ...(readString(record.topResultName) ? { topResultName: readString(record.topResultName) } : {}),
            ...(readString(record.topMatchReason) ? { topMatchReason: readString(record.topMatchReason) } : {}),
            ...(readNumber(record.topScore) !== null ? { topScore: readNumber(record.topScore) } : {}),
            ...(readString(record.secondResultName) ? { secondResultName: readString(record.secondResultName) } : {}),
            ...(readString(record.secondMatchReason) ? { secondMatchReason: readString(record.secondMatchReason) } : {}),
            ...(readNumber(record.secondScore) !== null ? { secondScore: readNumber(record.secondScore) } : {}),
            ...(readNumber(record.scoreGap) !== null ? { scoreGap: readNumber(record.scoreGap) } : {}),
            ...(readNumber(record.ignoredResultCount) !== null ? { ignoredResultCount: readNumber(record.ignoredResultCount) } : {}),
            ...(readStringArray(record.ignoredResultNames).length > 0 ? { ignoredResultNames: readStringArray(record.ignoredResultNames) } : {}),
            ...(readString(record.toolName) ? { toolName: readString(record.toolName) } : {}),
            status,
            ...(readString(record.message) ? { message: readString(record.message) } : {}),
            ...(readStringArray(record.evictedTools).length > 0 ? { evictedTools: readStringArray(record.evictedTools) } : {}),
            ...(readNumber(record.latencyMs) !== null ? { latencyMs: readNumber(record.latencyMs) } : {}),
            ...(readString(record.autoLoadReason) ? { autoLoadReason: readString(record.autoLoadReason) } : {}),
            ...(readNumber(record.autoLoadConfidence) !== null ? { autoLoadConfidence: readNumber(record.autoLoadConfidence) } : {}),
            ...(readBoolean(record.autoLoadEvaluated) !== null ? { autoLoadEvaluated: readBoolean(record.autoLoadEvaluated) } : {}),
            ...(readString(record.autoLoadOutcome) ? { autoLoadOutcome: readString(record.autoLoadOutcome) } : {}),
            ...(readString(record.autoLoadSkipReason) ? { autoLoadSkipReason: readString(record.autoLoadSkipReason) } : {}),
            ...(readNumber(record.autoLoadMinConfidence) !== null ? { autoLoadMinConfidence: readNumber(record.autoLoadMinConfidence) } : {}),
            ...(readString(record.autoLoadExecutionStatus) ? { autoLoadExecutionStatus: readString(record.autoLoadExecutionStatus) } : {}),
            ...(readString(record.autoLoadExecutionError) ? { autoLoadExecutionError: readString(record.autoLoadExecutionError) } : {}),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return [];
}

async function buildPreferredToolPreferences(): Promise<Record<string, unknown>> {
  const nativePreferences = await fetchNativeStatusPayload<Record<string, unknown>>('/api/mcp/preferences');
  if (!nativePreferences) {
    return {
      importantTools: [],
      alwaysLoadedTools: ['search_tools', 'read_file', 'write_file', 'grep_search', 'execute_command', 'browser__open'],
    };
  }

  return {
    importantTools: readStringArray(nativePreferences.importantTools),
    alwaysLoadedTools: readStringArray(nativePreferences.alwaysLoadedTools),
    ...(readNumber(nativePreferences.autoLoadMinConfidence) !== null ? { autoLoadMinConfidence: readNumber(nativePreferences.autoLoadMinConfidence) } : {}),
    ...(readNumber(nativePreferences.maxLoadedTools) !== null ? { maxLoadedTools: readNumber(nativePreferences.maxLoadedTools) } : {}),
    ...(readNumber(nativePreferences.maxHydratedSchemas) !== null ? { maxHydratedSchemas: readNumber(nativePreferences.maxHydratedSchemas) } : {}),
    ...(readNumber(nativePreferences.idleEvictionThresholdMs) !== null ? { idleEvictionThresholdMs: readNumber(nativePreferences.idleEvictionThresholdMs) } : {}),
  };
}

function buildApiKeyPrefix(rawKey: string | null, fallbackPrefix: string | null): string | null {
  if (fallbackPrefix) {
    return fallbackPrefix;
  }
  if (!rawKey) {
    return null;
  }
  return rawKey.slice(0, Math.min(rawKey.length, 8));
}

async function buildPreferredApiKeys(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/api-keys`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry, index) => {
          const record = asObjectRecord(entry);
          if (!record) {
            return null;
          }

          const uuid = readString(record.uuid) ?? `api-key-${index}`;
          const name = readString(record.name) ?? 'Unnamed key';
          const rawKey = readString(record.key);
          const keyPrefix = buildApiKeyPrefix(rawKey, readString(record.key_prefix));
          const createdAt = readString(record.created_at) ?? new Date(0).toISOString();
          const isActive = readBoolean(record.is_active);

          return {
            uuid,
            name,
            key_prefix: keyPrefix ?? 'sk-...',
            created_at: createdAt,
            is_active: isActive ?? false,
            ...(rawKey ? { key: rawKey } : {}),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return [];
}

async function buildPreferredSecretsList(): Promise<unknown[]> {
  const secrets = await fetchNativeControlPlaneData<unknown[]>('/api/secrets');
  return Array.isArray(secrets) ? secrets : [];
}

async function buildPreferredPoliciesList(): Promise<unknown[]> {
  const policies = await fetchNativeControlPlaneData<unknown[]>('/api/policies');
  return Array.isArray(policies) ? policies : [];
}

async function buildPreferredToolSetsList(): Promise<unknown[]> {
  const toolSets = await fetchNativeControlPlaneData<unknown[]>('/api/tool-sets');
  return Array.isArray(toolSets) ? toolSets : [];
}

async function buildPreferredSavedScriptsList(): Promise<unknown[]> {
  const scripts = await fetchNativeControlPlaneData<unknown[]>('/api/scripts');
  return Array.isArray(scripts) ? scripts : [];
}

async function buildPreferredMemoryStats(): Promise<Record<string, unknown>> {
  const nativeMemoryStats = await fetchNativeStatusPayload<Record<string, unknown>>('/api/memory/agent-stats');
  if (!nativeMemoryStats) {
    return {
      sessionCount: 0,
      workingCount: 0,
      longTermCount: 0,
      observationCount: 0,
      sessionSummaryCount: 0,
      promptCount: 0,
    };
  }

  return {
    sessionCount: readNumber(nativeMemoryStats.sessionCount) ?? readNumber(nativeMemoryStats.session) ?? 0,
    workingCount: readNumber(nativeMemoryStats.workingCount) ?? readNumber(nativeMemoryStats.working) ?? 0,
    longTermCount: readNumber(nativeMemoryStats.longTermCount) ?? readNumber(nativeMemoryStats.longTerm) ?? 0,
    observationCount: readNumber(nativeMemoryStats.observationCount) ?? 0,
    sessionSummaryCount: readNumber(nativeMemoryStats.sessionSummaryCount) ?? 0,
    promptCount: readNumber(nativeMemoryStats.promptCount) ?? 0,
  };
}

async function buildPreferredExpertStatus(): Promise<Record<string, unknown>> {
  const nativeExpertStatus = await fetchNativeStatusPayload<Record<string, unknown>>('/api/expert/status');
  if (!nativeExpertStatus) {
    return {};
  }

  return {
    ...(readString(nativeExpertStatus.researcher) ? { researcher: readString(nativeExpertStatus.researcher) } : {}),
    ...(readString(nativeExpertStatus.coder) ? { coder: readString(nativeExpertStatus.coder) } : {}),
  };
}

async function buildPreferredAgentMemoryStats(): Promise<Record<string, unknown>> {
  const nativeAgentMemoryStats = await fetchNativeStatusPayload<Record<string, unknown>>('/api/memory/agent-stats');
  if (!nativeAgentMemoryStats) {
    return {
      session: 0,
      working: 0,
      longTerm: 0,
      total: 0,
    };
  }

  return {
    session: readNumber(nativeAgentMemoryStats.session) ?? readNumber(nativeAgentMemoryStats.sessionCount) ?? 0,
    working: readNumber(nativeAgentMemoryStats.working) ?? readNumber(nativeAgentMemoryStats.workingCount) ?? 0,
    longTerm: readNumber(nativeAgentMemoryStats.longTerm) ?? readNumber(nativeAgentMemoryStats.longTermCount) ?? 0,
    total: readNumber(nativeAgentMemoryStats.total) ?? readNumber(nativeAgentMemoryStats.totalCount) ?? 0,
  };
}

function buildMemoryQueryString(entries: Record<string, string | number | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      continue;
    }
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

async function buildPreferredShellSystemHistory(limit?: number | null): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const endpoint = new URL(`${base}/api/shell/history/system`);
      if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        endpoint.searchParams.set('limit', String(limit));
      }

      const response = await fetch(endpoint.toString(), { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data.filter((entry): entry is string => typeof entry === 'string');
    } catch {
      // Try the next native control-plane base.
    }
  }

  return [];
}

async function buildPreferredServerHealth(
  serverUuid: string,
  localConfig: LocalMcpConfig,
): Promise<Record<string, unknown>> {
  const normalizedUuid = serverUuid.trim();
  if (!normalizedUuid) {
    return {
      status: 'unavailable',
      crashCount: 0,
      maxAttempts: 0,
    };
  }

  for (const base of resolveNativeStatusBases()) {
    try {
      const endpoint = new URL(`${base}/api/server-health/check`);
      endpoint.searchParams.set('serverUuid', normalizedUuid);

      const response = await fetch(endpoint.toString(), { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      const data = asObjectRecord(payload.data);
      if (payload.success !== true || !data) {
        continue;
      }

      const status = readString(data.status);
      const crashCount = readNumber(data.crashCount);
      const maxAttempts = readNumber(data.maxAttempts);
      if (!status || crashCount === null || maxAttempts === null) {
        continue;
      }

      return {
        status,
        crashCount,
        maxAttempts,
      };
    } catch {
      // Try the next native control-plane base.
    }
  }

  const match = findLocalServerByUuid(localConfig, normalizedUuid);
  const meta = match ? buildLocalServerMeta(match.name, match.server) : null;
  return {
    status: match
      ? (meta?.status === 'ready' ? 'ready' : meta?.status === 'disabled' ? 'disabled' : 'unavailable')
      : 'unavailable',
    crashCount: meta?.crashCount ?? 0,
    maxAttempts: meta?.maxAttempts ?? 0,
  };
}

async function buildPreferredSessionState(): Promise<Record<string, unknown>> {
  const nativeSessionState = await fetchNativeStatusPayload<Record<string, unknown>>('/api/sessions/supervisor/state');
  if (!nativeSessionState) {
    return {
      isAutoDriveActive: false,
      activeGoal: null,
    };
  }

  return {
    isAutoDriveActive: readBoolean(nativeSessionState.isAutoDriveActive) ?? false,
    activeGoal: readString(nativeSessionState.activeGoal),
  };
}

async function buildPreferredImportedMaintenanceStats(): Promise<ImportedMaintenanceStats> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/sessions/imported/maintenance-stats`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      const data = asObjectRecord(payload.data);
      if (payload.success !== true || !data) {
        continue;
      }

      return {
        totalSessions: readNumber(data.totalSessions) ?? 0,
        inlineTranscriptCount: readNumber(data.inlineTranscriptCount) ?? 0,
        archivedTranscriptCount: readNumber(data.archivedTranscriptCount) ?? 0,
        missingRetentionSummaryCount: readNumber(data.missingRetentionSummaryCount) ?? 0,
      };
    } catch {
      // Try the next native control-plane base.
    }
  }

  return {
    totalSessions: 0,
    inlineTranscriptCount: 0,
    archivedTranscriptCount: 0,
    missingRetentionSummaryCount: 0,
  };
}

async function buildPreferredInstallSurfaces(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/tools/detect-install-surfaces`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry) => {
          const record = asObjectRecord(entry);
          const id = readString(record?.id);
          const status = readString(record?.status);
          const detail = readString(record?.detail);
          if (!id || !detail || (status !== 'ready' && status !== 'partial' && status !== 'missing')) {
            return null;
          }

          return {
            id,
            status,
            artifactPath: readString(record?.artifactPath),
            artifactKind: readString(record?.artifactKind),
            detail,
            declaredVersion: readString(record?.declaredVersion),
            lastModifiedAt: readString(record?.lastModifiedAt),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return [];
}

function buildPreferredSessionCatalog(cliHarnessDetections: unknown[]): unknown[] {
  return (Array.isArray(cliHarnessDetections) ? cliHarnessDetections : [])
    .map((entry) => {
      const record = asObjectRecord(entry);
      const id = readString(record?.id);
      if (!id) {
        return null;
      }

      const name = readString(record?.name) ?? id;
      const command = readString(record?.command);
      const homepage = readString(record?.homepage);
      const docsUrl = readString(record?.docsUrl);
      const installHint = readString(record?.installHint);
      const installed = readBoolean(record?.installed);
      const resolvedPath = readString(record?.resolvedPath);
      const version = readString(record?.version);
      const detectionError = readString(record?.detectionError);

      return {
        id,
        name,
        ...(command ? { command } : {}),
        ...(homepage ? { homepage } : {}),
        ...(docsUrl ? { docsUrl } : {}),
        ...(installHint ? { installHint } : {}),
        category: 'cli',
        sessionCapable: true,
        versionArgs: ['--version'],
        installed: installed ?? false,
        resolvedPath: resolvedPath ?? null,
        version: version ?? null,
        detectionError: detectionError ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

async function buildPreferredSessionList(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/sessions`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry, index) => {
          const record = asObjectRecord(entry);
          if (!record) {
            return null;
          }

          const id = readString(record.id);
          const cliType = readString(record.cliType);
          if (!id || !cliType) {
            return null;
          }

          const task = readString(record.task);
          const sourcePath = readString(record.sourcePath);
          const startedAt = readString(record.startedAt);
          const lastActivityAt = readTimestamp(record.startedAt) ?? Date.now();
          const detectedModels = Array.isArray(record.detectedModels)
            ? record.detectedModels.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : [];
          const sessionFormat = readString(record.sessionFormat);
          const valid = readBoolean(record.valid);

          return {
            id,
            name: task ?? `${cliType} session`,
            cliType,
            workingDirectory: sourcePath ?? '',
            autoRestart: false,
            status: normalizeNativeSessionStatus(record.status),
            restartCount: 0,
            maxRestartAttempts: 0,
            lastActivityAt,
            logs: [],
            ...(startedAt ? { startedAt } : {}),
            ...(sessionFormat ? { sessionFormat } : {}),
            ...(sourcePath ? { sourcePath } : {}),
            ...(detectedModels.length > 0 ? { detectedModels } : {}),
            ...(valid !== null ? { valid } : {}),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return LEGACY_COMPAT_RESPONSES['session.list'] as unknown[];
}

async function buildPreferredSessionSnapshot(id: string | null): Promise<unknown | null> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return null;
  }

  const endpoint = new URL('/api/sessions/supervisor/get', 'http://127.0.0.1');
  endpoint.searchParams.set('id', normalizedId);
  return await fetchNativeControlPlaneData<unknown>(`${endpoint.pathname}${endpoint.search}`);
}

async function buildPreferredSessionLogs(id: string | null, limit?: number | null): Promise<unknown[]> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return [];
  }

  const endpoint = new URL('/api/sessions/supervisor/logs', 'http://127.0.0.1');
  endpoint.searchParams.set('id', normalizedId);
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    endpoint.searchParams.set('limit', String(limit));
  }

  const logs = await fetchNativeControlPlaneData<unknown[]>(`${endpoint.pathname}${endpoint.search}`);
  return Array.isArray(logs) ? logs : [];
}

async function buildPreferredSessionAttachInfo(id: string | null): Promise<Record<string, unknown> | null> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return null;
  }

  const endpoint = new URL('/api/sessions/supervisor/attach-info', 'http://127.0.0.1');
  endpoint.searchParams.set('id', normalizedId);
  const attachInfo = await fetchNativeControlPlaneData<Record<string, unknown>>(`${endpoint.pathname}${endpoint.search}`);
  return asObjectRecord(attachInfo);
}

async function buildPreferredSessionHealth(id: string | null): Promise<Record<string, unknown> | null> {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return null;
  }

  const endpoint = new URL('/api/sessions/supervisor/health', 'http://127.0.0.1');
  endpoint.searchParams.set('id', normalizedId);
  const health = await fetchNativeControlPlaneData<Record<string, unknown>>(`${endpoint.pathname}${endpoint.search}`);
  return asObjectRecord(health);
}

async function buildPreferredProviderQuotas(): Promise<unknown[]> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const response = await fetch(`${base}/api/billing/provider-quotas`, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true || !Array.isArray(payload.data)) {
        continue;
      }

      return payload.data
        .map((entry) => {
          const record = asObjectRecord(entry);
          if (!record) {
            return null;
          }

          const provider = readString(record.provider);
          const name = readString(record.name);
          const configured = readBoolean(record.configured);
          const tier = readString(record.tier);
          const used = readNumber(record.used);

          if (!provider || !name || configured === null || !tier || used === null) {
            return null;
          }

          return {
            provider,
            name,
            configured,
            ...(readBoolean(record.authenticated) !== null ? { authenticated: readBoolean(record.authenticated) } : {}),
            ...(readString(record.authMethod) ? { authMethod: readString(record.authMethod) } : {}),
            tier,
            limit: readNumber(record.limit),
            used,
            remaining: readNumber(record.remaining),
            resetDate: readString(record.resetDate),
            rateLimitRpm: readNumber(record.rateLimitRpm),
            availability: readString(record.availability) ?? undefined,
            lastError: readString(record.lastError),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    } catch {
      // Try the next native control-plane base.
    }
  }

  return LEGACY_COMPAT_RESPONSES['billing.getProviderQuotas'] as unknown[];
}

async function buildPreferredFallbackChain(taskType?: string | null): Promise<Record<string, unknown>> {
  for (const base of resolveNativeStatusBases()) {
    try {
      const endpoint = new URL(`${base}/api/billing/fallback-chain`);
      if (taskType && taskType.trim().length > 0) {
        endpoint.searchParams.set('taskType', taskType.trim());
      }

      const response = await fetch(endpoint.toString(), { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { success?: unknown; data?: unknown };
      if (payload.success !== true) {
        continue;
      }

      const data = asObjectRecord(payload.data);
      const chain = Array.isArray(data?.chain)
        ? data.chain
          .map((entry) => {
            const record = asObjectRecord(entry);
            if (!record) {
              return null;
            }

            const priority = readNumber(record.priority);
            const provider = readString(record.provider);
            const reason = readString(record.reason);
            if (priority === null || !provider || !reason) {
              return null;
            }

            return {
              priority,
              provider,
              ...(readString(record.model) ? { model: readString(record.model) } : {}),
              reason,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        : [];

      return {
        selectedTaskType: readString(data?.selectedTaskType) ?? null,
        chain,
      };
    } catch {
      // Try the next native control-plane base.
    }
  }

  return LEGACY_COMPAT_RESPONSES['billing.getFallbackChain'] as Record<string, unknown>;
}

async function buildPreferredMcpStatus(servers: unknown[]): Promise<Record<string, unknown>> {
  const baseStatus = buildStatusFromServers(servers) as Record<string, unknown>;
  const nativeMcpStatus = await fetchNativeStatusPayload<NativeMcpStatusPayload>('/api/mcp/status');

  if (!nativeMcpStatus) {
    return baseStatus;
  }

  const mergedStatus: Record<string, unknown> = {
    ...baseStatus,
  };

  const initialized = readBoolean(nativeMcpStatus.initialized);
  const connected = readBoolean(nativeMcpStatus.connected);
  const toolCount = readNumber(nativeMcpStatus.toolCount);
  const serverCount = readNumber(nativeMcpStatus.serverCount);
  const connectedCount = readNumber(nativeMcpStatus.connectedCount);
  const sourceBackedHarnessCount = readNumber(nativeMcpStatus.sourceBackedHarnessCount);
  const source = readString(nativeMcpStatus.source);
  const lifecycle = asObjectRecord(nativeMcpStatus.lifecycle);
  const pool = asObjectRecord(nativeMcpStatus.pool);
  const aggregatorStatus = asObjectRecord(nativeMcpStatus.aggregatorStatus);
  const lazySessionMode = readBoolean(nativeMcpStatus.lazySessionMode);
  const singleActiveServerMode = readBoolean(nativeMcpStatus.singleActiveServerMode);

  if (initialized !== null) {
    mergedStatus.initialized = initialized;
  }
  if (toolCount !== null) {
    mergedStatus.toolCount = toolCount;
  }
  if (serverCount !== null) {
    mergedStatus.serverCount = serverCount;
  }
  if (connectedCount !== null) {
    mergedStatus.connectedCount = connectedCount;
  } else if (connected !== null) {
    mergedStatus.connectedCount = connected ? Math.max(1, Number(mergedStatus.connectedCount ?? 0)) : 0;
  }
  if (connected !== null) {
    mergedStatus.connected = connected;
  }
  if (sourceBackedHarnessCount !== null) {
    mergedStatus.sourceBackedHarnessCount = sourceBackedHarnessCount;
  }
  if (source) {
    mergedStatus.source = source;
  }
  if (aggregatorStatus) {
    mergedStatus.aggregatorStatus = aggregatorStatus;
  }
  if (pool) {
    mergedStatus.pool = pool;
  }
  if (lifecycle) {
    mergedStatus.lifecycle = lifecycle;
  } else if (lazySessionMode !== null || singleActiveServerMode !== null) {
    mergedStatus.lifecycle = {
      ...(asObjectRecord(mergedStatus.lifecycle) ?? {}),
      ...(lazySessionMode !== null ? { lazySessionMode } : {}),
      ...(singleActiveServerMode !== null ? { singleActiveServerMode } : {}),
    };
  }

  return mergedStatus;
}

type ImportedMaintenanceStats = {
  totalSessions: number;
  inlineTranscriptCount: number;
  archivedTranscriptCount: number;
  missingRetentionSummaryCount: number;
};

async function buildLocalStartupStatus(
  servers: unknown[],
  executionEnvironment?: Record<string, unknown> | null,
  importedMaintenanceStats?: ImportedMaintenanceStats | null,
): Promise<LocalCompatStartupStatus> {
  const baseStatus = buildLocalCompatStartupStatusBase(servers);
  const [nativeStartupStatus, nativeRuntimeStatus] = await Promise.all([
    fetchNativeStatusPayload<NativeStartupStatusPayload>('/api/startup/status'),
    fetchNativeStatusPayload<NativeRuntimeStatusPayload>('/api/runtime/status'),
  ]);

  const mergedStatus: LocalCompatStartupStatus = {
    ...baseStatus,
    runtime: {
      ...baseStatus.runtime,
    },
    checks: {
      ...baseStatus.checks,
    },
  };

  if (nativeStartupStatus) {
    const nativeStatus = readString(nativeStartupStatus.status);
    const nativeReady = readBoolean(nativeStartupStatus.ready);
    const nativeSummary = readString(nativeStartupStatus.summary);
    const nativeBlockingReasons = Array.isArray(nativeStartupStatus.blockingReasons)
      ? nativeStartupStatus.blockingReasons
        .map((reason) => {
          const record = asObjectRecord(reason);
          if (!record) {
            return null;
          }

          const code = readString(record.code);
          const detail = readString(record.detail);
          return code && detail ? { code, detail } : null;
        })
        .filter((reason): reason is { code: string; detail: string } => reason !== null)
      : [];
    const nativeChecks = asObjectRecord(nativeStartupStatus.checks);
    const nativeMemory = asObjectRecord(nativeChecks?.memory);
    const nativeImportedSessions = asObjectRecord(nativeChecks?.importedSessions);
    const nativeSessionSupervisorBridge = asObjectRecord(nativeChecks?.sessionSupervisorBridge);
    const nativeMainControlPlane = asObjectRecord(nativeChecks?.mainControlPlane);
    const nativeConfig = asObjectRecord(nativeChecks?.config);
    const nativeMesh = asObjectRecord(nativeChecks?.mesh);

    if (nativeStatus) {
      mergedStatus.status = nativeStatus;
    }
    if (nativeReady !== null) {
      mergedStatus.ready = nativeReady;
    }
    if (nativeSummary) {
      mergedStatus.summary = `${nativeSummary} Using Go-native startup status in local dashboard compatibility mode because the TypeScript startupStatus procedure is unavailable.`;
    }
    if (nativeBlockingReasons.length > 0 || nativeStartupStatus.blockingReasons !== undefined) {
      mergedStatus.blockingReasons = nativeBlockingReasons;
    }
    if (nativeMemory) {
      const memoryReady = readBoolean(nativeMemory.ready);
      const storePath = readString(nativeMemory.storePath);
      const totalEntries = readNumber(nativeMemory.totalEntries);
      const presentDefaultSections = readNumber(nativeMemory.presentDefaultSections);
      const expectedDefaultSections = readNumber(nativeMemory.expectedDefaultSections);
      const missingSections = readStringArray(nativeMemory.missingSections);

      if (memoryReady !== null) {
        mergedStatus.checks = {
          ...mergedStatus.checks,
          memory: {
            ...mergedStatus.checks.memory,
            ready: memoryReady,
            initialized: memoryReady,
            agentMemory: memoryReady,
            sectionedMemory: {
              ready: memoryReady,
              enabled: true,
              storeExists: memoryReady,
              storePath,
              totalEntries: totalEntries ?? 0,
              defaultSectionCount: expectedDefaultSections ?? 0,
              presentDefaultSectionCount: presentDefaultSections ?? 0,
              missingSections,
            },
          },
        };
      }
    }
    if (nativeImportedSessions) {
      mergedStatus.checks.importedSessions = {
        totalSessions: readNumber(nativeImportedSessions.totalSessions) ?? 0,
        inlineTranscriptCount: readNumber(nativeImportedSessions.inlineTranscriptCount) ?? 0,
        archivedTranscriptCount: readNumber(nativeImportedSessions.archivedTranscriptCount) ?? 0,
        missingRetentionSummaryCount: readNumber(nativeImportedSessions.missingRetentionSummaryCount) ?? 0,
      };
    }
    if (nativeSessionSupervisorBridge) {
      const bridgeReady = readBoolean(nativeSessionSupervisorBridge.ready);
      if (bridgeReady !== null) {
        mergedStatus.checks.sessionSupervisor = {
          ...mergedStatus.checks.sessionSupervisor,
          ready: bridgeReady,
        };
      }
    }
    if (nativeMainControlPlane) {
      mergedStatus.checks = {
        ...mergedStatus.checks,
        mainControlPlane: {
          ready: readBoolean(nativeMainControlPlane.ready) ?? false,
          baseUrl: readString(nativeMainControlPlane.baseUrl),
        },
      };
    }
    if (nativeConfig) {
      mergedStatus.checks = {
        ...mergedStatus.checks,
        config: {
          workspaceRootAvailable: readBoolean(nativeConfig.workspaceRootAvailable) ?? false,
          goConfigDirAvailable: readBoolean(nativeConfig.goConfigDirAvailable) ?? false,
          mainConfigDirAvailable: readBoolean(nativeConfig.mainConfigDirAvailable) ?? false,
          repoConfigAvailable: readBoolean(nativeConfig.repoConfigAvailable) ?? false,
          mcpConfigAvailable: readBoolean(nativeConfig.mcpConfigAvailable) ?? false,
        },
      };
    }
    if (nativeMesh) {
      mergedStatus.checks = {
        ...mergedStatus.checks,
        mesh: {
          nodeId: readString(nativeMesh.nodeId),
          peersCount: readNumber(nativeMesh.peersCount) ?? 0,
        },
      };
    }
  }

  if (nativeRuntimeStatus) {
    const nativeUptime = readNumber(nativeRuntimeStatus.uptimeSec);
    const nativeVersion = readString(nativeRuntimeStatus.version);
    const nativeStartupMode = asObjectRecord(nativeRuntimeStatus.startupMode);

    if (nativeUptime !== null) {
      mergedStatus.uptime = nativeUptime;
    }
    if (nativeVersion) {
      mergedStatus.runtime = {
        ...mergedStatus.runtime,
        version: nativeVersion,
      };
    }
    if (nativeStartupMode) {
      mergedStatus.startupMode = {
        ...(asObjectRecord(mergedStatus.startupMode) ?? {}),
        ...nativeStartupMode,
      };
    }
  }

  const executionSummary = asObjectRecord(executionEnvironment?.summary);
  if (executionSummary) {
    mergedStatus.checks = {
      ...mergedStatus.checks,
      executionEnvironment: {
        ready: readBoolean(executionSummary.ready) ?? mergedStatus.checks.executionEnvironment.ready,
        preferredShellId: readString(executionSummary.preferredShellId),
        preferredShellLabel: readString(executionSummary.preferredShellLabel),
        shellCount: readNumber(executionSummary.shellCount) ?? 0,
        verifiedShellCount: readNumber(executionSummary.verifiedShellCount) ?? 0,
        toolCount: readNumber(executionSummary.toolCount) ?? 0,
        verifiedToolCount: readNumber(executionSummary.verifiedToolCount) ?? 0,
        harnessCount: readNumber(executionSummary.harnessCount) ?? 0,
        verifiedHarnessCount: readNumber(executionSummary.verifiedHarnessCount) ?? 0,
        supportsPowerShell: readBoolean(executionSummary.supportsPowerShell) ?? false,
        supportsPosixShell: readBoolean(executionSummary.supportsPosixShell) ?? false,
        notes: readStringArray(executionSummary.notes),
      },
    };
  }

  if (!mergedStatus.checks.importedSessions && importedMaintenanceStats) {
    mergedStatus.checks = {
      ...mergedStatus.checks,
      importedSessions: {
        totalSessions: importedMaintenanceStats.totalSessions,
        inlineTranscriptCount: importedMaintenanceStats.inlineTranscriptCount,
        archivedTranscriptCount: importedMaintenanceStats.archivedTranscriptCount,
        missingRetentionSummaryCount: importedMaintenanceStats.missingRetentionSummaryCount,
      },
    };
  }

  return mergedStatus;
}

async function fetchProcedureData(
  upstreamBases: string[],
  headers: Headers,
  procedureNames: string[],
): Promise<unknown | undefined> {
  for (const upstreamBase of upstreamBases) {
    for (const procedureName of procedureNames) {
      const normalizedBase = upstreamBase.replace(/\/$/, '');
      const procedureUrl = new URL(`${normalizedBase}/${procedureName}`);
      procedureUrl.searchParams.set('input', '{}');

      try {
        const response = await fetch(procedureUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          continue;
        }

        const json = await response.json();
        return extractTrpcData(json);
      } catch {
        // Try next candidate URL.
      }
    }
  }

  return undefined;
}

async function tryResolveLegacyMcpResponse(
  req: Request,
  upstreamBases: string[],
  headers: Headers,
  body?: string,
): Promise<Response | null> {
  if (!isLegacyMcpRequest(req)) {
    return null;
  }

  const procedures = getProcedureNames(req);
  const isBatch = new URL(req.url).searchParams.get('batch') === '1';
  const procedureInputs = extractTrpcProcedureInputs(body, req);

  const rawServers = await fetchProcedureData(upstreamBases, headers, [...LEGACY_MCP_SERVERS_LIST_PROCEDURES]);
  const localConfig = await loadLocalMcpConfig();
  const normalizedServers = normalizeServerList(rawServers);
  const effectiveServers = normalizedServers.length > 0 ? normalizedServers : mapConfigToServerList(localConfig);
  const status = await buildPreferredMcpStatus(effectiveServers);
  const toolsList = await buildPreferredToolsList();
  const mcpTraffic = await buildPreferredMcpTraffic();
  const providerQuotas = await buildPreferredProviderQuotas();
  const sessionList = await buildPreferredSessionList();

  const dataByResponseKey: Record<LegacyCompatResponseKey, unknown> = {
    'mcpServers.list': effectiveServers,
    'tools.list': toolsList,
    'mcp.getStatus': status,
    'mcp.traffic': mcpTraffic,
    'session.list': sessionList,
    'billing.getProviderQuotas': providerQuotas,
    'billing.getFallbackChain': LEGACY_COMPAT_RESPONSES['billing.getFallbackChain'],
  };

  if (!procedures.every((name) => getLegacyCompatResponseKey(name))) {
    return null;
  }

  const entries = await Promise.all(procedures.map(async (procedureName, index) => {
    const responseKey = getLegacyCompatResponseKey(procedureName) ?? 'mcp.getStatus';
    let data = dataByResponseKey[responseKey];

    if (responseKey === 'billing.getFallbackChain') {
      const input = procedureInputs[index];
      const taskType = input && typeof input === 'object' ? readString((input as { taskType?: unknown }).taskType) : null;
      data = await buildPreferredFallbackChain(taskType);
    }

    return {
      result: {
        data,
      },
    };
  }));

  return new Response(JSON.stringify(isBatch ? entries : entries[0]), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-hypercode-trpc-compat': 'legacy-mcp-dashboard-bridge',
    },
  });
}

function buildLegacyCompatResponse(req: Request): Response | null {
  return null;
}

async function buildLocalCompatResponse(req: Request, body?: string): Promise<Response | null> {
  const procedureNames = getProcedureNames(req);
  if (procedureNames.length === 0) {
    return null;
  }

  const isBatch = new URL(req.url).searchParams.get('batch') === '1';
  const procedureInputs = extractTrpcProcedureInputs(body, req);
  const localConfig = await loadLocalMcpConfig();
  const localConfigSource = await readLocalMcpSource();
  const localServers = mapConfigToServerList(localConfig);
  const localStatus = await buildPreferredMcpStatus(localServers);
  const toolsList = await buildPreferredToolsList();
  const mcpTraffic = await buildPreferredMcpTraffic();
  const providerQuotas = await buildPreferredProviderQuotas();
  const apiKeys = await buildPreferredApiKeys();
  const cliHarnessDetections = await buildPreferredCliHarnessDetections();
  const executionEnvironment = await buildPreferredExecutionEnvironment(cliHarnessDetections);
  const workingSet = await buildPreferredWorkingSet();
  const toolSelectionTelemetry = await buildPreferredToolSelectionTelemetry();
  const toolPreferences = await buildPreferredToolPreferences();
  const expertStatus = await buildPreferredExpertStatus();
  const sessionState = await buildPreferredSessionState();
  const agentMemoryStats = await buildPreferredAgentMemoryStats();
  const importedMaintenanceStats = await buildPreferredImportedMaintenanceStats();
  const installSurfaces = await buildPreferredInstallSurfaces();
  const memoryStats = await buildPreferredMemoryStats();
  const localStartupStatus = await buildLocalStartupStatus(localServers, executionEnvironment, importedMaintenanceStats);
  const sessionCatalog = buildPreferredSessionCatalog(cliHarnessDetections);
  const sessionList = await buildPreferredSessionList();

  const dataByResponseKey: Record<LocalCompatResponseKey, unknown> = {
    'mcpServers.list': localServers,
    'tools.list': toolsList,
    'mcp.getStatus': localStatus,
    'mcp.traffic': mcpTraffic,
    'session.list': sessionList,
    'billing.getProviderQuotas': providerQuotas,
    'billing.getFallbackChain': LEGACY_COMPAT_RESPONSES['billing.getFallbackChain'],
    startupStatus: localStartupStatus,
    'mcp.getWorkingSet': workingSet,
    'mcp.getToolSelectionTelemetry': toolSelectionTelemetry,
    'mcp.searchTools': [],
    'mcp.getToolPreferences': toolPreferences,
    'mcp.getJsoncEditor': {
      path: localConfigSource.path,
      content: localConfigSource.content,
    },
    'mcpServers.get': undefined,
    'mcpServers.syncTargets': [],
    'mcpServers.exportClientConfig': null,
    'apiKeys.list': apiKeys,
    'secrets.list': await buildPreferredSecretsList(),
    'policies.list': await buildPreferredPoliciesList(),
    'savedScripts.list': await buildPreferredSavedScriptsList(),
    'config.list': [],
    'tools.detectCliHarnesses': cliHarnessDetections,
    'tools.detectExecutionEnvironment': executionEnvironment,
    'tools.detectInstallSurfaces': installSurfaces,
    'expert.getStatus': expertStatus,
    'session.catalog': sessionCatalog,
    'session.importedMaintenanceStats': importedMaintenanceStats,
    'session.getState': sessionState,
    'session.get': null,
    'session.logs': [],
    'session.attachInfo': null,
    'session.health': null,
    'toolSets.list': await buildPreferredToolSetsList(),
    'agentMemory.search': [],
    'agentMemory.add': null,
    'agentMemory.getRecent': [],
    'agentMemory.getByType': [],
    'agentMemory.getByNamespace': [],
    'agentMemory.delete': false,
    'agentMemory.clearSession': { success: false },
    'agentMemory.export': {},
    'agentMemory.handoff': null,
    'agentMemory.pickup': null,
    'agentMemory.stats': agentMemoryStats,
    'memory.getAgentStats': memoryStats,
    'memory.getRecentObservations': [],
    'memory.searchObservations': [],
    'memory.getRecentUserPrompts': [],
    'memory.searchUserPrompts': [],
    'memory.getRecentSessionSummaries': [],
    'memory.searchSessionSummaries': [],
    'memory.searchAgentMemory': [],
    'memory.searchMemoryPivot': [],
    'memory.getMemoryTimelineWindow': [],
    'memory.getCrossSessionMemoryLinks': [],
    'memory.listInterchangeFormats': [],
    'memory.exportMemories': { data: '', format: 'json', exportedAt: null },
    'shell.getSystemHistory': [],
    'serverHealth.check': {
      status: 'unavailable',
      crashCount: 0,
      maxAttempts: 0,
    },
    'project.getContext': '',
    'project.getHandoffs': [],
    'skills.list': [],
    'skills.read': { content: [] },
    'suggestions.list': [],
    'suggestions.resolve': { success: true },
    'suggestions.clearAll': { success: true },
    'squad.list': [],
    'squad.spawn': { success: true, memberId: '' },
    'squad.kill': { success: true },
    'expert.research': { success: true, taskId: '' },
    'expert.code': { success: true, taskId: '' },
    'marketplace.list': [],
    'marketplace.get': null,
    'marketplace.install': { installed: true },
    'marketplace.publish': { entry: null },
    'swarm.startSwarm': { missionId: '', status: 'started' },
    'swarm.resumeMission': { success: true },
    'swarm.listMissions': [],
    'swarm.getMission': null,
    'swarm.stopMission': { success: true },
    'swarm.deleteMission': { success: true },
    'swarm.getLogs': [],
    'swarm.getAnalytics': {},
    'swarm.decomposeTask': { success: true, tasks: [] },
    'swarm.approveTask': { success: true },
    'swarm.updateTaskPriority': { success: true },
    'swarm.consensus': { success: true, consensus: null },
    'swarm.debate': { success: true, result: null },
    'swarm.sendDirectMessage': { success: true },
    'infrastructure.runDoctor': { success: true, output: '' },
    'infrastructure.applyConfigurations': { success: true, output: '' },
    'linksBacklog.stats': { total: 0, pending: 0, completed: 0 },
    'linksBacklog.list': [],
    'linksBacklog.syncFromBobbyBookmarks': { success: true, upserted: 0 },
    'unifiedDirectory.stats': { total: 0, tools: 0, servers: 0 },
    'unifiedDirectory.list': [],
    'workspace.list': [],
    'submodule.list': [],
    'submodule.detectCapabilities': [],
    'git.getModules': [],
    'git.getLog': [],
    'git.getStatus': { branch: 'unknown', clean: false, files: [] },
    'catalog.list': { items: [], total: 0 },
    'catalog.get': null,
    'catalog.listRuns': [],
    'catalog.stats': { total: 0, by_status: {}, by_transport: {}, last_ingest_at: null, providers: 0 },
    'catalog.listLinkedServers': [],
    'browser.status': { available: false, pageCount: 0 },
    'browser.searchHistory': [],
    'browser.scrapePage': null,
    'browser.proxyFetch': null,
    'browser.screenshot': null,
    'browser.debug': null,
    'browser.closePage': null,
    'browser.closeAll': { success: true },
    'council.base.status': { supervisors: [] },
    'council.sessions.list': [],
    'council.sessions.stats': { total: 0, active: 0 },
    'council.history.list': [],
    'council.quota.allStats': {},
    'council.smartPilot.status': { enabled: false },
    'council.visual.systemDiagram': '',
    'director.chat': { response: '' },
    'directorConfig.get': {},
    'directorConfig.update': { success: true },
  };

  const compatEntries = await Promise.all(procedureNames.map(async (procedureName, index) => {
    const responseKey = getLocalCompatResponseKey(procedureName);
    if (!responseKey) {
      return null;
    }

    let data = dataByResponseKey[responseKey];

    if (responseKey === 'mcpServers.get') {
      const input = procedureInputs[index];
      const uuid = input && typeof input === 'object' ? String((input as { uuid?: unknown }).uuid ?? '') : '';
      const match = uuid ? findLocalServerByUuid(localConfig, uuid) : null;
      if (!match) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Configured MCP server unavailable in local dashboard fallback.',
            data: {
              procedure: 'mcpServers.get',
              fallback: 'local-dashboard-fallback',
            },
          },
        };
      }
      data = buildLocalManagedServerRecord(match.name, match.server);
    }

    if (responseKey === 'mcpServers.syncTargets') {
      data = await fetchNativeControlPlaneData<unknown>('/api/mcp/servers/sync-targets');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'mcpServers.exportClientConfig') {
      const input = procedureInputs[index];
      const client = input && typeof input === 'object' ? readString((input as { client?: unknown }).client) : null;
      const overridePath = input && typeof input === 'object' ? readString((input as { path?: unknown }).path) : null;
      data = client
        ? await fetchNativeControlPlaneData<unknown>(`/api/mcp/servers/export-client-config${buildMemoryQueryString({ client, path: overridePath })}`)
        : null;
      if (data === null) {
        data = null;
      }
    }

    if (responseKey === 'billing.getFallbackChain') {
      const input = procedureInputs[index];
      const taskType = input && typeof input === 'object' ? readString((input as { taskType?: unknown }).taskType) : null;
      data = await buildPreferredFallbackChain(taskType);
    }

    if (responseKey === 'mcp.searchTools') {
      const input = procedureInputs[index];
      const query = input && typeof input === 'object' ? readString((input as { query?: unknown }).query) : null;
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      data = await buildPreferredToolSearch(query, limit);
    }

    if (responseKey === 'shell.getSystemHistory') {
      const input = procedureInputs[index];
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      data = await buildPreferredShellSystemHistory(limit);
    }

    if (responseKey === 'agentMemory.search' || responseKey === 'agentMemory.getRecent' || responseKey === 'agentMemory.getByType' || responseKey === 'agentMemory.getByNamespace' || responseKey === 'agentMemory.export') {
      const input = procedureInputs[index];
      const record = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
      let endpointPath = '';

      if (responseKey === 'agentMemory.search') {
        endpointPath = `/api/agent-memory/search${buildMemoryQueryString({
          query: readString(record.query),
          namespace: readString(record.namespace),
          type: readString(record.type),
          limit: readNumber(record.limit),
        })}`;
      } else if (responseKey === 'agentMemory.getRecent') {
        endpointPath = `/api/agent-memory/recent${buildMemoryQueryString({
          limit: readNumber(record.limit),
          type: readString(record.type),
        })}`;
      } else if (responseKey === 'agentMemory.getByType') {
        endpointPath = `/api/agent-memory/by-type${buildMemoryQueryString({
          type: readString(record.type),
        })}`;
      } else if (responseKey === 'agentMemory.getByNamespace') {
        endpointPath = `/api/agent-memory/by-namespace${buildMemoryQueryString({
          namespace: readString(record.namespace),
        })}`;
      } else if (responseKey === 'agentMemory.export') {
        endpointPath = '/api/agent-memory/export';
      }

      if (endpointPath) {
        data = await fetchNativeControlPlaneData<unknown>(endpointPath);
        if (data === null) {
          data = responseKey === 'agentMemory.export' ? {} : [];
        }
      }
    }

    if (responseKey === 'memory.getRecentObservations' || responseKey === 'memory.searchObservations' || responseKey === 'memory.getRecentUserPrompts' || responseKey === 'memory.searchUserPrompts' || responseKey === 'memory.getRecentSessionSummaries' || responseKey === 'memory.searchSessionSummaries' || responseKey === 'memory.searchAgentMemory' || responseKey === 'memory.listInterchangeFormats' || responseKey === 'memory.exportMemories') {
      const input = procedureInputs[index];
      const record = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
      let endpointPath = '';

      if (responseKey === 'memory.getRecentObservations') {
        endpointPath = `/api/memory/observations/recent${buildMemoryQueryString({
          limit: readNumber(record.limit),
          namespace: readString(record.namespace),
          type: readString(record.type),
        })}`;
      } else if (responseKey === 'memory.searchObservations') {
        endpointPath = `/api/memory/observations/search${buildMemoryQueryString({
          query: readString(record.query),
          limit: readNumber(record.limit),
          namespace: readString(record.namespace),
          type: readString(record.type),
        })}`;
      } else if (responseKey === 'memory.getRecentUserPrompts') {
        endpointPath = `/api/memory/user-prompts/recent${buildMemoryQueryString({
          limit: readNumber(record.limit),
          role: readString(record.role),
        })}`;
      } else if (responseKey === 'memory.searchUserPrompts') {
        endpointPath = `/api/memory/user-prompts/search${buildMemoryQueryString({
          query: readString(record.query),
          limit: readNumber(record.limit),
          role: readString(record.role),
        })}`;
      } else if (responseKey === 'memory.getRecentSessionSummaries') {
        endpointPath = `/api/memory/session-summaries/recent${buildMemoryQueryString({
          limit: readNumber(record.limit),
        })}`;
      } else if (responseKey === 'memory.searchSessionSummaries') {
        endpointPath = `/api/memory/session-summaries/search${buildMemoryQueryString({
          query: readString(record.query),
          limit: readNumber(record.limit),
        })}`;
      } else if (responseKey === 'memory.searchAgentMemory') {
        endpointPath = `/api/memory/agent-search${buildMemoryQueryString({
          query: readString(record.query),
          type: readString(record.type),
          limit: readNumber(record.limit),
        })}`;
      } else if (responseKey === 'memory.listInterchangeFormats') {
        endpointPath = '/api/memory/interchange-formats';
      } else if (responseKey === 'memory.exportMemories') {
        endpointPath = `/api/memory/export${buildMemoryQueryString({
          userId: readString(record.userId) ?? 'default',
          format: readString(record.format) ?? 'json',
        })}`;
      }

      if (endpointPath) {
        data = await fetchNativeControlPlaneData<unknown>(endpointPath);
        if (data === null) {
          if (responseKey === 'memory.exportMemories') {
            data = { data: '', format: readString(record.format) ?? 'json', exportedAt: null };
          } else {
            data = [];
          }
        }
      }
    }

    if (responseKey === 'memory.searchMemoryPivot' || responseKey === 'memory.getMemoryTimelineWindow' || responseKey === 'memory.getCrossSessionMemoryLinks') {
      const input = procedureInputs[index];
      const record = input && typeof input === 'object' ? (input as Record<string, unknown>) : null;
      let endpointPath = '';
      if (responseKey === 'memory.searchMemoryPivot') {
        endpointPath = '/api/memory/pivot/search';
      } else if (responseKey === 'memory.getMemoryTimelineWindow') {
        endpointPath = '/api/memory/timeline/window';
      } else if (responseKey === 'memory.getCrossSessionMemoryLinks') {
        endpointPath = '/api/memory/cross-session-links';
      }

      if (endpointPath && record) {
        data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(record),
        });
        if (data === null) {
          data = [];
        }
      }
    }

    if (responseKey === 'session.get') {
      const input = procedureInputs[index];
      const id = input && typeof input === 'object' ? readString((input as { id?: unknown }).id) : null;
      data = await buildPreferredSessionSnapshot(id);
    }

    if (responseKey === 'session.logs') {
      const input = procedureInputs[index];
      const id = input && typeof input === 'object' ? readString((input as { id?: unknown }).id) : null;
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      data = await buildPreferredSessionLogs(id, limit);
    }

    if (responseKey === 'session.attachInfo') {
      const input = procedureInputs[index];
      const id = input && typeof input === 'object' ? readString((input as { id?: unknown }).id) : null;
      data = await buildPreferredSessionAttachInfo(id);
    }

    if (responseKey === 'session.health') {
      const input = procedureInputs[index];
      const id = input && typeof input === 'object' ? readString((input as { id?: unknown }).id) : null;
      data = await buildPreferredSessionHealth(id);
    }

    if (responseKey === 'serverHealth.check') {
      const input = procedureInputs[index];
      const uuid = input && typeof input === 'object' ? String((input as { serverUuid?: unknown }).serverUuid ?? '') : '';
      data = await buildPreferredServerHealth(uuid, localConfig);
    }

    if (responseKey === 'config.list') {
      data = await fetchNativeControlPlaneData<unknown>('/api/config/list');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'project.getContext') {
      data = await fetchNativeControlPlaneData<unknown>('/api/project/context');
      if (data === null) {
        data = '';
      }
    }

    if (responseKey === 'project.getHandoffs') {
      data = await fetchNativeControlPlaneData<unknown>('/api/project/handoffs');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'skills.list') {
      data = await fetchNativeControlPlaneData<unknown>('/api/skills');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'skills.read') {
      const input = procedureInputs[index];
      const name = input && typeof input === 'object' ? readString((input as { name?: unknown }).name) : null;
      data = name ? await fetchNativeControlPlaneData<unknown>(`/api/skills/read${buildMemoryQueryString({ name })}`) : null;
      if (data === null) {
        data = { content: [] };
      }
    }

    if (responseKey === 'suggestions.list') {
      data = await fetchNativeControlPlaneData<unknown>('/api/suggestions');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'squad.list') {
      data = await fetchNativeControlPlaneData<unknown>('/api/squad');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'expert.getStatus') {
      data = await fetchNativeControlPlaneData<unknown>('/api/expert/status');
      if (data === null) {
        data = { status: 'offline' };
      }
    }

    if (responseKey === 'marketplace.list') {
      const input = procedureInputs[index];
      const filter = input && typeof input === 'object' ? readString((input as { filter?: unknown }).filter) : null;
      data = await fetchNativeControlPlaneData<unknown>(`/api/marketplace${buildMemoryQueryString({ filter })}`);
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'marketplace.get') {
      const input = procedureInputs[index];
      const id = input && typeof input === 'object' ? readString((input as { id?: unknown }).id) : null;
      data = id ? await fetchNativeControlPlaneData<unknown>(`/api/marketplace/get${buildMemoryQueryString({ id })}`) : null;
    }

    if (responseKey === 'swarm.listMissions') {
      data = await fetchNativeControlPlaneData<unknown>('/api/swarm/missions');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'swarm.getMission') {
      const input = procedureInputs[index];
      const missionId = input && typeof input === 'object' ? readString((input as { missionId?: unknown }).missionId) : null;
      data = missionId ? await fetchNativeControlPlaneData<unknown>(`/api/swarm/mission${buildMemoryQueryString({ missionId })}`) : null;
    }

    if (responseKey === 'swarm.getLogs') {
      const input = procedureInputs[index];
      const missionId = input && typeof input === 'object' ? readString((input as { missionId?: unknown }).missionId) : null;
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      data = missionId ? await fetchNativeControlPlaneData<unknown>(`/api/swarm/logs${buildMemoryQueryString({ missionId, limit })}`) : null;
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'swarm.getAnalytics') {
      const input = procedureInputs[index];
      const missionId = input && typeof input === 'object' ? readString((input as { missionId?: unknown }).missionId) : null;
      data = missionId ? await fetchNativeControlPlaneData<unknown>(`/api/swarm/analytics${buildMemoryQueryString({ missionId })}`) : null;
      if (data === null) {
        data = {};
      }
    }

    if (responseKey === 'linksBacklog.stats') {
      data = await fetchNativeControlPlaneData<unknown>('/api/links-backlog/stats');
      if (data === null) {
        data = { total: 0, pending: 0, completed: 0 };
      }
    }

    if (responseKey === 'linksBacklog.list') {
      const input = procedureInputs[index];
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      const offset = input && typeof input === 'object' ? readNumber((input as { offset?: unknown }).offset) : null;
      data = await fetchNativeControlPlaneData<unknown>(`/api/links-backlog${buildMemoryQueryString({ limit, offset })}`);
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'unifiedDirectory.stats') {
      data = await fetchNativeControlPlaneData<unknown>('/api/directory/stats');
      if (data === null) {
        data = { total: 0, tools: 0, servers: 0 };
      }
    }

    if (responseKey === 'unifiedDirectory.list') {
      const input = procedureInputs[index];
      const search = input && typeof input === 'object' ? readString((input as { search?: unknown }).search) : null;
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      const offset = input && typeof input === 'object' ? readNumber((input as { offset?: unknown }).offset) : null;
      data = await fetchNativeControlPlaneData<unknown>(`/api/directory${buildMemoryQueryString({ search, limit, offset })}`);
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'workspace.list') {
      data = await fetchNativeControlPlaneData<unknown>('/api/workspace/list');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'submodule.list') {
      data = await fetchNativeControlPlaneData<unknown>('/api/submodules');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'submodule.detectCapabilities') {
      const input = procedureInputs[index];
      const submodulePath = input && typeof input === 'object' ? readString((input as { path?: unknown }).path) : null;
      data = submodulePath ? await fetchNativeControlPlaneData<unknown>(`/api/submodules/capabilities${buildMemoryQueryString({ path: submodulePath })}`) : null;
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'git.getModules') {
      data = await fetchNativeControlPlaneData<unknown>('/api/git/modules');
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'git.getLog') {
      const input = procedureInputs[index];
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      data = await fetchNativeControlPlaneData<unknown>(`/api/git/log${buildMemoryQueryString({ limit })}`);
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'git.getStatus') {
      data = await fetchNativeControlPlaneData<unknown>('/api/git/status');
      if (data === null) {
        data = { branch: 'unknown', clean: false, files: [] };
      }
    }

    if (responseKey === 'catalog.list') {
      const input = procedureInputs[index];
      const search = input && typeof input === 'object' ? readString((input as { search?: unknown }).search) : null;
      const status = input && typeof input === 'object' ? readString((input as { status?: unknown }).status) : null;
      const transport = input && typeof input === 'object' ? readString((input as { transport?: unknown }).transport) : null;
      const install_method = input && typeof input === 'object' ? readString((input as { install_method?: unknown }).install_method) : null;
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      const offset = input && typeof input === 'object' ? readNumber((input as { offset?: unknown }).offset) : null;
      
      data = await fetchNativeControlPlaneData<unknown>(`/api/catalog${buildMemoryQueryString({ search, status, transport, install_method, limit, offset })}`);
      if (data === null) {
        data = { items: [], total: 0 };
      }
    }

    if (responseKey === 'catalog.get') {
      const input = procedureInputs[index];
      const uuid = input && typeof input === 'object' ? readString((input as { uuid?: unknown }).uuid) : null;
      data = uuid ? await fetchNativeControlPlaneData<unknown>(`/api/catalog/get${buildMemoryQueryString({ uuid })}`) : null;
    }

    if (responseKey === 'catalog.listRuns') {
      const input = procedureInputs[index];
      const server_uuid = input && typeof input === 'object' ? readString((input as { server_uuid?: unknown }).server_uuid) : null;
      const limit = input && typeof input === 'object' ? readNumber((input as { limit?: unknown }).limit) : null;
      const offset = input && typeof input === 'object' ? readNumber((input as { offset?: unknown }).offset) : null;
      data = server_uuid ? await fetchNativeControlPlaneData<unknown>(`/api/catalog/runs${buildMemoryQueryString({ server_uuid, limit, offset })}`) : null;
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'catalog.stats') {
      data = await fetchNativeControlPlaneData<unknown>('/api/catalog/stats');
      if (data === null) {
        data = { total: 0, by_status: {}, by_transport: {}, last_ingest_at: null, providers: 0 };
      }
    }

    if (responseKey === 'catalog.listLinkedServers') {
      const input = procedureInputs[index];
      const published_server_uuid = input && typeof input === 'object' ? readString((input as { published_server_uuid?: unknown }).published_server_uuid) : null;
      data = published_server_uuid ? await fetchNativeControlPlaneData<unknown>(`/api/catalog/linked-servers${buildMemoryQueryString({ published_server_uuid })}`) : null;
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'browser.status') {
      data = await fetchNativeControlPlaneData<unknown>('/api/browser/status');
      if (data === null) {
        data = { available: false, pageCount: 0 };
      }
    }

    if (responseKey === 'browser.searchHistory') {
      const input = procedureInputs[index];
      const query = input && typeof input === 'object' ? readString((input as { query?: unknown }).query) : null;
      const maxResults = input && typeof input === 'object' ? readNumber((input as { maxResults?: unknown }).maxResults) : null;
      data = await fetchNativeControlPlaneData<unknown>(`/api/browser/search-history${buildMemoryQueryString({ query, maxResults })}`);
      if (data === null) {
        data = [];
      }
    }

    if (responseKey === 'browser.scrapePage') {
      data = await fetchNativeControlPlaneData<unknown>('/api/browser/scrape');
    }

    if (responseKey === 'browser.proxyFetch' || responseKey === 'browser.screenshot' || responseKey === 'browser.debug' || responseKey === 'browser.closePage' || responseKey === 'browser.closeAll') {
      const input = procedureInputs[index];
      let endpointPath = '';
      if (responseKey === 'browser.proxyFetch') endpointPath = '/api/browser/proxy-fetch';
      else if (responseKey === 'browser.screenshot') endpointPath = '/api/browser/screenshot';
      else if (responseKey === 'browser.debug') endpointPath = '/api/browser/debug';
      else if (responseKey === 'browser.closePage') endpointPath = '/api/browser/close-page';
      else if (responseKey === 'browser.closeAll') endpointPath = '/api/browser/close-all';

      let browserData = await fetchNativeControlPlaneData<unknown>(endpointPath, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: input ? JSON.stringify(input) : undefined,
      });
      if (browserData === null) {
        browserData = responseKey === 'browser.closeAll' ? { success: true } : null;
      }
      data = browserData;
    }

    if (responseKey.startsWith('council.') || responseKey.startsWith('director')) {
      const input = procedureInputs[index];
      let endpointPath = '';
      let method = 'GET';

      if (responseKey === 'council.base.status') endpointPath = '/api/council/status';
      else if (responseKey === 'council.members') endpointPath = '/api/council/members';
      else if (responseKey === 'council.updateMembers') { endpointPath = '/api/council/members/update'; method = 'POST'; }
      else if (responseKey === 'council.sessions.list') endpointPath = '/api/council/sessions';
      else if (responseKey === 'council.sessions.stats') endpointPath = '/api/council/sessions/stats';
      else if (responseKey === 'council.history.list') endpointPath = '/api/council/history/list';
      else if (responseKey === 'council.quota.allStats') endpointPath = '/api/council/quota/stats';
      else if (responseKey === 'council.smartPilot.status') endpointPath = '/api/council/smart-pilot/status';
      else if (responseKey === 'council.visual.systemDiagram') endpointPath = '/api/council/visual/system-diagram';
      else if (responseKey === 'director.chat') { endpointPath = '/api/director/chat'; method = 'POST'; }
      else if (responseKey === 'directorConfig.get') endpointPath = '/api/director-config';
      else if (responseKey === 'directorConfig.update') { endpointPath = '/api/director-config/update'; method = 'POST'; }

      if (endpointPath) {
        data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
          method,
          headers: {
            'content-type': 'application/json',
          },
          body: method === 'POST' && input ? JSON.stringify(input) : undefined,
        });
        if (data === null) {
          if (responseKey.includes('list') || responseKey.includes('stats') || responseKey.includes('history')) {
            data = [];
          } else {
            data = {};
          }
        }
      }
    }

    return {
      result: {
        data,
      },
    };
  }));

  if (compatEntries.some((entry) => entry === null)) {
    return null;
  }

  const payload = isBatch ? compatEntries : compatEntries[0];
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-hypercode-trpc-compat': 'local-dashboard-fallback',
    },
  });
}

function normalizeTrpcPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

function extractLegacyResponseData(entry: unknown): unknown {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }

  const result = (entry as { result?: { data?: unknown } }).result;
  if (!result || typeof result !== 'object') {
    return undefined;
  }

  return result.data;
}

function isLegacyResponseEffectivelyEmpty(req: Request, payload: unknown): boolean {
  const procedures = getProcedureNames(req);
  const entries = normalizeTrpcPayload(payload);

  if (procedures.length === 0 || entries.length === 0) {
    return false;
  }

  return procedures.every((procedureName, index) => {
    const responseKey = getLegacyCompatResponseKey(procedureName);
    if (!responseKey) {
      return false;
    }

    const data = extractLegacyResponseData(entries[index]);

    if (responseKey === 'mcpServers.list' || responseKey === 'tools.list' || responseKey === 'mcp.traffic' || responseKey === 'session.list' || responseKey === 'billing.getProviderQuotas') {
      return Array.isArray(data) && data.length === 0;
    }

    if (responseKey === 'billing.getFallbackChain') {
      return Boolean(data) && typeof data === 'object' && Array.isArray((data as { chain?: unknown[] }).chain) && ((data as { chain?: unknown[] }).chain?.length ?? 0) === 0;
    }

    if (responseKey === 'mcp.getStatus') {
      return Boolean(data)
        && typeof data === 'object'
        && Number((data as { serverCount?: unknown }).serverCount ?? 0) === 0
        && Number((data as { toolCount?: unknown }).toolCount ?? 0) === 0
        && Number((data as { connectedCount?: unknown }).connectedCount ?? 0) === 0;
    }

    return false;
  });
}

async function shouldPreferLocalCompat(req: Request, upstreamResponse: Response): Promise<boolean> {
  if (!isLegacyMcpRequest(req) || !upstreamResponse.ok) {
    return false;
  }

  const localConfig = await loadLocalMcpConfig();
  if (Object.keys(localConfig.mcpServers).length === 0) {
    return false;
  }

  try {
    const payload = await upstreamResponse.clone().json();
    return isLegacyResponseEffectivelyEmpty(req, payload);
  } catch {
    return false;
  }
}

function cloneHeaders(req: Request): Headers {
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  return headers;
}

function isBatchRequest(req: Request): boolean {
  return new URL(req.url).searchParams.get('batch') === '1';
}

function isBulkImportRequest(req: Request): boolean {
  const procedures = getProcedureNames(req);
  return req.method === 'POST' && procedures.length === 1 && procedures[0] === 'mcpServers.bulkImport';
}

function buildTrpcResponse(req: Request, data: unknown, init?: ResponseInit): Response {
  const payload = isBatchRequest(req)
    ? [{ result: { data } }]
    : { result: { data } };

  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

function parseTrpcInputEntries(parsed: unknown, req: Request): unknown[] {
  if (isBatchRequest(req) && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return Object.entries(parsed as Record<string, unknown>)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => {
        if (value && typeof value === 'object' && 'json' in (value as Record<string, unknown>)) {
          return (value as { json?: unknown }).json;
        }

        return value;
      });
  }

  if (parsed && typeof parsed === 'object' && 'json' in (parsed as Record<string, unknown>)) {
    return [(parsed as { json?: unknown }).json];
  }

  return [parsed];
}

function extractTrpcProcedureInputs(body: string | undefined, req: Request): unknown[] {
  const sources = body
    ? [body, new URL(req.url).searchParams.get('input')]
    : [new URL(req.url).searchParams.get('input')];

  for (const source of sources) {
    if (!source) {
      continue;
    }

    try {
      const parsed = JSON.parse(source) as unknown;
      return parseTrpcInputEntries(parsed, req);
    } catch {
      // Try the next tRPC input source.
    }
  }

  return [];
}

function extractTrpcRequestInput(body: string | undefined, req: Request): unknown {
  return extractTrpcProcedureInputs(body, req)[0];
}

function normalizeBulkImportProxyBody(req: Request, body: string | undefined): string | undefined {
  if (!isBulkImportRequest(req)) {
    return body;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!Array.isArray(input)) {
    return body;
  }

  return JSON.stringify(input);
}

async function tryBridgeBulkImport(
  req: Request,
  upstreamBases: string[],
  headers: Headers,
  body: string | undefined,
): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  if (req.method !== 'POST' || procedures.length !== 1 || procedures[0] !== 'mcpServers.bulkImport') {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!Array.isArray(input)) {
    return null;
  }

  const mcpServers: Record<string, {
    type: unknown;
    description: unknown;
    command: unknown;
    args: unknown[];
    env: unknown;
    url: unknown;
    bearerToken: unknown;
    headers: unknown;
  }> = {};

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const name = String(item.name ?? '').trim();
    if (!name) {
      continue;
    }

    mcpServers[name] = {
      type: item.type ?? 'STDIO',
      description: item.description ?? undefined,
      command: item.command ?? undefined,
      args: Array.isArray(item.args) ? item.args : [],
      env: item.env ?? {},
      url: item.url ?? undefined,
      bearerToken: item.bearerToken ?? undefined,
      headers: item.headers ?? {},
    };
  }

  if (Object.keys(mcpServers).length === 0) {
    return buildTrpcResponse(req, { imported: 0, errors: ['No valid MCP servers were provided.'] }, { status: 200 });
  }

  for (const upstreamBase of upstreamBases) {
    const normalizedBase = upstreamBase.replace(/\/$/, '');

    for (const procedureName of LEGACY_MCP_BULK_IMPORT_PROCEDURES) {
      try {
        const response = await fetch(`${normalizedBase}/${procedureName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ mcpServers }),
        });

        if (response.status === 404) {
          continue;
        }

        if (!response.ok) {
          continue;
        }

        const json = await response.json();
        return buildTrpcResponse(req, extractTrpcData(json), {
          status: response.status,
          statusText: response.statusText,
          headers: { 'x-hypercode-trpc-compat': 'legacy-mcp-bulk-import-bridge' },
        });
      } catch {
        // Try the next candidate upstream/procedure.
      }
    }
  }

  return null;
}

async function tryLocalBulkImport(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  if (req.method !== 'POST' || procedures.length !== 1 || procedures[0] !== 'mcpServers.bulkImport') {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!Array.isArray(input)) {
    return null;
  }

  const localConfig = await loadLocalMcpConfig();
  let imported = 0;

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const name = String(item.name ?? '').trim();
    if (!name) {
      continue;
    }

    localConfig.mcpServers[name] = {
      command: typeof item.command === 'string' ? item.command : undefined,
      args: Array.isArray(item.args) ? item.args.filter((arg): arg is string => typeof arg === 'string') : [],
      env: item.env && typeof item.env === 'object'
        ? Object.fromEntries(Object.entries(item.env as Record<string, unknown>).map(([key, value]) => [key, String(value)]))
        : undefined,
      url: typeof item.url === 'string' ? item.url : undefined,
      description: typeof item.description === 'string' ? item.description : null,
      type: normalizeImportedServerType({
        type: typeof item.type === 'string' ? item.type : undefined,
        url: typeof item.url === 'string' ? item.url : undefined,
      }),
      bearerToken: typeof item.bearerToken === 'string' ? item.bearerToken : undefined,
      headers: item.headers && typeof item.headers === 'object'
        ? Object.fromEntries(Object.entries(item.headers as Record<string, unknown>).map(([key, value]) => [key, String(value)]))
        : undefined,
    };
    imported += 1;
  }

  await writeLocalMcpConfig(localConfig);
  return buildTrpcResponse(req, { imported, errors: [] }, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-mcp-config-bulk-import' },
  });
}

async function tryLocalSessionMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_SESSION_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if ((procedureName === 'session.clear' && (input === null || input === undefined || typeof input === 'object')) || (input && typeof input === 'object')) {
    let endpointPath = '';
    let method: 'POST' = 'POST';
    let requestBody: string | undefined;

    if (procedureName === 'session.create') {
      endpointPath = '/api/sessions/supervisor/create';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'session.start') {
      endpointPath = '/api/sessions/supervisor/start';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'session.stop') {
      endpointPath = '/api/sessions/supervisor/stop';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'session.restart') {
      endpointPath = '/api/sessions/supervisor/restart';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'session.executeShell') {
      endpointPath = '/api/sessions/supervisor/execute-shell';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'session.updateState') {
      endpointPath = '/api/sessions/supervisor/update-state';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'session.clear') {
      endpointPath = '/api/sessions/supervisor/clear';
      requestBody = JSON.stringify(input ?? {});
    }

    if (!endpointPath) {
      return null;
    }

    const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
      method,
      headers: {
        'content-type': 'application/json',
      },
      ...(requestBody ? { body: requestBody } : {}),
    });

    if (data === null && procedureName !== 'session.clear') {
      return null;
    }

    return buildTrpcResponse(req, data ?? { success: true }, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-session-supervisor-action' },
    });
  }

  return buildTrpcResponse(req, undefined, {
    status: 400,
    statusText: 'Invalid local session compat input',
    headers: { 'x-hypercode-trpc-compat': 'local-session-supervisor-action' },
  });
}

async function tryLocalOperatorMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_OPERATOR_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local operator compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-operator-action' },
    });
  }

  let endpointPath = '';
  if (procedureName === 'apiKeys.create') {
    endpointPath = '/api/api-keys/create';
  } else if (procedureName === 'apiKeys.delete') {
    endpointPath = '/api/api-keys/delete';
  } else if (procedureName === 'secrets.set') {
    endpointPath = '/api/secrets/set';
  } else if (procedureName === 'secrets.delete') {
    endpointPath = '/api/secrets/delete';
  } else if (procedureName === 'policies.create') {
    endpointPath = '/api/policies/create';
  } else if (procedureName === 'policies.update') {
    endpointPath = '/api/policies/update';
  } else if (procedureName === 'policies.delete') {
    endpointPath = '/api/policies/delete';
  } else if (procedureName === 'toolSets.create') {
    endpointPath = '/api/tool-sets/create';
  } else if (procedureName === 'toolSets.delete') {
    endpointPath = '/api/tool-sets/delete';
  } else if (procedureName === 'savedScripts.create') {
    endpointPath = '/api/scripts/create';
  } else if (procedureName === 'savedScripts.update') {
    endpointPath = '/api/scripts/update';
  } else if (procedureName === 'savedScripts.delete') {
    endpointPath = '/api/scripts/delete';
  } else if (procedureName === 'savedScripts.execute') {
    endpointPath = '/api/scripts/execute';
  }

  if (!endpointPath) {
    return null;
  }

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-operator-action' },
  });
}

async function tryLocalConfigMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_CONFIG_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local config compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-config-action' },
    });
  }

  const data = await fetchNativeControlPlaneData<unknown>('/api/config/update', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-config-action' },
  });
}

async function tryLocalToolMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_TOOL_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local tool compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-tool-action' },
    });
  }

  const data = await fetchNativeControlPlaneData<unknown>('/api/tools/always-on', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-tool-action' },
  });
}

async function tryLocalMemoryMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_MEMORY_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local memory compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-memory-action' },
    });
  }

  let endpointPath = '';
  if (procedureName === 'memory.addFact') {
    endpointPath = '/api/memory/facts/add';
  } else if (procedureName === 'memory.importMemories') {
    endpointPath = '/api/memory/import';
  } else if (procedureName === 'memory.convertMemories') {
    endpointPath = '/api/memory/convert';
  }

  if (!endpointPath) {
    return null;
  }

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-memory-action' },
  });
}

async function tryLocalAgentMemoryMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_AGENT_MEMORY_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  const expectsObject = procedureName !== 'agentMemory.clearSession';
  if ((expectsObject && (!input || typeof input !== 'object')) || (!expectsObject && input !== null && input !== undefined && typeof input !== 'object')) {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local agent memory compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-agent-memory-action' },
    });
  }

  let endpointPath = '';
  if (procedureName === 'agentMemory.add') {
    endpointPath = '/api/agent-memory/add';
  } else if (procedureName === 'agentMemory.delete') {
    endpointPath = '/api/agent-memory/delete';
  } else if (procedureName === 'agentMemory.clearSession') {
    endpointPath = '/api/agent-memory/clear-session';
  } else if (procedureName === 'agentMemory.handoff') {
    endpointPath = '/api/agent-memory/handoff';
  } else if (procedureName === 'agentMemory.pickup') {
    endpointPath = '/api/agent-memory/pickup';
  }

  if (!endpointPath) {
    return null;
  }

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify((input && typeof input === 'object') ? input : {}),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-agent-memory-action' },
  });
}

async function tryLocalProjectMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_PROJECT_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local project compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-project-action' },
    });
  }

  const data = await fetchNativeControlPlaneData<unknown>('/api/project/context/update', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-project-action' },
  });
}

async function tryLocalSkillMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_SKILL_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local skill compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-skill-action' },
    });
  }

  const data = await fetchNativeControlPlaneData<unknown>('/api/skills/assimilate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-skill-action' },
  });
}

async function tryLocalSuggestionsMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_SUGGESTIONS_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'suggestions.resolve') endpointPath = '/api/suggestions/resolve';
  else if (procedureName === 'suggestions.clearAll') endpointPath = '/api/suggestions/clear-all';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-suggestions-action' },
  });
}

async function tryLocalSquadMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_SQUAD_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'squad.spawn') endpointPath = '/api/squad/spawn';
  else if (procedureName === 'squad.kill') endpointPath = '/api/squad/kill';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-squad-action' },
  });
}

async function tryLocalExpertMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_EXPERT_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'expert.research') endpointPath = '/api/expert/research';
  else if (procedureName === 'expert.code') endpointPath = '/api/expert/code';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-expert-action' },
  });
}

async function tryLocalMarketplaceMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_MARKETPLACE_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'marketplace.install') endpointPath = '/api/marketplace/install';
  else if (procedureName === 'marketplace.publish') endpointPath = '/api/marketplace/publish';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-marketplace-action' },
  });
}

async function tryLocalSwarmMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_SWARM_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'swarm.startSwarm') endpointPath = '/api/swarm/start';
  else if (procedureName === 'swarm.resumeMission') endpointPath = '/api/swarm/resume';
  else if (procedureName === 'swarm.stopMission') endpointPath = '/api/swarm/stop';
  else if (procedureName === 'swarm.deleteMission') endpointPath = '/api/swarm/delete';
  else if (procedureName === 'swarm.decomposeTask') endpointPath = '/api/swarm/decompose-task';
  else if (procedureName === 'swarm.approveTask') endpointPath = '/api/swarm/approve-task';
  else if (procedureName === 'swarm.updateTaskPriority') endpointPath = '/api/swarm/update-task-priority';
  else if (procedureName === 'swarm.seekConsensus') endpointPath = '/api/swarm/consensus';
  else if (procedureName === 'swarm.executeDebate') endpointPath = '/api/swarm/debate';
  else if (procedureName === 'swarm.sendDirectMessage') endpointPath = '/api/swarm/send-direct-message';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-swarm-action' },
  });
}

async function tryLocalInfrastructureMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_INFRASTRUCTURE_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'infrastructure.runDoctor') endpointPath = '/api/infrastructure/run-doctor';
  else if (procedureName === 'infrastructure.applyConfigurations') endpointPath = '/api/infrastructure/apply-configurations';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-infrastructure-action' },
  });
}

async function tryLocalLinksBacklogMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_LINKS_BACKLOG_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  let endpointPath = '';
  if (procedureName === 'linksBacklog.syncFromBobbyBookmarks') endpointPath = '/api/links-backlog/sync';

  if (!endpointPath) return null;

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });
  if (data === null) return null;

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-links-backlog-action' },
  });
}

async function tryLocalSubmoduleMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_SUBMODULE_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);

  let endpointPath = '';
  if (procedureName === 'submodule.updateAll') {
    endpointPath = '/api/submodules/update-all';
  } else if (procedureName === 'submodule.installDependencies') {
    endpointPath = '/api/submodules/install-dependencies';
  } else if (procedureName === 'submodule.build') {
    endpointPath = '/api/submodules/build';
  } else if (procedureName === 'submodule.enable') {
    endpointPath = '/api/submodules/enable';
  } else if (procedureName === 'git.revert') {
    endpointPath = '/api/git/revert';
  }

  if (!endpointPath) {
    return null;
  }

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-submodule-action' },
  });
}

async function tryLocalCatalogMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_CATALOG_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);

  let endpointPath = '';
  if (procedureName === 'catalog.triggerIngestion') {
    endpointPath = '/api/catalog/ingest';
  } else if (procedureName === 'catalog.triggerValidation') {
    endpointPath = '/api/catalog/validate';
  } else if (procedureName === 'catalog.installFromRecipe') {
    endpointPath = '/api/catalog/install';
  } else if (procedureName === 'catalog.triggerBatchValidation') {
    endpointPath = '/api/catalog/validate-batch';
  }

  if (!endpointPath) {
    return null;
  }

  const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (data === null) {
    return null;
  }

  return buildTrpcResponse(req, data, {
    status: 200,
    headers: { 'x-hypercode-trpc-compat': 'local-catalog-action' },
  });
}

async function tryLocalMCPRuntimeMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  const procedureName = procedures[0] ?? '';
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_MCP_RUNTIME_MUTATION_PROCEDURES.has(procedureName)) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if ((input === null || input === undefined || typeof input === 'object')) {
    let endpointPath = '';
    let requestBody: string | undefined;

    if (procedureName === 'mcp.setToolPreferences') {
      endpointPath = '/api/mcp/preferences';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'mcp.loadTool') {
      endpointPath = '/api/mcp/working-set/load';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'mcp.unloadTool') {
      endpointPath = '/api/mcp/working-set/unload';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'mcp.clearToolSelectionTelemetry') {
      endpointPath = '/api/mcp/tool-selection-telemetry/clear';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'mcp.clearWorkingSetEvictionHistory') {
      endpointPath = '/api/mcp/working-set/evictions/clear';
      requestBody = JSON.stringify(input ?? {});
    } else if (procedureName === 'mcp.setLifecycleModes') {
      endpointPath = '/api/mcp/lifecycle-modes';
      requestBody = JSON.stringify(input ?? {});
    }

    if (!endpointPath) {
      return null;
    }

    const data = await fetchNativeControlPlaneData<unknown>(endpointPath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      ...(requestBody ? { body: requestBody } : {}),
    });

    if (data === null) {
      return null;
    }

    return buildTrpcResponse(req, data, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-runtime-action' },
    });
  }

  return buildTrpcResponse(req, undefined, {
    status: 400,
    statusText: 'Invalid local MCP runtime compat input',
    headers: { 'x-hypercode-trpc-compat': 'local-mcp-runtime-action' },
  });
}

async function tryLocalManagedServerMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_MCP_CONFIG_MUTATION_PROCEDURES.has(procedures[0] ?? '')) {
    return null;
  }

  const input = extractTrpcRequestInput(body, req);
  if (!input || typeof input !== 'object') {
    return buildTrpcResponse(req, undefined, {
      status: 400,
      statusText: 'Invalid local MCP compat input',
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  const procedureName = procedures[0] ?? '';
  if (procedureName === 'mcpServers.syncClientConfig') {
    const data = await fetchNativeControlPlaneData<unknown>('/api/mcp/servers/sync-client-config', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (data === null) {
      return null;
    }

    return buildTrpcResponse(req, data, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  const localConfig = await loadLocalMcpConfig();

  if (procedureName === 'mcpServers.create') {
    const name = String((input as { name?: unknown }).name ?? '').trim();
    if (!name) {
      return buildTrpcResponse(req, undefined, {
        status: 400,
        statusText: 'Server name is required',
        headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
      });
    }

    if (localConfig.mcpServers[name]) {
      return buildTrpcResponse(req, undefined, {
        status: 409,
        statusText: 'Server already exists',
        headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
      });
    }

    localConfig.mcpServers[name] = {
      command: typeof (input as { command?: unknown }).command === 'string' ? (input as { command?: string }).command : undefined,
      args: Array.isArray((input as { args?: unknown[] }).args)
        ? (input as { args?: unknown[] }).args?.filter((arg): arg is string => typeof arg === 'string')
        : [],
      env: (input as { env?: unknown }).env && typeof (input as { env?: unknown }).env === 'object'
        ? Object.fromEntries(Object.entries((input as { env?: Record<string, unknown> }).env ?? {}).map(([key, value]) => [key, String(value)]))
        : {},
      url: typeof (input as { url?: unknown }).url === 'string' ? (input as { url?: string }).url : undefined,
      disabled: false,
      description: typeof (input as { description?: unknown }).description === 'string' ? (input as { description?: string }).description : null,
      type: normalizeImportedServerType({
        type: typeof (input as { type?: unknown }).type === 'string' ? (input as { type?: string }).type : undefined,
        url: typeof (input as { url?: unknown }).url === 'string' ? (input as { url?: string }).url : undefined,
      }),
      bearerToken: typeof (input as { bearerToken?: unknown }).bearerToken === 'string' ? (input as { bearerToken?: string }).bearerToken : undefined,
      headers: (input as { headers?: unknown }).headers && typeof (input as { headers?: unknown }).headers === 'object'
        ? Object.fromEntries(Object.entries((input as { headers?: Record<string, unknown> }).headers ?? {}).map(([key, value]) => [key, String(value)]))
        : {},
    };

    upsertLocalServerMeta(localConfig, name);
    await writeLocalMcpConfig(localConfig);

    return buildTrpcResponse(req, buildLocalManagedServerRecord(name, localConfig.mcpServers[name]), {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  const localUuid = String((input as { uuid?: unknown; serverUuid?: unknown }).uuid ?? (input as { serverUuid?: unknown }).serverUuid ?? '').trim();
  const match = localUuid ? findLocalServerByUuid(localConfig, localUuid) : null;
  if (!match) {
    return buildTrpcResponse(req, undefined, {
      status: 404,
      statusText: 'Local managed MCP server not found',
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  if (procedureName === 'mcpServers.update') {
    const nextName = typeof (input as { name?: unknown }).name === 'string' && String((input as { name?: unknown }).name).trim()
      ? String((input as { name?: unknown }).name).trim()
      : match.name;
    const existingMeta = buildLocalServerMeta(match.name, match.server);
    const updatedServer: LocalMcpServerEntry = {
      ...match.server,
      description: typeof (input as { description?: unknown }).description === 'string'
        ? (input as { description?: string }).description
        : (input as { description?: null }).description === null
          ? null
          : match.server.description ?? null,
      type: normalizeImportedServerType({
        type: typeof (input as { type?: unknown }).type === 'string'
          ? String((input as { type?: unknown }).type)
          : match.server.type,
        url: typeof (input as { url?: unknown }).url === 'string'
          ? String((input as { url?: unknown }).url)
          : match.server.url,
      }),
      command: typeof (input as { command?: unknown }).command === 'string'
        ? (input as { command?: string }).command
        : (input as { command?: null }).command === null
          ? undefined
          : match.server.command,
      args: Array.isArray((input as { args?: unknown[] }).args)
        ? (input as { args?: unknown[] }).args?.filter((arg): arg is string => typeof arg === 'string')
        : match.server.args ?? [],
      env: (input as { env?: unknown }).env && typeof (input as { env?: unknown }).env === 'object'
        ? Object.fromEntries(Object.entries((input as { env?: Record<string, unknown> }).env ?? {}).map(([key, value]) => [key, String(value)]))
        : match.server.env ?? {},
      url: typeof (input as { url?: unknown }).url === 'string'
        ? (input as { url?: string }).url
        : (input as { url?: null }).url === null
          ? undefined
          : match.server.url,
      bearerToken: typeof (input as { bearerToken?: unknown }).bearerToken === 'string'
        ? (input as { bearerToken?: string }).bearerToken
        : (input as { bearerToken?: null }).bearerToken === null
          ? undefined
          : match.server.bearerToken,
      headers: (input as { headers?: unknown }).headers && typeof (input as { headers?: unknown }).headers === 'object'
        ? Object.fromEntries(Object.entries((input as { headers?: Record<string, unknown> }).headers ?? {}).map(([key, value]) => [key, String(value)]))
        : match.server.headers ?? {},
      _meta: existingMeta,
    };

    if (nextName !== match.name) {
      delete localConfig.mcpServers[match.name];
    }

    localConfig.mcpServers[nextName] = updatedServer;
    upsertLocalServerMeta(localConfig, nextName, { uuid: existingMeta.uuid });
    await writeLocalMcpConfig(localConfig);

    return buildTrpcResponse(req, buildLocalManagedServerRecord(nextName, localConfig.mcpServers[nextName]), {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  if (procedureName === 'mcpServers.delete') {
    const deletedServer = buildLocalManagedServerRecord(match.name, match.server);
    delete localConfig.mcpServers[match.name];
    await writeLocalMcpConfig(localConfig);

    return buildTrpcResponse(req, deletedServer, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  if (procedureName === 'mcpServers.reloadMetadata') {
    const mode = typeof (input as { mode?: unknown }).mode === 'string' ? String((input as { mode?: unknown }).mode) : 'binary';
    const metadata = upsertLocalServerMeta(localConfig, match.name, {
      status: 'ready',
      metadataSource: `local-${mode}`,
      toolCount: sanitizeNumericMetadata(match.server._meta?.toolCount, 0),
      lastSuccessfulBinaryLoadAt: new Date().toISOString(),
    });
    await writeLocalMcpConfig(localConfig);

    return buildTrpcResponse(req, {
      server: buildLocalManagedServerRecord(match.name, localConfig.mcpServers[match.name]),
      metadata,
    }, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  if (procedureName === 'mcpServers.clearMetadataCache') {
    const metadata = upsertLocalServerMeta(localConfig, match.name, {
      status: match.server.disabled ? 'disabled' : 'pending',
      metadataSource: LOCAL_COMPAT_METADATA_SOURCE,
      toolCount: 0,
      lastSuccessfulBinaryLoadAt: null,
    });
    await writeLocalMcpConfig(localConfig);

    return buildTrpcResponse(req, {
      server: buildLocalManagedServerRecord(match.name, localConfig.mcpServers[match.name]),
      metadata,
    }, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  if (procedureName === 'serverHealth.reset') {
    upsertLocalServerMeta(localConfig, match.name, {
      crashCount: 0,
      maxAttempts: 0,
    });
    await writeLocalMcpConfig(localConfig);

    return buildTrpcResponse(req, {
      status: 'unavailable',
      crashCount: 0,
      maxAttempts: 0,
    }, {
      status: 200,
      headers: { 'x-hypercode-trpc-compat': 'local-mcp-managed-action' },
    });
  }

  return null;
}

async function handler(req: Request): Promise<Response> {
  const upstreamBases = resolveUpstreamBases();
  const headers = cloneHeaders(req);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;
  const upstreamBody = normalizeBulkImportProxyBody(req, body);

  let upstreamResponse: Response | null = null;
  let lastUpstreamUrl = '';
  let lastError: unknown;
  let saw404 = false;

  for (const upstreamBase of upstreamBases) {
    const upstreamUrl = buildUpstreamUrl(req, upstreamBase);
    lastUpstreamUrl = upstreamUrl.toString();

    try {
      const response = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body: upstreamBody,
      });

      if (response.status === 404) {
        saw404 = true;
        continue;
      }

      if (response.status >= 500 && canFallbackLocally(req)) {
        continue;
      }

      if (isLegacyMcpRequest(req) && (response.status === 401 || response.status === 403)) {
        continue;
      }

      upstreamResponse = response;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!upstreamResponse) {
    const bulkImportBridgeResponse = await tryBridgeBulkImport(req, upstreamBases, headers, body);
    if (bulkImportBridgeResponse) {
      return bulkImportBridgeResponse;
    }

    const localSessionMutationResponse = await tryLocalSessionMutation(req, body);
    if (localSessionMutationResponse) {
      return localSessionMutationResponse;
    }

    const localOperatorMutationResponse = await tryLocalOperatorMutation(req, body);
    if (localOperatorMutationResponse) {
      return localOperatorMutationResponse;
    }

    const localConfigMutationResponse = await tryLocalConfigMutation(req, body);
    if (localConfigMutationResponse) {
      return localConfigMutationResponse;
    }

    const localToolMutationResponse = await tryLocalToolMutation(req, body);
    if (localToolMutationResponse) {
      return localToolMutationResponse;
    }

    const localMemoryMutationResponse = await tryLocalMemoryMutation(req, body);
    if (localMemoryMutationResponse) {
      return localMemoryMutationResponse;
    }

    const localAgentMemoryMutationResponse = await tryLocalAgentMemoryMutation(req, body);
    if (localAgentMemoryMutationResponse) {
      return localAgentMemoryMutationResponse;
    }

    const localProjectMutationResponse = await tryLocalProjectMutation(req, body);
    if (localProjectMutationResponse) {
      return localProjectMutationResponse;
    }

    const localSkillMutationResponse = await tryLocalSkillMutation(req, body);
    if (localSkillMutationResponse) {
      return localSkillMutationResponse;
    }

    const localSuggestionsMutationResponse = await tryLocalSuggestionsMutation(req, body);
    if (localSuggestionsMutationResponse) {
      return localSuggestionsMutationResponse;
    }

    const localSquadMutationResponse = await tryLocalSquadMutation(req, body);
    if (localSquadMutationResponse) {
      return localSquadMutationResponse;
    }

    const localExpertMutationResponse = await tryLocalExpertMutation(req, body);
    if (localExpertMutationResponse) {
      return localExpertMutationResponse;
    }

    const localMarketplaceMutationResponse = await tryLocalMarketplaceMutation(req, body);
    if (localMarketplaceMutationResponse) {
      return localMarketplaceMutationResponse;
    }

    const localSwarmMutationResponse = await tryLocalSwarmMutation(req, body);
    if (localSwarmMutationResponse) {
      return localSwarmMutationResponse;
    }

    const localInfrastructureMutationResponse = await tryLocalInfrastructureMutation(req, body);
    if (localInfrastructureMutationResponse) {
      return localInfrastructureMutationResponse;
    }

    const localLinksBacklogMutationResponse = await tryLocalLinksBacklogMutation(req, body);
    if (localLinksBacklogMutationResponse) {
      return localLinksBacklogMutationResponse;
    }

    const localSubmoduleMutationResponse = await tryLocalSubmoduleMutation(req, body);
    if (localSubmoduleMutationResponse) {
      return localSubmoduleMutationResponse;
    }

    const localCatalogMutationResponse = await tryLocalCatalogMutation(req, body);
    if (localCatalogMutationResponse) {
      return localCatalogMutationResponse;
    }

    const localMCPRuntimeMutationResponse = await tryLocalMCPRuntimeMutation(req, body);
    if (localMCPRuntimeMutationResponse) {
      return localMCPRuntimeMutationResponse;
    }

    const localManagedMutationResponse = await tryLocalManagedServerMutation(req, body);
    if (localManagedMutationResponse) {
      return localManagedMutationResponse;
    }

    const localBulkImportResponse = await tryLocalBulkImport(req, body);
    if (localBulkImportResponse) {
      return localBulkImportResponse;
    }

    const bridgeResponse = await tryResolveLegacyMcpResponse(req, upstreamBases, headers, body);
    if (bridgeResponse) {
      return bridgeResponse;
    }

    const compatResponse = await buildLocalCompatResponse(req, body);
    if (compatResponse) {
      return compatResponse;
    }

    const message = saw404
      ? 'No configured tRPC upstream exposed the requested procedure path'
      : lastError instanceof Error
        ? lastError.message
        : String(lastError ?? 'No upstream responded');
    return new Response(
      JSON.stringify({
        error: 'TRPC_UPSTREAM_UNAVAILABLE',
        message,
        upstream: lastUpstreamUrl,
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  if (await shouldPreferLocalCompat(req, upstreamResponse)) {
    const compatResponse = await buildLocalCompatResponse(req, body);
    if (compatResponse) {
      return compatResponse;
    }
  }

  // Detect and handle SSE (Server-Sent Events) for subscriptions
  const isSse = upstreamResponse.headers.get('content-type')?.includes('text/event-stream');
  
  const responseHeaders = new Headers(upstreamResponse.headers);
  if (isSse) {
    responseHeaders.set('Connection', 'keep-alive');
    responseHeaders.set('Cache-Control', 'no-cache, no-transform');
    responseHeaders.set('X-Accel-Buffering', 'no');
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export { handler as GET, handler as POST };
