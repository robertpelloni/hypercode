# Screenshot Capture Guide

Use this folder for repository-facing screenshots referenced from the root `README.md`.

## Canonical filenames

- `dashboard-home.png`
- `mcp-registry.png`
- `mcp-search.png`
- `mcp-inspector.png`
- `billing.png`
- `github-actions.png`

## Capture standards

- Resolution: 1920×1080 (or 1440p with similar aspect ratio)
- Theme: dark mode where possible
- Browser zoom: 100%
- Hide personal data, secrets, and API keys
- Prefer stable states (no transient toasts/loaders unless intentionally highlighted)

## Workflow

1. Capture screenshots using consistent viewport settings.
2. Name files exactly as listed above.
3. Replace existing files in this directory.
4. Update the status checkboxes in the root `README.md` screenshot table.

## Pre-commit sanity check

- Ensure each screenshot opens correctly.
- Ensure file names match the README table paths exactly.
- Keep file sizes reasonable for GitHub rendering (generally under 1.5 MB per image).
