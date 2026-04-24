/**
 * Agent Metadata — Shared display names and classification sets.
 *
 * This module provides UI-facing metadata that is safe to import from both
 * the main process and the renderer (via shared/).  All agent display names
 * live here so that adding a new agent requires exactly one update.
 */

import type { AgentId } from './agentIds';

/**
 * Human-readable display names for every agent.
 * Keyed by AgentId so TypeScript enforces completeness when a new ID is added.
 */
export const AGENT_DISPLAY_NAMES: Record<AgentId, string> = {
	terminal: 'Terminal',
	'claude-code': 'Claude Code',
	codex: 'Codex',
	'gemini-cli': 'Gemini CLI',
	'qwen3-coder': 'Qwen3 Coder',
	opencode: 'OpenCode',
	'factory-droid': 'Factory Droid',
	aider: 'Aider',
	'adrenaline-cli': 'Adrenaline CLI',
	'amazon-q-cli': 'Amazon Q CLI',
	'amazon-q-developer-cli': 'Amazon Q Developer CLI',
	'amp-code-cli': 'Amp Code CLI',
	'auggie-cli': 'Auggie CLI',
	'azure-openai-cli': 'Azure OpenAI CLI',
	'code-cli': 'Code CLI',
	'codebuff-cli': 'Codebuff CLI',
	'codemachine-cli': 'Codemachine CLI',
	'copilot-cli': 'Copilot CLI',
	'crush-cli': 'Crush CLI',
	'factory-cli': 'Factory CLI',
	'goose-cli': 'Goose CLI',
	'grok-cli': 'Grok CLI',
	'kilo-code-cli': 'Kilo Code CLI',
	'kimi-cli': 'Kimi CLI',
	'manus-cli': 'Manus CLI',
	'mistral-vibe-cli': 'Mistral Vibe CLI',
	'ollama-cli': 'Ollama CLI',
	'open-interpreter-cli': 'Open Interpreter CLI',
	'pi-cli': 'Pi CLI',
	'rovo-cli': 'Rovo CLI',
	'trae-cli': 'Trae CLI',
	'warp-cli': 'Warp CLI',
};

/**
 * Get the human-readable display name for an agent.
 * Returns the raw id string as fallback for unknown agents.
 */
export function getAgentDisplayName(agentId: AgentId | string): string {
	if (Object.prototype.hasOwnProperty.call(AGENT_DISPLAY_NAMES, agentId)) {
		return AGENT_DISPLAY_NAMES[agentId as AgentId];
	}
	return agentId;
}

/**
 * Agents currently in beta/experimental status.
 * Used to render "(Beta)" badges throughout the UI.
 */
export const BETA_AGENTS: ReadonlySet<AgentId> = new Set<AgentId>([
	'codex',
	'opencode',
	'factory-droid',
]);

/**
 * Check whether an agent is in beta status.
 */
export function isBetaAgent(agentId: AgentId | string): boolean {
	return BETA_AGENTS.has(agentId as AgentId);
}
