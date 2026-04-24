
import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
<<<<<<< HEAD:archive/ts-legacy/packages/ui/src/utils/trpc.ts
import type { AppRouter } from '@hypercode/core';
=======
import type { AppRouter } from '@borg/core';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/ui/src/utils/trpc.ts

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
