# Hypercode WebSocket Protocol Specification

> **Status**: Current implementation reference
> **Updated**: 2026-03-06
> **Version**: 2.7.106

Note: URL ingestion for extension surfaces currently uses the HTTP compatibility endpoint `POST /knowledge.ingest-url` rather than the WebSocket transport.
> **Primary transport**: WebSocket (`ws://localhost:3001` by default)

This document defines the currently implemented WebSocket contract used by Hypercode Core and the extension surfaces that connect to it.

It is intended to be the **single protocol reference** for:
- `packages/core/src/MCPServer.ts`
- `apps/extension/src/background.ts`
- `packages/vscode/src/extension.ts`

The goal is to document **what is actually implemented today**, including legacy compatibility behaviors that still exist in the bridge.

---

## Overview

Hypercode uses WebSocket as a lightweight real-time bridge for:
- editor/browser automation actions
- request/response style extension queries
- activity and telemetry streaming
- browser log forwarding
- memory/knowledge capture events
- screenshot mirroring and debugger event forwarding

### Current topology

| Participant | Role |
|---|---|
| **Hypercode Core** | WebSocket server and orchestration hub |
| **Browser Extension** | Browser automation bridge and telemetry source |
| **VS Code Extension** | Editor automation bridge and telemetry source |
| **Dashboard** | Primarily HTTP/tRPC today; receives WebSocket-rebroadcasted events indirectly through Core infrastructure |

---

## Transport defaults

### Core server
- **WebSocket URL**: `ws://localhost:3001`
- **HTTP compatibility URL**: `http://localhost:3001`

### Browser extension
- configurable via `chrome.storage.sync`
- keys:
  - `hypercodeCoreUrl`
  - `hypercodeWsUrl`

### VS Code extension
- configurable via VS Code settings:
  - `hypercode.coreUrl`
  - `hypercode.dashboardUrl`

---

## Envelope conventions

There is not yet one fully normalized envelope for every message, but the current bridge follows these patterns.

### Shared fields

| Field | Type | Meaning |
|---|---|---|
| `type` | `string` | Message kind |
| `requestId` | `string` | Correlates a response to a prior request |
| `status` | `unknown` | Legacy response payload used by Core when resolving pending requests |
| `payload` | `object` | Broadcast/event payload used for dashboard-friendly rebroadcasts |

### Important compatibility rule

In `MCPServer.ts`, any incoming message with a `requestId` that matches `pendingRequests` resolves that pending promise.

Resolution behavior:
- if `type === 'STATUS_UPDATE'`, Core resolves with `msg.status`
- otherwise Core resolves with the **entire message object**

This means the protocol currently supports two styles of replies:
1. **legacy status replies** via `STATUS_UPDATE`
2. **typed full-message replies** such as `CHAT_HISTORY_RESPONSE` or `CONSOLE_LOGS_RESPONSE`

---

## Message categories

1. **Core → Extension commands**
2. **Extension → Core responses**
3. **Extension → Core telemetry/events**
4. **Core rebroadcast events**

---

## Core → Extension commands

These are messages sent by Hypercode Core to an attached browser or VS Code client.

### `PASTE_INTO_CHAT`

**Direction**: Core → Browser Extension / VS Code Extension

Used to paste generated text into an active AI chat input.

```json
{
  "type": "PASTE_INTO_CHAT",
  "text": "...",
  "submit": true
}
```

Fields:
- `text`: text to paste
- `submit`: optional boolean; when true, client should also attempt submission

Implemented in:
- `apps/extension/src/background.ts`
- `packages/vscode/src/extension.ts`

---

### `SUBMIT_CHAT`

**Direction**: Core → Browser Extension / VS Code Extension

Requests chat submission without necessarily providing new text.

```json
{
  "type": "SUBMIT_CHAT"
}
```

Notes:
- Browser flow uses the content script path when chat submission is requested.
- VS Code attempts multiple possible chat-submit commands for compatibility.

---

### `VSCODE_COMMAND`

**Direction**: Core → VS Code Extension

Requests execution of a VS Code command.

```json
{
  "type": "VSCODE_COMMAND",
  "requestId": "req-123",
  "command": "workbench.action.chat.open",
  "args": []
}
```

Expected reply:
- `RESPONSE` with `success`, `result`, or `error`

---

### `GET_STATUS`

**Direction**: Core → VS Code Extension

Requests the active VS Code session status.

```json
{
  "type": "GET_STATUS",
  "requestId": "req-123"
}
```

Expected reply payload:
- active editor path
- active terminal name
- workspace folder list

Reply style:
- `RESPONSE`

---

### `GET_SELECTION`

**Direction**: Core → VS Code Extension

Requests current text selection content.

```json
{
  "type": "GET_SELECTION",
  "requestId": "req-123"
}
```

Reply style:
- `RESPONSE`

---

### `GET_TERMINAL`

**Direction**: Core → VS Code Extension

Requests the active terminal snapshot.

```json
{
  "type": "GET_TERMINAL",
  "requestId": "req-123"
}
```

Current VS Code implementation returns:
- `content`
- `terminalName`
- `terminalId`

Reply style:
- `RESPONSE`

---

### `GET_CHAT_HISTORY`

**Direction**: Core → Browser Extension / VS Code Extension

Requests the current chat thread/session history.

```json
{
  "type": "GET_CHAT_HISTORY",
  "requestId": "req-123"
}
```

Browser reply style:
- `CHAT_HISTORY_RESPONSE`

VS Code reply style:
- `RESPONSE` with recent extension-observed interactions plus best-effort visible chat editor snapshots when a likely chat document is open

---

### `SUBMIT_CHAT_HOOK`

**Direction**: Core → Extension surface

Legacy/specialized hook submission signal.

```json
{
  "type": "SUBMIT_CHAT_HOOK"
}
```

Notes:
- Present in Core send logic.
- Should be considered **legacy/compatibility behavior** until a stronger typed hook contract exists.

---

### `SET_MIRROR_ACTIVE`

**Direction**: Core → Browser Extension

Enables or disables browser screenshot mirroring.

```json
{
  "type": "SET_MIRROR_ACTIVE",
  "active": true,
  "interval": 5000
}
```

Browser behavior:
- captures visible tab periodically
- sends `BROWSER_MIRROR_UPDATE`

---

### Browser method commands

These messages are dispatched by Core with a `method` field rather than a `type` field.

#### `browser_scrape`

```json
{
  "id": "req-123",
  "method": "browser_scrape",
  "params": {}
}
```

Browser returns page content through `STATUS_UPDATE`.

#### `browser_screenshot`

```json
{
  "id": "req-123",
  "method": "browser_screenshot",
  "params": {}
}
```

Browser returns a data URL screenshot through `STATUS_UPDATE`.

#### `browser_get_history`

```json
{
  "id": "req-123",
  "method": "browser_get_history",
  "params": {
    "query": "hypercode",
    "maxResults": 20
  }
}
```

Browser returns matching history items through `STATUS_UPDATE`.

#### `browser_debug`

```json
{
  "id": "req-123",
  "method": "browser_debug",
  "params": {
    "action": "attach"
  }
}
```

Supported actions currently:
- `attach`
- `detach`
- `command`

Browser returns debugger results through `STATUS_UPDATE`.

#### `browser_proxy_fetch`

```json
{
  "id": "req-123",
  "method": "browser_proxy_fetch",
  "params": {
    "url": "https://example.com",
    "options": {
      "method": "GET"
    }
  }
}
```

Browser returns proxied fetch result through `STATUS_UPDATE`.

---

## Extension → Core responses

### `RESPONSE`

**Direction**: VS Code Extension → Core

Generic VS Code reply wrapper.

```json
{
  "type": "RESPONSE",
  "requestId": "req-123",
  "success": true,
  "result": {}
}
```

Error variant:

```json
{
  "type": "RESPONSE",
  "requestId": "req-123",
  "success": false,
  "error": "..."
}
```

Used for:
- `VSCODE_COMMAND`
- `GET_STATUS`
- `GET_SELECTION`
- `GET_TERMINAL`
- `GET_CHAT_HISTORY` (VS Code heuristic path)

---

### `STATUS_UPDATE`

**Direction**: Browser Extension → Core or Extension → Core

Legacy generic response wrapper still used heavily by the browser bridge and Core compatibility paths.

```json
{
  "type": "STATUS_UPDATE",
  "requestId": "req-123",
  "status": {}
}
```

Used for:
- browser scrape results
- browser screenshot results
- browser history results
- debugger results
- proxy fetch results
- knowledge capture acknowledgements

Core special-cases this type when resolving pending requests.

---

### `CHAT_HISTORY_RESPONSE`

**Direction**: Browser Extension → Core

```json
{
  "type": "CHAT_HISTORY_RESPONSE",
  "requestId": "req-123",
  "history": []
}
```

---

### `CONSOLE_LOGS_RESPONSE`

**Direction**: Browser Extension → Core

```json
{
  "type": "CONSOLE_LOGS_RESPONSE",
  "requestId": "req-123",
  "logs": []
}
```

---

## Extension → Core telemetry and event messages

### `USER_ACTIVITY`

**Direction**: Browser/VS Code → Core

Tracks last-known user activity and idle state context.

```json
{
  "type": "USER_ACTIVITY",
  "lastActivityTime": 1741220000000
}
```

Observed use:
- VS Code sends on selection/document activity
- Browser extension now sends throttled activity heartbeats from content-script interactions such as focus, click, keydown, scroll, and page visibility restoration
- Core updates `lastUserActivityTime`

Optional fields may exist in some callers, including:
- `activeEditor`
- `trigger`
- `activePage`
- `source`

Browser example:

```json
{
  "type": "USER_ACTIVITY",
  "lastActivityTime": 1741220000000,
  "trigger": "click",
  "activePage": {
    "url": "https://chatgpt.com/",
    "title": "ChatGPT",
    "host": "chatgpt.com"
  },
  "source": "browser_extension"
}
```

---

### `BROWSER_LOG`

**Direction**: Browser Extension → Core

Used to forward browser console log entries.

```json
{
  "type": "BROWSER_LOG",
  "level": "error",
  "content": "Failed to fetch ...",
  "message": "Failed to fetch ...",
  "timestamp": 1741220000000,
  "url": "https://example.com",
  "source": "browser_extension"
}
```

Core behavior:
- rebroadcasts as dashboard-friendly `BROWSER_LOG` event with `payload`
- triggers healer/audit path on `error`

---

### `KNOWLEDGE_CAPTURE`

**Direction**: Browser Extension / VS Code Extension → Core

Used to persist captured text context into memory.

```json
{
  "type": "KNOWLEDGE_CAPTURE",
  "requestId": "req-123",
  "title": "Captured Page",
  "url": "https://example.com",
  "source": "browser_extension",
  "timestamp": 1741220000000,
  "content": "..."
}
```

Core behavior:
- stores context in memory manager
- rebroadcasts `KNOWLEDGE_CAPTURED`
- may reply with `STATUS_UPDATE` when `requestId` is present

---

### `BROWSER_MIRROR_UPDATE`

**Direction**: Browser Extension → Core

Used for screenshot streaming/mirroring.

```json
{
  "type": "BROWSER_MIRROR_UPDATE",
  "screenshot": "data:image/jpeg;base64,..."
}
```

Core behavior:
- rebroadcasts this message to other WebSocket clients

---

### `BROWSER_DEBUG_EVENT`

**Direction**: Browser Extension → Core

Relays Chrome debugger events.

```json
{
  "type": "BROWSER_DEBUG_EVENT",
  "tabId": 123,
  "method": "Network.responseReceived",
  "params": {}
}
```

---

### `BROWSER_CHAT_SURFACE`

**Direction**: Browser Extension → Core

Relays adapter-observed chat-surface snapshots from supported web AI interfaces.

```json
{
  "type": "BROWSER_CHAT_SURFACE",
  "trigger": "mutation",
  "timestamp": 1741220000000,
  "source": "browser_extension",
  "snapshot": {
    "adapterId": "chatgpt",
    "adapterName": "ChatGPT",
    "url": "https://chatgpt.com/",
    "title": "ChatGPT",
    "messageCount": 6,
    "toolCallCount": 1,
    "toolCalls": [
      {
        "name": "browser.search",
        "source": "text",
        "preview": "<invoke name=\"browser.search\">..."
      }
    ],
    "functionResults": [
      {
        "name": "browser.search",
        "source": "xml",
        "status": "ok",
        "summary": "3 results returned",
        "fields": [
          {
            "name": "count",
            "value": "3"
          }
        ]
      }
    ],
    "executions": [
      {
        "id": "msg-1-1234abcd",
        "name": "browser.search",
        "state": "completed",
        "isStreaming": true,
        "callSource": "text",
        "resultSource": "xml",
        "status": "ok",
        "summary": "3 results returned",
        "parameters": [
          {
            "name": "query",
            "value": "hypercode"
          }
        ],
        "fields": [
          {
            "name": "count",
            "value": "3"
          }
        ]
      }
    ],
    "latestMessages": [
      {
        "id": "dom:chatgpt:data-testid:conversation-turn-42",
        "sourceId": "dom:chatgpt:data-testid:conversation-turn-42",
        "text": "Assistant: calling browser.search",
        "role": "assistant",
        "isStreaming": true
      }
    ]
  }
}
```

Core behavior:
- rebroadcasts as dashboard-friendly `BROWSER_CHAT_SURFACE` event with `payload`
- makes supported chat-surface observation visible in the live traffic inspector
- current parsers understand XML, JSON, complete or still-streaming fenced markdown blocks, and unfenced plain-text `tool_name:` / `status:` style blocks seen during streamed chat rendering
- latest message snapshots may also include best-effort DOM-derived `role` (`user`, `assistant`, `system`, `tool`, `unknown`) and `isStreaming` hints for operator visibility
- latest message snapshots prefer stable DOM-backed `id` / `sourceId` values when the surface exposes message identifiers, which reduces timeline churn during streaming updates
- execution timeline entries may also include `isStreaming` so operators can tell whether a pending or recently matched tool run is still rendering in the chat surface

---

## Core rebroadcast events

These are messages Core emits to attached clients after ingesting or transforming extension-originated telemetry.

### `BROWSER_LOG`

Core rebroadcast shape:

```json
{
  "type": "BROWSER_LOG",
  "payload": {
    "level": "warn",
    "content": "...",
    "url": "https://example.com",
    "timestamp": 1741220000000,
    "source": "browser_extension"
  }
}
```

---

### `KNOWLEDGE_CAPTURED`

```json
{
  "type": "KNOWLEDGE_CAPTURED",
  "payload": {
    "id": "ctx_...",
    "title": "Captured Page",
    "url": "https://example.com",
    "source": "browser_extension",
    "timestamp": 1741220000000,
    "preview": "..."
  }
}
```

---

### `BROWSER_CHAT_SURFACE`

```json
{
  "type": "BROWSER_CHAT_SURFACE",
  "payload": {
    "timestamp": 1741220000000,
    "trigger": "mutation",
    "source": "browser_extension",
    "snapshot": {
      "adapterId": "chatgpt",
      "adapterName": "ChatGPT",
      "messageCount": 6,
      "toolCallCount": 1,
      "toolCalls": [],
      "functionResultCount": 1,
      "functionResults": [],
      "executions": [],
      "latestMessages": []
    }
  }
}
```

---

### `RAG_INGESTED`

Emitted by the HTTP compatibility ingestion path after successful text ingestion.

```json
{
  "type": "RAG_INGESTED",
  "payload": {
    "sourceName": "browser-extension-page",
    "chunksIngested": 4,
    "success": true,
    "timestamp": 1741220000000,
    "source": "browser_extension"
  }
}
```

---

## Current protocol quirks and compatibility debt

### 1. Mixed command styles
Current transport uses both:
- `type`-based commands
- `method`-based browser RPC commands

This works, but it is not fully normalized.

### 2. Mixed response styles
Current responses may arrive as:
- `STATUS_UPDATE`
- `RESPONSE`
- `CHAT_HISTORY_RESPONSE`
- `CONSOLE_LOGS_RESPONSE`

This is why Core still includes special-case request resolution logic.

### 3. Surface-specific reply conventions
- Browser extension prefers `STATUS_UPDATE` and special response types
- VS Code extension prefers `RESPONSE`

### 4. Broadcast event wrapping is inconsistent
Some rebroadcasts wrap data in `payload`, while others may forward raw message shapes.

---

## Recommended normalization direction

The current implementation is stable enough to document, but future protocol cleanup should converge on:

### Recommended command envelope

```json
{
  "type": "COMMAND_NAME",
  "requestId": "req-123",
  "payload": {}
}
```

### Recommended response envelope

```json
{
  "type": "RESPONSE",
  "requestId": "req-123",
  "success": true,
  "payload": {}
}
```

### Recommended event envelope

```json
{
  "type": "EVENT_NAME",
  "payload": {},
  "timestamp": 1741220000000,
  "source": "browser_extension"
}
```

---

## Source of truth

If protocol behavior and this document disagree, check these files first:

1. `packages/core/src/MCPServer.ts`
2. `apps/extension/src/background.ts`
3. `packages/vscode/src/extension.ts`

This document should be updated whenever any of those message contracts change.
