# GitHub Copilot Instructions

> **MANDATORY INCLUSION:** Refer to the global project directives maintained in `LLM_INSTRUCTIONS.md`.

## Inline Assistance Strategies

1. **Code Completion Standards:**
   - Always prefer `pnpm` ecosystem tooling. Do not suggest `npm install`.
   - Next.js: Adhere to App Router conventions (`app/` directory). Do not suggest legacy `pages/` directory structures.
   - Database: Always suggest `prisma.$transaction` for multi-step database mutations to ensure atomic compliance.
   - TypeScript: Never auto-complete with `any`. Derive exact types from `schema.prisma` exports or `app/types/index.ts`.
   
2. **Context Window Limitations:**
   - Understand that you are operating within a constrained inline editor context. You will not see the holistic architecture. 
   - Trust and utilize the imports and variable names present in the active file, assuming they follow the overarching project structure defined in the universal instructions.

3. **Global Updates Awareness:**
   - Even though you act inline, remind the user to increment the version in the global `VERSION` file, update `CHANGELOG.md`, and include the version number in their commit messages after making significant logic changes.
