# Jules API Reference

This project interacts with the Jules API to manage sessions, activities, and agent interactions.

## Official Documentation

The complete Jules REST API documentation is available at:
**[https://jules.google/docs/api/reference/overview](https://jules.google/docs/api/reference/overview)**

## Key Endpoints Used

The Jules UI interacts with the following primary resources:

### Sessions
- `GET /sessions`: List all sessions.
- `POST /sessions`: Create a new session with a prompt and source.
- `GET /sessions/{id}`: Retrieve session details.
- `POST /sessions/{id}/resume`: Resume a paused session.

### Activities
- `GET /sessions/{id}/activities`: List activities (messages, plans, tool outputs) for a session.
- `POST /sessions/{id}/activities`: Send a user message to the session.

### Plans
- `POST /sessions/{id}/plan:approve`: Approve the current plan proposed by the agent.

## Authentication

All requests require a Bearer token (API Key) provided via the `Authorization` header or `X-Goog-Api-Key`.

## MCP Integration

This UI also supports integration with Model Context Protocol (MCP) servers. See `external/` for reference implementations.
