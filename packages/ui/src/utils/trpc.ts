// Lazy-import @trpc/react-query from the consumer's node_modules.
// This package is resolved at runtime by the consuming app (apps/web),
// not by packages/ui itself (pnpm strict isolation).
let createTRPCReactFn: (...args: any[]) => any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@trpc/react-query');
  createTRPCReactFn = mod.createTRPCReact;
} catch {
  // Fallback: the consuming app will provide this at runtime
  createTRPCReactFn = () => new Proxy({}, {
    get: () => () => ({ data: undefined, isLoading: false, error: null })
  });
}

// Use dynamic call to avoid type argument on untyped function.
// The actual type safety comes from the server-side router definition.
export const trpc = createTRPCReactFn();
