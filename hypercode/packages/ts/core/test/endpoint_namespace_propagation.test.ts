import { describe, test, expect } from 'vitest';
import { EventEmitter } from 'events';
import { HubServer } from '../src/hub/HubServer.js';

type HubCtorArgs = ConstructorParameters<typeof HubServer>;

class DummyRouter {
    private ns = new Map<string, string>();

    setNamespaceForSession(sessionId: string, namespaceId: string) {
        this.ns.set(sessionId, namespaceId);
    }

    async getAllTools(sessionId: string) {
        const current = this.ns.get(sessionId);
        return [{ name: current ? `ns:${current}` : 'ns:null' }];
    }

    async callTool() {
        return { content: [{ type: 'text', text: 'ok' }] };
    }
}

describe('endpoint namespace propagation', () => {
    test('tools/list sets session namespace from endpointPath', async () => {
        // Reason: test doubles only implement the subset used by this scenario.
        // What: narrow local doubles to HubServer constructor parameter types via `unknown`.
        // Why: keeps test intent intact without permissive casts.
        const router = new DummyRouter() as unknown as HubCtorArgs[0];
        const manager = {} as unknown as HubCtorArgs[1];
        const hub = new HubServer(router, manager, undefined, undefined, undefined, (path: string) => {
            if (path === '/api/mcp/coding') return 'ns-coding';
            return undefined;
        });

        const res = await hub.handleMessage('s1', {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: { endpointPath: '/api/mcp/coding' }
        });

        expect(res.result.tools[0].name).toBe('ns:ns-coding');
    });
});
