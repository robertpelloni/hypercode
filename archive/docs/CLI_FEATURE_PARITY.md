# CLI Feature Parity Master List

> **Compiled from research on**: OpenCode, Codebuff, Crush, Codex CLI, Goose
> **Last Updated**: 2026-02-02

## Core Features (Must Have)

### 1. Model Support
- [ ] Multi-provider support (OpenAI, Anthropic, Google, AWS, Azure, Groq, etc.)
- [ ] Local model support (Ollama, LM Studio)
- [ ] 75+ model compatibility
- [ ] OpenRouter integration
- [ ] Dynamic model switching mid-session (preserve context)
- [ ] Custom LLM provider integration via OpenAI/Anthropic-compatible APIs

### 2. Operational Modes
- [ ] **Build Mode**: Full access for development (file ops, commands)
- [ ] **Plan Mode**: Analysis only, no modifications
- [ ] **Suggest Mode**: Read-only, suggestions only
- [ ] **Auto Edit Mode**: Automatic file editing
- [ ] **Full Auto Mode**: Complete autonomy
- [ ] Custom mode definitions

### 3. Session Management
- [ ] SQLite-based session persistence
- [ ] Multiple concurrent sessions per project
- [ ] Session isolation (context, state, history)
- [ ] Resume previous sessions
- [ ] Session remove/archive
- [ ] Session export for sharing
- [ ] Public link generation for collaboration

### 4. Code Intelligence
- [ ] LSP Integration (Language Server Protocol)
- [ ] Real-time type information
- [ ] Function signatures
- [ ] Error detection
- [ ] Code navigation
- [ ] AST understanding

### 5. Context Management
- [ ] Automatic context scanning
- [ ] Dependency recognition
- [ ] GitHub Issues/PR reading
- [ ] Automatic context compaction
- [ ] `.gitignore` respect
- [ ] Custom ignore files (`.crushignore`, `.codebuffignore`, `.gooseignore`)
- [ ] Image/screenshot input support

### 6. Code Operations
- [ ] Multi-file refactoring
- [ ] Feature addition via natural language
- [ ] Bug fixing
- [ ] Code review
- [ ] Error explanation
- [ ] Test generation
- [ ] Undo/Redo changes

### 7. Command Execution
- [ ] Shell command execution
- [ ] Git operations
- [ ] npm/package manager integration
- [ ] Docker integration

### 8. MCP/Extensions
- [ ] Model Context Protocol support
- [ ] HTTP, stdio, SSE transport
- [ ] Agent Skills standard
- [ ] Custom skills/agents

### 9. Configuration
- [ ] Project-specific config files
- [ ] Global config files
- [ ] Knowledge files (`knowledge.md`, `AGENTS.md`, `CLAUDE.md`)
- [ ] Custom system prompts
- [ ] Temperature control

### 10. Multi-Agent Architecture (Codebuff)
- [ ] Specialized agents: Base, Editor, Reviewer, Thinker, Researcher
- [ ] File Picker agent
- [ ] Commander agent (terminal)
- [ ] Code Searcher agent

### 11. Approval Workflow
- [ ] Step-by-step approval
- [ ] Auto-approve modes
- [ ] Permission management
- [ ] Granular autonomy control

### 12. Web Features
- [ ] Web search tool
- [ ] Documentation lookup
- [ ] OpenAI-indexed results

### 13. Installation & Platforms
- [ ] npm installation
- [ ] curl/homebrew/paru installation
- [ ] Docker deployment
- [ ] Cross-platform (macOS, Linux, Windows, WSL, Android, BSD)
- [ ] Desktop app
- [ ] IDE extension

---

## Unique Features by Tool

### OpenCode Unique
- Client-server architecture for remote control
- File change tracking visualization
- Image scanning for prompts
- Secure GitHub Actions runner integration

### Codebuff Unique
- Multi-agent orchestration (8 specialized agents)
- `/init` command for project setup
- Checkpoints for rollback
- `/connect:claude` for subscription integration

### Crush Unique
- Go-based performance (low memory, fast)
- Bubble Tea TUI framework
- Split-pane view for diffs
- Attribution settings for Git commits

### Codex CLI Unique
- Cloud task integration (`codex cloud`)
- Parallel task execution
- Reviewer mode for diff analysis
- Multimodal inputs (diagrams, screenshots)
- Skills for repeatable workflows

### Goose Unique
- 25+ provider support out of box
- Extensive slash commands
- `/compact` for history compression
- YAML-based configuration
- Agent Client Protocol (ACP) compatibility

---

## Memory System Features (from Mem0 Research)

### Must Have
- [ ] Persistent memory across sessions
- [ ] LLM-powered fact extraction
- [ ] Vector storage for semantic similarity
- [ ] Graph storage for relationships
- [ ] Hybrid retrieval (vector + graph)
- [ ] Memory filtering (noise reduction)
- [ ] Memory scoping (user_id, agent_id, run_id)

### Memory Types
- [ ] Working memory
- [ ] Factual memory
- [ ] Episodic memory
- [ ] Semantic memory
- [ ] Graph memory

### Performance
- [ ] 90% token reduction vs full-context
- [ ] 91% faster response latency
- [ ] 26% accuracy improvement over OpenAI Memory

### Integration
- [ ] Python SDK
- [ ] Node.js SDK
- [ ] Self-hosted option
- [ ] Cloud-hosted option

---

## Plandex Unique Features

### Plan Management
- [ ] Plans as conversations (context + history + pending changes)
- [ ] Create, list, switch, delete, archive plans
- [ ] Chat Mode vs Tell Mode
- [ ] REPL for interactive use

### Context Management
- [ ] 2 million tokens direct context
- [ ] 20 million tokens indexed via Tree-sitter maps
- [ ] 30+ language support
- [ ] Selective context loading per step
- [ ] Context caching (OpenAI, Anthropic, Google)

### Diff Sandbox
- [ ] Cumulative diff review sandbox
- [ ] File-by-file review before applying
- [ ] Version-controlled sandbox
- [ ] Revert to previous states
- [ ] Branch experimentation

### Automation
- [ ] Full auto mode (end-to-end)
- [ ] Automatic debugging (terminal + browser)
- [ ] Command execution for deps/builds/tests

---

## Aider Unique Features

### Git Integration
- [ ] Auto-commit with meaningful messages
- [ ] Easy diffing and undo
- [ ] Repository map for LLM context

### Input Methods
- [ ] Text commands
- [ ] Voice-to-code
- [ ] AI comments in code
- [ ] Web link scraping
- [ ] Image context

### IDE Integration
- [ ] Watch files for AI comments
- [ ] Work from any IDE/editor

### In-Chat Commands
- [ ] `/add`, `/drop` - manage context
- [ ] `/undo` - revert changes
- [ ] `/diff` - show changes
- [ ] `/model` - switch models
- [ ] `/tokens` - check usage
- [ ] Architect mode for planning

### Automation
- [ ] Auto-run linters and tests
- [ ] Auto-fix detected errors
- [ ] Prompt caching for cost control
