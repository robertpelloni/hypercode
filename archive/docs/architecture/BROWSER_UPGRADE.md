# Architecture: Agentic Browser Upgrade (`browser-use`)

**Status:** Draft
**Last Updated:** 2026-02-03
**Target Component:** `packages/tools`

## 1. Overview
Current browser automation relies on `Puppeteer`, which requires low-level DOM selector logic (brittle).
We will adopt **`browser-use`**, a Python-based library designed specifically for **LLM Agents**. It allows the agent to "see" the page (screenshots) and interact via high-level intent ("Click the 'Login' button") rather than CSS selectors.

## 2. Integration Architecture

### A. The `browser-use` Bridge
Since `browser-use` is Python, we will expose it to our Node.js/TypeScript swarm via two methods:
1.  **MCP Server:** Run `browser-use` as a local MCP server. Borg connects via `MCPServer.ts`.
2.  **Direct Shell:** Wrap the python library in a `BrowserService` that spawns python processes.

**Recommendation:** **MCP Server**. It decouples the heavy Python environment from the Node.js core.

### B. `BrowserTool` Implementation
We will replace the existing `browser_scrape` and `browser_click` tools with a unified Agentic Interface.

```typescript
// New generic tool
{
  name: "browse_web",
  description: "Advanced agentic browsing. Use this to navigate, click, and extract data.",
  input_schema: {
    task: "string", // e.g., "Go to amazon.com and find the price of iPhone 15"
  }
}
```

### C. The "Cloud" Option
`browser-use` supports a "Stealth Cloud" mode. We should implement a configuration toggle in `borg.config.json`:
*   `browser.mode`: `"local" | "cloud"`
*   If `cloud`, we route requests to the `browser-use` cloud API (requires key) to evade bot detection.

## 3. Benefits
*   **Vision-Enabled:** The agent sees what's happening.
*   **Self-Healing:** If a click fails, `browser-use` retries or tries an alternative selector automatically.
*   **Simplicity:** Reduces 500 lines of Puppeteer code to 1 line of prompt.

## 4. Migration
*   Retain `Puppeteer` for simple "Fast Scrape" (text only).
*   Use `browser-use` for "Deep Interaction" (tasks requiring login, navigation, or complex SPAs).
