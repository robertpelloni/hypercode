'use client';

import { useEffect, useState } from 'react';
import { Activity, Cpu, Database, HeartPulse, RefreshCw, Wifi, Clock, Play, Loader2, AlertTriangle, DollarSign, Zap, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchHealth, fetchMetricsText, fetchScheduledTasks, triggerScheduledTask, type HealthResponse, type ScheduledTask } from '@/lib/api/health';
import { fetchActiveAnomalies, resolveAnomaly, fetchTokenUsageStats, fetchShadowPilotStatus, startShadowPilot, stopShadowPilot, fetchDependencyReport, type AnomalyRecord, type TokenUsageReport, type DependencyReport } from '@/lib/api/observability';
import { toast } from 'sonner';

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [metricsText, setMetricsText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [tokenReport, setTokenReport] = useState<TokenUsageReport | null>(null);
  const [resolvingAnomaly, setResolvingAnomaly] = useState<string | null>(null);
  const [shadowPilot, setShadowPilot] = useState<Record<string, unknown> | null>(null);
  const [togglingPilot, setTogglingPilot] = useState(false);
  const [depReport, setDepReport] = useState<DependencyReport | null>(null);

  const load = async (showToast = false) => {
    try {
      setIsRefreshing(true);
      const [healthData, taskData, metrics, anomalyData, tokenData] = await Promise.allSettled([
        fetchHealth(), 
        fetchScheduledTasks().catch(() => []), 
        fetchMetricsText(),
        fetchActiveAnomalies(),
        fetchTokenUsageStats(),
      ]);

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      }
      if (taskData.status === 'fulfilled') {
        setTasks(taskData.value);
      }
      if (metrics.status === 'fulfilled') {
        setMetricsText(metrics.value);
      }
      if (anomalyData.status === 'fulfilled') {
        setAnomalies(anomalyData.value.anomalies || []);
      }
      if (tokenData.status === 'fulfilled') {
        setTokenReport(tokenData.value);
      }
      const pilotData = await fetchShadowPilotStatus().catch(() => ({ running: false }));
      setShadowPilot(pilotData);
      const depData = await fetchDependencyReport().catch(() => null);
      if (depData) setDepReport(depData);

      if (showToast) {
        toast.success('Health dashboard refreshed');
      }
    } catch (error) {
      console.error(error);
      if (showToast) {
        toast.error('Failed to refresh health dashboard');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTriggerTask = async (name: string) => {
    try {
      setTriggeringTask(name);
      await triggerScheduledTask(name);
      toast.success(`Task ${name} triggered manually`);
      void load();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to trigger task ${name}`);
    } finally {
      setTriggeringTask(null);
    }
  };

  useEffect(() => {    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const databaseHealthy = health?.checks?.database?.status === 'ok';
  const daemonRunning = !!health?.checks?.daemon?.running;
  const workerRunning = !!health?.checks?.worker?.running;
  const keeperEnabled = !!health?.checks?.daemon?.enabled;
  const julesConfigured = !!health?.checks?.credentials?.julesConfigured;

  return (
    <div className="h-full overflow-y-auto bg-black text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-emerald-400" />
              <h1 className="text-lg font-bold uppercase tracking-widest">System Health</h1>
            </div>
            <p className="mt-2 text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Runtime observability sourced from the Go backend health and metrics endpoints.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={isRefreshing}
            className="border-white/10 hover:bg-white/5 text-[10px] font-mono uppercase tracking-widest"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Database className="h-3.5 w-3.5" /> Database
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{databaseHealthy ? 'Healthy' : 'Degraded'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">{health?.checks?.database?.error || 'SQLite connectivity is healthy.'}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Cpu className="h-3.5 w-3.5" /> Daemon
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{daemonRunning ? 'Running' : 'Stopped'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Keeper {keeperEnabled ? 'enabled' : 'disabled'}.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Activity className="h-3.5 w-3.5" /> Worker
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{workerRunning ? 'Running' : 'Stopped'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Queue job execution loop state.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Wifi className="h-3.5 w-3.5" /> Credentials
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{julesConfigured ? 'Ready' : 'Missing'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Jules API configuration availability.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Activity className="h-3.5 w-3.5" /> Runtime
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{health?.status || 'unknown'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Version {health?.version || 'unknown'}.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Backend Totals</h2>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase">Live</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                ['Sessions', health?.totals?.sessions ?? 0],
                ['Code Chunks', health?.totals?.codeChunks ?? 0],
                ['Memory Chunks', health?.totals?.memoryChunks ?? 0],
                ['Templates', health?.totals?.templates ?? 0],
                ['Debates', health?.totals?.debates ?? 0],
                ['WS Clients', health?.realtime?.wsClients ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
                  <div className="mt-2 text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Queue State</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-white/5 bg-black/20 p-3 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pending</span>
                <span className="text-xl font-bold">{health?.queue?.pending ?? 0}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Processing</span>
                <span className="text-xl font-bold">{health?.queue?.processing ?? 0}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Timestamp</div>
                <div className="mt-2 text-[11px] text-zinc-300 break-all">{health?.timestamp || 'unknown'}</div>
              </div>
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-white">Scheduled Automation Engine</h2>
              </div>
              <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] uppercase">Active</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasks.map(task => (
                <div key={task.name} className="rounded-lg border border-white/5 bg-black/20 p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-white mb-2">{task.name}</div>
                    <div className="text-[9px] font-mono text-zinc-500 mb-1">
                      Interval: {task.intervalMs / 1000 / 60} minutes
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 mb-1">
                      Next run: {new Date(task.nextRun).toLocaleTimeString()}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">
                      Last run: {task.lastRun ? new Date(task.lastRun).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full border-white/10 hover:bg-white/5 text-[9px] uppercase tracking-widest h-7"
                    disabled={triggeringTask === task.name}
                    onClick={() => void handleTriggerTask(task.name)}
                  >
                    {triggeringTask === task.name ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                    Run Now
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-red-400">Active Anomalies</h2>
              </div>
              <Badge variant="destructive" className="text-[9px] uppercase">{anomalies.length} Detected</Badge>
            </div>
            <div className="space-y-2">
              {anomalies.map(anomaly => (
                <div key={anomaly.id} className="rounded-lg border border-white/5 bg-black/20 p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">{anomaly.title}</span>
                      <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'outline'} className={`text-[9px] px-1.5 py-0 h-4 ${anomaly.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : anomaly.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'border-zinc-700'}`}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-zinc-400">{anomaly.description}</p>
                    <span className="text-[9px] text-zinc-600 mt-1 block">{new Date(anomaly.createdAt).toLocaleString()}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[9px] border-green-800/50 text-green-400 hover:bg-green-500/10"
                    disabled={resolvingAnomaly === anomaly.id}
                    onClick={() => {
                      setResolvingAnomaly(anomaly.id);
                      resolveAnomaly(anomaly.id).then(() => load()).finally(() => setResolvingAnomaly(null));
                    }}
                  >
                    {resolvingAnomaly === anomaly.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tokenReport && tokenReport.totalRequests > 0 && (
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-white">Token Budget Tracker</h2>
              </div>
              <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] uppercase">
                ${((tokenReport.totalCostCents || 0) / 100).toFixed(2)} total
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Requests</div>
                <div className="mt-2 text-xl font-bold">{tokenReport.totalRequests}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Tokens</div>
                <div className="mt-2 text-xl font-bold">{(tokenReport.totalTokens || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Prompt / Completion</div>
                <div className="mt-2 text-sm font-bold">{(tokenReport.totalPromptTokens || 0).toLocaleString()} / {(tokenReport.totalCompletionTokens || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  {tokenReport.failedRequests > 0 ? <XCircle className="h-2.5 w-2.5 text-red-400" /> : <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />}
                  Failed
                </div>
                <div className="mt-2 text-xl font-bold">{tokenReport.failedRequests || 0}</div>
              </div>
            </div>
            {Object.keys(tokenReport.byProvider || {}).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(tokenReport.byProvider).map(([provider, stats]) => (
                  <div key={provider} className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-white capitalize">{provider}</span>
                      <span className="text-[9px] text-zinc-500">${((stats.costCents || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-zinc-500" />
                      <span className="text-[10px] text-zinc-400">{(stats.totalTokens || 0).toLocaleString()} tokens</span>
                    </div>
                    <div className="text-[9px] text-zinc-600 mt-1">{stats.requests} requests</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {shadowPilot && (
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {shadowPilot.running ? (
                  <Eye className="h-4 w-4 text-blue-400" />
                ) : (
                  <EyeOff className="h-4 w-4 text-zinc-500" />
                )}
                <h2 className="text-xs font-bold uppercase tracking-widest text-white">Shadow Pilot</h2>
                <Badge variant="outline" className={`text-[9px] uppercase ${shadowPilot.running ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-zinc-700 text-zinc-500'}`}>
                  v1.5
                </Badge>
              </div>
              <Button
                variant={shadowPilot.running ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-[9px] uppercase tracking-widest"
                disabled={togglingPilot}
                onClick={() => {
                  setTogglingPilot(true);
                  (shadowPilot.running ? stopShadowPilot() : startShadowPilot())
                    .then(() => fetchShadowPilotStatus())
                    .then((data) => setShadowPilot(data))
                    .finally(() => setTogglingPilot(false));
                }}
              >
                {togglingPilot ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : shadowPilot.running ? <EyeOff className="h-3 w-3 mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                {shadowPilot.running ? 'Disable' : 'Enable'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Monitored Repos</div>
                <div className="mt-2 text-xl font-bold">{String(shadowPilot.repoCount ?? 0)}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Diff Events</div>
                <div className="mt-2 text-xl font-bold">{String(shadowPilot.diffEvents ?? 0)}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Check Interval</div>
                <div className="mt-2 text-xl font-bold">{String(shadowPilot.interval ?? '5m0s')}</div>
              </div>
            </div>
            {Boolean(shadowPilot.running) && (
              <p className="mt-3 text-[10px] text-zinc-500">
                Shadow Pilot is actively monitoring repository changes and detecting potential regressions.
              </p>
            )}
          </div>
        )}

        {depReport && (
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HeartPulse className={`h-4 w-4 ${depReport.overall === 'ok' ? 'text-green-400' : depReport.overall === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`} />
                <h2 className="text-xs font-bold uppercase tracking-widest text-white">Dependency Checks</h2>
                <Badge variant="outline" className={`text-[9px] uppercase ${depReport.overall === 'ok' ? 'bg-green-500/10 text-green-400 border-green-500/20' : depReport.overall === 'degraded' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {depReport.overall}
                </Badge>
              </div>
              <div className="text-[9px] text-zinc-500 font-mono">
                {new Date(depReport.checkedAt).toLocaleTimeString()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {depReport.checks.map((check) => (
                <div key={check.name} className={`rounded-lg border p-3 ${check.status === 'ok' ? 'border-green-500/10 bg-green-500/5' : check.status === 'degraded' ? 'border-yellow-500/10 bg-yellow-500/5' : check.status === 'down' ? 'border-red-500/10 bg-red-500/5' : 'border-white/5 bg-black/20'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{check.name}</span>
                    <span className={`text-[9px] font-bold uppercase ${check.status === 'ok' ? 'text-green-400' : check.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>{check.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500 truncate">{check.message}</p>
                  {check.latencyMs > 0 && (
                    <p className="mt-0.5 text-[9px] text-zinc-600">{check.latencyMs}ms</p>
                  )}
                </div>
              ))}
            </div>
            {depReport.systemInfo && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[9px]">
                <div className="text-zinc-500">Go: <span className="text-zinc-300">{depReport.systemInfo.goVersion?.slice(0, 12)}</span></div>
                <div className="text-zinc-500">CPU: <span className="text-zinc-300">{depReport.systemInfo.numCPU}</span></div>
                <div className="text-zinc-500">Heap: <span className="text-zinc-300">{depReport.systemInfo.heapAllocMB}MB</span></div>
                <div className="text-zinc-500">Goroutines: <span className="text-zinc-300">{depReport.systemInfo.numGoroutine}</span></div>
                <div className="text-zinc-500">Stack: <span className="text-zinc-300">{depReport.systemInfo.stackInUseMB}MB</span></div>
                <div className="text-zinc-500">Uptime: <span className="text-zinc-300">{Math.floor(depReport.systemInfo.uptimeSeconds / 60)}m</span></div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Prometheus Metrics Preview</h2>
            <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] uppercase">Raw</Badge>
          </div>
          <pre className="mt-4 max-h-[320px] overflow-auto rounded-lg border border-white/5 bg-black/30 p-4 text-[11px] leading-relaxed text-zinc-300">
            {metricsText || 'Metrics not yet available from the current frontend origin. They remain available directly from the Go runtime when served there.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
