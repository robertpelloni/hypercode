import WebSocket from 'ws';
import * as vscode from 'vscode';

/**
 * Daemon event types mirrored from @jules/shared websocket.ts
 * We inline these to avoid cross-workspace dependency issues in the extension.
 */
export type DaemonEventType =
    | 'connected'
    | 'daemon_status'
    | 'log_added'
    | 'sessions_interrupted'
    | 'sessions_continued'
    | 'session_updated'
    | 'session_nudged'
    | 'session_approved'
    | 'activities_updated'
    | 'sessions_list_updated'
    | 'shadow_pilot_alert'
    | 'ping'
    | 'pong';

export interface DaemonEvent<T = unknown> {
    type: DaemonEventType;
    timestamp?: number;
    data?: T;
}

export interface DaemonStatusPayload {
    status: 'running' | 'stopped';
    sessionCount: number;
}

export interface LogAddedPayload {
    log: {
        id: number;
        sessionId: string;
        type: string;
        message: string;
        metadata?: string | null;
        createdAt: string;
    };
}

export interface ShadowPilotAlertPayload {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    diffSnippet: string;
}

type EventCallback = (event: DaemonEvent) => void;

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 30000;

export class DaemonClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private listeners: EventCallback[] = [];
    private url: string;
    private disposed = false;

    constructor(url: string) {
        this.url = url;
    }

    public onEvent(callback: EventCallback): vscode.Disposable {
        this.listeners.push(callback);
        return new vscode.Disposable(() => {
            this.listeners = this.listeners.filter(l => l !== callback);
        });
    }

    public connect(): void {
        if (this.disposed) {
            return;
        }

        try {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                this.reconnectAttempts = 0;
                this.startPing();
                this.emit({ type: 'connected', timestamp: Date.now() });
            });

            this.ws.on('message', (data: WebSocket.RawData) => {
                try {
                    const event = JSON.parse(data.toString()) as DaemonEvent;
                    if (event.type === 'ping') {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'pong' }));
                        }
                        return;
                    }
                    this.emit(event);
                } catch {
                    // Silently discard malformed messages
                }
            });

            this.ws.on('close', () => {
                this.stopPing();
                this.scheduleReconnect();
            });

            this.ws.on('error', () => {
                // Error event is always followed by close, reconnect handled there
            });
        } catch {
            this.scheduleReconnect();
        }
    }

    public disconnect(): void {
        this.disposed = true;
        this.stopPing();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public send(data: Record<string, unknown>): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    public get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    private emit(event: DaemonEvent): void {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch {
                // Don't let listener errors crash the client
            }
        }
    }

    private startPing(): void {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            this.send({ type: 'ping' });
        }, PING_INTERVAL);
    }

    private stopPing(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    private scheduleReconnect(): void {
        if (this.disposed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            return;
        }
        this.reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.min(this.reconnectAttempts, 5);
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }
}
