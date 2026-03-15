import { describe, expect, it } from 'vitest';

import { SIDEBAR_SECTIONS } from './nav-config';
import { validateSidebarSections } from './nav-validation';

describe('SIDEBAR_SECTIONS', () => {
    it('uses unique href values within each section', () => {
        const diagnostics = validateSidebarSections(SIDEBAR_SECTIONS);

        expect(
            diagnostics.duplicateWithinSection,
            `Duplicate navigation hrefs found within sections: ${JSON.stringify(diagnostics.duplicateWithinSection)}`,
        ).toEqual([]);
    });

    it('uses globally unique href values across sections', () => {
        const diagnostics = validateSidebarSections(SIDEBAR_SECTIONS);

        expect(
            diagnostics.duplicateAcrossSections,
            `Duplicate navigation hrefs found across sections: ${JSON.stringify(diagnostics.duplicateAcrossSections)}`,
        ).toEqual([]);
    });
});
