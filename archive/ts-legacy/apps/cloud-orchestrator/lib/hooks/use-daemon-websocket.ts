'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSessionKeeperStore, Log } from '@/lib/stores/session-keeper';
import type {
  DaemonEvent,
  DaemonStatusPayload,
  LogAddedPayload,
  SessionUpdatedPayload,
  SessionNudgedPayload,
  SessionApprovedPayload,
  SessionDebateEscalatedPayload,
  SessionDebateResolvedPayload,
  SessionRecoveryStartedPayload,
  SessionRecoveryCompletedPayload,
  CodebaseIndexStartedPayload,
  CodebaseIndexCompletedPayload,
  IssueCheckStartedPayload,
  IssueEvaluatedPayload,
  IssueSessionSpawnedPayload,
} from '@jules/shared';
import { WS_DEFAULTS } from '@jules/shared';
import { emitDaemonEvent } from './use-daemon-events';
import { DAEMON_WS_URL } from '@/lib/config/daemon';

const WS_URL = DAEMON_WS_URL;

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface BorgSignalPayload {
  type: string;
  timestamp: string;
  source?: string;
  data?: unknown;
}

export function useDaemonWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPongRef = useRef<number>(0);

  useEffect(() => {
    lastPongRef.current = Date.now();
  }, []);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [latency, setLatency] = useState<number | null>(null);

  const config = useSessionKeeperStore(state => state.config);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);
  const setPausedAll = useSessionKeeperStore(state => state.setPausedAll);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: DaemonEvent = JSON.parse(event.data);
      
      emitDaemonEvent(message);
      
      switch (message.type) {
        case 'daemon_status': {
          const payload = message.data as DaemonStatusPayload;
          setStatusSummary({
            monitoringCount: payload?.sessionCount || 0,
            lastAction: 'WS: ' + new Date().toLocaleTimeString(),
          });
          break;
        }

        case 'log_added': {
          const payload = message.data as LogAddedPayload;
          if (payload?.log) {
            const newLog: Log = {
              id: String(payload.log.id),
              sessionId: payload.log.sessionId,
              time: new Date(payload.log.createdAt || Date.now()).toLocaleTimeString(),
              message: payload.log.message,
              type: payload.log.type as Log['type'],
              details: payload.log.metadata ? JSON.parse(payload.log.metadata) : undefined
            };
            useSessionKeeperStore.setState((state) => ({
              logs: [newLog, ...state.logs].slice(0, 100)
            }));
          }
          break;
        }

        case 'sessions_interrupted':
          setPausedAll(true);
          break;

        case 'sessions_continued':
          setPausedAll(false);
          break;

        case 'session_updated': {
          const payload = message.data as SessionUpdatedPayload;
          setStatusSummary({
            lastAction: `Session ${payload?.sessionId?.slice(-6) || 'unknown'} updated`,
          });
          break;
        }

        case 'session_nudged': {
          const payload = message.data as SessionNudgedPayload;
          const nudgeLog: Log = {
            id: String(Date.now()),
            sessionId: payload?.sessionId,
            time: new Date().toLocaleTimeString(),
            message: `Nudged session ${payload?.sessionId?.slice(0, 8)} (${payload?.inactiveMinutes ?? 0}m inactive)`,
            type: 'action',
            details: {
              event: 'session_nudged',
              nudgeMessage: payload?.message,
              sessionTitle: payload?.sessionTitle,
              inactiveMinutes: payload?.inactiveMinutes,
            }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [nudgeLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Nudged ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'session_approved': {
          const payload = message.data as SessionApprovedPayload;
          const approveLog: Log = {
            id: String(Date.now()),
            sessionId: payload?.sessionId,
            time: new Date().toLocaleTimeString(),
            message: `Auto-approved plan for ${payload?.sessionId?.slice(0, 8)}`,
            type: 'action',
            details: {
              event: 'session_approved',
              sessionTitle: payload?.sessionTitle,
            }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [approveLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Approved ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'session_debate_escalated': {
          const payload = message.data as SessionDebateEscalatedPayload;
          const debateLog: Log = {
            id: String(Date.now()),
            sessionId: payload?.sessionId,
            time: new Date().toLocaleTimeString(),
            message: `Escalated plan to Council Debate (${payload?.riskScore ?? 0}/100 risk)`,
            type: 'info',
            details: {
              event: 'session_debate_escalated',
              sessionTitle: payload?.sessionTitle,
              riskScore: payload?.riskScore,
            }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [debateLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Debating ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'session_debate_resolved': {
          const payload = message.data as SessionDebateResolvedPayload;
          const resolvedLog: Log = {
            id: String(Date.now()),
            sessionId: payload?.sessionId,
            time: new Date().toLocaleTimeString(),
            message: `Council Debate resolved with ${payload?.approvalStatus || 'pending'} status (${payload?.riskScore ?? 0}/100 risk)`,
            type: payload?.approvalStatus === 'approved' ? 'action' : payload?.approvalStatus === 'rejected' ? 'error' : 'info',
            details: {
              event: 'session_debate_resolved',
              sessionTitle: payload?.sessionTitle,
              riskScore: payload?.riskScore,
              approvalStatus: payload?.approvalStatus,
              summary: payload?.summary,
            }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [resolvedLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Debate resolved for ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'session_recovery_started': {
          const payload = message.data as SessionRecoveryStartedPayload;
          const recoveryLog: Log = {
            id: String(Date.now()),
            sessionId: payload?.sessionId,
            time: new Date().toLocaleTimeString(),
            message: `Started recovery analysis for ${payload?.sessionId?.slice(0, 8)}`,
            type: 'info',
            details: {
              event: 'session_recovery_started',
              sessionTitle: payload?.sessionTitle,
            }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [recoveryLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Recovering ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'session_recovery_completed': {
          const payload = message.data as SessionRecoveryCompletedPayload;
          const recoveryLog: Log = {
            id: String(Date.now()),
            sessionId: payload?.sessionId,
            time: new Date().toLocaleTimeString(),
            message: `Recovery guidance generated for ${payload?.sessionId?.slice(0, 8)}`,
            type: 'action',
            details: {
              event: 'session_recovery_completed',
              sessionTitle: payload?.sessionTitle,
              summary: payload?.summary,
            }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [recoveryLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Recovery sent to ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'codebase_index_started': {
          const payload = message.data as CodebaseIndexStartedPayload;
          setStatusSummary({
            lastAction: `Indexing ${payload?.scope || 'workspace'} started`,
          });
          break;
        }

        case 'codebase_index_completed': {
          const payload = message.data as CodebaseIndexCompletedPayload;
          setStatusSummary({
            lastAction: `Indexed ${payload?.newChunks ?? 0} chunks`,
          });
          break;
        }

        case 'issue_check_started': {
          const payload = message.data as IssueCheckStartedPayload;
          setStatusSummary({
            lastAction: `Checking issues for ${payload?.sourceId || 'repo'}`,
          });
          break;
        }

        case 'issue_evaluated': {
          const payload = message.data as IssueEvaluatedPayload;
          setStatusSummary({
            lastAction: `Evaluated issue #${payload?.issueNumber ?? '?'} (${payload?.confidence ?? 0}%)`,
          });
          break;
        }

        case 'issue_session_spawned': {
          const payload = message.data as IssueSessionSpawnedPayload;
          setStatusSummary({
            lastAction: `Spawned ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'borg_signal_received': {
          const payload = message.data as BorgSignalPayload;
          useSessionKeeperStore.getState().addBorgSignal({
            id: String(Date.now()),
            type: payload.type,
            timestamp: payload.timestamp,
            source: payload.source || 'collective',
            data: payload.data
          });
          break;
        }

        case 'pong': {
          lastPongRef.current = Date.now();
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          const pingTime = (message.data as { timestamp?: number })?.timestamp;
          if (pingTime) {
            setLatency(Date.now() - pingTime);
          }
          break;
        }

        default:
          break;
      }
    } catch {
      // Ignore malformed daemon payloads and keep the socket alive.
    }
  }, [setStatusSummary, setPausedAll]);

  const connectRef = useRef<() => void>(() => {});

  const attemptConnection = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setConnectionState('connected');
        lastPongRef.current = Date.now();
        setStatusSummary({
          lastAction: 'WS Connected',
        });
        
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const pingTime = Date.now();
            wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: pingTime }));
            
            pongTimeoutRef.current = setTimeout(() => {
              const timeSinceLastPong = Date.now() - lastPongRef.current;
              if (timeSinceLastPong > WS_DEFAULTS.PING_INTERVAL * 2) {
                setConnectionState('reconnecting');
                wsRef.current?.close(4000, 'Ping timeout');
              }
            }, WS_DEFAULTS.PING_INTERVAL);
          }
        }, WS_DEFAULTS.PING_INTERVAL);
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        wsRef.current = null;
        setConnectionState('disconnected');

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (pongTimeoutRef.current) {
          clearTimeout(pongTimeoutRef.current);
          pongTimeoutRef.current = null;
        }

        if (config.isEnabled && reconnectAttemptsRef.current < WS_DEFAULTS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          setConnectionState('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), WS_DEFAULTS.RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= WS_DEFAULTS.MAX_RECONNECT_ATTEMPTS) {
          setStatusSummary({
            lastAction: 'WS: Max reconnect attempts reached',
          });
        }
      };

      ws.onerror = () => {
        // Connection retries are coordinated in onclose.
      };

      wsRef.current = ws;
    } catch {
      setConnectionState('disconnected');
    }
  }, [config.isEnabled, handleMessage, setStatusSummary]);

  useEffect(() => {
    connectRef.current = attemptConnection;
  }, [attemptConnection]);

  const connect = useCallback(() => {
    attemptConnection();
  }, [attemptConnection]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (config.isEnabled) {
      attemptConnection();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.isEnabled]); // Only re-run if enabled state changes

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    latency,
    send,
    reconnect: connect,
  };
}
