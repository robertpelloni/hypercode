# UI KNOWLEDGE BASE

**Context:** Next.js (App Router) | React | Tailwind CSS | Custom Server

## OVERVIEW
The frontend dashboard for the HyperCode. It provides a visual interface for monitoring agents, managing skills, and viewing system status. It uses a custom `server.js` to integrate closely with the Core backend.

## STRUCTURE
```
src/
├── app/              # Next.js App Router pages
├── components/       # React components (Atomic design)
├── lib/              # Utilities and orchestration logic
├── server.js         # Custom Next.js server entry point
└── types/            # UI-specific types
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Custom Server** | `server.js` | Handles startup and proxying |
| **Page Layouts** | `src/app/layout.tsx` | Root layout and providers |
| **Orchestration** | `src/lib/orchestration` | Client-side agent coordination |
| **Components** | `src/components/` | Reusable UI elements |

## CONVENTIONS
- **Client vs Server**: Explicitly use `'use client'` for interactive components.
- **Tailwind**: Use utility classes for styling; avoid CSS modules unless necessary.
- **State**: Use React Context or simple hooks for state; avoid heavy Redux unless needed.

## ANTI-PATTERNS
- **Direct API Calls**: Avoid calling external APIs directly in components; use the orchestration layer or server actions.
- **Hardcoded URLs**: Use environment variables or config constants for API endpoints.
- **Standard Start**: DO NOT use `next dev`; MUST use the custom server script (via `pnpm dev` in root or package).
