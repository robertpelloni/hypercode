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
  'apiKeys.list': 'apiKeys.list',
  'tools.detectCliHarnesses': 'tools.detectCliHarnesses',
  'tools.detectExecutionEnvironment': 'tools.detectExecutionEnvironment',
  'tools.detectInstallSurfaces': 'tools.detectInstallSurfaces',
  'expert.getStatus': 'expert.getStatus',
  'session.catalog': 'session.catalog',
  'session.getState': 'session.getState',
  'agentMemory.stats': 'agentMemory.stats',
  'shell.getSystemHistory': 'shell.getSystemHistory',
  'serverHealth.check': 'serverHealth.check',
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
const LOCAL_COMPAT_MUTATION_PROCEDURES = new Set([
  'mcpServers.create',
  'mcpServers.update',
  'mcpServers.delete',
  'mcpServers.reloadMetadata',
  'mcpServers.clearMetadataCache',
  'serverHealth.reset',
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

async function buildLocalStartupStatus(
  servers: unknown[],
  executionEnvironment?: Record<string, unknown> | null,
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
  const providerQuotas = await buildPreferredProviderQuotas();
  const sessionList = await buildPreferredSessionList();

  const dataByResponseKey: Record<LegacyCompatResponseKey, unknown> = {
    'mcpServers.list': effectiveServers,
    'tools.list': LEGACY_COMPAT_RESPONSES['tools.list'],
    'mcp.getStatus': status,
    'mcp.traffic': LEGACY_COMPAT_RESPONSES['mcp.traffic'],
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
  const providerQuotas = await buildPreferredProviderQuotas();
  const cliHarnessDetections = await buildPreferredCliHarnessDetections();
  const executionEnvironment = await buildPreferredExecutionEnvironment(cliHarnessDetections);
  const localStartupStatus = await buildLocalStartupStatus(localServers, executionEnvironment);
  const sessionCatalog = buildPreferredSessionCatalog(cliHarnessDetections);
  const sessionList = await buildPreferredSessionList();

  const dataByResponseKey: Record<LocalCompatResponseKey, unknown> = {
    'mcpServers.list': localServers,
    'tools.list': LEGACY_COMPAT_RESPONSES['tools.list'],
    'mcp.getStatus': localStatus,
    'mcp.traffic': LEGACY_COMPAT_RESPONSES['mcp.traffic'],
    'session.list': sessionList,
    'billing.getProviderQuotas': providerQuotas,
    'billing.getFallbackChain': LEGACY_COMPAT_RESPONSES['billing.getFallbackChain'],
    startupStatus: localStartupStatus,
    'mcp.getWorkingSet': {
      tools: [],
      limits: {
        maxLoadedTools: 24,
        maxHydratedSchemas: 8,
      },
    },
    'mcp.getToolSelectionTelemetry': [],
    'mcp.searchTools': [],
    'mcp.getToolPreferences': {
      importantTools: [],
      alwaysLoadedTools: ['search_tools', 'read_file', 'write_file', 'grep_search', 'execute_command', 'browser__open'],
    },
    'mcp.getJsoncEditor': {
      path: localConfigSource.path,
      content: localConfigSource.content,
    },
    'mcpServers.get': undefined,
    'apiKeys.list': [],
    'tools.detectCliHarnesses': cliHarnessDetections,
    'tools.detectExecutionEnvironment': executionEnvironment,
    'tools.detectInstallSurfaces': [],
    'expert.getStatus': {},
    'session.catalog': sessionCatalog,
    'session.getState': {
      isAutoDriveActive: false,
      activeGoal: null,
    },
    'agentMemory.stats': {
      session: 0,
      working: 0,
      longTerm: 0,
      total: 0,
    },
    'shell.getSystemHistory': [],
    'serverHealth.check': {
      status: 'unavailable',
      crashCount: 0,
      maxAttempts: 0,
    },
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

    if (responseKey === 'billing.getFallbackChain') {
      const input = procedureInputs[index];
      const taskType = input && typeof input === 'object' ? readString((input as { taskType?: unknown }).taskType) : null;
      data = await buildPreferredFallbackChain(taskType);
    }

    if (responseKey === 'serverHealth.check') {
      const input = procedureInputs[index];
      const uuid = input && typeof input === 'object' ? String((input as { serverUuid?: unknown }).serverUuid ?? '') : '';
      const match = uuid ? findLocalServerByUuid(localConfig, uuid) : null;
      const meta = match ? buildLocalServerMeta(match.name, match.server) : null;
      data = {
        status: match
          ? (meta?.status === 'ready' ? 'ready' : meta?.status === 'disabled' ? 'disabled' : 'unavailable')
          : 'unavailable',
        crashCount: meta?.crashCount ?? 0,
        maxAttempts: meta?.maxAttempts ?? 0,
      };
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

async function tryLocalManagedServerMutation(req: Request, body: string | undefined): Promise<Response | null> {
  const procedures = getProcedureNames(req);
  if (req.method !== 'POST' || procedures.length !== 1 || !LOCAL_COMPAT_MUTATION_PROCEDURES.has(procedures[0] ?? '')) {
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

  const localConfig = await loadLocalMcpConfig();
  const procedureName = procedures[0] ?? '';

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
