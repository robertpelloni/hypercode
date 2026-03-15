import type { NavSection } from './nav-config';

type NavItem = NavSection['items'][number];

export interface NavSearchCandidate {
    title: string;
    href: string;
    description?: string;
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
        || (item.description ?? '').toLowerCase().includes(normalizedQuery)
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
