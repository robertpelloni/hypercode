import type { NavSection } from './nav-config';

type NavItem = NavSection['items'][number];

export interface NavSearchCandidate {
    title: string;
    href: string;
    description?: string;
}

export interface NavDescriptionCandidate {
    title: string;
    href?: string;
    description?: string;
}

export interface NavPaletteRouteCandidate extends NavSearchCandidate {
    section: string;
}

export interface NavDuplicateIssue {
    href: string;
    sections: string[];
}

export interface NavValidationResult {
    duplicateWithinSection: Array<{
        section: string;
        duplicates: string[];
    }>;
    duplicateAcrossSections: NavDuplicateIssue[];
    normalizedHrefCollisions: Array<{
        normalizedHref: string;
        hrefs: string[];
        sections: string[];
    }>;
}

export interface SanitizedNavPreferences {
    collapsedSections: Record<string, boolean>;
    favorites: string[];
    recentRoutes: string[];
    recentSearches: string[];
}

export interface ExportedNavPreferences extends SanitizedNavPreferences {
    exportedAt: string;
}

export function extractStringArray(values: unknown): string[] {
    if (!Array.isArray(values)) {
        return [];
    }

    return values.filter((value): value is string => typeof value === 'string');
}

export function hasNavValidationIssues(result: NavValidationResult): boolean {
    return result.duplicateWithinSection.length > 0
        || result.duplicateAcrossSections.length > 0
        || result.normalizedHrefCollisions.length > 0;
}

export function normalizeNavHref(href: string): string {
    const trimmed = href.trim();
    if (trimmed === '' || trimmed === '/') {
        return '/';
    }

    const withoutSearchOrHash = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
    if (withoutSearchOrHash === '') {
        return '/';
    }

    const withoutTrailingSlash = withoutSearchOrHash.endsWith('/')
        ? withoutSearchOrHash.replace(/\/+$/, '')
        : withoutSearchOrHash;
    return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
}

export function normalizeNavHrefList(values: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const value of values) {
        const href = normalizeNavHref(value);
        if (seen.has(href)) {
            continue;
        }

        seen.add(href);
        normalized.push(href);
    }

    return normalized;
}

export function filterNavHrefsByAllowedSet(values: string[], allowedHrefs: ReadonlySet<string>): string[] {
    return normalizeNavHrefList(values).filter((href) => allowedHrefs.has(href));
}

export function sanitizeFavoriteRoutes(
    values: unknown,
    allowedHrefs: ReadonlySet<string>,
): string[] {
    return filterNavHrefsByAllowedSet(extractStringArray(values), allowedHrefs);
}

export function sanitizeRecentRoutes(
    values: unknown,
    allowedHrefs: ReadonlySet<string>,
    limit: number,
): string[] {
    return filterNavHrefsByAllowedSet(extractStringArray(values), allowedHrefs).slice(0, limit);
}

export function sanitizeRecentSearches(values: unknown, limit: number): string[] {
    const seen = new Set<string>();
    const sanitized: string[] = [];

    for (const value of extractStringArray(values)) {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }

        seen.add(trimmed);
        sanitized.push(trimmed);

        if (sanitized.length >= limit) {
            break;
        }
    }

    return sanitized;
}

export function sanitizeCollapsedSections(
    value: unknown,
    allowedSections?: ReadonlySet<string>,
): Record<string, boolean> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    const sanitized: Record<string, boolean> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'boolean' && (!allowedSections || allowedSections.has(key))) {
            sanitized[key] = entry;
        }
    }

    return sanitized;
}

export function sanitizeNavPreferences(
    value: {
        collapsedSections?: unknown;
        favorites?: unknown;
        recentRoutes?: unknown;
        recentSearches?: unknown;
    },
    allowedHrefs: ReadonlySet<string>,
    allowedSections: ReadonlySet<string>,
    routeLimit: number,
    searchLimit: number,
): SanitizedNavPreferences {
    const favorites = sanitizeFavoriteRoutes(value.favorites, allowedHrefs);
    const recentRoutes = sanitizeRecentRoutes(value.recentRoutes, allowedHrefs, routeLimit);

    return {
        collapsedSections: sanitizeCollapsedSections(value.collapsedSections, allowedSections),
        favorites,
        recentRoutes,
        recentSearches: sanitizeRecentSearches(value.recentSearches, searchLimit),
    };
}

export function buildExportedNavPreferences(
    value: {
        collapsedSections?: unknown;
        favorites?: unknown;
        recentRoutes?: unknown;
        recentSearches?: unknown;
        exportedAt?: unknown;
    },
    allowedHrefs: ReadonlySet<string>,
    allowedSections: ReadonlySet<string>,
    routeLimit: number,
    searchLimit: number,
    fallbackExportedAt: string,
): ExportedNavPreferences {
    const exportedAt = typeof value.exportedAt === 'string' && value.exportedAt.trim()
        ? value.exportedAt.trim()
        : fallbackExportedAt;

    return {
        ...sanitizeNavPreferences(value, allowedHrefs, allowedSections, routeLimit, searchLimit),
        exportedAt,
    };
}

export function buildRecentRouteHistory(currentRoutes: string[], nextHref: string, limit: number): string[] {
    return normalizeNavHrefList([
        nextHref,
        ...currentRoutes,
    ]).slice(0, limit);
}

export function buildRecentSearchHistory(currentSearches: string[], nextQuery: string, limit: number): string[] {
    return sanitizeRecentSearches([
        nextQuery,
        ...currentSearches,
    ], limit);
}

export function comparePaletteRoutes(
    a: NavPaletteRouteCandidate,
    b: NavPaletteRouteCandidate,
    favoriteHrefs: ReadonlySet<string>,
    recencyRank: ReadonlyMap<string, number>,
): number {
    const aFav = favoriteHrefs.has(a.href) ? 1 : 0;
    const bFav = favoriteHrefs.has(b.href) ? 1 : 0;
    if (aFav !== bFav) {
        return bFav - aFav;
    }

    const aRecent = recencyRank.get(a.href) ?? Number.MAX_SAFE_INTEGER;
    const bRecent = recencyRank.get(b.href) ?? Number.MAX_SAFE_INTEGER;
    if (aRecent !== bRecent) {
        return aRecent - bRecent;
    }

    return a.title.localeCompare(b.title);
}

export function buildFallbackNavDescription(title: string, section: string, href?: string): string {
    const normalized = title.toLowerCase();

    if (normalized.includes('dashboard')) return `Open ${title} to view high-level system status, active services, and operational summaries.`;
    if (normalized.includes('director')) return `Open ${title} to manage autonomous orchestration policy, run loops, and execution controls.`;
    if (normalized.includes('council')) return `Open ${title} to review multi-model consensus sessions, votes, and recommendations.`;
    if (normalized.includes('memory')) return `Open ${title} to inspect stored context, retrieval behavior, and memory lifecycle data.`;
    if (normalized.includes('research')) return `Open ${title} to run or review research workflows, evidence, and generated findings.`;
    if (normalized.includes('security')) return `Open ${title} to review policies, controls, and security posture signals.`;
    if (normalized.includes('settings') || normalized.includes('config')) return `Open ${title} to configure platform behavior, routing options, and runtime preferences.`;
    if (normalized.includes('mcp')) return `Open ${title} to manage MCP routing, aggregation, server status, and tool catalog behavior.`;
    if (normalized.includes('tools')) return `Open ${title} to browse tool metadata, invocation options, and execution diagnostics.`;
    if (normalized.includes('logs') || normalized.includes('events') || normalized.includes('inspector')) return `Open ${title} to inspect runtime events, logs, and trace-level diagnostics.`;

    const location = href ?? 'its route';
    return `Open ${title} (${section}) at ${location} to access this subsystem's controls, status, and detailed operational data.`;
}

export function getNavDescription(item: NavDescriptionCandidate, section: string): string {
    return item.description?.trim() || buildFallbackNavDescription(item.title, section, item.href);
}

export function isNavHrefActive(currentPathname: string, href: string): boolean {
    const normalizedPathname = normalizeNavHref(currentPathname);
    const normalizedHref = normalizeNavHref(href);

    if (normalizedPathname === normalizedHref) {
        return true;
    }

    return normalizedHref !== '/' && normalizedPathname.startsWith(`${normalizedHref}/`);
}

export function matchesNavQuery(
    query: string,
    item: NavSearchCandidate,
    section?: string,
): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    const normalizedHref = normalizeNavHref(item.href).toLowerCase();
    return item.title.toLowerCase().includes(normalizedQuery)
        || normalizedHref.includes(normalizedQuery)
        || getNavDescription(item, section ?? '').toLowerCase().includes(normalizedQuery)
        || (section ?? '').toLowerCase().includes(normalizedQuery);
}

export function buildNavItemsByHref(sections: NavSection[]): Map<string, NavItem> {
    const map = new Map<string, NavItem>();

    for (const section of sections) {
        for (const item of section.items) {
            // Preserve first-seen entries so duplicate href collisions cannot silently overwrite metadata.
            if (!map.has(item.href)) {
                map.set(item.href, item);
            }
        }
    }

    return map;
}

export function buildNavItemsByNormalizedHref(sections: NavSection[]): Map<string, NavItem> {
    const map = new Map<string, NavItem>();

    for (const section of sections) {
        for (const item of section.items) {
            const normalizedHref = normalizeNavHref(item.href);
            // Preserve first-seen entries so normalized collisions cannot silently overwrite metadata.
            if (!map.has(normalizedHref)) {
                map.set(normalizedHref, item);
            }
        }
    }

    return map;
}

export function validateSidebarSections(sections: NavSection[]): NavValidationResult {
    const duplicateWithinSection: NavValidationResult['duplicateWithinSection'] = [];
    const hrefToSections = new Map<string, Set<string>>();
    const normalizedHrefMap = new Map<string, { hrefs: Set<string>; sections: Set<string> }>();

    for (const section of sections) {
        const seen = new Set<string>();
        const duplicates = new Set<string>();

        for (const item of section.items) {
            if (seen.has(item.href)) {
                duplicates.add(item.href);
            } else {
                seen.add(item.href);
            }

            const sectionsWithHref = hrefToSections.get(item.href) ?? new Set<string>();
            sectionsWithHref.add(section.title);
            hrefToSections.set(item.href, sectionsWithHref);

            const normalizedHref = normalizeNavHref(item.href);
            const normalizedEntry = normalizedHrefMap.get(normalizedHref) ?? {
                hrefs: new Set<string>(),
                sections: new Set<string>(),
            };
            normalizedEntry.hrefs.add(item.href);
            normalizedEntry.sections.add(section.title);
            normalizedHrefMap.set(normalizedHref, normalizedEntry);
        }

        if (duplicates.size > 0) {
            duplicateWithinSection.push({
                section: section.title,
                duplicates: Array.from(duplicates).sort(),
            });
        }
    }

    const duplicateAcrossSections: NavDuplicateIssue[] = [];
    for (const [href, sectionSet] of hrefToSections.entries()) {
        if (sectionSet.size > 1) {
            duplicateAcrossSections.push({
                href,
                sections: Array.from(sectionSet).sort(),
            });
        }
    }

    duplicateAcrossSections.sort((a, b) => a.href.localeCompare(b.href));

    const normalizedHrefCollisions: NavValidationResult['normalizedHrefCollisions'] = [];
    for (const [normalizedHref, entry] of normalizedHrefMap.entries()) {
        if (entry.hrefs.size > 1) {
            normalizedHrefCollisions.push({
                normalizedHref,
                hrefs: Array.from(entry.hrefs).sort(),
                sections: Array.from(entry.sections).sort(),
            });
        }
    }
    normalizedHrefCollisions.sort((a, b) => a.normalizedHref.localeCompare(b.normalizedHref));

    return {
        duplicateWithinSection,
        duplicateAcrossSections,
        normalizedHrefCollisions,
    };
}
