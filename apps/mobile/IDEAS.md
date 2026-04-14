# Ideas for Improvement: @hypercode/mobile

Ambitious features to evolve the mobile companion app from a telemetry log into a first-class remote control pane.

## 1. Remote Orchestration & Veto
- **Biometric Action Veto:** Use FaceID/TouchID to authorize high-risk agent actions (like `rm -rf` or large refactors) detected by the supervisor.
- **Voice-Command Interaction:** Allow the operator to give natural language directives to the swarm directly via the mobile microphone (e.g., "HyperCode, fix all lint errors in the ui package").
- **Live Debate Monitor:** A specialized UI for monitoring multi-agent "Council Debates" in real-time, with the ability to "vote" or break ties from the phone.

## 2. Immersive Visualization
- **3D Swarm Visualization:** An interactive 3D view (via React Three Fiber) showing agents as nodes moving through the project's directory structure.
- **Knowledge Pulse Stream:** A "TikTok-style" vertical scroll of captured observations and generated summaries, optimized for quick review while away from the desk.
- **AR Code Map:** Use the mobile camera to overlay architectural diagrams or test coverage metrics onto a physical workspace or monitor.

## 3. Operations & Memory
- **Offline Knowledge Browser:** Download a semantic subset of the captured knowledge graph for offline reference and search during travel.
- **Remote Environment Management:** Ability to toggle `.env` variables, rotate API keys, and monitor provider credit balances on the go.
- **Push Notification Alerts:** Intelligent alerts for critical system events, such as quota exhaustion, build failures, or successful high-priority task completions.

## 4. Architectural Enhancements
- **tRPC Integration:** Migrate from raw WebSockets to `@trpc/client` with SSE support for typed queries and mutations, matching the web dashboard's robustness.
- **Unified Auth Sync:** Securely sync orchestrator credentials from the desktop to the mobile app via a one-time QR code scan.
- **Edge-Stored Sessions:** Cache recent session logs locally using SQLite (via Expo SQLite) for instant access without network latency.
