# Ideas for Improvement: Borg Extension

Borg Extension is a Chrome extension that brings MCP tools to any web-based AI chat. To move from "Extension" to "Universal Agent Interface," here are several creative ideas:

## 1. Architectural & Performance Perspectives
*   **The "Edge-MCP" Runtime:** Implement a **WASM-based MCP server runner** directly within the extension. This would allow the extension to execute simple tools (like "Read File", "Run Regex") completely on-device without needing the `npx borg-extension-proxy` server running locally.
*   **WebGPU-Accelerated "Render Mode":** Enhance the "Render Mode" to handle **Massive Function Results**. If a tool returns a 10,000-line JSON or a high-res image, use WebGPU to perform "Visual Filtering" or "Auto-Summarization" directly in the DOM, preventing the AI chat tab from hanging.

## 2. AI & Intelligence Perspectives
*   **Autonomous "Instruction" Weaver:** Instead of manually "Inserting" or "Attaching" instructions, implement an **Intelligent Prompt Contextualizer**. The extension could analyze the current page's URL (e.g., Google AI Studio) and autonomously "Weave" the optimal MCP instructions into the system prompt based on the tools the user has enabled.
*   **Cross-Tab "Tool Memory":** Introduce an agent that maintains **Knowledge Persistence across AI Platforms**. If you ask ChatGPT to "Read File A" using a tool, and then switch to Gemini, the extension "remembers" the content of File A and proactively offers it to Gemini without needing to re-run the tool.

## 3. Product & UX Perspectives
*   **The "Shadow" Tool Inspector:** Implement a **"Live Tool Debugger" Overlay**. Users could see a real-time stream of the SSE/WebSocket packets passing through the extension, with "JSON Diffing" to see exactly how the AI's function call differs from the tool's schema.
*   **Voice-Native MCP Execution:** Integrate the voice tech from Merk.Mobile. "Assistant, use the search tool to find every occurrence of 'TODO' in my codebase." The extension autonomously types the tool-formatted prompt and executes it.

## 4. Security & Compliance Perspectives
*   **"Vault-Backed" Parameter Masking:** Integrate with **Vault BFSI**. When a tool requires a secret (like an API key), the extension should not "Type" the secret into the chat. Instead, it should use a "Vault Reference" that is only resolved by the local proxy server, ensuring secrets never touch the AI's cloud-based chat logs.
*   **Immutable "Tool Call Ledger":** Store every tool execution signature on **Stone.Ledger**. This provides a "Black Box" recorder for your AI assistants, proving exactly which agent called which tool and what the outcome was, in case of a malicious tool-chaining event.

## 5. Ecosystem & Monetization
*   **The "Super-Tool" Marketplace:** Create a **Built-in Registry** for community-contributed MCP servers. Users could browse, preview, and "One-Click Install" new tools directly from the extension's sidebar, with the extension handling the `config.json` updates automatically.
*   **Embedded "Bobcoin" Tool Staking:** Integrate **Bobcoin**. Tool developers could earn Bobcoin when their tools are executed, and users earn Bobcoin for "Rating & Reviewing" tools, creating a self-sustaining economy for the Model Context Protocol.

## 6. Code Architecture & Reliability (Audit Insights)
*   **AST-based Tool Parsing:** Migrate from regex-based block parsing in the AI adapters to full AST (Abstract Syntax Tree) parsing of the chat DOM mutations. This would make tool extraction completely resilient to UI changes by ChatGPT/Claude.
*   **Zustand Slice Pattern Migration:** Currently there are 10 separate Zustand stores. Refactoring them into a unified "Slice" pattern would eliminate cross-store synchronization issues (like the dual sync logic between `ui.store` and `app.store` for themes).
*   **Integrated JSON Schema Validator:** When tools are fetched from the MCP server, run them through an embedded Zod/Ajv schema validator to instantly catch malformed schema definitions before they break the AI generation loop.
*   **Real-time MCP Health Telemetry:** Use Background SSEs to stream real-time memory/CPU usage of the active MCP proxy servers directly into the "Server Status" sidebar tab.

## 7. UI/UX Polish & Automation Refactoring
*   **Visual Node-based Tool Chaining (Macro Builder V2):** Instead of a linear list of steps for Macros, build a visual node graph (like React Flow or n8n) where users can drag and drop tools, link their outputs to the inputs of other tools, and visually map out complex automation pipelines.
*   **Command Palette (Cmd+K) Everywhere:** We have a command palette, but it should be globally accessible even when the sidebar is closed, appearing as a floating spotlight search in the center of the web page to execute tools or macros instantly.
*   **Floating Result Widgets:** When a tool executes (e.g., `fetch_weather`), instead of just dumping JSON text into the chat, the extension renders a beautiful, interactive floating React component (a weather widget) directly inside the ChatGPT/Claude UI DOM.
*   **Migrate to React Query + Unified Event Bus:** Migrate the actual execution and caching of MCP tool results to `@tanstack/react-query` for automatic retries, polling, and background updates. Refactor the Background Worker into a robust `webext-bridge` event bus for type-safe messaging.