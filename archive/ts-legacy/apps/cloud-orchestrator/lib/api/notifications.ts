export interface Notification {
  id: string;
  type: string; // 'info', 'success', 'warning', 'error', 'action'
  category: string; // 'session', 'debate', 'recovery', 'indexing', 'issues', 'circuit_breaker', 'scheduler', 'webhook', 'system'
  title: string;
  message: string;
  sessionId?: string;
  sourceId?: string;
  metadata?: string;
  isRead: boolean;
  isDismissed: boolean;
  priority: number; // 0=normal, 1=high, 2=critical
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  status: string;
  summary: string;
  details?: string;
  provider?: string;
  model?: string;
  tokenUsage?: number;
  durationMs?: number;
  createdAt: string;
}

export interface AuditResponse {
  entries: AuditEntry[];
  total: number;
}

export interface AuditStats {
  total: number;
  last24h: number;
  tokens: number;
  byAction: Record<string, number>;
  byActor: Record<string, number>;
  byStatus: Record<string, number>;
}

export async function fetchNotifications(opts?: {
  category?: string;
  type?: string;
  sessionId?: string;
  includeRead?: boolean;
  includeDismissed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (opts?.category) params.set('category', opts.category);
  if (opts?.type) params.set('type', opts.type);
  if (opts?.sessionId) params.set('sessionId', opts.sessionId);
  if (opts?.includeRead) params.set('includeRead', 'true');
  if (opts?.includeDismissed) params.set('includeDismissed', 'true');
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));

  const response = await fetch(`/api/notifications?${params}`);
  if (!response.ok) throw new Error('Failed to load notifications');
  return response.json();
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await fetch('/api/notifications/unread-count');
  if (!response.ok) throw new Error('Failed to load notification count');
  const data = await response.json();
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch('/api/notifications/read-all', { method: 'POST' });
}

export async function dismissNotification(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/dismiss`, { method: 'POST' });
}

export async function dismissAllNotifications(): Promise<void> {
  await fetch('/api/notifications/dismiss-all', { method: 'POST' });
}

export async function fetchAuditEntries(opts?: {
  action?: string;
  actor?: string;
  resourceType?: string;
  resourceId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditResponse> {
  const params = new URLSearchParams();
  if (opts?.action) params.set('action', opts.action);
  if (opts?.actor) params.set('actor', opts.actor);
  if (opts?.resourceType) params.set('resourceType', opts.resourceType);
  if (opts?.resourceId) params.set('resourceId', opts.resourceId);
  if (opts?.status) params.set('status', opts.status);
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));

  const response = await fetch(`/api/audit?${params}`);
  if (!response.ok) throw new Error('Failed to load audit entries');
  return response.json();
}

export async function fetchAuditStats(): Promise<AuditStats> {
  const response = await fetch('/api/audit/stats');
  if (!response.ok) throw new Error('Failed to load audit stats');
  return response.json();
}
