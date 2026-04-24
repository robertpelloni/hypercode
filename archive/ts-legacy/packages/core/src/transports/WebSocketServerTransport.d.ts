import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer } from 'ws';
export declare class WebSocketServerTransport implements Transport {
    private _ws;
    private _wss;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    constructor(wss: WebSocketServer);
    close(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
    start(): Promise<void>;
}
//# sourceMappingURL=WebSocketServerTransport.d.ts.map