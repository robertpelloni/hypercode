# MCP Registry

A centralized registry for Model Context Protocol (MCP) servers and tools within the HyperCode ecosystem.

## Purpose

- Track available MCP servers
- Manage installation and configuration
- Validate server capabilities

## Usage

```typescript
import { Registry } from '@hypercode/mcp-registry';

const registry = new Registry();
const server = registry.find('git');
```
