# MCP Integration Plan

> **Status**: Draft
> **Phase**: 65 (Marketplace & Ecosystem)

This document outlines the strategy for integrating standard Model Context Protocol (MCP) servers and libraries into the Borg ecosystem.

## 1. Targeted MCP Servers

We aim to integrate the following reference implementations as available plugins or core extensions:

- **Core Utilities**:
    - `mcp-server-git`: Repository management
    - `mcp-server-memory`: Persistent knowledge graph
    - `mcp-server-time`: Timezone and scheduling
    - `mcp-server-filesystem`: Safe local file access

- **External Integrations**:
    - `mcp-server-weather`: Real-time weather data
    - `mcp-server-gdrive`: Google Drive file access
    - `mcp-server-slack`: Slack workspace interaction
    - `mcp-server-sentry`: Sentry issue tracking
    - `mcp-server-github`: GitHub issue/PR management

- **Data Connectors**:
    - `mcp-server-postgres`: PostgreSQL database access
    - `mcp-server-sqlite`: SQLite database access

## 2. Libraries & SDKs

Integration of official `@modelcontextprotocol` packages:

- **`@modelcontextprotocol/sdk`**: Core SDK (Already integrated in Phase 21)
- **`@modelcontextprotocol/server-bridge`**: For bridging Express/Fastify apps to MCP
- **`@modelcontextprotocol/inspector`**: For debugging and inspecting MCP traffic

## 3. Advanced Features

- **Multi-Agent Orchestration**: Coordinating multiple specialized MCP agents to solve complex tasks.
- **CLI Harness**: A unified CLI for managing, installing, and running MCP servers.
- **Router**: Intelligent routing of prompts to specific MCP servers based on capability semantic search.
- **Sandbox**: Secure execution environments for untrusted MCP servers (Docker/Wasm).

## 4. Implementation Strategy

1.  **Registry**: creating a `registry.json` or database table to track available MCP servers.
2.  **Installer**: implementing a `borg mcp install <server>` command.
3.  **Config**: updating `mcp.json` automatically upon installation.
4.  **UI**: updating `/dashboard/marketplace` to list these integratable servers.

