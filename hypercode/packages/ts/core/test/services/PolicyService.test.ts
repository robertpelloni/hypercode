import { describe, test, expect, beforeEach, mock } from 'vitest';
import { PolicyService, type PolicyContext } from '../../src/services/PolicyService.ts';

// Mock DatabaseManager to avoid better-sqlite3 binding issues in tests
const mockDb = {
    createPolicy: mock((p: any) => ({ id: 'policy-1', ...p })),
    deletePolicy: mock(() => true),
    getAllPolicies: mock(() => []),
};

// @ts-ignore
import { DatabaseManager } from '../../src/db/index.ts';
mock.module('../../src/db/index.ts', () => ({
    DatabaseManager: {
        getInstance: () => mockDb
    }
}));

describe('PolicyService', () => {
    let policyService: PolicyService;

    beforeEach(() => {
        // Clear mocks
        mockDb.createPolicy.mockClear();
        mockDb.deletePolicy.mockClear();
        mockDb.getAllPolicies.mockClear();
        
        policyService = new PolicyService();
    });

    describe('Agent Guardrails', () => {
        test('should block execution if agent is not allowed', () => {
            mockDb.getAllPolicies.mockReturnValueOnce([
                {
                    id: 'p1',
                    name: 'Restrict Agents',
                    enabled: true,
                    rules: [
                        {
                            action: 'allow',
                            pattern: '*',
                            conditions: { allowedAgents: ['architect'] }
                        },
                        {
                            action: 'deny',
                            pattern: '*'
                        }
                    ]
                }
            ]);

            const context: PolicyContext = {
                toolName: 'agent_run',
                agentId: 'researcher'
            };

            const result = policyService.evaluate(context);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("Agent 'researcher' is not allowed");
        });

        test('should allow execution if agent is in allowed list', () => {
            mockDb.getAllPolicies.mockReturnValueOnce([
                {
                    id: 'p1',
                    name: 'Restrict Agents',
                    enabled: true,
                    rules: [
                        {
                            action: 'allow',
                            pattern: '*',
                            conditions: { allowedAgents: ['architect', 'researcher'] }
                        }
                    ]
                }
            ]);

            const context: PolicyContext = {
                toolName: 'agent_run',
                agentId: 'architect'
            };

            const result = policyService.evaluate(context);
            expect(result.allowed).toBe(true);
        });

        test('should block execution if token limit is exceeded', () => {
            mockDb.getAllPolicies.mockReturnValueOnce([
                {
                    id: 'p1',
                    name: 'Token Limit',
                    enabled: true,
                    rules: [
                        {
                            action: 'allow',
                            pattern: '*',
                            conditions: { maxTokensPerTask: 1000 }
                        },
                        {
                            action: 'deny',
                            pattern: '*'
                        }
                    ]
                }
            ]);

            const context: PolicyContext = {
                toolName: 'agent_run',
                taskTokens: 1500
            };

            const result = policyService.evaluate(context);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("Token limit exceeded");
        });

        test('should block specific action types', () => {
            mockDb.getAllPolicies.mockReturnValueOnce([
                {
                    id: 'p1',
                    name: 'No Deletion',
                    enabled: true,
                    rules: [
                        {
                            action: 'deny',
                            pattern: '*',
                            conditions: { blockedActions: ['delete'] }
                        }
                    ]
                }
            ]);

            const context: PolicyContext = {
                toolName: 'filesystem/delete_file',
                actionType: 'delete'
            };

            const result = policyService.evaluate(context);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("Action type 'delete' is blocked");
        });

        test('should allow non-blocked action types', () => {
            mockDb.getAllPolicies.mockReturnValueOnce([
                {
                    id: 'p1',
                    name: 'No Deletion',
                    enabled: true,
                    rules: [
                        {
                            action: 'deny',
                            pattern: '*',
                            conditions: { blockedActions: ['delete'] }
                        }
                    ]
                }
            ]);

            const context: PolicyContext = {
                toolName: 'filesystem/read_file',
                actionType: 'read'
            };

            const result = policyService.evaluate(context);
            expect(result.allowed).toBe(true);
        });
    });

    describe('Bulk Operations', () => {
        test('should block specific tools using blockTools', () => {
            // Mock created policy for the test to use
            const blockedPolicy = {
                id: 'bt',
                name: 'Blocked Tools',
                enabled: true,
                rules: [
                    { action: 'deny', pattern: '**/dangerous_tool' },
                    { action: 'deny', pattern: '**/rm_*' }
                ]
            };
            mockDb.getAllPolicies.mockReturnValue([blockedPolicy]);
            
            expect(policyService.evaluate({ toolName: 'dangerous_tool' }).allowed).toBe(false);
            expect(policyService.evaluate({ toolName: 'rm_everything' }).allowed).toBe(false);
            expect(policyService.evaluate({ toolName: 'safe_tool' }).allowed).toBe(true);
        });
    });
});

