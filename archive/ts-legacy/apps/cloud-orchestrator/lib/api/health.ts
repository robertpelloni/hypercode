export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  checks: {
    database?: { status?: string; error?: string };
    daemon?: { running?: boolean; enabled?: boolean };
    worker?: { running?: boolean };
    credentials?: { julesConfigured?: boolean };
  };
  queue?: { pending?: number; processing?: number };
  totals?: {
    sessions?: number;
    codeChunks?: number;
    memoryChunks?: number;
    templates?: number;
    debates?: number;
  };
  realtime?: { wsClients?: number };
}

export interface ScheduledTask {
  name: string;
  intervalMs: number;
  nextRun: string;
  lastRun?: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error('Failed to load runtime health');
  }
  return response.json() as Promise<HealthResponse>;
}

export async function fetchScheduledTasks(): Promise<ScheduledTask[]> {
  const response = await fetch('/api/scheduler');
  if (!response.ok) {
    throw new Error('Failed to load scheduled tasks');
  }
  return response.json() as Promise<ScheduledTask[]>;
}

export async function triggerScheduledTask(name: string): Promise<void> {
  const response = await fetch(`/api/scheduler/${name}/trigger`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to trigger task ${name}`);
  }
}

export async function fetchMetricsText(): Promise<string> {
  const response = await fetch('/metrics');
  if (!response.ok) {
    throw new Error('Failed to load metrics');
  }
  return response.text();
}

