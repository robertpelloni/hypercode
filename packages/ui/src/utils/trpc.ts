// Lazy-import @trpc/react-query from the consumer's node_modules.
// This package is resolved at runtime by the consuming app (apps/web),
// not by packages/ui itself (pnpm strict isolation).
let createTRPCReactFn: (...args: any[]) => any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@trpc/react-query');
  createTRPCReactFn = mod.createTRPCReact;
} catch {
  // Fallback: return a deep proxy that won't crash SSR prerendering.
  // Handles trpc.router.subRouter.useQuery() style access.
  const noopQuery = () => ({ data: undefined, isLoading: false, error: null, mutate: () => {}, mutateAsync: async () => {}, refetch: async () => ({}) });
  const handler: ProxyHandler<any> = {
    get: (_target: any, _prop: string | symbol) => {
      return new Proxy(noopQuery, handler);
    },
    apply: () => noopQuery(),
  };
  createTRPCReactFn = () => {
    const trpcObj = {
      Provider: ({ children }: { children: any }) => children,
      useContext: () => new Proxy({}, handler),
      useUtils: () => new Proxy({}, handler),
      createClient: () => ({}),
    };
    return new Proxy(trpcObj, {
      get: (target, prop) => {
        if (prop in target) return (target as any)[prop];
        return new Proxy(noopQuery, handler);
      }
    });
  };
}

// Dynamic call to avoid type argument on untyped function.
export const trpc = createTRPCReactFn();
