import { describe, expect, it } from 'vitest';

import {
    isLegacyProxyDisabled,
    isToolNotFoundError,
    parseBooleanFlag,
    shouldAttemptLegacyProxyExecution,
    shouldPreferAggregatorExecution,
    shouldUseDirectMCPHandlers,
    shouldUseLegacyProxy,
} from '../../src/mcp/legacyProxyMode.ts';

describe('legacyProxyMode', () => {
    it('treats common truthy values as enabled flags', () => {
        expect(parseBooleanFlag('true')).toBe(true);
        expect(parseBooleanFlag('1')).toBe(true);
        expect(parseBooleanFlag('YES')).toBe(true);
        expect(parseBooleanFlag('on')).toBe(true);
        expect(parseBooleanFlag('false')).toBe(false);
        expect(parseBooleanFlag(undefined)).toBe(false);
    });

    it('disables legacy proxy mode when MCP_DISABLE_METAMCP is set', () => {
        expect(isLegacyProxyDisabled({ MCP_DISABLE_METAMCP: 'true' })).toBe(true);
        expect(shouldUseLegacyProxy({ MCP_DISABLE_METAMCP: 'true' })).toBe(false);
        expect(shouldUseLegacyProxy({})).toBe(false);
    });

    it('recognizes missing-tool errors across proxy and aggregator paths', () => {
        expect(isToolNotFoundError(new Error('Unknown tool: search_tools'))).toBe(true);
        expect(isToolNotFoundError(new Error("Tool 'x' not found in any connected MCP server."))).toBe(true);
        expect(isToolNotFoundError(new Error('No provider found for tool x'))).toBe(true);
        expect(isToolNotFoundError(new Error('socket hang up'))).toBe(false);
    });

    it('prefers HyperCode aggregator execution for namespaced downstream tools', () => {
        expect(shouldPreferAggregatorExecution('github__create_issue')).toBe(true);
        expect(shouldPreferAggregatorExecution('memory__store_fact')).toBe(true);
        expect(shouldPreferAggregatorExecution('search_tools')).toBe(false);
        expect(shouldPreferAggregatorExecution('run_code')).toBe(false);
    });

    it('prefers HyperCode aggregator execution for plain tool names already present in the aggregated inventory', () => {
        expect(shouldPreferAggregatorExecution('create_issue', [
            { name: 'github__create_issue', _originalName: 'create_issue' },
        ])).toBe(true);
        expect(shouldPreferAggregatorExecution('search_issues', [
            { name: 'github__create_issue', _originalName: 'create_issue' },
        ])).toBe(false);
    });

    it('falls back to direct handlers when legacy proxy is disabled or bootstrap fails', () => {
        expect(shouldUseDirectMCPHandlers({ legacyProxyEnabled: false })).toBe(true);
        expect(shouldUseDirectMCPHandlers({ legacyProxyEnabled: true, legacyProxyInitFailed: true })).toBe(true);
        expect(shouldUseDirectMCPHandlers({ legacyProxyEnabled: true, legacyProxyInitFailed: false })).toBe(false);
    });

    it('attempts legacy proxy execution only when HyperCode is not already handling the tool natively', () => {
        expect(shouldAttemptLegacyProxyExecution({ legacyProxyEnabled: true, prefersAggregatorExecution: false })).toBe(true);
        expect(shouldAttemptLegacyProxyExecution({ legacyProxyEnabled: true, prefersAggregatorExecution: true })).toBe(false);
        expect(shouldAttemptLegacyProxyExecution({ legacyProxyEnabled: false, prefersAggregatorExecution: false })).toBe(false);
    });
});