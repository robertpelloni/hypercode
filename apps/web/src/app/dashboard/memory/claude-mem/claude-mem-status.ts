export type ClaudeMemCapabilityStatus = 'shipped' | 'partial' | 'missing';

export type ClaudeMemCapability = {
    title: string;
    status: ClaudeMemCapabilityStatus;
    note: string;
    evidence: string;
};

export type ClaudeMemStartupSummary = {
    ready?: boolean;
    checks?: {
        [key: string]: {
            ready?: boolean;
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
    coreStatusTone: 'ready' | 'pending' | 'warming';
    pendingStartupChecks: number;
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
        title: 'Schema-inspired claude-mem adapter',
        status: 'shipped',
        note: 'Borg ships a dedicated `ClaudeMemAdapter` that mirrors claude-mem-style sections inside a Borg-managed local store.',
        evidence: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
    },
    {
        title: 'Redundant fan-out persistence',
        status: 'shipped',
        note: 'The default memory manager can fan out writes to both Borg JSON memory and the claude-mem-inspired adapter.',
        evidence: 'packages/core/src/services/memory/RedundantMemoryManager.ts',
    },
    {
        title: 'Section-aware memory buckets',
        status: 'shipped',
        note: 'Current storage models project context, user facts, style preferences, commands, and general notes as claude-mem-shaped sections.',
        evidence: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
    },
    {
        title: 'Dedicated operator parity surface',
        status: 'shipped',
        note: 'Borg now exposes a route that tells the truth about current claude-mem assimilation instead of quietly forwarding to the generic vector explorer.',
        evidence: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
    },
    {
        title: 'Generic Borg memory search foundation',
        status: 'partial',
        note: 'Borg can already search its own memory providers, but that is not yet claude-mem-specific search/timeline/observation workflow parity.',
        evidence: 'apps/web/src/app/dashboard/memory/vector/VectorMemoryDashboard.tsx',
    },
    {
        title: 'Vector and graph memory primitives adjacent to the adapter',
        status: 'partial',
        note: 'Borg has broader memory infrastructure around the adapter, but it is not yet wired into a native claude-mem runtime story.',
        evidence: 'apps/web/src/app/dashboard/memory/vector/VectorMemoryDashboard.tsx',
    },
    {
        title: 'Claude Code lifecycle hooks',
        status: 'missing',
        note: 'Borg does not currently register SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, or SessionEnd hooks into Claude Code.',
        evidence: 'Gap vs upstream claude-mem hook system',
    },
    {
        title: 'Structured observation compression pipeline',
        status: 'missing',
        note: 'Raw tool outputs are not yet compressed into typed observations with facts, concepts, files, and deduplicated hashes the way claude-mem does.',
        evidence: 'Gap vs upstream observation agents and response processors',
    },
    {
        title: 'Progressive-disclosure memory injection',
        status: 'missing',
        note: 'Borg does not yet assemble claude-mem-style session context with index/detail/source layers and token-budgeted injection.',
        evidence: 'Gap vs upstream ContextBuilder / ObservationCompiler pipeline',
    },
    {
        title: 'Observation-centric search and timeline workflow',
        status: 'missing',
        note: 'Upstream tools like `search`, `timeline`, and `get_observations` do not have Borg-native claude-mem equivalents yet.',
        evidence: 'Gap vs upstream memory MCP toolset',
    },
    {
        title: 'Transcript compression / Endless Mode',
        status: 'missing',
        note: 'Borg does not currently rewrite long-running transcripts in place to replace bulky tool output with compressed memories.',
        evidence: 'Gap vs upstream transcript transformer and watcher',
    },
    {
        title: 'Relational session-observation storage model',
        status: 'missing',
        note: 'There is no Borg-native claude-mem schema yet for sessions, observations, summaries, prompts, correlations, and a persistent pending queue.',
        evidence: 'Gap vs upstream SQLite schema and queueing model',
    },
];

export const CLAUDE_MEM_IMPLEMENTATION_FILES = [
    {
        label: 'Current adapter implementation',
        path: 'packages/core/src/services/memory/ClaudeMemAdapter.ts',
        note: 'Flat-file JSON provider inspired by claude-mem sections, not the full upstream runtime.',
    },
    {
        label: 'Redundant write manager',
        path: 'packages/core/src/services/memory/RedundantMemoryManager.ts',
        note: 'Fans out reads/writes across Borg JSON memory and the claude-mem-inspired adapter.',
    },
    {
        label: 'Generic vector explorer',
        path: 'apps/web/src/app/dashboard/memory/vector/VectorMemoryDashboard.tsx',
        note: 'Useful for raw memory inspection, but not a claude-mem parity surface on its own.',
    },
    {
        label: 'This parity page',
        path: 'apps/web/src/app/dashboard/memory/claude-mem/page.tsx',
        note: 'Operator-facing truth table for what Borg has and has not assimilated from claude-mem yet.',
    },
];

function getPendingStartupChecks(startupStatus?: ClaudeMemStartupSummary | null): number {
    if (!startupStatus?.checks) {
        return 0;
    }

    return Object.values(startupStatus.checks).filter((check) => check?.ready === false).length;
}

export function getClaudeMemOperatorGuidance(storeStatus?: ClaudeMemStoreSnapshot | null): ClaudeMemOperatorGuidance {
    if (!storeStatus) {
        return {
            title: 'Reading adapter state',
            detail: 'Waiting for core to report whether the Borg-managed claude-mem store exists and how many default buckets are already seeded.',
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
            title: 'Claude-mem adapter not active in the runtime pipeline',
            detail: `Core reports the active memory pipeline as ${runtimePipeline.configuredMode ?? 'unknown'} with ${providerLabel}. The adapter file can still exist on disk, but Borg is not currently writing new memories through claude-mem.`,
            tone: 'warning',
        };
    }

    if (!storeStatus.exists) {
        return {
            title: 'Adapter store not created yet',
            detail: `No Borg-managed claude_mem store exists yet. When the adapter initializes, it seeds ${defaultSectionCount} default buckets for project context, user facts, style preferences, commands, and general notes.`,
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
        detail: `${populatedSectionCount} populated bucket${populatedSectionCount === 1 ? '' : 's'} across all ${presentDefaultSectionCount}/${defaultSectionCount} default claude-mem buckets.`,
        tone: 'ready',
    };
}

export function getClaudeMemStatusSummary(startupStatus?: ClaudeMemStartupSummary | null): ClaudeMemStatusSummary {
    const shippedCount = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'shipped').length;
    const partialCount = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'partial').length;
    const missingCount = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'missing').length;
    const coreReady = Boolean(startupStatus?.ready);
    const pendingStartupChecks = getPendingStartupChecks(startupStatus);

    const stage = missingCount === 0 && partialCount === 0
        ? 'full-parity'
        : missingCount <= partialCount
            ? 'parity-advancing'
            : 'compatibility-layer';

    const coreStatusLabel = !startupStatus
        ? 'Core warming up'
        : coreReady && pendingStartupChecks > 0
            ? `Core ready · ${pendingStartupChecks} startup check${pendingStartupChecks === 1 ? '' : 's'} pending`
            : coreReady
                ? 'Core ready'
                : 'Core warming up';

    const coreStatusTone = !startupStatus
        ? 'warming'
        : coreReady && pendingStartupChecks > 0
            ? 'pending'
            : coreReady
                ? 'ready'
                : 'warming';

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
        pendingStartupChecks,
    };
}