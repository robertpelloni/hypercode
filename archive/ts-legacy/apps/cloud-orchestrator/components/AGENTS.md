# COMPONENTS KNOWLEDGE BASE

## OVERVIEW
This directory contains the React UI building blocks for Jules. It is divided into low-level primitives (shadcn/ui) and high-level feature components.

## STRUCTURE
```
components/
├── ui/               # Generic, reusable primitives (Button, Dialog, Input)
├── debate-dialog.tsx # Feature: Multi-agent debate configuration
├── debate-viewer.tsx # Feature: Real-time debate visualization
├── session-*.tsx     # Feature: Session management & monitoring
└── terminal.tsx      # Feature: Web-based terminal interface
```

## CONVENTIONS
- **Server vs Client**:
    - `ui/` components are generally Client Components (`"use client"`) due to interactivity.
    - Feature components should be Client Components if they manage state (like `DebateDialog`).
- **Styling**: All components use Tailwind CSS classes. Avoid inline styles.
- **Icons**: Use `lucide-react`.

## ANTI-PATTERNS
- **Business Logic**: Do not place API calls or heavy logic inside `ui/` primitives. Keep them dumb.
- **Direct Imports**: Do not import from `dist/` or internal package paths. Use named exports.
