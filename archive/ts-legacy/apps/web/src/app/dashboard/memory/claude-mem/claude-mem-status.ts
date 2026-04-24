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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        title: 'Schema-inspired hypercode-memory adapter',
        status: 'shipped',
        note: 'HyperCode ships a dedicated `ClaudeMemAdapter` that mirrors hypercode-memory-style sections inside a HyperCode-managed local store.',
=======
        title: 'Schema-inspired borg-memory adapter',
        status: 'shipped',
        note: 'borg ships a dedicated `ClaudeMemAdapter` that mirrors borg-memory-style sections inside a borg-managed local store.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
    },
    {
        title: 'Redundant fan-out persistence',
        status: 'shipped',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'The default memory manager can fan out writes to both HyperCode JSON memory and the hypercode-memory-inspired adapter.',
=======
        note: 'The default memory manager can fan out writes to both borg JSON memory and the borg-memory-inspired adapter.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'packages/core/src/services/memory/RedundantMemoryManager.ts',
    },
    {
        title: 'Section-aware memory buckets',
        status: 'shipped',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'Current storage models project context, user facts, style preferences, commands, and general notes as hypercode-memory-shaped sections.',
=======
        note: 'Current storage models project context, user facts, style preferences, commands, and general notes as borg-memory-shaped sections.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
    },
    {
        title: 'Dedicated operator parity surface',
        status: 'shipped',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode now exposes a route that tells the truth about current hypercode-memory assimilation instead of quietly forwarding to the generic vector explorer.',
        evidence: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
    },
    {
        title: 'Canonical HyperCode observation schema',
        status: 'shipped',
        note: 'HyperCode defines shared observation input contracts in `@hypercode/types` and stores typed observation payloads with facts, concepts, files, hashes, and timestamps.',
=======
        note: 'borg now exposes a route that tells the truth about current borg-memory assimilation instead of quietly forwarding to the generic vector explorer.',
        evidence: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
    },
    {
        title: 'Canonical borg observation schema',
        status: 'shipped',
        note: 'borg defines shared observation input contracts in `@borg/types` and stores typed observation payloads with facts, concepts, files, hashes, and timestamps.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'packages/types/src/schemas/memory.ts',
    },
    {
        title: 'Structured prompt and session summary capture',
        status: 'shipped',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode natively records structured user prompts and supervised-session summaries alongside the adapter layer, instead of relying on the hypercode-memory store alone.',
        evidence: 'packages/core/src/services/AgentMemoryService.ts',
    },
    {
        title: 'Generic HyperCode memory search foundation',
        status: 'partial',
        note: 'HyperCode can already search observations, prompts, summaries, and raw memory records from the main memory dashboard, but that is not yet a dedicated hypercode-memory search/timeline workflow.',
=======
        note: 'borg natively records structured user prompts and supervised-session summaries alongside the adapter layer, instead of relying on the borg-memory store alone.',
        evidence: 'packages/core/src/services/AgentMemoryService.ts',
    },
    {
        title: 'Generic borg memory search foundation',
        status: 'partial',
        note: 'borg can already search observations, prompts, summaries, and raw memory records from the main memory dashboard, but that is not yet a dedicated borg-memory search/timeline workflow.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'apps/web/src/app/dashboard/memory/page.tsx',
    },
    {
        title: 'Vector and graph memory primitives adjacent to the adapter',
        status: 'partial',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode has broader memory infrastructure around the adapter, but it is not yet wired into a native hypercode-memory runtime story.',
=======
        note: 'borg has broader memory infrastructure around the adapter, but it is not yet wired into a native borg-memory runtime story.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'apps/web/src/app/dashboard/memory/page.tsx',
    },
    {
        title: 'Claude Code lifecycle hooks',
        status: 'missing',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode does not currently register SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, or SessionEnd hooks into Claude Code.',
        evidence: 'Gap vs upstream hypercode-memory hook system',
=======
        note: 'borg does not currently register SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, or SessionEnd hooks into Claude Code.',
        evidence: 'Gap vs upstream borg-memory hook system',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
    },
    {
        title: 'Structured observation compression pipeline',
        status: 'partial',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode already records heuristic typed observations with facts, concepts, files, and deduplicated hashes, but it does not yet have hypercode-memory-style model-driven observation workers or response processors.',
=======
        note: 'borg already records heuristic typed observations with facts, concepts, files, and deduplicated hashes, but it does not yet have borg-memory-style model-driven observation workers or response processors.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'packages/core/src/services/AgentMemoryService.ts',
    },
    {
        title: 'Progressive-disclosure memory injection',
        status: 'missing',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode does not yet assemble hypercode-memory-style session context with index/detail/source layers and token-budgeted injection.',
=======
        note: 'borg does not yet assemble borg-memory-style session context with index/detail/source layers and token-budgeted injection.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'Gap vs upstream ContextBuilder / ObservationCompiler pipeline',
    },
    {
        title: 'Observation-centric search and timeline workflow',
        status: 'missing',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'Upstream tools like `search`, `timeline`, and `get_observations` do not have HyperCode-native hypercode-memory equivalents yet.',
=======
        note: 'Upstream tools like `search`, `timeline`, and `get_observations` do not have borg-native borg-memory equivalents yet.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'Gap vs upstream memory MCP toolset',
    },
    {
        title: 'Transcript compression / Endless Mode',
        status: 'missing',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'HyperCode does not currently rewrite long-running transcripts in place to replace bulky tool output with compressed memories.',
=======
        note: 'borg does not currently rewrite long-running transcripts in place to replace bulky tool output with compressed memories.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'Gap vs upstream transcript transformer and watcher',
    },
    {
        title: 'Relational session-observation storage model',
        status: 'missing',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'There is no HyperCode-native hypercode-memory schema yet for sessions, observations, summaries, prompts, correlations, and a persistent pending queue.',
=======
        note: 'There is no borg-native borg-memory schema yet for sessions, observations, summaries, prompts, correlations, and a persistent pending queue.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        evidence: 'Gap vs upstream SQLite schema and queueing model',
    },
];

export const CLAUDE_MEM_IMPLEMENTATION_FILES = [
    {
        label: 'Current adapter implementation',
        path: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'Flat-file JSON provider inspired by hypercode-memory sections, not the full upstream runtime.',
=======
        note: 'Flat-file JSON provider inspired by borg-memory sections, not the full upstream runtime.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
    },
    {
        label: 'Redundant write manager',
        path: 'packages/core/src/services/memory/RedundantMemoryManager.ts',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'Fans out reads/writes across HyperCode JSON memory and the hypercode-memory-inspired adapter.',
    },
    {
        label: 'Primary HyperCode memory dashboard',
        path: 'apps/web/src/app/dashboard/memory/page.tsx',
        note: 'HyperCode-native view for observations, prompts, session summaries, search, and provider interchange.',
=======
        note: 'Fans out reads/writes across borg JSON memory and the borg-memory-inspired adapter.',
    },
    {
        label: 'Primary borg memory dashboard',
        path: 'apps/web/src/app/dashboard/memory/page.tsx',
        note: 'borg-native view for observations, prompts, session summaries, search, and provider interchange.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
    },
    {
        label: 'This parity page',
        path: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        note: 'Operator-facing truth table for what HyperCode has and has not assimilated from hypercode-memory yet.',
=======
        note: 'Operator-facing truth table for what borg has and has not assimilated from borg-memory yet.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
            detail: 'Waiting for core to report whether the HyperCode-managed hypercode-memory store exists and how many default buckets are already seeded.',
=======
            detail: 'Waiting for core to report whether the borg-managed borg-memory store exists and how many default buckets are already seeded.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
            title: 'hypercode-memory adapter not active in the runtime pipeline',
            detail: `Core reports the active memory pipeline as ${runtimePipeline.configuredMode ?? 'unknown'} with ${providerLabel}. The adapter file can still exist on disk, but HyperCode is not currently writing new memories through hypercode-memory.`,
=======
            title: 'borg-memory adapter not active in the runtime pipeline',
            detail: `Core reports the active memory pipeline as ${runtimePipeline.configuredMode ?? 'unknown'} with ${providerLabel}. The adapter file can still exist on disk, but borg is not currently writing new memories through borg-memory.`,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
            tone: 'warning',
        };
    }

    if (!storeStatus.exists) {
        return {
            title: 'Adapter store not created yet',
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
            detail: `No HyperCode-managed claude_mem store exists yet. When the adapter initializes, it seeds ${defaultSectionCount} default buckets for project context, user facts, style preferences, commands, and general notes.`,
=======
            detail: `No borg-managed claude_mem store exists yet. When the adapter initializes, it seeds ${defaultSectionCount} default buckets for project context, user facts, style preferences, commands, and general notes.`,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
        detail: `${populatedSectionCount} populated bucket${populatedSectionCount === 1 ? '' : 's'} across all ${presentDefaultSectionCount}/${defaultSectionCount} default hypercode-memory buckets.`,
=======
        detail: `${populatedSectionCount} populated bucket${populatedSectionCount === 1 ? '' : 's'} across all ${presentDefaultSectionCount}/${defaultSectionCount} default borg-memory buckets.`,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
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
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
            ? (startupSummary || 'Live startup telemetry is unavailable, so HyperCode is serving a cached compatibility snapshot.')
=======
            ? (startupSummary || 'Live startup telemetry is unavailable, so borg is serving a cached compatibility snapshot.')
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts
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
