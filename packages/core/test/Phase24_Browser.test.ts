import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../src/MCPServer.js';
import { EventEmitter } from 'events';

// Mock Dependencies to avoid full instantiation
vi.mock('../src/services/MemoryManager', () => ({
    MemoryManager: class {
        initialize() { }
    }
}));
vi.mock('../src/orchestrator/Director', () => ({
    Director: class {
        startAutoDrive() { return Promise.resolve(); }
    }
}));
vi.mock('../src/skills/SkillRegistry', () => ({
    SkillRegistry: class {
        setMasterIndexPath() { }
        register() { }
        getSkills() { return []; }
    }
}));

describe('Phase 24: Browser Integration (WebSocket Bridge)', () => {
    let server: MCPServer;
    let mockWss: any;
    let mockClient: any;

    beforeEach(() => {
        // Instantiate without real WebSocket
        server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });

        // Mock WebSocket Server
        mockWss = {
            clients: new Set()
        };

        // Mock WebSocket Client
        mockClient = {
            readyState: 1, // OPEN
            send: vi.fn(),
            on: vi.fn()
        };

        mockWss.clients.add(mockClient);

        // Inject Mock WSS
        (server as any).wssInstance = mockWss;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('executes browser_screenshot and waits for response', async () => {
        const screenshotPromise = server.executeTool('browser_screenshot', {});

        // Advance timers? No, we use Promise resolution.
        // Wait for send to be called
        await new Promise(r => setTimeout(r, 50));

        expect(mockClient.send).toHaveBeenCalled();

        // Find the specific call for browser_screenshot (there might be TOOL_CALL_START messages)
        const calls = mockClient.send.mock.calls.map((c: any) => JSON.parse(c[0]));
        const msg = calls.find((c: any) => c.method === 'browser_screenshot');

        expect(msg).toBeDefined();
        expect(msg.method).toBe('browser_screenshot');
        expect(msg.id).toBeDefined();

        // Simulate response from browser extension
        const requestId = msg.id;
        const pendingMap = (server as any).pendingRequests;
        expect(pendingMap.has(requestId)).toBe(true);

        const callback = pendingMap.get(requestId);

        // Simulate Extension sending back data URL
        const mockDataUrl = "data:image/png;base64,FAKEIMAGE";
        callback(mockDataUrl);

        const result = await screenshotPromise;

        expect(result.content[0].text).toBe("Screenshot captured.");
        expect(result.content[1].mimeType).toBe("image/png");
        expect(result.content[1].data).toBe("FAKEIMAGE");
    });

    it('executes memorize_page but does not enforce wait/response logic logic for everything', async () => {
        // memorize_page might not be implemented to wait yet, but let's check screenshot only for now 
        // as per Phase 24 goal.
    });
});
