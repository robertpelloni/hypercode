import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './useAppState';
import type {
  DaemonEvent,
  DaemonStatusPayload,
  LogAddedPayload,
  SessionsInterruptedPayload,
  SessionsContinuedPayload,
  SessionNudgedPayload,
  SessionApprovedPayload,
} from '@jules/shared';
import { WS_DEFAULTS } from '@jules/shared';

const WS_URL = process.env.JULES_WS_URL || 'ws://localhost:8080/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: DaemonEvent = JSON.parse(event.data);
      
      switch (message.type) {
        case 'connected':
          useAppStore.setState({ isConnected: true, error: null });
          break;

        case 'daemon_status': {
          const payload = message.data as DaemonStatusPayload;
          useAppStore.setState(state => ({
            daemonStatus: state.daemonStatus ? {
              ...state.daemonStatus,
              isEnabled: payload?.status === 'running',
              lastCheck: new Date().toISOString()
            } : {
              isEnabled: payload?.status === 'running',
              lastCheck: new Date().toISOString(),
              logs: []
            }
          }));
          break;
        }

        case 'log_added': {
          const payload = message.data as LogAddedPayload;
          if (payload?.log) {
            useAppStore.setState(state => ({
              logs: [payload.log, ...state.logs].slice(0, 100)
            }));
          }
          break;
        }

        case 'sessions_interrupted': {
          const payload = message.data as SessionsInterruptedPayload;
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: 'global',
              type: 'action' as const,
              message: `Interrupted ${payload?.count ?? 0} sessions`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;
        }

        case 'sessions_continued': {
          const payload = message.data as SessionsContinuedPayload;
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: 'global',
              type: 'action' as const,
              message: `Continued ${payload?.count ?? 0} sessions`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;
        }

        case 'session_nudged': {
          const payload = message.data as SessionNudgedPayload;
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: payload?.sessionId ?? 'unknown',
              type: 'action' as const,
              message: `Nudged ${payload?.sessionId?.slice(0, 8) ?? '?'} (${payload?.inactiveMinutes ?? 0}m inactive)`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;
        }

        case 'session_approved': {
          const payload = message.data as SessionApprovedPayload;
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: payload?.sessionId ?? 'unknown',
              type: 'action' as const,
              message: `Auto-approved plan for ${payload?.sessionId?.slice(0, 8) ?? '?'}`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;
        }

        case 'pong':
          break;

        default:
          break;
      }
    } catch {
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        useAppStore.setState({ isConnected: true, error: null });
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        wsRef.current = null;
        useAppStore.setState({ isConnected: false });

        if (reconnectAttemptsRef.current < WS_DEFAULTS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, WS_DEFAULTS.RECONNECT_DELAY);
        } else {
          useAppStore.setState({ error: 'Max reconnect attempts reached' });
        }
      };

      ws.onerror = () => {
        useAppStore.setState({ error: 'WebSocket error' });
      };

      wsRef.current = ws;
    } catch {
      useAppStore.setState({ error: 'Failed to connect' });
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    connect();
    
    const pingInterval = setInterval(sendPing, WS_DEFAULTS.PING_INTERVAL);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect,
    disconnect
  };
}
