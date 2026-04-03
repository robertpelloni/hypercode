# Progressive Disclosure Strategy

Hypercode implements a **progressive disclosure** strategy to manage context window limits effectively. Instead of exposing hundreds of tools to the model immediately, Hypercode starts each MCP session with a tiny router-oriented tool surface and expands the visible tool set only as needed.

## Architecture

### 1. Default State
When a client connects, the default visible tool surface should stay intentionally small. The baseline meta-tools are:

* `search_tools` — discover tools by keyword or natural-language intent.
* `load_tool` — make a specific downstream tool visible for the current session.
* `get_tool_schema` — hydrate the full schema for a loaded tool on demand.
* `unload_tool` — remove a tool from the current working set.
* `list_loaded_tools` — inspect the current session working set.
* `run_code` — expose code execution when code mode is enabled.

`run_agent` is available only in explicitly agent-oriented workflows; it is not part of the universal minimal disclosure surface.

### 2. Discovery
The model (or operator) begins with discovery instead of a giant tool dump.

Example:

* `search_tools(query="github issues")`

The router searches its local index and any configured upstream bridge indexes, then returns candidate tools **without** hydrating their full schemas into the active context.

### 3. Loading
Once the model decides it needs a specific tool, it loads only that tool.

Example:

* `load_tool(name="github__create_issue")`

The router adds the tool to the session working set for that connection. If full parameter details are needed, the model follows with:

* `get_tool_schema(name="github__create_issue")`

This keeps lightweight metadata and full schema hydration separate.

### 4. Execution
The model can now see and invoke `github__create_issue`.

When the task changes, the session can trim its working set with `unload_tool` instead of letting irrelevant tools accumulate forever.

## Working-Set Behavior

Hypercode treats tool disclosure as a **session working set**, not a one-way reveal.

Current defaults:

* loaded tools: `24`
* hydrated schemas: `8`

The runtime keeps loaded-tool metadata and hydrated schemas on separate limits so the system can preserve discoverability while still controlling prompt size.

In practice, this means:

* search returns candidates without full schema cost
* load makes a tool visible
* schema hydration happens only when needed
* older loaded tools and schemas can be evicted as the session shifts focus

## Configuration

To enable this mode locally:

```env
MCP_PROGRESSIVE_MODE=true
```

## Benefits

* **Token savings:** keeps the initial tool surface small instead of front-loading every downstream schema.
* **Focus:** reduces tool distraction and improves tool selection quality.
* **Scale:** supports many downstream MCP servers without making clients unusable.
* **Operator clarity:** makes discovery, loading, hydration, and unloading explicit in both runtime behavior and dashboard UX.
