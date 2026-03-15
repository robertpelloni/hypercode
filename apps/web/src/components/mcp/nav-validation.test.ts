import { describe, expect, it } from 'vitest';

import type { NavSection } from './nav-config';
import {
    buildNavItemsByHref,
    buildNavItemsByNormalizedHref,
    hasNavValidationIssues,
    normalizeNavHref,
    validateSidebarSections,
} from './nav-validation';

describe('normalizeNavHref', () => {
    it('normalizes trailing slashes while preserving root', () => {
        expect(normalizeNavHref('/dashboard/library')).toBe('/dashboard/library');
        expect(normalizeNavHref('/dashboard/library/')).toBe('/dashboard/library');
        expect(normalizeNavHref('/')).toBe('/');
    });

    it('strips query/hash fragments and trims surrounding whitespace', () => {
        expect(normalizeNavHref(' /dashboard/library/?tab=overview#top ')).toBe('/dashboard/library');
        expect(normalizeNavHref('/dashboard/library?tab=overview')).toBe('/dashboard/library');
        expect(normalizeNavHref('/dashboard/library#summary')).toBe('/dashboard/library');
    });
});

describe('validateSidebarSections', () => {
    it('returns empty diagnostics when hrefs are unique', () => {
        const sections: NavSection[] = [
            {
                title: 'One',
                items: [
                    { title: 'A', href: '/a', icon: null, variant: 'ghost' },
                    { title: 'B', href: '/b', icon: null, variant: 'ghost' },
                ],
            },
            {
                title: 'Two',
                items: [
                    { title: 'C', href: '/c', icon: null, variant: 'ghost' },
                    { title: 'D', href: '/d', icon: null, variant: 'ghost' },
                ],
            },
        ];

        const diagnostics = validateSidebarSections(sections);

        expect(diagnostics.duplicateWithinSection).toEqual([]);
        expect(diagnostics.duplicateAcrossSections).toEqual([]);
        expect(diagnostics.normalizedHrefCollisions).toEqual([]);
        expect(hasNavValidationIssues(diagnostics)).toBe(false);
    });

    it('detects duplicates within and across sections', () => {
        const sections: NavSection[] = [
            {
                title: 'One',
                items: [
                    { title: 'A', href: '/repeat', icon: null, variant: 'ghost' },
                    { title: 'B', href: '/repeat', icon: null, variant: 'ghost' },
                    { title: 'C', href: '/x', icon: null, variant: 'ghost' },
                ],
            },
            {
                title: 'Two',
                items: [
                    { title: 'D', href: '/x', icon: null, variant: 'ghost' },
                    { title: 'E', href: '/y', icon: null, variant: 'ghost' },
                ],
            },
        ];

        const diagnostics = validateSidebarSections(sections);

        expect(diagnostics.duplicateWithinSection).toEqual([
            {
                section: 'One',
                duplicates: ['/repeat'],
            },
        ]);

        expect(diagnostics.duplicateAcrossSections).toEqual([
            {
                href: '/x',
                sections: ['One', 'Two'],
            },
        ]);

        expect(diagnostics.normalizedHrefCollisions).toEqual([]);
        expect(hasNavValidationIssues(diagnostics)).toBe(true);
    });

    it('detects normalized href collisions such as trailing slash variants', () => {
        const sections: NavSection[] = [
            {
                title: 'One',
                items: [
                    { title: 'A', href: '/dashboard/library', icon: null, variant: 'ghost' },
                ],
            },
            {
                title: 'Two',
                items: [
                    { title: 'B', href: '/dashboard/library/', icon: null, variant: 'ghost' },
                ],
            },
        ];

        const diagnostics = validateSidebarSections(sections);

        expect(diagnostics.normalizedHrefCollisions).toEqual([
            {
                normalizedHref: '/dashboard/library',
                hrefs: ['/dashboard/library', '/dashboard/library/'],
                sections: ['One', 'Two'],
            },
        ]);
        expect(hasNavValidationIssues(diagnostics)).toBe(true);
    });

    it('detects normalized href collisions for query and hash variants', () => {
        const sections: NavSection[] = [
            {
                title: 'One',
                items: [
                    { title: 'A', href: '/dashboard/library?tab=overview', icon: null, variant: 'ghost' },
                ],
            },
            {
                title: 'Two',
                items: [
                    { title: 'B', href: '/dashboard/library#top', icon: null, variant: 'ghost' },
                ],
            },
        ];

        const diagnostics = validateSidebarSections(sections);

        expect(diagnostics.normalizedHrefCollisions).toEqual([
            {
                normalizedHref: '/dashboard/library',
                hrefs: ['/dashboard/library#top', '/dashboard/library?tab=overview'],
                sections: ['One', 'Two'],
            },
        ]);
        expect(hasNavValidationIssues(diagnostics)).toBe(true);
    });

    it('builds href map with first-seen metadata when duplicates exist', () => {
        const sections: NavSection[] = [
            {
                title: 'One',
                items: [
                    { title: 'Original', href: '/same', icon: null, variant: 'ghost', description: 'first' },
                ],
            },
            {
                title: 'Two',
                items: [
                    { title: 'Shadowed', href: '/same', icon: null, variant: 'ghost', description: 'second' },
                ],
            },
        ];

        const map = buildNavItemsByHref(sections);

        expect(map.get('/same')?.title).toBe('Original');
        expect(map.get('/same')?.description).toBe('first');
    });

    it('builds normalized href map with first-seen metadata for semantic collisions', () => {
        const sections: NavSection[] = [
            {
                title: 'One',
                items: [
                    { title: 'Original', href: '/same/?tab=one#top', icon: null, variant: 'ghost', description: 'first' },
                ],
            },
            {
                title: 'Two',
                items: [
                    { title: 'Shadowed', href: '/same/', icon: null, variant: 'ghost', description: 'second' },
                ],
            },
        ];

        const map = buildNavItemsByNormalizedHref(sections);

        expect(map.get('/same')?.title).toBe('Original');
        expect(map.get('/same')?.description).toBe('first');
    });
});
