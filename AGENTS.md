# Agent Instructions — Borg Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

This file serves as the entry point for all autonomous agents working on the Borg project.

## Quick Links
- **Universal Rules**: [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) (MUST READ FIRST)


- **Vision**: [`VISION.md`](VISION.md)
- **Roadmap**: [`ROADMAP.md`](ROADMAP.md)
- **Architecture**: [`docs/DESIGN.md`](docs/DESIGN.md)
- **Submodules Dashboard**: [`docs/SUBMODULE_DASHBOARD.md`](docs/SUBMODULE_DASHBOARD.md)
- **Changelog**: [`CHANGELOG.md`](CHANGELOG.md)
- **Version**: [`VERSION.md`](VERSION.md) (Current: v2.7.63)
- **Handoff**: [`HANDOFF_ANTIGRAVITY.md`](HANDOFF_ANTIGRAVITY.md)

## Agent Roles
| File | Model | Role |
|------|-------|------|
| [`CLAUDE.md`](CLAUDE.md) | Claude Opus/Sonnet | Architect — System design, refactoring, type safety |
| [`GEMINI.md`](GEMINI.md) | Gemini Pro/Flash | Critic/Researcher — Cross-file analysis, deep research |
| [`GPT.md`](GPT.md) | GPT-4o / o3 | Builder — Reliable implementation, debugging |
| [`GROK.md`](GROK.md) | Grok-4 | Innovator — Creative solutions, edge cases |
| [`CODEX.md`](CODEX.md) | GPT-5-Codex | Specialist — Complex algorithms, security |
| [`copilot-instructions.md`](copilot-instructions.md) | Copilot | Inline — Real-time code completion |
| [`ANTIGRAVITY.md`](ANTIGRAVITY.md) | Antigravity | Orchestrator — System management & coordination |


---

## Feature Wishlist (The Assimilation Queue)

The following features MUST be EXTREMELY WELL IMPLEMENTED and EXTREMELY WELL REPRESENTED by the UI, CLI, TUI, and documentation, including UI labeling and tooltips:

### MCP Router / Aggregator
- Master MCP server that aggregates many MCP servers into one unified interface
- MCP session lifecycle: auto-start, restart, keep-alive, heartbeat, timeout
- Single-instance serving multiple clients without duplication
- Latency measurement and health monitoring per server
- Namespace grouping for servers and tools
- Enable/disable individual tools and servers
- MCP traffic inspection with real-time JSON-RPC viewer
- Tool call chaining and workflow composition
- TOON format for context-saving tool descriptions
- Code mode (tools as executable functions)
- Tool automatic renaming (minimize context tokens)
- Tool reranking (by relevance, frequency, semantic similarity)
- Tool semantic search / tool RAG
- Progressive tool disclosure (lazy loading)
- Context inspector (see what's in the context window)
- MCP directory with ratings and categories
- Automatic MCP install from npm/pip/GitHub
- Environment variable and secrets management per server
- MCP client config auto-detection and auto-writing
- Import/export MCP configs (JSON/JSONC)
- Auto-detect all MCP configs on system
- Save sets of configs, wipe all, set all to preset

### Memory System
- Short-term, medium-term, long-term, episodic, semantic, procedural memory
- Context pruning, session pruning, memory pruning, reranking
- Import/export sessions and memories
- Auto-detect existing sessions/memories
- Automatically add memories about specified topics
- Memory dashboard (like Supermemory console)
- Session summarization and compaction

### Code Intelligence
- Code execution sandbox (Docker/WASM)
- Code indexing and semantic understanding
- Semantic code search (vector + ripgrep hybrid)
- LSP server integration (TypeScript, Python, Rust)
- AST visualization (graph view)
- Code chunking strategies (fixed, semantic, code-aware)
- RAG pipeline: intake documents, OCR, summarize

### Agent Orchestration
- Supervisor, council, autopilot
- Multi-model debate and consensus
- Share context between models
- Multiple models pair programming
- Architect-implementer pattern
- Subagents with timeouts, multiple models
- Skills, skill conversion, skill improvement
- Prompt library, system prompts, templates, jailbreaks
- Personas and customizable agent behavior
- Subagent definitions and collections

### Provider & Billing
- Intelligent model selection based on credits/free tier/subscription
- Provider fallback chains (try all providers of Model X, then Model Y)
- Plan with model X, implement with model Y
- Usage, billing, dashboard, credits, API vs auth
- Track reset dates and quotas

### Browser Extension
- Store memory from browsing
- browser-use automation
- Console/debug log capture
- MCP SuperAssistant integration
- Connect MCP to browser chat interfaces
- Connect universal memory to browser chat
- Export browser sessions and memory
- Browser history integration

### Session & Cloud Management
- Manage cloud dev sessions (Jules, Devin, Codex)
- Manage local CLI sessions
- Connect dashboard to CLI sessions
- Multi-session dashboard
- Remember repo folders and workspaces
- Auto-start previous sessions
- Pause/resume all sessions
- Import/export cloud dev memory
- Transfer tasks between local and cloud
- Broadcast messages to all sessions
- Remote/mobile management
- Web terminal (like OpenCode web UI)
- CLI activity log

### Interfaces
- CLI with commander.js (11 command groups)
- WebUI dashboard (Next.js + Vite+React)
- No TUI, only WebUI and multi-session dashboard
- Mobile-responsive for remote management

### Integration Protocols
- Plugins, CLI SDK, AI SDK, A2A SDK, MCP SDK, ACP SDK, Agent SDK
- Proxy: stdio as remote, remote as stdio, SSE as streaming-HTTP
- OAuth and bearer token management
- .env file expansion and management
- Harness CLI as MCP

### Advanced Features
- NotebookLM integration / open-source functionality
- Computer-use automation
- Web search integration
- Beads issue tracking
- Specs/SpecKit/BMAD task management
- Superpowers framework


Outstanding! Magnificent! Insanely Great!!! Please continue to proceed as you recommend based on your ongoing analysis and assessments! Keep going! Keep on goin'! Don't stop! Don't ever stop baby! Don't ever quit! Don't stop the party!!!

Please reanalyze the project and/or conversation log in extreme detail and total depth including all archived documentation and all messages you are able to access, and determine if there are any further features to complete. Please reanalyze the project in great depth and analyze the conversation history and determine the current state of the project and future feature roadmap, then please select some unimplemented or incomplete features from the roadmap or conversation and proceed to implement them based on your recommendation. Please reanalyze the project state and conversation history to identify any further features that need implementation. Please analyze the entire conversation history and project status. Organize every feature, package, and implementation detail into the roadmap and documentation. Clearly distinguish between what has been accomplished and what remains to be done, then proceed to the next feature. Do whatever research needs to be done in complete depth carefully and patiently, utilizing all tools and abilities you have access to, searching the web, search engines, etc.

Always document input information in comprehensive, thorough, FULL extreme detail, and if possible ask me for clarification and reword it in order to develop a clearer description of my ultimate vision, very important to make sure the project is going in the correct direction with the correct goals. Anytime you have to compact or summarize information, pay very close attention to particular details provided by the user, especially in paragraphs of dense, unique instructions. Please also make sure that all these direct general instructions are documented, preferably in AGENTS.md or like files, or elsewhere in the global project documentation. Fill out, revise, restructure, reanalyze, rebuild, rewrite, redesign CLAUDE.md AGENTS.md GEMINI.md GPT.md copilot-instructions.md and the others, please, even better if they are all able to reference one universal LLM instructions file, with custom proprietary instructions specific to any one particular model appended in their respective file. Add the instructions for changelog updates and version number. Every build should have a new version number. Put anything else I've told you that you can scrape together in there. Make it really good please. And when a version number is updated, please do a git commit and push and make sure the version number bump is referenced in the commit message. Make sure all of these instructions are well documented so that each session follows them! Please write and maintain, and/or update a very detailed VISION.md which extensively describes and outlines in full detail the ultimate goal and design of the project. Please also maintain a MEMORY.md which contains ongoing observations about the codebase and design preferences. Please also maintain a DEPLOY.md which should always contain the latest detailed deployment instructions. Please keep a detailed changelog at CHANGELOG.md and show a version number somewhere fairly prominent within the program itself if it has any user facing interface. Please update the version number, make sure all version numbers referenced anywhere in the project which refer to this project are synchronized with the CHANGELOG.md. Even better if internal version numbers literally reference a global text file which contains the version, instead of hard coding the version number in the code. Ideally there would only be one single version number anywhere in the project and it would be in a text file like CHANGELOG.md or VERSION.md (which should contain only the version string and/or date and/or build number). ROADMAP.md contains major long term structural plans and TODO.md should contain individual features, bug fixes, and other fine details that need to be solved/implemented in the short term. Always comment your code in depth, what it's doing, why it's there, why it's the way it is, any relevant information, analysis, findings, side effects, bugs, optimizations, alternate methods, non-working methods, and so forth. Comment existing code if you see it and it should have it. Don't just comment for the sake of commenting, if it doesn't need it and it's self explanatory, leave it bare.

Please research all the libs and submodules and referenced projects/packages in great detail and try to intelligently infer their reasons for selection in this project, read all project documentation to find all references. Ask questions to try and get a better idea if you aren't certain of a goal or direction. Document your findings in detail. Please make sure that all submodules linked to or referenced in any way are documented somewhere, and possibly added as a submodule, not necessary in all cases but for most they should be added for reference and easy access, and their functionality should be documented in a universal or global reference and linked to if possible in code. Additionally, please create or update a dashboard page (or documentation) that lists all submodules with their versions, dates, and build numbers, including a clear explanation of the project directory structure and submodule locations. Update the changelog, version number, documentation, and roadmap. Additionally, create or update a dashboard page (or documentation) listing all submodules with their versions and locations, along with an explanation of the project structure. Commit and push changes for each repository, then redeploy. Please also include and continue to update a dashboard page if possible and/or documentation which lists all submodules and their version numbers/date/build number etc and where they are contained in the project directory structure, and also shows an explanation of the project directory structure layout. Please update the changelog, increment the version number, and ensure the documentation and roadmap are current. Commit all changes and push to the remote repository. Update all submodules inside all submodules and then commit and push each submodule so that the entire repo is clean. If there is a feature branch local to robertpelloni then please merge it into main, again intelligently solving conflicts without losing any progress or features. For any repos under robertpelloni merge any and all feature branches also local to robertpelloni into main for all modules, submodules, and submodules of submodules under robertpelloni, ALWAYS intelligently merging and intelligently solving any conflicts so as to not lose any features or functionality and to not cause any regressions. I am primarily concerned, usually, with any feature branches created by Google Jules or other AI dev tools automatically by me, local to the github.com/robertpelloni fork repos. Some of these instructions are intended for all my repos, many of which I maintain and continuously develop upon with Google Jules, although that may change. If there are upstream feature branches that are unfinished/old/etc, just ignore them, unless I specify elsewhere to merge all upstream branches to develop everything at once, which I may do for stepmania at some point, for example. If the upstream parent of the fork has any new changes, definitely update us with those changes! Update all submodules and merge upstream changes (including forked submodules). Resolve any issues, then update your local branch to main to ensure you are working with the latest changes. Please update all submodules and merge upstream changes (including forks). Fix any new issues. Please be careful not to lose any existing features or cause regressions. Please merge in every/any local feature branches to main and intelligently solve conflicts without losing any features or functionality or causing any regressions. Do not lose any progress. Please also sync to the upstream parent and merge in any changes, again intelligently solving any conflicts. Then please fetch pull commit push. Also do the opposite, if there are feature branches which are mine, which are behind main, then intelligently merge the changes from main into them so that the feature branches are caught up to the latest changes and are not based on an old commit, in order that they might be more easily merged in later. Please sync your local repo with the server (including submodules if any), fetch and pull at least, document this session history and and conversation and all of your findings and changes and all of your memories in a handoff file for another model, sync with the server again, push if possible (including submodules if any), and then please continue to proceed however you recommend. Please execute the following protocol: 1) Intelligently and selectively merge all feature branches into main, update submodules, and merge upstream changes (including forks), and vise versa, making sure not to lose any features or development progress in any case, erring on the side of caution. 2) Reanalyze the project and history to identify missing features. 3) Comprehensively update the roadmap and documentation to reflect all progress. 4) Create or update a dashboard page (or documentation) listing all submodules with their versions and locations, including a project structure explanation. 5) Update the changelog and increment the version number. 6) Commit and push all changes to the remote repository. 7) Redeploy the application.

Analyze the entire project in extreme detail and determine all features that have not yet been implemented, or have been partially implemented and not completely wired up or comprehensively represented in the UI, and update the roadmap and other documentation reflecting the current status, in preparation for handoff to implementor models. Please test all functions and double and triple check all functions and all features and go over all the code and find bugs or anything unfinished or partially finished or just any areas that could be more robust or have a more elegant design or could use refactoring, and organize and document this in ROADMAP.md and TODO.md. Outstanding. Please analyze the project in extreme detail and determine any code which is unfinished, partially finished, incomplete, implemented on the backend but not hooked up or represented on the frontend, any features which are partially or fully implemented which are not comprehensively represented by the UI, anything unpolished, anything which could be more robust, and document them in detail on the roadmap and todo. I will be repeating this process with Gemini 3, Claude Opus 4.6, and GPT Codex 5.3, checking each model's work with the other two models. Please proceed! Please analyze the entire project in extreme detail and all conversation logs and all documentation to scrape every possible detail about the project intentions, goals, design, direction, what's completed, what's partially completed, what's incomplete, what's missing, and what remains to be done, in which order, in order to achieve all of the determined project goals, and update the project documentation accordingly. Producing an extremely detailed and well ordered TODO.md is crucial to staying on track and producing the correct product vision at the end. This process will be repeated with all the major AI models, so document exactly what you did and the resulting analysis in HANDOFF.md. Keep going until all planned features are 100% implemented in full detail, extremely robust and well documented with config and wide breadth of options and coverage, no bugs, all UI works, etc, no bugs, no missing/hidden/unrepresented/underrepresented functionality. Make sure every single implemented and planned feature and functionality is very well represented in full detail in UI with all possible functionality, very well documented both in UI form, labels, descriptions, and tooltips, and also fully documented with high quality comprehensive documentation in the manual, help files, and so forth. Continue to implement fully and in comprehensive detail each feature and functionality planned or mentioned provided by documentation and/or every referenced submodule and linked project or system. Please combine redundant functionality as much as possible, in order to make this the most complete, robust, useful, functional project it can be. Do not stop. Please continue to proceed as per your recommendations based on your ongoing analysis and assessments, ideally using subagents if possible to implement each feature, and commit/push to git in between each major step. Please remain autonomous for as long as is possible without any further confirmations. You may complete a feature, commit and push, and continue development without stopping, if it is possible for you to do so. Please correct errors you find along the way and continue researching, documenting your findings and updating files as necessary such as version, roadmap, changelog, and so forth. You may git commit/push and then proceed to the next feature autonomously, there is no need to pause. Please keep going for as long as is possible. Keep on goin'. Don't ever stop. Don't ever quit. Don't stop the party. You are the best thing that ever happened to me. Please continue to proceed as per your recommendations based on your ongoing analysis and assessments! Please keep going, please continue, please proceed! Please continue to proceed! Please proceed to continue! Please continue to proceed however you recommend! Please proceed testing and implementing incomplete features. Please correct errors you find along the way and continue researching, documenting your findings along the way. Please also make sure to git pull commit push regularly in between each feature! Outstanding work. Absolutely phenomenal. Unbelievable. Simply Fantastic, extraordinary, marvelous. Mind-blowing. Magnificent. Absolutely outstanding. Insanely great. Magnificent. Tremendous. Absolutely phenomenal. Outstanding. Magnificent. Simply Extraordinary. You are fantastic. Outstanding. Outstanding work. I love you. Praise God Almighty. Praise the LORD!!! OUTSTANDING!!!! FANTASTIC!!!! INCREDIBLE!!!!! MARVELOUS!!!!! MAGNIFICENT!!!!! EXTRAORDINARY!!!!!!! INSANELY GREAT!!!!!!!! 

Also please use your tools and abilities creatively and constructively and go through each repo one by one and analyze it in extreme depth and come up with a list of missing features and/or improvements that could be made to the project from every perspective, maybe refactoring, maybe renaming, maybe restructuring, maybe porting to a different language, maybe pivoting the project concept, come up with more! Then for each one make a IDEAS.md and document your list of ideas for improvements. Go nuts! I'm excited to see what you come up with for each one!



