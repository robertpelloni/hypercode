# HANDOFF - Phase 91: Swarm Agent Tool Execution (MCP)

## Current State
- **Phase 91 Complete**: Swarm Worker Agents can now execute MCP Tools (like `read_file` or `execute_sandbox`) during their task execution loop.
- **Core Logic**: Created `McpWorkerAgent.ts` which uses an autonomous LLM JSON loop to execute bound MCP schemas dynamically. `SwarmOrchestrator` now broadcasts the required `tools` inside the `TASK_OFFER` mesh payload. The Swarm UI supports injecting tools at the mission start.

## Tasks Remaining
- [ ] Phase 92: P2P Multi-Node Worker Dispatch. Now that tasks can use tools locally, we need to distribute this tool execution workload across the Mesh to remote satellite nodes.

## Technical Notes
- **Tool Mapping**: Tools must be passed via `offer.tools` array in the `TASK_OFFER` payload to be exposed to the `McpWorkerAgent`. Native tools are mapped to JSON schemas and placed in the system prompt.

**Version**: 2.7.51
