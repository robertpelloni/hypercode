export interface HealthSnapshot {
  id: string;
  status: string;
  databaseUp: boolean;
  daemonRunning: boolean;
  workerRunning: boolean;
  schedulerRunning: boolean;
  pendingJobs: number;
  processingJobs: number;
  wsClients: number;
  sessions: number;
  codeChunks: number;
  memoryChunks: number;
  notifications: number;
  auditEntries: number;
  responseTimeMs: number;
  memoryUsageMB: number;
  goroutineCount: number;
  createdAt: string;
}

export interface AnomalyRecord {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  sessionId?: string;
  metadata?: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export interface TokenUsageReport {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostCents: number;
  failedRequests: number;
  byProvider: Record<string, {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costCents: number;
  }>;
  byRequestType: Record<string, {
    requests: number;
    totalTokens: number;
    costCents: number;
  }>;
}

export async function fetchHealthHistory(hours = 24, limit = 100): Promise<{ snapshots: HealthSnapshot[]; total: number }> {
  const response = await fetch(`/api/health/history?hours=${hours}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load health history');
  return response.json();
}

export async function fetchActiveAnomalies(): Promise<{ anomalies: AnomalyRecord[]; total: number }> {
  const response = await fetch('/api/health/anomalies');
  if (!response.ok) throw new Error('Failed to load anomalies');
  return response.json();
}

export async function resolveAnomaly(id: string): Promise<void> {
  await fetch(`/api/health/anomalies/${id}/resolve`, { method: 'POST' });
}

export async function fetchAnomalyHistory(limit = 50): Promise<{ anomalies: AnomalyRecord[]; total: number }> {
  const response = await fetch(`/api/health/anomalies/history?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load anomaly history');
  return response.json();
}

export async function fetchTokenUsageStats(opts?: {
  provider?: string;
  sessionId?: string;
  since?: string;
}): Promise<TokenUsageReport> {
  const params = new URLSearchParams();
  if (opts?.provider) params.set('provider', opts.provider);
  if (opts?.sessionId) params.set('sessionId', opts.sessionId);
  if (opts?.since) params.set('since', opts.since);
  const response = await fetch(`/api/tokens/usage?${params}`);
  if (!response.ok) throw new Error('Failed to load token usage');
  return response.json();
}

export async function fetchSessionTokenUsage(sessionId: string): Promise<TokenUsageReport> {
  const response = await fetch(`/api/tokens/session/${sessionId}`);
  if (!response.ok) throw new Error('Failed to load session token usage');
  return response.json();
}

export async function fetchShadowPilotStatus(): Promise<Record<string, unknown>> {
  const response = await fetch('/api/shadow-pilot/status');
  if (!response.ok) throw new Error('Failed to load shadow pilot status');
  return response.json();
}

export async function startShadowPilot(): Promise<void> {
  const response = await fetch('/api/shadow-pilot/start', { method: 'POST' });
  if (!response.ok) throw new Error('Failed to start shadow pilot');
}

export async function stopShadowPilot(): Promise<void> {
  const response = await fetch('/api/shadow-pilot/stop', { method: 'POST' });
  if (!response.ok) throw new Error('Failed to stop shadow pilot');
}

export interface DependencyCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
  checkedAt: string;
}

export interface DependencyReport {
  checks: DependencyCheck[];
  overall: string;
  checkedAt: string;
  systemInfo: SystemInfo;
}

export interface SystemInfo {
  goVersion: string;
  os: string;
  arch: string;
  numCPU: number;
  numGoroutine: number;
  heapAllocMB: number;
  heapSysMB: number;
  stackInUseMB: number;
  uptimeSeconds: number;
  pid: number;
  workingDir: string;
}

export async function fetchDependencyReport(): Promise<DependencyReport> {
  const response = await fetch('/api/health/dependencies');
  if (!response.ok) throw new Error('Failed to load dependency report');
  return response.json();
}

export async function fetchHealthTrend(check?: string, hours?: number): Promise<{ snapshots: HealthSnapshot[]; count: number }> {
  const params = new URLSearchParams();
  if (check) params.set('check', check);
  if (hours) params.set('hours', String(hours));
  const response = await fetch(`/api/health/trend?${params}`);
  if (!response.ok) throw new Error('Failed to load health trend');
  return response.json();
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch('/api/system/info');
  if (!response.ok) throw new Error('Failed to load system info');
  return response.json();
}
