# Borg Project Roadmap

> **Status**: Phase 76 (MetaMCP Backend Fix & Dev Readiness) - **COMPLETED**
> **Version**: 2.7.35 (canonical from `VERSION`)
> **Codename**: AIOS (AI Operating System)

---

## Phase 1-19: Foundations (Completed)

- [x] **Phase 1: Zero-Shot Architecting** - Initial concept and MVP
- [x] **Phase 10: The Local LLM Bridge** - Oufob/Ollama integration
- [x] **Phase 15: Deep Analysis** - Core system introspection
- [x] **Phase 19: The Enterprise Vision** - Defined commercial goals

## Phase 20-29: The Core Architecture (Completed)

- [x] **Phase 20: The Monorepo Transition** - Migrated to pnpm + Turborepo structure types/core/ui/apps
- [x] **Phase 21: The MCP Foundation** - Implemented Model Context Protocol SDK integration
- [x] **Phase 22: The tRPC Backbone** - Replaced REST with tRPC for type-safe frontend-backend comms
- [x] **Phase 23: The Director Agent** - Created the first autonomous loop (Director.ts)
- [x] **Phase 24: The Tool Registry** - Built `packages/tools` with standard file/terminal tools
- [x] **Phase 25: The Shell Service** - Robust PTY management for terminal persistence
- [x] **Phase 26: The Git Service** - Git integration for autonomous commits
- [x] **Phase 27: The System Dashboard** - Launched Next.js dashboard (v1)
- [x] **Phase 28: The Vector Memory** - Integrated LanceDB/ChromaDB for semantic search
- [x] **Phase 29: The Search Service** - Ripgrep + AST implementation

## Phase 30-39: The Intelligence Layer (Completed)

- [x] **Phase 30: Multi-Model Selector** - Support for Claude, Gemini, GPT via `LLMService`
- [x] **Phase 31: The Metrics Service** - Prometheus-style metrics for agent performance
- [x] **Phase 32: The Policy Engine** - Allowed/Blocked commands and file paths
- [x] **Phase 33: The Healer (Self-Correction)** - Automatic error analysis and fix generation
- [x] **Phase 34: The Darwin Protocol** - Prompt mutation and evolution experiments
- [x] **Phase 35: The Council** - Multi-persona voting mechanism (Architect/Critic/Builder)
- [x] **Phase 36: Deep Research V1** - Recursive web scraping and summarization
- [x] **Phase 37: The Knowledge Graph** - Cognee integration for semantic relationships
- [x] **Phase 38: The Skill Assimilator** - Reading docs and generating new tools
- [x] **Phase 39: The Visual Cortex** - Image analysis and screenshot capabilities

## Phase 40-49: The Expansion (Completed)

- [x] **Phase 40: The Browser Extension** - Chrome extension for browser-MCP bridge
- [x] **Phase 41: The IDE Bridge** - VS Code extension for internal observation
- [x] **Phase 42: The Submodule Surge** - Integrated 100+ reference submodules
- [x] **Phase 43: The Nervous System** - Event bus and global state management
- [x] **Phase 44: The CLI Harness** - Commander.js CLI with 11 functional groups
- [x] **Phase 45: Knowledge Assimilation** - Ingesting PDFs, docs, and codebase context
- [x] **Phase 46: Dashboard Rebuild (v2)** - Modern UI with Tailwind, glassmorphism, real-time stats
- [x] **Phase 47: The Supervisor** - High-level task decomposition agent
- [x] **Phase 48: The Worktree Manager** - Git worktrees for parallel agent squads
- [x] **Phase 49: The Sandbox** - Secure code execution environment (VM/Docker)

## Phase 50-59: The Singularity (Completed)

- [x] **Phase 50: Grand Unification V1** - Connecting all disparate systems into one OS
- [x] **Phase 51: Infrastructure Hardening** - Robust error handling and process supervision
- [x] **Phase 52: The Universal Interface** - Standardized UI components across all 31 pages
- [x] **Phase 53: The Documentation Overhaul** - Rewrote all LLM instructions (v2.6.0)
- [x] **Phase 54: The Version Sync** - Unified versioning across all packages
- [x] **Phase 55: The Session Manager** - State persistence and crash recovery
- [x] **Phase 56: The Session Router** - Dashboard control of session state
- [x] **Phase 57: Resilient Intelligence** - Automatic fallback, Director hardening, heartbeats
    - [x] Automatic Model/Provider Switch on Quota Limit (429)
    - [x] SessionManager recovery & persistence
- [x] **Phase 58: Grand Unification The Final Integration**
    - [x] Full System Test (`test_grand_unification_v2.ts`)
    - [x] Submodule Dashboard & Documentation Sync
    - [x] Autonomous Loop Execution
- [x] **Phase 59: Autonomous Loop Implementation**
    - [x] ProjectTracker service
    - [x] Director self-assignment & idle task selection

## Phase 60-69: The Hive Mind (Current)

- [x] **Phase 62: Ignition (Real Capabilities)**
    - [x] Real LLM coding integration (CoderAgent)
    - [x] DeepResearch integration (ResearcherAgent)
    - [x] Skill Registry Mismatch Fix
    - [x] Project Tracker Hardening (JSON persistence)
- [x] **Phase 63: Codebase Hardening (Audit Findings)**
    - [x] Critical Fixes (Skills, Research, EventBus)
    - [x] Extension Connectivity Fix (Circular deps)
    - [x] Real Data Wiring (Billing, Task Status, Indexing)
    - [x] TypeScript Hardening (90+ `as any` removals)
    - [x] UI Polish (Healer streaming, Inspector config, Council members)
    - [x] Router Refactor (Decoupled tools/scripts from DB)
- [x] **Phase 64: Release Readiness (v0.8.0-rc1) [COMPLETED]**
    - [x] Docker & Deployment Verification
    - [x] Cross-service local readiness checker (`scripts/verify_dev_readiness.mjs`)
    - [x] Strict machine-readable release gate (`check:release-gate`)
    - [x] Git Tree Stabilization (Repaired .gitmodules mapping errors)
    - [x] Knowledge Base Sync (932 submodules assimilated)
    - [x] Documentation Audit (Created feature gap and deduplication reports)
    - [x] Documentation Freeze & Deep Analysis
    - [x] Submodule Operations Dashboard (React UI at `/dashboard/submodules`)
    - [x] Final E2E Regression (All 4 services pass `verify_dev_readiness.mjs` strict mode)

## P3 — Future Phases (Post-69)

- [x] **Phase 69: Deep Submodule Assimilation (v2.7.28) [COMPLETED]**
    - [x] Cloned foundational submodules (MetaMCP, MCP-SuperAssistant, jules-autopilot, claude-mem).
    - [x] Re-architected project documentation and models to mandate strict Version/Changelog protocol.
    - [x] Refactored `@borg/core` MCPServer to delegate tool execution through MetaMCP proxy (`executeProxiedTool`).
    - [x] Injected Borg WebSocket bridge + `window.borg` API into `MCP-SuperAssistant` (official browser extension).
    - [x] Created `ClaudeMemAdapter` + `RedundantMemoryManager` for guaranteed multi-store writes.
    - [x] Implemented `cloudDevRouter` + `/dashboard/cloud-dev` for multi-provider cloud agent management.
- [x] **Phase 70: Memory System Multi-Backend**
    - [x] Selectable vector store backends (LanceDB, ChromaDB, Pinecone)
    - [x] Memory import/export (JSON, CSV, JSONL)
    - [x] Cross-session memory synchronization across agents
- [x] **Phase 71: RAG Pipeline & Context Harvesting**
    - [x] Document intake pipeline (PDF, DOCX, Markdown)
    - [x] Chunking strategies (semantic, sliding window, recursive)
    - [x] Embedding service abstraction (OpenAI, local models)
- [x] **Phase 72: Production Hardening & Deployment**
    - [x] Docker multi-stage production builds
    - [x] Health monitoring and auto-restart
    - [x] Rate limiting and authentication middleware
- [x] **Phase 73: Multi-Agent Orchestration & Swarm**
    - [x] Swarm execution pattern implementation
    - [x] Multi-Model Debate protocols
    - [x] Pair Programming orchestrator
    - [x] Consensus voting mechanisms
- [x] **Phase 74: Frontend Type Closure & Dev Readiness**
    - [x] Clean `tsc --noEmit` on both `packages/core` and `apps/web`
    - [x] Created missing `PageHeader`, `types/nav`, `heroicons.d.ts` stubs
    - [x] Migrated tRPC v11 `isLoading` → `isPending`
    - [x] Rebuilt `@borg/core` dist types for swarm router propagation
- [x] **Phase 75: Documentation Reality Sync & Stub Audit**
    - [x] Updated `DEPLOY.md`, `MEMORY.md`, `AGENTS.md` to v2.7.33
    - [x] Documented `Dockerfile.prod` multi-target build in DEPLOY.md
    - [x] Stub audit: zero critical P0 blockers found

- [x] **Phase 65: Marketplace & Ecosystem**
    - [x] MCP Registry Integration (1000+ servers)
    - [x] End-to-end Plugin Execution Engine
    - [x] Integration of standard MCP servers (git, memory, time, weather, etc)
- [x] **Phase 66: AI Command Center & Dashboards**
    - [x] Jules Autopilot Dashboard
    - [x] OpenCode Autopilot Dashboard
    - [x] Master AI Billing & API Key Dashboard
    - [x] Installed AI Tool Detector & Usage Tracker
- [x] **Phase 67: MetaMCP Submodule Assimilation**
    - [x] Add MetaMCP as Git submodule at `external/MetaMCP`
    - [x] Configure as `pnpm` workspace package
    - [x] Link via `MetaMCPBridgeService` HTTP client + TRPC router procedures
    - [x] Build separate `dist/metamcp.js` library entry point via tsup
- [x] **Phase 68: Bytedance DeerFlow Integration (Super Agent Harness)**
    - [x] Add Bytedance DeerFlow as Git submodule at `external/deer-flow`
    - [x] Configure as `pnpm` workspace package (frontend)
    - [x] Link via `DeerFlowBridgeService` HTTP client + TRPC router procedures
    - [x] Build `/dashboard/deer-flow` and inject into `mcp` array

- [x] **Phase 77: Autonomous Agent Mesh Network**
    - [x] Create decentralized `MeshService.ts` for cross-node messaging
    - [x] Define `SwarmProtocol` for capability queries and task offers
    - [x] Reactivate P2P routing in `SpecializedAgent.ts`
    - [x] Refactor `SwarmOrchestrator` to dispatch tasks across the mesh
