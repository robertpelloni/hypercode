export interface ToolSearchCandidate {
    name: string;
    description?: string | null;
    inputSchema?: unknown;
    serverName?: string | null;
    serverDisplayName?: string | null;
    originalName?: string | null;
    advertisedName?: string | null;
    serverTags?: string[];
    toolTags?: string[];
    semanticGroup?: string | null;
    semanticGroupLabel?: string | null;
    keywords?: string[];
    alwaysOn?: boolean;
    loaded?: boolean;
    hydrated?: boolean;
    deferred?: boolean;
}

export type ToolSearchProfile = 'web-research' | 'repo-coding' | 'browser-automation' | 'local-ops' | 'database';

export interface ToolSearchScoreBreakdown {
    primaryMatchScore: number;
    tokenMatchScore: number;
    tokenMatchCount: number;
    profileBoostScore: number;
    loadedBoostScore: number;
    alwaysOnBoostScore: number;
    hydratedBoostScore: number;
    noQueryBaseScore: number;
}

export interface RankedToolSearchResult {
    name: string;
    description: string;
    inputSchema?: unknown;
    serverName?: string;
    serverDisplayName?: string;
    originalName?: string;
    advertisedName?: string;
    serverTags?: string[];
    toolTags?: string[];
    semanticGroup?: string;
    semanticGroupLabel?: string;
    keywords?: string[];
    alwaysOn?: boolean;
    loaded: boolean;
    hydrated: boolean;
    deferred: boolean;
    requiresSchemaHydration: boolean;
    matchReason: string;
    score: number;
    scoreBreakdown: ToolSearchScoreBreakdown;
    autoLoaded?: boolean;
}

export interface ToolSearchAutoLoadDecision {
    toolName: string;
    reason: string;
    confidence: number;
    scoreGap: number;
    topScore: number;
    secondScore: number;
}

export type ToolSearchAutoLoadOutcome = 'loaded' | 'skipped' | 'not-applicable';

export interface ToolSearchAutoLoadEvaluation {
    evaluated: boolean;
    outcome: ToolSearchAutoLoadOutcome;
    decision: ToolSearchAutoLoadDecision | null;
    skipReason?: string;
    minConfidence?: number;
}

interface ToolSearchAutoLoadOptions {
    minConfidence?: number;
}

function computeAutoLoadConfidence(options: {
    hasExactMatch: boolean;
    hasPrefixMatch: boolean;
    scoreGap: number;
}): number {
    const baseConfidence = options.hasExactMatch
        ? 0.95
        : options.hasPrefixMatch
            ? 0.87
            : 0.82;

    return Math.max(0, Math.min(0.99, baseConfidence + (options.scoreGap >= 20 ? 0.04 : options.scoreGap >= 12 ? 0.02 : 0)));
}

function normalizeText(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
}

function tokenizeQuery(query: string): string[] {
    return normalizeText(query)
        .split(/\s+/)
        .filter(Boolean);
}

function buildNoQueryScore(candidate: ToolSearchCandidate): number {
    let score = 0;

    if (candidate.alwaysOn) {
        score += 30;
    }

    if (candidate.loaded) {
        score += 20;
    }

    if (candidate.hydrated) {
        score += 10;
    }

    if (!candidate.deferred) {
        score += 2;
    }

    return score;
}

function buildProfileBoost(
    candidate: ToolSearchCandidate,
    profile: ToolSearchProfile | undefined,
): { boost: number; reason?: string } {
    if (!profile) {
        return { boost: 0 };
    }

    const searchable = normalizeText([
        candidate.name,
        candidate.originalName,
        candidate.advertisedName,
        candidate.description,
        candidate.serverName,
        candidate.serverDisplayName,
        candidate.semanticGroup,
        candidate.semanticGroupLabel,
        ...(candidate.serverTags ?? []),
        ...(candidate.toolTags ?? []),
        ...(candidate.keywords ?? []),
    ].join(' '));

    const profileKeywords: Record<ToolSearchProfile, string[]> = {
        'web-research': ['web', 'search', 'crawl', 'scrape', 'http', 'url', 'browser', 'docs'],
        'repo-coding': ['code', 'repo', 'git', 'lsp', 'symbol', 'test', 'build', 'diff'],
        'browser-automation': ['browser', 'playwright', 'dom', 'click', 'navigate', 'screenshot', 'page'],
        'local-ops': ['shell', 'terminal', 'process', 'filesystem', 'task', 'command', 'runtime'],
        'database': ['db', 'database', 'sql', 'sqlite', 'postgres', 'query', 'schema'],
    };

    const matches = profileKeywords[profile].filter((keyword) => searchable.includes(keyword));
    if (matches.length === 0) {
        return { boost: 0 };
    }

    const boost = Math.min(18, matches.length * 4);
    return {
        boost,
        reason: `${profile} profile boost (${matches.slice(0, 3).join(', ')})`,
    };
}

function scoreCandidate(
    candidate: ToolSearchCandidate,
    normalizedQuery: string,
    queryTokens: string[],
    profile: ToolSearchProfile | undefined,
): {
    score: number;
    matchReason: string;
    scoreBreakdown: ToolSearchScoreBreakdown;
} | null {
    if (!normalizedQuery) {
        const noQueryBaseScore = buildNoQueryScore(candidate);
        const profileBoost = buildProfileBoost(candidate, profile);
        return {
            score: noQueryBaseScore + profileBoost.boost,
            matchReason: profileBoost.reason
                ?? (candidate.loaded
                    ? 'already loaded in the current session'
                    : 'available tool in the current catalog'),
            scoreBreakdown: {
                primaryMatchScore: 0,
                tokenMatchScore: 0,
                tokenMatchCount: 0,
                profileBoostScore: profileBoost.boost,
                loadedBoostScore: 0,
                alwaysOnBoostScore: 0,
                hydratedBoostScore: 0,
                noQueryBaseScore,
            },
        };
    }

    const normalizedName = normalizeText(candidate.name);
    const normalizedOriginalName = normalizeText(candidate.originalName);
    const normalizedAdvertisedName = normalizeText(candidate.advertisedName);
    const normalizedDescription = normalizeText(candidate.description);
    const normalizedServerName = normalizeText(candidate.serverName);
    const normalizedServerDisplayName = normalizeText(candidate.serverDisplayName);
    const normalizedSemanticGroup = normalizeText(candidate.semanticGroup);
    const normalizedSemanticGroupLabel = normalizeText(candidate.semanticGroupLabel);
    const normalizedTagText = normalizeText([
        ...(candidate.serverTags ?? []),
        ...(candidate.toolTags ?? []),
        ...(candidate.keywords ?? []),
    ].join(' '));

    let primaryMatchScore = 0;
    let tokenMatchScore = 0;
    let loadedBoostScore = 0;
    let alwaysOnBoostScore = 0;
    let hydratedBoostScore = 0;

    let score = 0;
    let matchReason = '';

    if (normalizedName === normalizedQuery) {
        primaryMatchScore = 120;
        matchReason = 'exact tool name match';
    } else if (normalizedOriginalName === normalizedQuery) {
        primaryMatchScore = 115;
        matchReason = 'exact original tool name match';
    } else if (normalizedAdvertisedName === normalizedQuery) {
        primaryMatchScore = 110;
        matchReason = 'exact advertised tool name match';
    } else if (normalizedName.startsWith(normalizedQuery)) {
        primaryMatchScore = 90;
        matchReason = 'tool name prefix match';
    } else if (normalizedOriginalName.startsWith(normalizedQuery)) {
        primaryMatchScore = 85;
        matchReason = 'original tool name prefix match';
    } else if (normalizedAdvertisedName.startsWith(normalizedQuery)) {
        primaryMatchScore = 80;
        matchReason = 'advertised tool name prefix match';
    } else if (normalizedName.includes(normalizedQuery)) {
        primaryMatchScore = 70;
        matchReason = 'tool name contains query';
    } else if (normalizedOriginalName.includes(normalizedQuery)) {
        primaryMatchScore = 65;
        matchReason = 'original tool name contains query';
    } else if (normalizedAdvertisedName.includes(normalizedQuery)) {
        primaryMatchScore = 60;
        matchReason = 'advertised tool name contains query';
    } else if (normalizedTagText.includes(normalizedQuery)) {
        primaryMatchScore = 58;
        matchReason = 'semantic tag match';
    } else if (normalizedSemanticGroupLabel.includes(normalizedQuery) || normalizedSemanticGroup.includes(normalizedQuery)) {
        primaryMatchScore = 55;
        matchReason = 'semantic group match';
    } else if (normalizedDescription.includes(normalizedQuery)) {
        primaryMatchScore = 45;
        matchReason = 'description contains query';
    } else if (normalizedServerDisplayName.includes(normalizedQuery)) {
        primaryMatchScore = 35;
        matchReason = 'advertised server name contains query';
    } else if (normalizedServerName.includes(normalizedQuery)) {
        primaryMatchScore = 30;
        matchReason = 'server name contains query';
    }

    score += primaryMatchScore;

    const tokenMatches = queryTokens.filter((token) => (
        normalizedName.includes(token)
        || normalizedOriginalName.includes(token)
        || normalizedAdvertisedName.includes(token)
        || normalizedDescription.includes(token)
        || normalizedServerDisplayName.includes(token)
        || normalizedServerName.includes(token)
        || normalizedSemanticGroup.includes(token)
        || normalizedSemanticGroupLabel.includes(token)
        || normalizedTagText.includes(token)
    ));

    if (tokenMatches.length === 0 && score === 0) {
        return null;
    }

    tokenMatchScore = tokenMatches.length * 6;
    score += tokenMatchScore;

    if (!matchReason) {
        matchReason = tokenMatches.length > 1
            ? `matched ${tokenMatches.length} query keywords`
            : 'matched a query keyword';
    }

    if (candidate.loaded) {
        loadedBoostScore = 5;
        score += loadedBoostScore;
    }

    if (candidate.alwaysOn) {
        alwaysOnBoostScore = 4;
        score += alwaysOnBoostScore;
    }

    if (candidate.hydrated) {
        hydratedBoostScore = 3;
        score += hydratedBoostScore;
    }

    const profileBoost = buildProfileBoost(candidate, profile);
    score += profileBoost.boost;

    if (profileBoost.reason && profile && !matchReason.includes(profile)) {
        matchReason = `${matchReason}; ${profileBoost.reason}`;
    }

    return {
        score,
        matchReason,
        scoreBreakdown: {
            primaryMatchScore,
            tokenMatchScore,
            tokenMatchCount: tokenMatches.length,
            profileBoostScore: profileBoost.boost,
            loadedBoostScore,
            alwaysOnBoostScore,
            hydratedBoostScore,
            noQueryBaseScore: 0,
        },
    };
}

function compareResults(left: RankedToolSearchResult, right: RankedToolSearchResult): number {
    if (right.score !== left.score) {
        return right.score - left.score;
    }

    if (left.loaded !== right.loaded) {
        return left.loaded ? -1 : 1;
    }

    if (left.hydrated !== right.hydrated) {
        return left.hydrated ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
}

export function rankToolSearchCandidates(
    candidates: ToolSearchCandidate[],
    query: string,
    limit: number,
    profile?: ToolSearchProfile,
): RankedToolSearchResult[] {
    const normalizedQuery = normalizeText(query);
    const queryTokens = tokenizeQuery(query);
    const safeLimit = Math.max(1, limit);
    const rankedCandidates: Array<RankedToolSearchResult | null> = candidates
        .map((candidate) => {
            const ranking = scoreCandidate(candidate, normalizedQuery, queryTokens, profile);
            if (!ranking) {
                return null;
            }

            const loaded = candidate.loaded ?? false;
            const hydrated = candidate.hydrated ?? false;
            const deferred = candidate.deferred ?? false;

            return {
                name: candidate.name,
                description: candidate.description ?? '',
                inputSchema: candidate.inputSchema,
                serverName: candidate.serverName ?? undefined,
                serverDisplayName: candidate.serverDisplayName ?? undefined,
                originalName: candidate.originalName ?? undefined,
                advertisedName: candidate.advertisedName ?? undefined,
                serverTags: candidate.serverTags ?? [],
                toolTags: candidate.toolTags ?? [],
                semanticGroup: candidate.semanticGroup ?? undefined,
                semanticGroupLabel: candidate.semanticGroupLabel ?? undefined,
                keywords: candidate.keywords ?? [],
                alwaysOn: candidate.alwaysOn ?? false,
                loaded,
                hydrated,
                deferred,
                requiresSchemaHydration: deferred && !hydrated,
                matchReason: ranking.matchReason,
                score: ranking.score,
                scoreBreakdown: ranking.scoreBreakdown,
            };
        });

    return rankedCandidates
        .filter((candidate): candidate is RankedToolSearchResult => candidate !== null)
        .sort(compareResults)
        .slice(0, safeLimit);
}

export function pickAutoLoadCandidate(
    results: RankedToolSearchResult[],
    query: string,
    options?: ToolSearchAutoLoadOptions,
): ToolSearchAutoLoadDecision | null {
    return evaluateAutoLoadCandidate(results, query, options).decision;
}

export function evaluateAutoLoadCandidate(
    results: RankedToolSearchResult[],
    query: string,
    options?: ToolSearchAutoLoadOptions,
): ToolSearchAutoLoadEvaluation {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery || results.length === 0) {
        return {
            evaluated: false,
            outcome: 'not-applicable',
            decision: null,
            skipReason: 'no query or ranked results available',
        };
    }

    const [topResult, secondResult] = results;
    if (!topResult) {
        return {
            evaluated: false,
            outcome: 'not-applicable',
            decision: null,
            skipReason: 'no top-ranked result available',
        };
    }

    const scoreGap = topResult.score - (secondResult?.score ?? 0);
    const hasExactMatch = topResult.matchReason.includes('exact');
    const hasPrefixMatch = topResult.matchReason.includes('prefix');
    const hasStrongKeywordMatch = topResult.score >= 125 && scoreGap >= 18;
    const confidence = computeAutoLoadConfidence({
        hasExactMatch,
        hasPrefixMatch,
        scoreGap,
    });
    const minConfidence = Math.max(0, Math.min(0.99, options?.minConfidence ?? 0.85));

    if (topResult.loaded) {
        if (topResult.autoLoaded) {
            return {
                evaluated: true,
                outcome: 'loaded',
                decision: {
                    toolName: topResult.name,
                    reason: `runtime auto-loaded after ${topResult.matchReason}`,
                    confidence,
                    scoreGap,
                    topScore: topResult.score,
                    secondScore: secondResult?.score ?? 0,
                },
                minConfidence,
            };
        }

        return {
            evaluated: false,
            outcome: 'not-applicable',
            decision: null,
            skipReason: 'top result already loaded',
            minConfidence,
        };
    }

    if (!(hasExactMatch || hasPrefixMatch || hasStrongKeywordMatch)) {
        return {
            evaluated: true,
            outcome: 'skipped',
            decision: null,
            skipReason: 'top result did not meet exact/prefix/strong-keyword auto-load criteria',
            minConfidence,
        };
    }

    if (hasPrefixMatch && topResult.score < 90) {
        return {
            evaluated: true,
            outcome: 'skipped',
            decision: null,
            skipReason: 'prefix match score below minimum threshold',
            minConfidence,
        };
    }

    if (!hasExactMatch && scoreGap < 10) {
        return {
            evaluated: true,
            outcome: 'skipped',
            decision: null,
            skipReason: 'top result too ambiguous relative to second result',
            minConfidence,
        };
    }

    if (confidence < minConfidence) {
        return {
            evaluated: true,
            outcome: 'skipped',
            decision: null,
            skipReason: 'confidence below configured auto-load threshold',
            minConfidence,
        };
    }

    return {
        evaluated: true,
        outcome: 'loaded',
        decision: {
            toolName: topResult.name,
            reason: `auto-loaded after ${topResult.matchReason}`,
            confidence,
            scoreGap,
            topScore: topResult.score,
            secondScore: secondResult?.score ?? 0,
        },
        minConfidence,
    };
}
