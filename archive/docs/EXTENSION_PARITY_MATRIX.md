# Extension Surfaces Parity Matrix

> **Updated**: 2026-03-06 (Phase 103)
> **Version**: 2.7.62

This document tracks capability parity across the three Hypercode client surfaces: **Web Dashboard**, **Browser Extension**, and **VS Code Extension**.

---

## Capability Matrix

| Capability | Dashboard | Browser Ext | VS Code Ext | Status |
|---|:---:|:---:|:---:|---|
| **Connection & Health** | | | | |
| Core health check | ✅ tRPC | ✅ HTTP `/health` | ✅ WS auto-connect | 🟢 Shipped |
| Status bar indicator | N/A | N/A | ✅ StatusBarItem | 🟢 Shipped |
| Auto-reconnect | ✅ TRPCProvider | ✅ 5s retry | ✅ 5s retry | 🟢 Shipped |
| **Memory & Knowledge** | | | | |
| Page/context ingestion | ✅ Knowledge dashboard | ✅ `ABSORB_PAGE` (Readability→Markdown) | ❌ — | 🟡 Partial |
| URL ingestion | ✅ `knowledge.ingest` | ❌ — | ❌ — | 🟡 Partial |
| RAG file ingestion | ✅ `rag.ingestFile` | ❌ — | ❌ — | 🟡 Partial |
| Memory save from context | ❌ — | ✅ `SAVE_CONTEXT` to Core | ❌ — | 🟡 Partial |
| **Agent Interaction** | | | | |
| Research agent dispatch | ✅ `expert.research` | ❌ — | ❌ — | 🟡 Dashboard-only |
| Coder agent dispatch | ✅ `expert.code` | ❌ — | ❌ — | 🟡 Dashboard-only |
| Chat paste/submit | N/A | ✅ `PASTE_INTO_CHAT` | ✅ `PASTE_INTO_CHAT` (anti-hijack) | 🟢 Shipped |
| Chat history scraping | N/A | ✅ `SCRAPE_CHAT` (DOM) | ⚠️ Heuristic only | 🟡 Partial |
| Tool execution proxy | N/A | ✅ `EXECUTE_TOOL` | ✅ `VSCODE_COMMAND` | 🟢 Shipped |
| **Monitoring** | | | | |
| Console log capture | ✅ Traffic Inspector | ✅ Interceptor + buffer | ❌ — | 🟡 Partial |
| User activity tracking | N/A | ❌ — | ✅ Selection + Document changes | 🟡 Partial |
| Tab mirroring (screenshots) | ❌ — | ✅ JPEG mirror stream | ❌ — | 🟡 Browser-only |
| **Browser-Specific** | | | | |
| Page scraping (Readability) | ❌ — | ✅ Full pipeline | N/A | 🟡 Browser-only |
| Screenshot capture | ❌ — | ✅ `captureVisibleTab` | N/A | 🟡 Browser-only |
| Browser history search | ❌ — | ✅ `chrome.history` API | N/A | 🟡 Browser-only |
| CDP debug proxy | ❌ — | ✅ Attach/detach/command | N/A | 🟡 Browser-only |
| Proxy fetch | ❌ — | ✅ `browser_proxy_fetch` | N/A | 🟡 Browser-only |
| **VS Code–Specific** | | | | |
| Active editor info | ❌ — | N/A | ✅ `GET_STATUS` | 🟡 VSCode-only |
| Text selection extraction | ❌ — | N/A | ✅ `GET_SELECTION` | 🟡 VSCode-only |
| Terminal name reporting | ❌ — | N/A | ✅ `GET_TERMINAL` | 🟡 VSCode-only |
| Anti-hijack paste guard | N/A | N/A | ✅ 2s activity check | 🟢 Shipped |
| **Infrastructure** | | | | |
| Swarm orchestration | ✅ Full UI | ❌ — | ❌ — | 🟡 Dashboard-only |
| Director config | ✅ Full UI | ❌ — | ❌ — | 🟡 Dashboard-only |
| Submodule management | ✅ Full UI | ❌ — | ❌ — | 🟡 Dashboard-only |
| MCP server management | ✅ Full UI | ❌ — | ❌ — | 🟡 Dashboard-only |

---

## Parity Milestones

### Milestone 1: Extension Hardening (P2)
- [x] Replace hardcoded `localhost:3001` in browser extension `background.ts` with configurable URL
- [x] Add configurable WS URL to browser extension (matching VS Code's `hypercode.coreUrl` config)
- [ ] Add error boundary / offline UI to browser extension popup

### Milestone 2: Cross-Surface Intelligence (P3)
- [ ] Forward RAG ingestion capability to browser extension (ingest current page via tRPC)
- [ ] Add research/code agent dispatch UI to VS Code sidebar
- [ ] Surface console log buffer from browser extension in dashboard Traffic Inspector
- [ ] Add terminal content reading to VS Code extension (beyond name-only)

### Milestone 3: Full Parity (P4)
- [ ] Unified WebSocket protocol specification document
- [ ] Browser extension options page for URL/port configuration
- [ ] VS Code webview panel for mini-dashboard (status, recent tasks, quick actions)

---

## Architecture Notes

| Surface | Transport | Entry Point |
|---|---|---|
| Dashboard | tRPC over HTTP (batch) | `apps/web` → `@hypercode/ui` TRPCProvider |
| Browser Extension | WS + Chrome messaging | `apps/extension/src/background.ts` |
| VS Code Extension | WS (node `ws` lib) | `packages/vscode/src/extension.ts` |

All three surfaces connect to the same Hypercode Core instance. The browser and VS Code extensions use WebSocket for real-time bidirectional communication, while the dashboard uses tRPC HTTP batch for request/response patterns.
