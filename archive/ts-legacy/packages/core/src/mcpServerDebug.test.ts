import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMcpServerDebugEnabled, mcpServerDebugLog } from './mcpServerDebug.js';

describe('mcpServerDebug', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('stays quiet by default for normal dev boot', () => {
        expect(isMcpServerDebugEnabled({})).toBe(false);
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcpServerDebug.test.ts
        expect(isMcpServerDebugEnabled({ HYPERCODE_MCP_SERVER_DEBUG: '0' })).toBe(false);
    });

    it('enables logging via the dedicated HyperCode flag or DEBUG namespace', () => {
        expect(isMcpServerDebugEnabled({ HYPERCODE_MCP_SERVER_DEBUG: '1' })).toBe(true);
        expect(isMcpServerDebugEnabled({ HYPERCODE_MCP_SERVER_DEBUG: 'true' })).toBe(true);
        expect(isMcpServerDebugEnabled({ DEBUG: 'other,hypercode:mcp-server' })).toBe(true);
=======
        expect(isMcpServerDebugEnabled({ BORG_MCP_SERVER_DEBUG: '0' })).toBe(false);
    });

    it('enables logging via the dedicated borg flag or DEBUG namespace', () => {
        expect(isMcpServerDebugEnabled({ BORG_MCP_SERVER_DEBUG: '1' })).toBe(true);
        expect(isMcpServerDebugEnabled({ BORG_MCP_SERVER_DEBUG: 'true' })).toBe(true);
        expect(isMcpServerDebugEnabled({ DEBUG: 'other,borg:mcp-server' })).toBe(true);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcpServerDebug.test.ts
    });

    it('only writes to console when debug is enabled', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        mcpServerDebugLog('[DEBUG] hidden by default', {});
        expect(logSpy).not.toHaveBeenCalled();

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/mcpServerDebug.test.ts
        mcpServerDebugLog('[DEBUG] visible when enabled', { HYPERCODE_MCP_SERVER_DEBUG: '1' });
=======
        mcpServerDebugLog('[DEBUG] visible when enabled', { BORG_MCP_SERVER_DEBUG: '1' });
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/mcpServerDebug.test.ts
        expect(logSpy).toHaveBeenCalledWith('[DEBUG] visible when enabled');
    });
});