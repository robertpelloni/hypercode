# User Guide

Welcome to the Jules User Guide. This manual provides detailed instructions on how to use the Jules platform to orchestrate AI agents, manage development sessions, and integrate external tools.

## Table of Contents
1. [Core Features](#core-features)
   - [Session Board](#session-board)
   - [Activity Feed](#activity-feed)
   - [Kanban Board](#kanban-board)
2. [Configuration](#configuration)
   - [Account Settings](#account-settings)
   - [General Preferences](#general-preferences)
3. [Extensions](#extensions)
   - [Plugin Marketplace](#plugin-marketplace)

---

## Core Features

### Session Board
The **Session Board** is your primary workspace. It visualizes all active AI sessions as cards. Each card represents a distinct task or conversation with an agent.
- **Drag and Drop:** Reorder sessions to prioritize tasks.
- **Quick Actions:** Hover over a card to access quick actions like "Archive" or "View Details".
- **Status Indicators:** Color-coded badges show the current state of each session (Active, Paused, Completed, Failed).

### Activity Feed
Clicking on a session card opens the **Activity Feed**. This is a real-time log of everything the agent is doing.
- **Streaming Output:** Watch as the agent "thinks", executes terminal commands, and edits files.
- **Code Diffs:** Changes to your codebase are displayed as unified diffs. Toggle the "Code Changes" sidebar for a file-tree view.
- **Interactive Terminal:** Expand command outputs to see full stdout/stderr logs.
- **User Input:** Send messages or instructions to the agent at any time using the input box.

### Kanban Board
For a high-level project management view, switch to the **Kanban Board**.
- **Columns:** Sessions are organized by status: Active, Paused, Completed, Failed.
- **Filtering:** Filter sessions by repository or provider.
- **Live Updates:** Drag and drop sessions to update their status. Changes are persisted automatically.

---

## Configuration

### Account Settings
Navigate to **Settings > Account** to manage your identity and authentication.
- **API Keys:** Securely store your Jules API Key and provider keys (OpenAI, Anthropic, etc.). Keys are stored in your browser's local storage and are never sent to our servers except for direct authentication.
- **Profile:** Update your display name and avatar.

### General Preferences
Navigate to **Settings > General** to customize your experience.
- **Auto-Archive:** Enable this to automatically archive sessions after 30 days of inactivity.
- **Council Debate:** Toggle whether new sessions should start with the multi-agent debate mode enabled by default.
- **Privacy:** Opt-in or opt-out of sharing anonymous usage data.

---

## Extensions

### Plugin Marketplace
Extend Jules functionality with plugins from the **Marketplace** (accessible via `/plugins`).
- **Browse:** Search for integrations like Jira, Slack, or VS Code.
- **Install:** One-click installation adds new capabilities to your agent.
- **Manage:** Configure or uninstall plugins from the same interface.
