export type ClaudeMemCapabilityStatus = 'shipped' | 'partial' | 'missing';

export type ClaudeMemCapability = {
    title: string;
    status: ClaudeMemCapabilityStatus;
    note: string;
    evidence: string;
};

export type ClaudeMemStartupSummary = {
    ready?: boolean;
    status?: string;
    summary?: string;
    checks?: {
        [key: string]: {
            ready?: boolean;
            [field: string]: unknown;
        } | undefined;
    };
};

export type ClaudeMemStatusSummary = {
    shippedCount: number;
    partialCount: number;
    missingCount: number;
    stage: 'full-parity' | 'parity-advancing' | 'compatibility-layer';
    stageLabel: string;
    coreReady: boolean;
    coreStatusLabel: string;
    coreStatusTone: 'ready' | 'pending' | 'warming' | 'degraded';
    coreStatusDetail: string | null;
    pendingStartupChecks: number;
};

export type ClaudeMemInstallSurfaceArtifact = {
    id: string;
    status: 'ready' | 'partial' | 'missing';
};

export type ClaudeMemStoreSnapshot = {
    exists?: boolean;
    totalEntries?: number;
    defaultSectionCount?: number;
    presentDefaultSectionCount?: number;
    populatedSectionCount?: number;
    missingSections?: string[];
    runtimePipeline?: {
        configuredMode?: string;
        providerNames?: string[];
        providerCount?: number;
        claudeMemEnabled?: boolean;
    };
};

export type ClaudeMemOperatorGuidance = {
    title: string;
    detail: string;
    tone: 'ready' | 'pending' | 'warning' | 'warming';
};

export const CLAUDE_MEM_CAPABILITIES: ClaudeMemCapability[] = [
    {
        title: 'Schema-inspired hypercode-memory adapter',
        status: 'shipped',
        note: 'HyperCode ships a dedicated `ClaudeMemAdapter` that mirrors hypercode-memory-style sections inside a HyperCode-managed local store.',
        evidence: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
    },
    {
        title: 'Redundant fan-out persistence',
        status: 'shipped',
        note: 'The default memory manager can fan out writes to both HyperCode JSON memory and the hypercode-memory-inspired adapter.',
        evidence: 'packages/core/src/services/memory/RedundantMemoryManager.ts',
    },
    {
        title: 'Section-aware memory buckets',
        status: 'shipped',
        note: 'Current storage models project context, user facts, style preferences, commands, and general notes as hypercode-memory-shaped sections.',
        evidence: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
    },
    {
        title: 'Dedicated operator parity surface',
        status: 'shipped',
        note: 'HyperCode now exposes a route that tells the truth about current hypercode-memory assimilation instead of quietly forwarding to the generic vector explorer.',
        evidence: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
    },
    {
        title: 'Canonical HyperCode observation schema',
        status: 'shipped',
        note: 'HyperCode defines shared observation input contracts in `@hypercode/types` and stores typed observation payloads with facts, concepts, files, hashes, and timestamps.',
        evidence: 'packages/types/src/schemas/memory.ts',
    },
    {
        title: 'Structured prompt and session summary capture',
        status: 'shipped',
        note: 'HyperCode natively records structured user prompts and supervised-session summaries alongside the adapter layer, instead of relying on the hypercode-memory store alone.',
        evidence: 'packages/core/src/services/AgentMemoryService.ts',
    },
    {
        title: 'Generic HyperCode memory search foundation',
        status: 'partial',
        note: 'HyperCode can already search observations, prompts, summaries, and raw memory records from the main memory dashboard, but that is not yet a dedicated hypercode-memory search/timeline workflow.',
        evidence: 'apps/web/src/app/dashboard/memory/page.tsx',
    },
    {
        title: 'Vector and graph memory primitives adjacent to the adapter',
        status: 'partial',
        note: 'HyperCode has broader memory infrastructure around the adapter, but it is not yet wired into a native hypercode-memory runtime story.',
        evidence: 'apps/web/src/app/dashboard/memory/page.tsx',
    },
    {
        title: 'Claude Code lifecycle hooks',
        status: 'missing',
        note: 'HyperCode does not currently register SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, or SessionEnd hooks into Claude Code.',
        evidence: 'Gap vs upstream hypercode-memory hook system',
    },
    {
        title: 'Structured observation compression pipeline',
        status: 'partial',
        note: 'HyperCode already records heuristic typed observations with facts, concepts, files, and deduplicated hashes, but it does not yet have hypercode-memory-style model-driven observation workers or response processors.',
        evidence: 'packages/core/src/services/AgentMemoryService.ts',
    },
    {
        title: 'Progressive-disclosure memory injection',
        status: 'missing',
        note: 'HyperCode does not yet assemble hypercode-memory-style session context with index/detail/source layers and token-budgeted injection.',
        evidence: 'Gap vs upstream ContextBuilder / ObservationCompiler pipeline',
    },
    {
        title: 'Observation-centric search and timeline workflow',
        status: 'missing',
        note: 'Upstream tools like `search`, `timeline`, and `get_observations` do not have HyperCode-native hypercode-memory equivalents yet.',
        evidence: 'Gap vs upstream memory MCP toolset',
    },
    {
        title: 'Transcript compression / Endless Mode',
        status: 'missing',
        note: 'HyperCode does not currently rewrite long-running transcripts in place to replace bulky tool output with compressed memories.',
        evidence: 'Gap vs upstream transcript transformer and watcher',
    },
    {
        title: 'Relational session-observation storage model',
        status: 'missing',
        note: 'There is no HyperCode-native hypercode-memory schema yet for sessions, observations, summaries, prompts, correlations, and a persistent pending queue.',
        evidence: 'Gap vs upstream SQLite schema and queueing model',
    },
];

export const CLAUDE_MEM_IMPLEMENTATION_FILES = [
    {
        label: 'Current adapter implementation',
        path: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
        note: 'Flat-file JSON provider inspired by hypercode-memory sections, not the full upstream runtime.',
    },
    {
        label: 'Redundant write manager',
        path: 'packages/core/src/services/memory/RedundantMemoryManager.ts',
        note: 'Fans out reads/writes across HyperCode JSON memory and the hypercode-memory-inspired adapter.',
    },
    {
        label: 'Primary HyperCode memory dashboard',
        path: 'apps/web/src/app/dashboard/memory/page.tsx',
        note: 'HyperCode-native view for observations, prompts, session summaries, search, and provider interchange.',
    },
    {
        label: 'This parity page',
        path: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
        note: 'Operator-facing truth table for what HyperCode has and has not assimilated from hypercode-memory yet.',
    },
];

function getPendingStartupChecks(startupStatus?: ClaudeMemStartupSummary | null): number {
    if (!startupStatus?.checks) {
        return 0;
    }

    return Object.values(startupStatus.checks).filter((check) => check?.ready === false).length;
}

const BROWSER_EXTENSION_SURFACE_IDS = [
    'browser-extension-chromium',
    'browser-extension-firefox',
] as const;

function hasStartupInstallArtifactCheck(startupStatus?: ClaudeMemStartupSummary | null): boolean {
    const keys = Object.keys(startupStatus?.checks ?? {});
    return keys.some((key) => /artifact|installsurface/i.test(key));
}

function getPendingInstallArtifactCheckCount(installSurfaceArtifacts?: ClaudeMemInstallSurfaceArtifact[] | null): number {
    const relevantArtifacts = (installSurfaceArtifacts ?? []).filter((artifact) => BROWSER_EXTENSION_SURFACE_IDS.includes(artifact.id as (typeof BROWSER_EXTENSION_SURFACE_IDS)[number]));
    if (relevantArtifacts.length === 0) {
        return 1;
    }

    const allReady = relevantArtifacts.length === BROWSER_EXTENSION_SURFACE_IDS.length && relevantArtifacts.every((artifact) => artifact.status === 'ready');
    return allReady ? 0 : 1;
}

export function getClaudeMemOperatorGuidance(storeStatus?: ClaudeMemStoreSnapshot | null): ClaudeMemOperatorGuidance {
    if (!storeStatus) {
        return {
            title: 'Reading adapter state',
            detail: 'Waiting for core to report whether the HyperCode-managed hypercode-memory store exists and how many default buckets are already seeded.',
            tone: 'warming',
        };
    }

    const runtimePipeline = storeStatus.runtimePipeline;
    const defaultSectionCount = storeStatus.defaultSectionCount ?? 0;
    const presentDefaultSectionCount = storeStatus.presentDefaultSectionCount ?? 0;
    const populatedSectionCount = storeStatus.populatedSectionCount ?? 0;
    const missingSections = storeStatus.missingSections ?? [];

    if (runtimePipeline && runtimePipeline.claudeMemEnabled === false) {
        const providerLabel = runtimePipeline.providerNames?.length ? runtimePipeline.providerNames.join(', ') : 'no active providers reported';
        return {
            title: 'hypercode-memory adapter not active in the runtime pipeline',
            detail: `Core reports the active memory pipeline as ${runtimePipeline.configuredMode ?? 'unknown'} with ${providerLabel}. The adapter file can still exist on disk, but HyperCode is not currently writing new memories through hypercode-memory.`,
            tone: 'warning',
        };
    }

    if (!storeStatus.exists) {
        return {
            title: 'Adapter store not created yet',
            detail: `No HyperCode-managed claude_mem store exists yet. When the adapter initializes, it seeds ${defaultSectionCount} default buckets for project context, user facts, style preferences, commands, and general notes.`,
            tone: 'warning',
        };
    }

    if ((storeStatus.totalEntries ?? 0) === 0) {
        return {
            title: 'Adapter store seeded, waiting for entries',
            detail: `${presentDefaultSectionCount}/${defaultSectionCount} default buckets exist, but none contain entries yet. The adapter shell is ready; the workflow data is not.`,
            tone: 'pending',
        };
    }

    if (missingSections.length > 0) {
        return {
            title: 'Adapter store active, bucket coverage incomplete',
            detail: `${populatedSectionCount} bucket${populatedSectionCount === 1 ? '' : 's'} currently hold data, but ${missingSections.length} default bucket${missingSections.length === 1 ? '' : 's'} are still missing: ${missingSections.join(', ')}.`,
            tone: 'pending',
        };
    }

    return {
        title: 'Adapter store active',
        detail: `${populatedSectionCount} populated bucket${populatedSectionCount === 1 ? '' : 's'} across all ${presentDefaultSectionCount}/${defaultSectionCount} default hypercode-memory buckets.`,
        tone: 'ready',
    };
}

export function getClaudeMemStatusSummary(
    startupStatus?: ClaudeMemStartupSummary | null,
    installSurfaceArtifacts?: ClaudeMemInstallSurfaceArtifact[] | null,
): ClaudeMemStatusSummary {
    const shippedCount = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'shipped').length;
    const partialCount = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'partial').length;
    const missingCount = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'missing').length;
    const coreReady = Boolean(startupStatus?.ready);
    const startupPendingChecks = getPendingStartupChecks(startupStatus);
    const installArtifactPendingChecks = startupStatus && !hasStartupInstallArtifactCheck(startupStatus)
        ? getPendingInstallArtifactCheckCount(installSurfaceArtifacts)
        : 0;
    const pendingStartupChecks = startupPendingChecks + installArtifactPendingChecks;
    const startupSummary = startupStatus?.summary?.trim() || null;

    const stage = missingCount === 0 && partialCount === 0
        ? 'full-parity'
        : missingCount <= partialCount
            ? 'parity-advancing'
            : 'compatibility-layer';

    const coreStatusLabel = !startupStatus
        ? 'Core warming up'
        : startupStatus.status === 'degraded'
            ? 'Core running in compat fallback'
            : coreReady && pendingStartupChecks > 0
                ? `Core ready · ${pendingStartupChecks} startup check${pendingStartupChecks === 1 ? '' : 's'} pending`
                : coreReady
                    ? 'Core ready'
                    : 'Core warming up';

    const coreStatusTone = !startupStatus
        ? 'warming'
        : startupStatus.status === 'degraded'
            ? 'degraded'
            : coreReady && pendingStartupChecks > 0
                ? 'pending'
                : coreReady
                    ? 'ready'
                    : 'warming';

    const coreStatusDetail = !startupStatus
        ? null
        : startupStatus.status === 'degraded'
            ? (startupSummary || 'Live startup telemetry is unavailable, so HyperCode is serving a cached compatibility snapshot.')
            : !coreReady && startupSummary
                ? startupSummary
                : null;

    return {
        shippedCount,
        partialCount,
        missingCount,
        stage,
        stageLabel: stage === 'full-parity'
            ? 'Full parity'
            : stage === 'parity-advancing'
                ? 'Parity advancing'
                : 'Compatibility layer',
        coreReady,
        coreStatusLabel,
        coreStatusTone,
        coreStatusDetail,
        pendingStartupChecks,
    };
}
