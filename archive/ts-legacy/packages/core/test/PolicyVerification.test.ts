import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPServer } from '../src/MCPServer.js';

interface AuditServiceLike {
    log: (...args: unknown[]) => void;
}

interface PermissionManagerLike {
    checkPermission: (...args: unknown[]) => string;
    autonomyLevel: string;
}

interface RouterLike {
    callTool: (tool: string, args: unknown) => Promise<{ content: unknown[] }>;
}

interface TerminalServiceLike {
    getTools: () => unknown[];
}

// Mock dependencies
vi.mock('../src/security/PolicyService', () => ({
    PolicyService: class {
        constructor() { console.log("[MOCK] PolicyService (no-ext) instantiated"); }
        check(tool: string, args: unknown) { return { allowed: true }; }
    }
}));
vi.mock('../src/security/PolicyService.js', () => ({
    PolicyService: class {
        constructor() { console.log("[MOCK] PolicyService (.js) instantiated"); }
        check(tool: string, args: unknown) { return { allowed: true }; }
    }
}));
// Check path resolution
import * as PS from '../src/security/PolicyService.js';

describe('Policy Enforcement', () => {
    let server: MCPServer;

    beforeEach(() => {
        try {
            console.log("Manual PolicyService Check:", new PS.PolicyService());

            console.log("Instantiating MCPServer...");
            server = new MCPServer({ skipWebsocket: true, skipAutoDrive: true });
            console.log("Server instantiated. PolicyService:", server.policyService);
        } catch (e) {
            console.error("Instantiation failed:", e);
        }

        // Mock internal services if needed
        // @ts-ignore
        server.auditService = { log: vi.fn() } as unknown as AuditServiceLike;
        // @ts-ignore
        server.permissionManager = {
            checkPermission: vi.fn().mockReturnValue('GRANTED'),
            autonomyLevel: 'high'
        } as unknown as PermissionManagerLike;
    });

    it('should block tools when PolicyEngine denies access', async () => {
        // Setup Policy Denial
        const denyReason = 'Test Policy Denial';
        // @ts-ignore
        server.policyService.check = vi.fn().mockReturnValue({ allowed: false, reason: denyReason });

        // Attempt execution
        await expect(server.executeTool('read_file', { path: 'secret.txt' }))
            .rejects
            .toThrow(/Policy VIOLATION/);

        // Verify Check usage
        expect(server.policyService.check).toHaveBeenCalledWith('read_file', { path: 'secret.txt' });
    });

    it('should allow tools when PolicyEngine allows access', async () => {
        // Setup Policy Allow
        // @ts-ignore
        server.policyService.check = vi.fn().mockReturnValue({ allowed: true });

        // Mock actual tool handler to avoid real execution logic failure
        // @ts-ignore
        server.router = { callTool: vi.fn().mockResolvedValue({ content: [] }) } as unknown as RouterLike;
        // @ts-ignore
        server.terminalService = { getTools: () => [] } as unknown as TerminalServiceLike;

        // If we call a tool that doesn't exist in standard set, it goes to router.callTool
        await server.executeTool('custom_tool', {});

        expect(server.policyService.check).toHaveBeenCalledWith('custom_tool', {});
    });
});
