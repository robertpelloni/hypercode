// @ts-expect-error -- @trpc/react-query resolved from consumer's node_modules at runtime
import { createTRPCReact } from '@trpc/react-query';

// Use 'any' to avoid tRPC's type recursion limit with large routers.
// The actual type safety comes from the server-side router definition.
export const trpc = createTRPCReact<any>();
