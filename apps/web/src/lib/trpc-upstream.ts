import { resolveLockedBorgBase } from './hypercode-runtime';

const DEFAULT_UPSTREAM_TRPC_URLS: string[] = [
  'http://127.0.0.1:3100/trpc',
  'http://127.0.0.1:4000/trpc',
  'http://127.0.0.1:4001/trpc',
  'http://127.0.0.1:3847/trpc',
  'http://127.0.0.1:3001/trpc',
];

export function resolveUpstreamBases(): string[] {
  const configured = process.env.BORG_TRPC_UPSTREAM?.trim();
  const lockedBase = resolveLockedBorgBase();
  const allBases = [
    ...(lockedBase ? [`${lockedBase}/trpc`] : []),
    ...(configured ? [configured] : []),
    ...DEFAULT_UPSTREAM_TRPC_URLS,
  ];
  const normalizedBases = allBases.map((base) => base.trim()).filter(Boolean);

  return Array.from(new Set(normalizedBases));
}
