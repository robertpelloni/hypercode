# IDEAS: Main Process (Core)

## 1. Hot-Swappable AI Providers

Currently, AI providers (Claude, Codex, etc.) are implemented as fairly rigid CLI wrappers. We could introduce a standard `ProviderInterface` that allows users to drop in custom provider scripts without rebuilding the app.

## 2. Distributed PTY (Tele-Maestro)

Allow the `ProcessManager` to proxy PTY sessions across machines. You could start an agent on your laptop, and "attach" to its terminal from your desktop Maestro instance.

## 3. Local LLM Integration (Ollama/Llama.cpp)

Native support for running small models (like Llama 3 or Mistral) locally within Maestro for context grooming or basic code explanation, saving API costs.

## 4. Intelligent Usage Forecasting

Analyze historical token usage and cost data from `src/main/stats` to predict monthly spending and suggest "Context Grooming" early if a session is trending toward high costs.

## 5. System-Level "Undo"

Integrate with filesystem snapshots (like APFS snapshots or Btrfs) so that if a multi-agent Auto Run playbook makes a mess, you can revert the entire project directory to its pre-playbook state in one click.
