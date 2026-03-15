import type { NavSection } from './nav-config';

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
}

export function validateSidebarSections(sections: NavSection[]): NavValidationResult {
    const duplicateWithinSection: NavValidationResult['duplicateWithinSection'] = [];
    const hrefToSections = new Map<string, Set<string>>();

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

    return {
        duplicateWithinSection,
        duplicateAcrossSections,
    };
}
