import { describe, expect, it } from 'vitest';

import { SessionToolWorkingSet } from './metamcp-session-working-set.service.ts';

describe('SessionToolWorkingSet', () => {
    it('evicts the least recently used loaded tool when the hard loaded cap is exceeded', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 3,
            maxHydratedSchemas: 2,
        });

        workingSet.loadTool('alpha');
        workingSet.loadTool('beta');
        workingSet.loadTool('gamma');
        workingSet.loadTool('beta');

        const evicted = workingSet.loadTool('delta');

        expect(evicted).toEqual(['alpha']);
        expect(workingSet.getLoadedToolNames()).toEqual(['gamma', 'beta', 'delta']);
    });

    it('evicts the least recently used hydrated schema independently of loaded metadata', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 4,
            maxHydratedSchemas: 2,
        });

        workingSet.hydrateTool('alpha');
        workingSet.hydrateTool('beta');
        const evicted = workingSet.hydrateTool('gamma');

        expect(evicted).toEqual(['alpha']);
        expect(workingSet.isLoaded('alpha')).toBe(true);
        expect(workingSet.isHydrated('alpha')).toBe(false);
        expect(workingSet.isHydrated('beta')).toBe(true);
        expect(workingSet.isHydrated('gamma')).toBe(true);
    });

    it('supports explicit unload and loaded-tool inspection', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 4,
            maxHydratedSchemas: 2,
        });

        workingSet.loadTool('alpha');
        workingSet.hydrateTool('beta');

        const snapshot = workingSet.listLoadedTools();

        expect(snapshot.map((item) => ({ name: item.name, hydrated: item.hydrated }))).toEqual([
            { name: 'alpha', hydrated: false },
            { name: 'beta', hydrated: true },
        ]);

        expect(workingSet.unloadTool('beta')).toBe(true);
        expect(workingSet.listLoadedTools().map((item) => item.name)).toEqual(['alpha']);
        expect(workingSet.unloadTool('missing')).toBe(false);
    });
});
