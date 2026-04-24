<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/trpc-upstream.ts
import { resolveLockedHyperCodeBase } from './hypercode-runtime';
=======
import { resolveLockedBorgBase } from './borg-runtime';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/lib/trpc-upstream.ts

const DEFAULT_UPSTREAM_TRPC_URLS: string[] = [
  'http://127.0.0.1:3100/trpc',
  'http://127.0.0.1:4000/trpc',
  'http://127.0.0.1:4001/trpc',
  'http://127.0.0.1:3847/trpc',
  'http://127.0.0.1:3001/trpc',
];

export function resolveUpstreamBases(): string[] {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/trpc-upstream.ts
  const configured = process.env.HYPERCODE_TRPC_UPSTREAM?.trim() || process.env.HYPERCODE_TRPC_UPSTREAM?.trim();
  const lockedBase = resolveLockedHyperCodeBase();
=======
  const configured = process.env.BORG_TRPC_UPSTREAM?.trim();
  const lockedBase = resolveLockedBorgBase();
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/lib/trpc-upstream.ts
  const allBases = [
    ...(lockedBase ? [`${lockedBase}/trpc`] : []),
    ...(configured ? [configured] : []),
    ...DEFAULT_UPSTREAM_TRPC_URLS,
  ];
  const normalizedBases = allBases.map((base) => base.trim()).filter(Boolean);

  return Array.from(new Set(normalizedBases));
}
