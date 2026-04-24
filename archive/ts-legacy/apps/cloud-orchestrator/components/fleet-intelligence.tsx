'use client';

import { useState, useEffect } from 'react';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { 
  Brain, 
  Cpu, 
  Search, 
  Zap, 
  History,
  Activity,
  Layers,
  ChevronRight,
  Loader2,
  RefreshCw,
  HeartPulse,
  Database,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchHealth, type HealthResponse } from '@/lib/api/health';

interface QueueStats {
  pending: number;
  processing: number;
}

export function FleetIntelligence() {
  const {
    config: { isEnabled },
    logs,
    queue,
    borgSignals,
  } = useSessionKeeperStore();
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0 });
  const [isReindexing, setIsReindexing] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  useEffect(() => {
    if (queue) {
      setStats(queue);
    }
  }, [queue]);

  const loadHealth = async (showToast = false) => {
    try {
      setIsLoadingHealth(true);
      const data = await fetchHealth();
      setHealth(data);
      if (showToast) {
        toast.success('Runtime health refreshed');
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        toast.error('Failed to refresh runtime health');
      }
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const handleReindex = async () => {
    try {
      setIsReindexing(true);
      const response = await fetch('/api/rag/reindex', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to trigger re-index');
      toast.success('Codebase re-indexing job enqueued');
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger re-index');
    } finally {
      setTimeout(() => setIsReindexing(false), 2000);
    }
  };

  useEffect(() => {
    void loadHealth();
    const intervalId = window.setInterval(() => {
      void loadHealth();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Filter logs for Council or RAG related events
  const intelligenceLogs = logs.filter(log => 
    log.message.toLowerCase().includes('council') || 
    log.message.toLowerCase().includes('plan risk') || 
    log.message.toLowerCase().includes('indexing') ||
    log.message.toLowerCase().includes('rag') ||
    log.message.toLowerCase().includes('self-healing') ||
    log.message.toLowerCase().includes('memory')
  ).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 1. Fleet Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-zinc-500">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-widest">Autonomous Core</span>
            </div>
            {isEnabled ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[8px] h-4 font-bold">ONLINE</Badge>
            ) : (
              <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[8px] h-4 font-bold">OFFLINE</Badge>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white font-mono tracking-tighter">
              {stats.processing > 0 ? "COGNITIVE" : "WATCHING"}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
              {stats.processing} Active
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-zinc-500">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-widest">Job Queue</span>
            </div>
            <Activity className={cn("h-3.5 w-3.5", stats.processing > 0 && "text-purple-500 animate-pulse")} />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white font-mono tracking-tighter">
              {stats.pending}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
              Pending Tasks
            </div>
          </div>
        </div>
      </div>

      {/* 2. Runtime Health Monitoring */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Runtime Health</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadHealth(true)}
            disabled={isLoadingHealth}
            className="h-7 border-white/10 hover:bg-white/5 text-[9px] font-mono uppercase tracking-widest"
          >
            {isLoadingHealth ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/5 bg-black/20 p-3 space-y-1">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
                <Database className="h-3 w-3" />
                <span>Database</span>
              </div>
              <div className="text-sm font-bold text-white uppercase tracking-tight">
                {health?.checks?.database?.status === 'ok' ? 'HEALTHY' : health?.checks?.database?.status === 'error' ? 'DEGRADED' : 'UNKNOWN'}
              </div>
              {health?.checks?.database?.error ? (
                <p className="text-[10px] text-red-300 break-all">{health.checks.database.error}</p>
              ) : (
                <p className="text-[10px] text-zinc-500">SQLite connectivity available.</p>
              )}
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3 space-y-1">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
                <Cpu className="h-3 w-3" />
                <span>Daemon Loop</span>
              </div>
              <div className="text-sm font-bold text-white uppercase tracking-tight">
                {health?.checks?.daemon?.running ? 'RUNNING' : 'STOPPED'}
              </div>
              <p className="text-[10px] text-zinc-500">
                Keeper {health?.checks?.daemon?.enabled ? 'enabled' : 'disabled'} · Worker {health?.checks?.worker?.running ? 'running' : 'stopped'} · Jules key {health?.checks?.credentials?.julesConfigured ? 'configured' : 'missing'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Sessions</div>
              <div className="text-lg font-bold text-white">{health?.totals?.sessions ?? 0}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Code</div>
              <div className="text-lg font-bold text-white">{health?.totals?.codeChunks ?? 0}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Memory</div>
              <div className="text-lg font-bold text-white">{health?.totals?.memoryChunks ?? 0}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">WS</div>
              <div className="text-lg font-bold text-white">{health?.realtime?.wsClients ?? 0}</div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            <div className="flex items-center gap-2">
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span>Status: {health?.status ?? 'unknown'}</span>
            </div>
            <span>v{health?.version ?? 'unknown'}</span>
          </div>
        </div>
      </div>

      {/* 3. Borg Collective Signals */}
      <div className="bg-zinc-900 border border-purple-500/20 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 bg-purple-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Collective Signals</span>
          </div>
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[8px] h-4 font-bold uppercase">Webhooks</Badge>
        </div>
        
        <div className="divide-y divide-white/5 max-h-[150px] overflow-y-auto font-mono text-[10px]">
          {borgSignals?.length === 0 ? (
            <div className="p-6 text-center text-zinc-600 uppercase tracking-tighter italic">
              Awaiting signals from the HyperCode meta-orchestrator...
            </div>
          ) : (
            borgSignals?.map(sig => (
              <div key={sig.id} className="p-3 flex items-start gap-3 hover:bg-white/[0.01] transition-colors group">
                <div className="mt-1 p-1 bg-purple-500/10 rounded">
                  <Zap className="h-2.5 w-2.5 text-purple-500" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-purple-300 font-bold uppercase tracking-tighter">{sig.type}</span>
                    <span className="text-[8px] text-zinc-600">{new Date(sig.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-zinc-500 leading-tight">Source: {sig.source}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. RAG Indexing Progress */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Search className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Semantic Knowledge Base</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-tighter">Cross-Session History Enabled</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReindex}
            disabled={isReindexing || stats.processing > 0}
            className="h-8 border-white/10 hover:bg-white/5 text-[9px] font-mono uppercase tracking-widest"
          >
            {isReindexing ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-3 w-3" />
                Sync Code
              </>
            )}
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-purple-500"></div>
              <span>Intelligence Freshness</span>
            </div>
            <span>100%</span>
          </div>
          <Progress value={100} className="h-1 bg-white/5" />
        </div>
      </div>

      {/* 5. Live Intelligence Feed */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cognitive Events</span>
          </div>
          <History className="h-3.5 w-3.5 text-zinc-600" />
        </div>
        
        <div className="divide-y divide-white/5 max-h-[200px] overflow-y-auto font-mono text-[10px]">
          {intelligenceLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 uppercase tracking-tighter">
              No recent cognitive activity detected.
            </div>
          ) : (
            intelligenceLogs.map(log => (
              <div key={log.id} className="p-3 flex items-start gap-3 hover:bg-white/[0.01] transition-colors group">
                <div className={cn(
                  "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                  log.message.toLowerCase().includes('approved') ? "bg-green-500" : 
                  log.message.toLowerCase().includes('risk') ? "bg-purple-500" : 
                  log.message.toLowerCase().includes('memory') ? "bg-blue-500" : "bg-zinc-600"
                )}></div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-300 leading-relaxed">{log.message}</span>
                    <span className="text-[8px] text-zinc-600 group-hover:text-zinc-500">{log.time}</span>
                  </div>
                </div>
                <ChevronRight className="h-3 w-3 text-zinc-800 group-hover:text-zinc-600 mt-0.5" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Borg Integration Hint */}
      <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
        <Zap className="h-4 w-4 text-purple-500 shrink-0" />
        <p className="text-[10px] text-purple-300/80 leading-relaxed font-mono">
          HyperCode Meta-Orchestrator detected. Jules Autopilot is acting as the primary Cloud Session node. RAG context is being shared across all local processes.
        </p>
      </div>
    </div>
  );
}
