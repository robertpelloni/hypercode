export type DaemonEventType =
  | 'connected'
  | 'daemon_status'
  | 'log_added'
  | 'sessions_interrupted'
  | 'sessions_continued'
  | 'session_updated'
  | 'session_nudged'
  | 'session_approved'
  | 'session_debate_escalated'
  | 'session_debate_resolved'
  | 'session_recovery_started'
  | 'session_recovery_completed'
  | 'codebase_index_started'
  | 'codebase_index_completed'
  | 'issue_check_started'
  | 'issue_evaluated'
  | 'issue_session_spawned'
  | 'activities_updated'
  | 'sessions_list_updated'
  | 'borg_signal_received'
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
  log: KeeperLog;
}

export interface SessionsInterruptedPayload {
  count: number;
  sessionIds: string[];
}

export interface SessionsContinuedPayload {
  count: number;
  sessionIds: string[];
}

export interface SessionUpdatedPayload {
  sessionId: string;
}

export interface SessionNudgedPayload {
  sessionId: string;
  sessionTitle?: string;
  inactiveMinutes: number;
  message: string;
}

export interface SessionApprovedPayload {
  sessionId: string;
  sessionTitle?: string;
}

export interface SessionDebateEscalatedPayload {
  sessionId: string;
  sessionTitle?: string;
  riskScore: number;
}

export interface SessionDebateResolvedPayload {
  sessionId: string;
  sessionTitle?: string;
  riskScore: number;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
  summary?: string;
}

export interface SessionRecoveryStartedPayload {
  sessionId: string;
  sessionTitle?: string;
}

export interface SessionRecoveryCompletedPayload {
  sessionId: string;
  sessionTitle?: string;
  summary?: string;
}

export interface CodebaseIndexStartedPayload {
  scope?: string;
}

export interface CodebaseIndexCompletedPayload {
  newChunks: number;
  totalFilesScanned?: number;
}

export interface IssueCheckStartedPayload {
  sourceId: string;
}

export interface IssueEvaluatedPayload {
  sourceId: string;
  issueNumber: number;
  issueTitle?: string;
  confidence: number;
  isFixable: boolean;
}

export interface IssueSessionSpawnedPayload {
  sourceId: string;
  issueNumber: number;
  issueTitle?: string;
  sessionId: string;
  sessionTitle?: string;
}

export interface ActivitiesUpdatedPayload {
  sessionId: string;
}

export interface SessionsListUpdatedPayload {
  reason?: 'created' | 'deleted' | 'status_changed';
}

export type LogType = 'info' | 'action' | 'error' | 'warn' | 'skip';

export interface KeeperLog {
  id: number;
  sessionId: string;
  type: LogType;
  message: string;
  metadata?: string | null;
  createdAt: string;
}

export function createDaemonEvent<T>(type: DaemonEventType, data?: T): DaemonEvent<T> {
  return {
    type,
    timestamp: Date.now(),
    data,
  };
}

export const WS_DEFAULTS = {
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 30000,
} as const;
