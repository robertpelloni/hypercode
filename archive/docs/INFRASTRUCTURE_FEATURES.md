# Infrastructure Features Master List

> **Compiled from research on**: Serena, E2B, Puppeteer MCP
> **Last Updated**: 2026-02-02

## Code Indexing Features (Serena)

### Semantic Code Understanding
- [ ] Symbol-level code understanding via LSP
- [ ] Find symbols across project
- [ ] Reference lookup (find all usages)
- [ ] Insert code after specific symbol
- [ ] Relational structure exploitation

### Architecture
- [ ] MCP server integration
- [ ] LSP (Language Server Protocol) backend
- [ ] `multilspy` library for language servers
- [ ] Model-agnostic LLM integration

### Code Operations
- [ ] Semantic code retrieval
- [ ] Precise code editing at symbol level
- [ ] Large file incremental editing
- [ ] Syntax checking with feedback
- [ ] Complex refactoring (rename + update refs)

### Indexing
- [ ] Full codebase indexing
- [ ] Cross-reference database building
- [ ] Architectural pattern identification
- [ ] Project-specific context storage

### Language Support
- [ ] Python, Java, TypeScript/JavaScript
- [ ] PHP, Go, Rust, C/C++
- [ ] Indirect: Ruby, C#

### Memory Features
- [ ] Persistent "memories" storage
- [ ] Requirements tracking
- [ ] Design decisions
- [ ] Debug findings
- [ ] Cross-session persistence
- [ ] Team sharing

---

## Code Sandbox Features (E2B)

### Core Sandbox
- [ ] Isolated ephemeral VMs
- [ ] Firecracker microVMs (hardware isolation)
- [ ] <200ms spin-up time
- [ ] Up to 24-hour sessions
- [ ] LLM-agnostic

### Multi-Language Support
- [ ] Python execution
- [ ] JavaScript execution
- [ ] Any Linux-compatible language
- [ ] Pre-installed data science libraries (Pandas, Matplotlib)

### SDK
- [ ] Python SDK
- [ ] JavaScript/TypeScript SDK
- [ ] Streaming support (stdout, stderr, charts)
- [ ] Reconnect to running sandboxes

### File Management
- [ ] File upload to sandbox
- [ ] Result download
- [ ] Terminal command execution
- [ ] Package installation

### Deployment
- [ ] Cloud-hosted
- [ ] Bring Your Own Cloud (BYOC)
- [ ] On-premise/self-hosted
- [ ] Custom sandbox templates

### Framework Integration
- [ ] LangChain integration
- [ ] LangGraph integration
- [ ] AutoGen integration

---

## Browser Automation Features (Puppeteer MCP)

### Navigation & Interaction
- [ ] URL navigation
- [ ] Button clicking
- [ ] Form filling
- [ ] Dropdown selection
- [ ] Element hover
- [ ] Connect to active Chrome tabs

### Content Capture
- [ ] Full-page screenshots
- [ ] Element-specific screenshots
- [ ] Console log monitoring
- [ ] Network request logging

### JavaScript Execution
- [ ] Arbitrary JS in browser context
- [ ] DOM manipulation
- [ ] Complex data extraction

### Debugging
- [ ] Detailed logging
- [ ] Error handling
- [ ] Video recordings
- [ ] Interactive sessions

### MCP Integration
- [ ] MCP server for LLM access
- [ ] Automated E2E testing
- [ ] Dynamic web scraping
- [ ] AI-assisted debugging
- [ ] Automated documentation

### Deployment
- [ ] Local development
- [ ] Docker containers
- [ ] Cloud functions (Azure, etc.)
- [ ] Headless and headed modes

---

## Browser-Use Features (Agentic)

### Agent-First Design
- [ ] **Vision-Enabled**: Screenshot analysis for navigation
- [ ] **Stealth Mode**: Anti-detection cloud execution
- [ ] **High-Level API**: `agent.run(task)` vs low-level clicking
- [ ] **Self-Correcting**: Retries failed interactions

### Integration
- [ ] **LangChain Compatible**
- [ ] **Python SDK**
- [ ] **Local & Cloud** Support

---

## Implementation Priority for Borg

### Phase 1: Code Indexing
1. Integrate LSP for semantic understanding
2. Build symbol index and cross-references
3. Implement symbol-based editing

### Phase 2: Sandboxing
1. E2B integration for code execution
2. Isolated environment for agent actions
3. Multi-language support

### Phase 3: Browser Automation
1. Puppeteer MCP server
2. Screenshot and DOM extraction
3. Form automation for testing
