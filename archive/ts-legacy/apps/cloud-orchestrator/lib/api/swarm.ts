export interface Swarm {
  id: string;
  title: string;
  description: string;
  sourceRepo?: string;
  strategy: 'parallel' | 'sequential' | 'pipeline';
  status: 'pending' | 'planning' | 'running' | 'complete' | 'failed' | 'cancelled';
  rootTask: string;
  decomposition?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SwarmAgent {
  id: string;
  swarmId: string;
  role: 'architect' | 'engineer' | 'auditor' | 'coordinator';
  sessionId?: string;
  task: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  output?: string;
  provider?: string;
  model?: string;
  dependsOn?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SwarmEvent {
  id: string;
  swarmId: string;
  agentId?: string;
  eventType: string;
  message: string;
  data?: string;
  createdAt: string;
}

export interface CostPrediction {
  taskType: string;
  estimatedTokens: number;
  costCents: number;
  recommendedProvider: string;
  recommendedModel: string;
  confidence: number;
  basis: 'historical' | 'heuristic';
}

export interface ProviderProfile {
  provider: string;
  model: string;
  avgTokensPerReq: number;
  avgCostPerReqCents: number;
  avgLatencyMs: number;
  successRate: number;
  totalRequests: number;
  totalCostCents: number;
  score: number;
}

export interface BudgetReport {
  period: string;
  spentCents: number;
  budgetCents: number;
  utilization: number;
  projectedCents: number;
  trend: 'under' | 'on_track' | 'over';
  byProvider: Record<string, number>;
  daysRemaining: number;
  recommendedPause: boolean;
}

export interface DailySpend {
  date: string;
  costCents: number;
  tokens: number;
  requests: number;
}

export async function fetchSwarms(status?: string): Promise<Swarm[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const response = await fetch(`/api/swarms?${params}`);
  if (!response.ok) throw new Error('Failed to load swarms');
  return response.json();
}

export async function fetchSwarm(id: string): Promise<Swarm> {
  const response = await fetch(`/api/swarms/${id}`);
  if (!response.ok) throw new Error('Failed to load swarm');
  return response.json();
}

export async function createSwarm(data: { title: string; rootTask: string; strategy?: string; sourceRepo?: string }): Promise<Swarm> {
  const response = await fetch('/api/swarms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create swarm');
  return response.json();
}

export async function fetchSwarmAgents(swarmId: string): Promise<SwarmAgent[]> {
  const response = await fetch(`/api/swarms/${swarmId}/agents`);
  if (!response.ok) throw new Error('Failed to load agents');
  return response.json();
}

export async function fetchSwarmEvents(swarmId: string): Promise<SwarmEvent[]> {
  const response = await fetch(`/api/swarms/${swarmId}/events`);
  if (!response.ok) throw new Error('Failed to load events');
  return response.json();
}

export async function cancelSwarm(swarmId: string): Promise<void> {
  const response = await fetch(`/api/swarms/${swarmId}/cancel`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to cancel swarm');
}

export async function fetchCostPrediction(taskType: string): Promise<CostPrediction> {
  const response = await fetch(`/api/cost/predict?task=${taskType}`);
  if (!response.ok) throw new Error('Failed to predict cost');
  return response.json();
}

export async function fetchProviderProfiles(): Promise<ProviderProfile[]> {
  const response = await fetch('/api/cost/providers');
  if (!response.ok) throw new Error('Failed to load provider profiles');
  return response.json();
}

export async function fetchBudgetReport(dailyBudgetCents?: number): Promise<BudgetReport> {
  const params = new URLSearchParams();
  if (dailyBudgetCents) params.set('dailyBudgetCents', String(dailyBudgetCents));
  const response = await fetch(`/api/cost/budget?${params}`);
  if (!response.ok) throw new Error('Failed to load budget report');
  return response.json();
}

export async function fetchSpendingTrend(days?: number): Promise<DailySpend[]> {
  const params = new URLSearchParams();
  if (days) params.set('days', String(days));
  const response = await fetch(`/api/cost/trend?${params}`);
  if (!response.ok) throw new Error('Failed to load spending trend');
  return response.json();
}
