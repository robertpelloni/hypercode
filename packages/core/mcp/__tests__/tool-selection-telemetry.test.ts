import { beforeEach, describe, expect, it } from 'vitest';

import { toolSelectionTelemetry } from '../../src/mcp/toolSelectionTelemetry.ts';

describe('toolSelectionTelemetry', () => {
    beforeEach(() => {
        toolSelectionTelemetry.clear();
    });

    it('stores the newest events first', () => {
        toolSelectionTelemetry.record({ type: 'search', query: 'github issues', status: 'success' });
        toolSelectionTelemetry.record({ type: 'load', toolName: 'github__create_issue', status: 'success' });

        const events = toolSelectionTelemetry.list();
        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ type: 'load', toolName: 'github__create_issue' });
        expect(events[1]).toMatchObject({ type: 'search', query: 'github issues' });
    });

    it('caps the retained event history', () => {
        for (let index = 0; index < 120; index += 1) {
            toolSelectionTelemetry.record({ type: 'search', query: `query-${index}`, status: 'success' });
        }

        const events = toolSelectionTelemetry.list();
        expect(events).toHaveLength(100);
        expect(events[0]?.query).toBe('query-119');
        expect(events.at(-1)?.query).toBe('query-20');
    });
});