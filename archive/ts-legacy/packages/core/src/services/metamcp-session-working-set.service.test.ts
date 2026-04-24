import { describe, expect, it, vi } from 'vitest';

import { SessionToolWorkingSet } from './metamcp-session-working-set.service.js';

describe('SessionToolWorkingSet', () => {
    it('uses tighter default limits for the session working set', () => {
        const workingSet = new SessionToolWorkingSet();

        expect(workingSet.getLimits()).toEqual({
            maxLoadedTools: 16,
            maxHydratedSchemas: 8,
            idleEvictionThresholdMs: 5 * 60 * 1000,
        });
    });

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
        expect(new Set(workingSet.getLoadedToolNames())).toEqual(new Set(['beta', 'gamma', 'delta']));
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

    it('refreshes LRU order when an already loaded tool is actually used', () => {
        const nowSpy = vi.spyOn(Date, 'now');
        let tick = 1_000;
        nowSpy.mockImplementation(() => {
            tick += 1;
            return tick;
        });

        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 3,
            maxHydratedSchemas: 2,
        });

        workingSet.loadTool('alpha');
        workingSet.loadTool('beta');
        workingSet.loadTool('gamma');

        expect(workingSet.touchTool('alpha')).toBe(true);

        const evicted = workingSet.loadTool('delta');

        expect(evicted).toEqual(['beta']);
        expect(new Set(workingSet.getLoadedToolNames())).toEqual(new Set(['gamma', 'alpha', 'delta']));

        const alphaState = workingSet.listLoadedTools().find((tool) => tool.name === 'alpha');
        expect(typeof alphaState?.lastAccessedAt).toBe('number');
        expect((alphaState?.lastAccessedAt ?? 0) > 0).toBe(true);

        nowSpy.mockRestore();
    });

    it('keeps always-loaded tools visible and protected from eviction or full unload', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 2,
            maxHydratedSchemas: 1,
        });

        workingSet.setAlwaysLoadedTools(['pinned']);
        workingSet.loadTool('alpha');
        const evicted = workingSet.loadTool('beta');

        expect(evicted).toEqual([]);
        expect(workingSet.getLoadedToolNames()).toEqual(['pinned', 'alpha', 'beta']);
        expect(workingSet.isLoaded('pinned')).toBe(true);
        expect(workingSet.unloadTool('pinned')).toBe(false);

        workingSet.hydrateTool('pinned');
        expect(workingSet.isHydrated('pinned')).toBe(true);
        expect(workingSet.unloadTool('pinned')).toBe(true);
        expect(workingSet.isLoaded('pinned')).toBe(true);
        expect(workingSet.isHydrated('pinned')).toBe(false);
    });

    it('tracks always-loaded tool recency metadata', () => {
        const nowSpy = vi.spyOn(Date, 'now');
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 2,
            maxHydratedSchemas: 1,
        });

        nowSpy.mockReturnValueOnce(1_000);
        workingSet.setAlwaysLoadedTools(['pinned']);

        const initialState = workingSet.listLoadedTools().find((tool) => tool.name === 'pinned');
        expect(initialState).toBeTruthy();
        expect(initialState?.lastLoadedAt).toBe(1_000);
        expect(initialState?.lastAccessedAt).toBe(1_000);

        nowSpy.mockReturnValueOnce(2_500);
        expect(workingSet.touchTool('pinned')).toBe(true);

        const updatedState = workingSet.listLoadedTools().find((tool) => tool.name === 'pinned');
        expect(updatedState?.lastLoadedAt).toBe(1_000);
        expect(updatedState?.lastAccessedAt).toBe(2_500);

        nowSpy.mockRestore();
    });

    it('records evicted tools in the bounded eviction history with tier=loaded', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 2,
            maxHydratedSchemas: 2,
        });

        workingSet.loadTool('alpha');
        workingSet.loadTool('beta');
        workingSet.loadTool('gamma'); // evicts alpha

        const history = workingSet.getEvictionHistory();
        expect(history).toHaveLength(1);
        expect(history[0].toolName).toBe('alpha');
        expect(history[0].tier).toBe('loaded');
        expect(typeof history[0].timestamp).toBe('number');
    });

    it('records hydrated schema evictions separately with tier=hydrated', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 4,
            maxHydratedSchemas: 2,
        });

        workingSet.hydrateTool('alpha');
        workingSet.hydrateTool('beta');
        workingSet.hydrateTool('gamma'); // evicts alpha schema only

        const history = workingSet.getEvictionHistory();
        expect(history).toHaveLength(1);
        expect(history[0].toolName).toBe('alpha');
        expect(history[0].tier).toBe('hydrated');
        // alpha is still loaded (metadata) even though schema was evicted
        expect(workingSet.isLoaded('alpha')).toBe(true);
    });

    it('returns history most recent first', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 2,
            maxHydratedSchemas: 2,
        });

        workingSet.loadTool('a');
        workingSet.loadTool('b');
        workingSet.loadTool('c'); // evicts a
        workingSet.loadTool('d'); // evicts b

        const history = workingSet.getEvictionHistory();
        expect(history[0].toolName).toBe('b');
        expect(history[1].toolName).toBe('a');
    });

    it('clearEvictionHistory empties the ring buffer', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 1,
            maxHydratedSchemas: 1,
        });

        workingSet.loadTool('alpha');
        workingSet.loadTool('beta'); // evicts alpha

        expect(workingSet.getEvictionHistory()).toHaveLength(1);
        workingSet.clearEvictionHistory();
        expect(workingSet.getEvictionHistory()).toHaveLength(0);
    });

    it('bounds eviction history to the configured retention size', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 1,
            maxHydratedSchemas: 1,
        });

        for (let index = 0; index < 220; index += 1) {
            workingSet.loadTool(`tool-${index}`);
        }

        const history = workingSet.getEvictionHistory();
        expect(history).toHaveLength(200);
        expect(history[0]?.toolName).toBe('tool-218');
        expect(history[history.length - 1]?.toolName).toBe('tool-19');
    });

    it('reconfigure applies tighter limits immediately and records evictions', () => {
        const workingSet = new SessionToolWorkingSet({
            maxLoadedTools: 8,
            maxHydratedSchemas: 4,
        });

        workingSet.loadTool('alpha');
        workingSet.loadTool('beta');
        workingSet.loadTool('gamma');

        workingSet.reconfigure({ maxLoadedTools: 2, maxHydratedSchemas: 1, idleEvictionThresholdMs: 90_000 });

        expect(workingSet.getLimits()).toEqual({
            maxLoadedTools: 2,
            maxHydratedSchemas: 1,
            idleEvictionThresholdMs: 90_000,
        });

        expect(workingSet.getLoadedToolNames().length).toBeLessThanOrEqual(2);
        expect(workingSet.getEvictionHistory().length).toBeGreaterThan(0);
    });

    it('reconfigure normalizes inputs to valid lower bounds', () => {
        const workingSet = new SessionToolWorkingSet();

        workingSet.reconfigure({ maxLoadedTools: 0.2, maxHydratedSchemas: 0, idleEvictionThresholdMs: -5 });

        const limits = workingSet.getLimits();
        expect(limits.maxLoadedTools).toBe(1);
        expect(limits.maxHydratedSchemas).toBe(1);
        expect(limits.idleEvictionThresholdMs).toBe(0);
    });
});
