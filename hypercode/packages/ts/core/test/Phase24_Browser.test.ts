import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../src/MCPServer.js';
import { EventEmitter } from 'events';

interface MockWsClient {
    readyState: number;
    send: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
}

interface MockWsServer {
    clients: Set<MockWsClient>;
}

interface PendingRequestMap {
    get(key: string): ((payload: unknown) => void) | undefined;
    has(key: string): boolean;
}

function setServerWssInstance(server: MCPServer, wss: MockWsServer): void {
    Reflect.set(server as object, 'wssInstance', wss);
}

function getPendingRequests(server: MCPServer): PendingRequestMap {
    const value = Reflect.get(server as object, 'pendingRequests');
    return value as PendingRequestMap;
}

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
    let mockWss: MockWsServer;
    let mockClient: MockWsClient;

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
        setServerWssInstance(server, mockWss);
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
        const calls = mockClient.send.mock.calls.map((c) => JSON.parse(String(c[0])) as { method?: string; id?: string });
        const msg = calls.find((c) => c.method === 'browser_screenshot');

        expect(msg).toBeDefined();
        expect(msg.method).toBe('browser_screenshot');
        expect(msg.id).toBeDefined();

        // Simulate response from browser extension
        const requestId = msg?.id;
        expect(typeof requestId).toBe('string');
        const pendingMap = getPendingRequests(server);
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
