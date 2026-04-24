import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Loader2,
  Users,
  Pause,
  Play,
  Eye,
  Brain,
  Wrench,
  Shield,
  BarChart3,
  RefreshCw,
  Zap,
} from 'lucide-react';
import useSWR from 'swr';
import {
  fetchSwarms,
  fetchSwarmAgents,
  fetchSwarmEvents,
  createSwarm,
  cancelSwarm,
  fetchBudgetReport,
  fetchSpendingTrend,
  type Swarm,
  type SwarmAgent,
  type SwarmEvent,
  type BudgetReport,
  type DailySpend,
} from '@/lib/api/swarm';

const statusColors: Record<string, string> = {
  pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  planning: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  running: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  complete: 'bg-green-500/10 text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const roleIcons: Record<string, typeof Brain> = {
  architect: Brain,
  engineer: Wrench,
  auditor: Shield,
  coordinator: BarChart3,
};

const roleColors: Record<string, string> = {
  architect: 'text-purple-400',
  engineer: 'text-blue-400',
  auditor: 'text-green-400',
  coordinator: 'text-orange-400',
};

function SwarmCard({
  swarm,
  isSelected,
  onSelect,
  onCancel,
}: {
  swarm: Swarm;
  isSelected: boolean;
  onSelect: () => void;
  onCancel: () => void;
}) {
  return (
    <Card
      className={`p-3 cursor-pointer transition-all border ${
        isSelected ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{swarm.title || `Swarm ${swarm.id.slice(0, 8)}`}</span>
            <Badge variant="outline" className={`text-[8px] uppercase shrink-0 ${statusColors[swarm.status] || ''}`}>
              {swarm.status}
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-zinc-500 line-clamp-2">{swarm.rootTask}</p>
          <div className="mt-2 flex items-center gap-3 text-[9px] text-zinc-500">
            <span className="uppercase">{swarm.strategy}</span>
            <span>{new Date(swarm.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {(swarm.status === 'running' || swarm.status === 'planning') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            <Pause className="h-3 w-3 text-zinc-500" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function AgentCard({ agent }: { agent: SwarmAgent }) {
  const Icon = roleIcons[agent.role] || Brain;
  const agentStatusColor =
    agent.status === 'complete'
      ? 'text-green-400'
      : agent.status === 'running'
        ? 'text-yellow-400'
        : agent.status === 'failed'
          ? 'text-red-400'
          : 'text-zinc-500';

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${roleColors[agent.role] || 'text-zinc-400'}`} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{agent.role}</span>
        </div>
        <span className={`text-[9px] font-bold uppercase ${agentStatusColor}`}>{agent.status}</span>
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-300 line-clamp-2">{agent.task}</p>
      {agent.output && (
        <p className="mt-1 text-[9px] text-zinc-500 line-clamp-1 truncate">{agent.output}</p>
      )}
      {agent.provider && (
        <div className="mt-1.5 text-[8px] text-zinc-600">
          {agent.provider}/{agent.model || 'default'}
        </div>
      )}
    </div>
  );
}

function EventTimeline({ events }: { events: SwarmEvent[] }) {
  return (
    <div className="space-y-1">
      {events.slice(-20).map((event) => (
        <div key={event.id} className="flex items-start gap-2 text-[9px]">
          <span className="text-zinc-600 shrink-0 font-mono">{new Date(event.createdAt).toLocaleTimeString()}</span>
          <Badge
            variant="outline"
            className={`h-4 px-1 text-[7px] uppercase shrink-0 ${
              event.eventType.includes('fail')
                ? 'bg-red-500/10 text-red-300 border-red-500/20'
                : event.eventType.includes('complete')
                  ? 'bg-green-500/10 text-green-300 border-green-500/20'
                  : 'border-white/10 text-zinc-400'
            }`}
          >
            {event.eventType}
          </Badge>
          <span className="text-zinc-400 truncate">{event.message}</span>
        </div>
      ))}
    </div>
  );
}

function BudgetPanel() {
  const { data: budget, mutate } = useSWR<BudgetReport>('budget', () => fetchBudgetReport(100));
  const { data: trend } = useSWR<DailySpend[]>('spending-trend', () => fetchSpendingTrend(14));

  if (!budget) return null;

  const utilPct = Math.min(budget.utilization * 100, 100);
  const trendColor =
    budget.trend === 'over' ? 'text-red-400' : budget.trend === 'under' ? 'text-green-400' : 'text-yellow-400';

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-white">Cost Budget</h2>
        </div>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => mutate()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <div className="text-[9px] font-mono uppercase text-zinc-500">Spent</div>
          <div className="text-sm font-bold">${(budget.spentCents / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <div className="text-[9px] font-mono uppercase text-zinc-500">Budget</div>
          <div className="text-sm font-bold">${(budget.budgetCents / 100).toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <div className="text-[9px] font-mono uppercase text-zinc-500">Projected</div>
          <div className="text-sm font-bold">${(budget.projectedCents / 100).toFixed(2)}</div>
        </div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-[9px] mb-1">
          <span className="text-zinc-500">Utilization</span>
          <span className={trendColor}>{utilPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budget.trend === 'over' ? 'bg-red-500' : budget.trend === 'under' ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${utilPct}%` }}
          />
        </div>
      </div>
      {trend && trend.length > 0 && (
        <div className="mt-3">
          <div className="text-[9px] text-zinc-500 mb-1">14-Day Trend</div>
          <div className="flex items-end gap-px h-8">
            {trend.map((d, i) => {
              const maxCost = Math.max(...trend.map((t) => t.costCents), 0.01);
              const height = (d.costCents / maxCost) * 100;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${d.costCents > 0 ? 'bg-blue-500/40' : 'bg-zinc-800'}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${d.date}: $${(d.costCents / 100).toFixed(2)}`}
                />
              );
            })}
          </div>
        </div>
      )}
      {budget.recommendedPause && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-[10px] text-red-300">
          ⚠️ Budget utilization critical. Consider pausing non-essential operations.
        </div>
      )}
    </div>
  );
}

export function SwarmDashboard() {
  const [selectedSwarmId, setSelectedSwarmId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newStrategy, setNewStrategy] = useState<'parallel' | 'sequential' | 'pipeline'>('parallel');
  const [creating, setCreating] = useState(false);

  const { data: swarms, mutate: mutateSwarms } = useSWR<Swarm[]>('swarms', () => fetchSwarms());
  const { data: agents } = useSWR<SwarmAgent[]>(selectedSwarmId ? `swarm-agents-${selectedSwarmId}` : null, () =>
    selectedSwarmId ? fetchSwarmAgents(selectedSwarmId) : Promise.resolve([])
  );
  const { data: events } = useSWR<SwarmEvent[]>(selectedSwarmId ? `swarm-events-${selectedSwarmId}` : null, () =>
    selectedSwarmId ? fetchSwarmEvents(selectedSwarmId) : Promise.resolve([])
  );

  const handleCreate = useCallback(async () => {
    if (!newTask.trim()) return;
    setCreating(true);
    try {
      await createSwarm({ title: newTitle || `Swarm ${Date.now()}`, rootTask: newTask, strategy: newStrategy });
      mutateSwarms();
      setShowCreate(false);
      setNewTitle('');
      setNewTask('');
    } finally {
      setCreating(false);
    }
  }, [newTitle, newTask, newStrategy, mutateSwarms]);

  const handleCancel = useCallback(
    async (id: string) => {
      await cancelSwarm(id);
      mutateSwarms();
    },
    [mutateSwarms]
  );

  const selectedSwarm = swarms?.find((s) => s.id === selectedSwarmId);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          <h1 className="text-sm font-bold uppercase tracking-widest text-white">Agent Swarms</h1>
          <Badge variant="outline" className="text-[9px] border-blue-500/20 bg-blue-500/10 text-blue-300">
            v2.0
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[9px] uppercase tracking-widest"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="h-3 w-3 mr-2" />
          New Swarm
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Swarm Title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/40"
            />
            <textarea
              placeholder="Root task description (required)"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/40 h-20 resize-none"
            />
            <div className="flex items-center gap-3">
              {(['parallel', 'sequential', 'pipeline'] as const).map((s) => (
                <button
                  key={s}
                  className={`text-[9px] uppercase tracking-widest px-3 py-1 rounded border ${
                    newStrategy === s ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-white/10 text-zinc-500'
                  }`}
                  onClick={() => setNewStrategy(s)}
                >
                  {s}
                </button>
              ))}
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[9px]"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-[9px]"
                disabled={!newTask.trim() || creating}
                onClick={handleCreate}
              >
                {creating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                Launch
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Budget Panel */}
      <BudgetPanel />

      {/* Swarm List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Swarm List */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Swarms ({swarms?.length || 0})
          </div>
          {!swarms ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          ) : swarms.length === 0 ? (
            <div className="text-center py-8 text-[10px] text-zinc-500">
              No swarms yet. Create one to start orchestrating agents.
            </div>
          ) : (
            swarms.map((swarm) => (
              <SwarmCard
                key={swarm.id}
                swarm={swarm}
                isSelected={selectedSwarmId === swarm.id}
                onSelect={() => setSelectedSwarmId(swarm.id)}
                onCancel={() => handleCancel(swarm.id)}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedSwarm ? (
            <>
              {/* Swarm Detail */}
              <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold">{selectedSwarm.title}</h2>
                  <Badge variant="outline" className={`text-[9px] ${statusColors[selectedSwarm.status]}`}>
                    {selectedSwarm.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-zinc-400">{selectedSwarm.rootTask}</p>
                <div className="mt-2 flex gap-4 text-[9px] text-zinc-500">
                  <span>Strategy: <span className="text-zinc-300">{selectedSwarm.strategy}</span></span>
                  {selectedSwarm.sourceRepo && (
                    <span>Repo: <span className="text-zinc-300">{selectedSwarm.sourceRepo}</span></span>
                  )}
                  <span>Created: <span className="text-zinc-300">{new Date(selectedSwarm.createdAt).toLocaleString()}</span></span>
                </div>
              </div>

              {/* Agents */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                  Agents ({agents?.length || 0})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {agents?.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
                  (!agents || agents.length === 0) && (
                    <div className="text-[10px] text-zinc-500 col-span-2 py-4 text-center">
                      {selectedSwarm.status === 'planning' ? 'Decomposing task...' : 'No agents yet'}
                    </div>
                  )
                </div>
              </div>

              {/* Event Timeline */}
              {events && events.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                    Event Timeline ({events.length})
                  </div>
                  <div className="rounded-xl border border-white/5 bg-zinc-900 p-3">
                    <EventTimeline events={events} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-white/5 bg-zinc-900 p-8 text-center">
              <Eye className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-[10px] text-zinc-500">Select a swarm to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
