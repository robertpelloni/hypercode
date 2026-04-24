# IDEAS — HyperCode Improvement Brainstorm

_Generated 2026-04-08 from deep project analysis_

## Architecture Ideas

1. **WebSocket Multiplexer** — Instead of one WS connection per client, add a multiplexer that lets multiple dashboard tabs share one connection with subchannel routing. Would reduce connection overhead significantly.

2. **SQLite WAL Mode** — Enable Write-Ahead Logging on the SQLite database for better concurrent read performance. The Go bridge and TS server both read the same DB.

3. **Embedded Documentation Server** — Add a `/docs` route in the dashboard that renders all .md files as beautiful HTML pages. Makes the manual browsable alongside the dashboard.

4. **Config Hot-Reload via FSWatch** — Watch `mcp.jsonc` and `council.json` for changes and auto-reload without server restart. Would make config changes instant.

5. **Go Plugin System** — Use Go's `plugin` package (or hashicorp go-plugin) to load MCP server connectors as dynamic plugins. Enables adding MCP server types without recompiling.

## Feature Ideas

6. **Tool Recommendation Engine** — When the model starts discussing a topic (e.g., "database"), the supervisor preemptively injects a list of database-related tools. This is the "decision system" concept.

7. **Session Timeline View** — A visual timeline in the dashboard showing every tool call, model response, and state change across a session. Like a developer tools network tab but for AI sessions.

8. **Provider Credit Tracker** — Track API credits/spend across providers and display remaining quota. Auto-switch to free-tier models when paid quota is exhausted. Show cost per session.

9. **MCP Server Health Dashboard** — Real-time health monitoring for all MCP servers: response time, error rate, uptime, memory usage. Auto-restart on health check failure.

10. **Prompt Library with Variables** — A prompt management system where prompts can have `{{variable}}` placeholders that get filled at execution time. Version control for prompts.

11. **Skill Marketplace** — Browse, install, rate, and review skills from a community registry. Skills auto-install into the correct harness configuration.

12. **Multi-Model Chatroom UI** — A dashboard page where you can add multiple models to a shared conversation. Each model gets a color-coded avatar. Rotate who implements, who tests, who plans.

13. **Context Window Visualizer** — Show a visual breakdown of what's in the current context window: system prompt, tools, conversation history, injected memories. Help operators understand why context is full.

14. **Automatic Session Summarization** — When a session ends or gets too long, automatically summarize the key decisions and outcomes into a memory entry. Compress old conversation turns.

15. **Bookmarklet for Web Chat MCP** — A JavaScript bookmarklet that injects MCP functionality into any web chat interface (ChatGPT, Gemini, Claude). No extension needed for quick use.

## Performance Ideas

16. **Lazy Dashboard Pages** — Use Next.js dynamic imports with `loading.tsx` for every dashboard page. Only load the code for pages actually visited.

17. **MCP Tool Schema Cache** — Cache tool schemas in a compressed file. On startup, load cached schemas immediately while fresh schemas are fetched in background.

18. **Connection Pooling** — Pool MCP server connections so multiple clients share the same server instance. Avoid spawning duplicate processes.

19. **Incremental Catalog Sync** — Instead of re-fetching all catalog entries on every ingestion, use ETags/Last-Modified headers for incremental sync.

## Developer Experience Ideas

20. **`hypercode doctor` Command** — A CLI command that checks: Node version, Go version, SQLite bindings, port availability, env vars, config validity. Prints a health report.

21. **Dashboard Dev Mode** — A special dashboard mode that shows internal debug info: TRPC request/response logs, MCP message traffic, Go bridge status.

22. **Auto-Generated API Docs** — Generate API documentation from the Go server routes and tRPC router definitions. Keep it in sync automatically.

23. **One-Command Setup** — `npx hypercode init` that: installs dependencies, rebuilds SQLite, creates default config, starts the server, opens dashboard.

## Wild Ideas

24. **Local Model Benchmarking** — Automatically benchmark local models (Ollama, LM Studio) against a standard suite of coding tasks. Display scores in dashboard.

25. **Voice-Controlled Dashboard** — Use Web Speech API to add voice commands for common dashboard actions ("show MCP servers", "start session", "check billing").

26. **Diff-Based Memory** — Instead of storing full memories, store diffs/changes over time. Enables time-travel debugging of what the AI learned.

27. **Session Branching** — Fork a session at any point and explore alternative paths. Like git branches but for AI conversations.

28. **Collaborative Dashboard** — Multiple operators can view and control the same HyperCode instance from different browsers. Real-time sync via WebSocket.
