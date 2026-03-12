export interface ToolSearchCandidate {
    name: string;
    description?: string | null;
    serverName?: string | null;
    originalName?: string | null;
    loaded?: boolean;
    hydrated?: boolean;
    deferred?: boolean;
}

export interface RankedToolSearchResult {
    name: string;
    description: string;
    serverName?: string;
    originalName?: string;
    loaded: boolean;
    hydrated: boolean;
    deferred: boolean;
    requiresSchemaHydration: boolean;
    matchReason: string;
    score: number;
    autoLoaded?: boolean;
}

export interface ToolSearchAutoLoadDecision {
    toolName: string;
    reason: string;
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

function scoreCandidate(candidate: ToolSearchCandidate, normalizedQuery: string, queryTokens: string[]): { score: number; matchReason: string } | null {
    if (!normalizedQuery) {
        return {
            score: buildNoQueryScore(candidate),
            matchReason: candidate.loaded
                ? 'already loaded in the current session'
                : 'available tool in the current catalog',
        };
    }

    const normalizedName = normalizeText(candidate.name);
    const normalizedOriginalName = normalizeText(candidate.originalName);
    const normalizedDescription = normalizeText(candidate.description);
    const normalizedServerName = normalizeText(candidate.serverName);

    let score = 0;
    let matchReason = '';

    if (normalizedName === normalizedQuery) {
        score += 120;
        matchReason = 'exact tool name match';
    } else if (normalizedOriginalName === normalizedQuery) {
        score += 115;
        matchReason = 'exact original tool name match';
    } else if (normalizedName.startsWith(normalizedQuery)) {
        score += 90;
        matchReason = 'tool name prefix match';
    } else if (normalizedOriginalName.startsWith(normalizedQuery)) {
        score += 85;
        matchReason = 'original tool name prefix match';
    } else if (normalizedName.includes(normalizedQuery)) {
        score += 70;
        matchReason = 'tool name contains query';
    } else if (normalizedOriginalName.includes(normalizedQuery)) {
        score += 65;
        matchReason = 'original tool name contains query';
    } else if (normalizedDescription.includes(normalizedQuery)) {
        score += 45;
        matchReason = 'description contains query';
    } else if (normalizedServerName.includes(normalizedQuery)) {
        score += 30;
        matchReason = 'server name contains query';
    }

    const tokenMatches = queryTokens.filter((token) => (
        normalizedName.includes(token)
        || normalizedOriginalName.includes(token)
        || normalizedDescription.includes(token)
        || normalizedServerName.includes(token)
    ));

    if (tokenMatches.length === 0 && score === 0) {
        return null;
    }

    score += tokenMatches.length * 6;

    if (!matchReason) {
        matchReason = tokenMatches.length > 1
            ? `matched ${tokenMatches.length} query keywords`
            : 'matched a query keyword';
    }

    if (candidate.loaded) {
        score += 5;
    }

    if (candidate.hydrated) {
        score += 3;
    }

    return { score, matchReason };
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

export function rankToolSearchCandidates(candidates: ToolSearchCandidate[], query: string, limit: number): RankedToolSearchResult[] {
    const normalizedQuery = normalizeText(query);
    const queryTokens = tokenizeQuery(query);
    const safeLimit = Math.max(1, limit);
    const rankedCandidates: Array<RankedToolSearchResult | null> = candidates
        .map((candidate) => {
            const ranking = scoreCandidate(candidate, normalizedQuery, queryTokens);
            if (!ranking) {
                return null;
            }

            const loaded = candidate.loaded ?? false;
            const hydrated = candidate.hydrated ?? false;
            const deferred = candidate.deferred ?? false;

            return {
                name: candidate.name,
                description: candidate.description ?? '',
                serverName: candidate.serverName ?? undefined,
                originalName: candidate.originalName ?? undefined,
                loaded,
                hydrated,
                deferred,
                requiresSchemaHydration: deferred && !hydrated,
                matchReason: ranking.matchReason,
                score: ranking.score,
            };
        });

    return rankedCandidates
        .filter((candidate): candidate is RankedToolSearchResult => candidate !== null)
        .sort(compareResults)
        .slice(0, safeLimit);
}

export function pickAutoLoadCandidate(results: RankedToolSearchResult[], query: string): ToolSearchAutoLoadDecision | null {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery || results.length === 0) {
        return null;
    }

    const [topResult, secondResult] = results;
    if (!topResult || topResult.loaded) {
        return null;
    }

    const scoreGap = topResult.score - (secondResult?.score ?? 0);
    const hasExactMatch = topResult.matchReason.includes('exact');
    const hasPrefixMatch = topResult.matchReason.includes('prefix');
    const hasStrongKeywordMatch = topResult.score >= 125 && scoreGap >= 18;

    if (!(hasExactMatch || hasPrefixMatch || hasStrongKeywordMatch)) {
        return null;
    }

    if (hasPrefixMatch && topResult.score < 90) {
        return null;
    }

    if (!hasExactMatch && scoreGap < 10) {
        return null;
    }

    return {
        toolName: topResult.name,
        reason: `auto-loaded after ${topResult.matchReason}`,
    };
}