import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
export interface RouterConfig {
    defaultProvider?: string;
}
export declare class Router {
    private config;
    private clients;
    constructor(config?: RouterConfig);
    /**
     * Connects to a local MCP server via stdio.
     */
    connectToServer(name: string, command: string, args: string[]): Promise<Client<{
        method: string;
        params?: {
            [x: string]: unknown;
            _meta?: {
                [x: string]: unknown;
                progressToken?: string | number | undefined;
                "io.modelcontextprotocol/related-task"?: {
                    taskId: string;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        method: string;
        params?: {
            [x: string]: unknown;
            _meta?: {
                [x: string]: unknown;
                progressToken?: string | number | undefined;
                "io.modelcontextprotocol/related-task"?: {
                    taskId: string;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }> | undefined>;
    listTools(): Promise<Tool[]>;
    callTool(name: string, args: any): Promise<CallToolResult>;
    getClient(name: string): Client | undefined;
}
//# sourceMappingURL=Router.d.ts.map