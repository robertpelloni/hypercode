import { describe, expect, it } from 'vitest';

import { isMetaMCPDisabled, isToolNotFoundError, parseBooleanFlag, shouldPreferAggregatorExecution, shouldUseDirectMCPHandlers, shouldUseMetaMCPProxy } from '../../src/mcp/metaMcpMode.ts';
import { isMetaMCPDisabled, isToolNotFoundError, parseBooleanFlag, shouldAttemptMetaMCPProxyExecution, shouldPreferAggregatorExecution, shouldUseDirectMCPHandlers, shouldUseMetaMCPProxy } from '../../src/mcp/metaMcpMode.ts';

describe('metaMcpMode', () => {
    it('treats common truthy values as enabled flags', () => {
        expect(parseBooleanFlag('true')).toBe(true);
        expect(parseBooleanFlag('1')).toBe(true);
        expect(parseBooleanFlag('YES')).toBe(true);
        expect(parseBooleanFlag('on')).toBe(true);
        expect(parseBooleanFlag('false')).toBe(false);
        expect(parseBooleanFlag(undefined)).toBe(false);
    });

    it('disables MetaMCP proxy mode when MCP_DISABLE_METAMCP is set', () => {
        expect(isMetaMCPDisabled({ MCP_DISABLE_METAMCP: 'true' })).toBe(true);
        expect(shouldUseMetaMCPProxy({ MCP_DISABLE_METAMCP: 'true' })).toBe(false);
        expect(shouldUseMetaMCPProxy({})).toBe(true);
    });

    it('recognizes missing-tool errors across proxy and aggregator paths', () => {
        expect(isToolNotFoundError(new Error("Unknown tool: search_tools"))).toBe(true);
        expect(isToolNotFoundError(new Error("Tool 'x' not found in any connected MCP server."))).toBe(true);
        expect(isToolNotFoundError(new Error('No provider found for tool x'))).toBe(true);
        expect(isToolNotFoundError(new Error('socket hang up'))).toBe(false);
    });

    it('prefers Borg aggregator execution for namespaced downstream tools', () => {
        expect(shouldPreferAggregatorExecution('github__create_issue')).toBe(true);
        expect(shouldPreferAggregatorExecution('memory__store_fact')).toBe(true);
        expect(shouldPreferAggregatorExecution('search_tools')).toBe(false);
        expect(shouldPreferAggregatorExecution('run_code')).toBe(false);
    });

    it('prefers Borg aggregator execution for plain tool names already present in the aggregated inventory', () => {
        expect(shouldPreferAggregatorExecution('create_issue', [
            { name: 'github__create_issue', _originalName: 'create_issue' },
        ])).toBe(true);
        expect(shouldPreferAggregatorExecution('search_issues', [
            { name: 'github__create_issue', _originalName: 'create_issue' },
        ])).toBe(false);
    });

    it('falls back to direct handlers when MetaMCP is disabled or bootstrap fails', () => {
        expect(shouldUseDirectMCPHandlers({ metaMCPProxyEnabled: false })).toBe(true);
        expect(shouldUseDirectMCPHandlers({ metaMCPProxyEnabled: true, metaMCPInitFailed: true })).toBe(true);
        expect(shouldUseDirectMCPHandlers({ metaMCPProxyEnabled: true, metaMCPInitFailed: false })).toBe(false);
    });

    it('attempts MetaMCP proxy execution only when Borg is not already handling the tool natively', () => {
        expect(shouldAttemptMetaMCPProxyExecution({ metaMCPProxyEnabled: true, prefersAggregatorExecution: false })).toBe(true);
        expect(shouldAttemptMetaMCPProxyExecution({ metaMCPProxyEnabled: true, prefersAggregatorExecution: true })).toBe(false);
        expect(shouldAttemptMetaMCPProxyExecution({ metaMCPProxyEnabled: false, prefersAggregatorExecution: false })).toBe(false);
    });
});