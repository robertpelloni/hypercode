# Borg Project Roadmap

> **Status**: Phase 64 (Release Readiness) - **IN PROGRESS**
> **Version**: 2.7.14 (canonical from `VERSION.md`)
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

- [x] **Phase 60: The Mesh (P2P Execution)**
    - [x] Hyperswarm / Secret-Stream integration
    - [x] MeshService & Swarm Router
    - [x] Node-to-node RPC verification
- [x] **Phase 61: Specialized Agents (Mesh Workers)**
    - [x] SpecializedAgent base class
    - [x] CoderAgent & ResearcherAgent implementation
    - [x] Capability-based routing
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
- [ ] **Phase 64: Release Readiness (v0.8.0-rc1) [IN PROGRESS]**
    - [x] Docker & Deployment Verification
    - [x] Cross-service local readiness checker (`scripts/verify_dev_readiness.mjs`)
    - [x] Strict machine-readable release gate (`check:release-gate`)
    - [ ] Documentation Freeze
    - [ ] Final E2E Regression

## P3 — Future Phases (Post-63)

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

