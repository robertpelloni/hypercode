/**
 * Type declarations for the `backend/metamcp` library entry point.
 *
 * The `backend` workspace package (external/MetaMCP/apps/backend) is bundled
 * without declaration files to avoid complex Express type-portability issues.
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/types/backend-metamcp.d.ts
 * This shim re-declares only the minimal surface area consumed by @hypercode/core.
=======
 * This shim re-declares only the minimal surface area consumed by @borg/core.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/types/backend-metamcp.d.ts
 *
 * Add more declarations here as you import more from backend/metamcp.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

declare module "backend/metamcp" {
    /**
     * Attaches MetaMCP proxy extensions to an existing MCP Server instance.
     * Registers tool-listing and tool-call handlers that fan out to all
     * configured downstream MCP servers.
     *
     * @param server         The MCP Server to augment.
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/types/backend-metamcp.d.ts
     * @param namespaceUuid  Namespace identifier (e.g. "hypercode-core-namespace").
     * @param sessionId      Session identifier (e.g. "hypercode-core-session").
     * @param nativeTools    Tools already implemented natively by HyperCode.
=======
     * @param namespaceUuid  Namespace identifier (e.g. "borg-core-namespace").
     * @param sessionId      Session identifier (e.g. "borg-core-session").
     * @param nativeTools    Tools already implemented natively by borg.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/types/backend-metamcp.d.ts
     * @param nativeHandler  Callback used to execute those native tools.
     * @param includeInact   Whether to include inactive / disabled servers.
     * @returns An object with a `cleanup()` async function to tear down.
     */
    export function attachTo(
        server: Server,
        namespaceUuid: string,
        sessionId: string,
        nativeTools: Tool[],
        nativeHandler: (name: string, args: unknown) => Promise<CallToolResult>,
        includeInactiveServers?: boolean,
        options?: {
            registerDiscoveryHandlers?: boolean;
        }
    ): Promise<{ cleanup: () => Promise<void> }>;

    /**
     * Returns a safe subset of process.env suitable for passing to child
     * processes, filtering out shell functions and platform-specific noise.
     */
    export function getDefaultEnvironment(): Record<string, string>;
}
