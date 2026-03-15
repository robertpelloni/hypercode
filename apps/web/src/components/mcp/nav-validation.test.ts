import { describe, expect, it } from 'vitest';

import type { NavSection } from './nav-config';
import { validateSidebarSections } from './nav-validation';

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
    });
});
