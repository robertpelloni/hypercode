import { parseNamespacedToolName } from './namespaces.js';
import type { MCPAggregatedTool } from './types.js';

interface DirectMCPHandlerDecision {
    metaMCPProxyEnabled: boolean;
    metaMCPInitFailed?: boolean;
}

interface ProxyExecutionDecision {
    metaMCPProxyEnabled: boolean;
    prefersAggregatorExecution: boolean;
}

export function parseBooleanFlag(value: string | undefined): boolean {
    if (!value) {
        return false;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isMetaMCPDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return parseBooleanFlag(env.MCP_DISABLE_METAMCP);
}

export function shouldUseMetaMCPProxy(env: NodeJS.ProcessEnv = process.env): boolean {
    return !isMetaMCPDisabled(env);
}

export function isToolNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    return /unknown tool|not found in any connected mcp server|no provider found/i.test(error.message);
}

export function shouldPreferAggregatorExecution(
    toolName: string,
    aggregatedTools: ReadonlyArray<Pick<MCPAggregatedTool, 'name' | '_originalName'>> = [],
): boolean {
    if (parseNamespacedToolName(toolName) !== null) {
        return true;
    }

    return aggregatedTools.some((tool) => tool.name === toolName || tool._originalName === toolName);
}

export function shouldUseDirectMCPHandlers(decision: DirectMCPHandlerDecision): boolean {
    if (!decision.metaMCPProxyEnabled) {
        return true;
    }

    return decision.metaMCPInitFailed === true;
}

export function shouldAttemptMetaMCPProxyExecution(decision: ProxyExecutionDecision): boolean {
    if (!decision.metaMCPProxyEnabled) {
        return false;
    }

    return !decision.prefersAggregatorExecution;
}