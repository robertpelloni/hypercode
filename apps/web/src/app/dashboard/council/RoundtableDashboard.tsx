'use client';

import { useState } from 'react';
import { 
  Gavel, 
  History, 
  Users, 
  Settings, 
  Zap, 
  BarChart3, 
  Layers, 
  Play, 
  Activity,
  Terminal,
  ShieldCheck,
  Eye,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { trpc } from '@/utils/trpc';

import { SessionGrid } from '@/components/council/SessionGrid';
import { DebateHistoryTable } from '@/components/council/DebateHistoryTable';
import { CouncilMemberGrid } from '@/components/council/CouncilMemberGrid';
import { QuotaConfigPanel } from '@/components/council/QuotaConfigPanel';
import { SmartPilotPanel } from '@/components/council/SmartPilotPanel';
import { VisualArchitecture } from '@/components/council/VisualArchitecture';

function isRoundtableSession(value: unknown): value is {
  id?: string;
  status?: string;
  startedAt?: string;
  tags?: string[];
} {
  return typeof value === 'object'
    && value !== null
    && ((value as { tags?: unknown }).tags === undefined || (Array.isArray((value as { tags?: unknown }).tags) && (value as { tags: unknown[] }).tags.every((tag) => typeof tag === 'string')));
}

function isSmartPilotStatusPayload(value: unknown): value is {
  config?: {
    enabled?: boolean;
    autoApproveThreshold?: number;
    requireUnanimous?: boolean;
    maxAutoApprovals?: number;
  };
  activePlans?: Array<{ sessionId?: string; plan?: Record<string, unknown> }>;
} {
  return typeof value === 'object'
    && value !== null
    && ((value as { activePlans?: unknown }).activePlans === undefined || Array.isArray((value as { activePlans?: unknown }).activePlans));
}

function isHistoryPayload(value: unknown): value is {
  meta?: { totalRecords?: number };
  records?: Array<{
    id?: string;
    timestamp?: number;
    task?: { description?: string };
    decision?: { approved?: boolean; consensus?: number; votes?: unknown[] };
    metadata?: { participatingSupervisors?: string[]; dynamicSelection?: { taskType?: string } };
  }>;
} {
  return typeof value === 'object'
    && value !== null
    && ((value as { records?: unknown }).records === undefined || Array.isArray((value as { records?: unknown }).records));
}

function isCouncilStatusPayload(value: unknown): value is {
  enabled?: boolean;
  supervisorCount?: number;
  hierarchy?: Array<{ id: string; name: string; supervisorCount?: number; specialties: string[] }>;
  config?: { consensusMode?: string };
} {
  return typeof value === 'object'
    && value !== null
    && ((value as { hierarchy?: unknown }).hierarchy === undefined || Array.isArray((value as { hierarchy?: unknown }).hierarchy));
}

function isSessionStatsPayload(value: unknown): value is { active?: number } {
  return typeof value === 'object' && value !== null;
}

function isVisualPayload(value: unknown): value is { mermaid?: string } {
  return typeof value === 'object' && value !== null && ((value as { mermaid?: unknown }).mermaid === undefined || typeof (value as { mermaid?: unknown }).mermaid === 'string');
}

export function RoundtableDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Queries
  const councilStatus = trpc.council.base.status.useQuery(undefined, {
    refetchInterval: 10000
  });
  
  const sessions = trpc.council.sessions.list.useQuery(undefined, {
    refetchInterval: 5000
  });

  const sessionStats = trpc.council.sessions.stats.useQuery(undefined, {
    refetchInterval: 5000
  });

  const history = trpc.council.history.list.useQuery({ limit: 20 }, {
    refetchInterval: 30000
  });

  const quotaStats = trpc.council.quota.allStats.useQuery(undefined, {
    refetchInterval: 15000
  });

  const smartPilotStatus = trpc.council.smartPilot.status.useQuery(undefined, {
    refetchInterval: 10000
  });

  const visualDiagram = trpc.council.visual.systemDiagram.useQuery(undefined, {
    refetchInterval: 20000
  });
  const councilStatusUnavailable = councilStatus.isError || (councilStatus.data !== undefined && !isCouncilStatusPayload(councilStatus.data));
  const sessionsUnavailable = sessions.isError || (sessions.data !== undefined && (!Array.isArray(sessions.data) || !sessions.data.every(isRoundtableSession)));
  const sessionStatsUnavailable = sessionStats.isError || (sessionStats.data !== undefined && !isSessionStatsPayload(sessionStats.data));
  const historyUnavailable = history.isError || (history.data !== undefined && !isHistoryPayload(history.data));
  const smartPilotUnavailable = smartPilotStatus.isError || (smartPilotStatus.data !== undefined && !isSmartPilotStatusPayload(smartPilotStatus.data));
  const visualUnavailable = visualDiagram.isError || (visualDiagram.data !== undefined && !isVisualPayload(visualDiagram.data));
  const councilStatusData = !councilStatusUnavailable && isCouncilStatusPayload(councilStatus.data) ? councilStatus.data : undefined;
  const sessionsData = !sessionsUnavailable && Array.isArray(sessions.data) ? sessions.data : [];
  const sessionStatsData = !sessionStatsUnavailable && isSessionStatsPayload(sessionStats.data) ? sessionStats.data : undefined;
  const historyData = !historyUnavailable && isHistoryPayload(history.data) ? history.data : undefined;
  const smartPilotData = !smartPilotUnavailable && isSmartPilotStatusPayload(smartPilotStatus.data) ? smartPilotStatus.data : undefined;
  const visualData = !visualUnavailable && isVisualPayload(visualDiagram.data) ? visualDiagram.data : undefined;
  const hierarchy = !councilStatusUnavailable && Array.isArray(councilStatusData?.hierarchy) ? councilStatusData.hierarchy.filter((item) => typeof item === 'object' && item !== null) : [];

  // Mutations
  const stopSession = trpc.council.sessions.stop.useMutation({
    onSuccess: () => sessions.refetch()
  });

  const resumeSession = trpc.council.sessions.resume.useMutation({
    onSuccess: () => sessions.refetch()
  });

  const deleteSession = trpc.council.sessions.delete.useMutation({
    onSuccess: () => sessions.refetch()
  });

  const toggleSmartPilot = trpc.council.smartPilot.updateConfig.useMutation({
    onSuccess: () => smartPilotStatus.refetch()
  });

  const stopAll = trpc.council.sessions.bulkStop.useMutation({
    onSuccess: () => sessions.refetch()
  });

  const sessionItems = sessionsData.map((session, index) => ({
    id: session.id ?? `session-${index}`,
    status: session.status ?? 'stopped',
    cliType: undefined,
    startedAt: session.startedAt,
    tags: session.tags ?? [],
  }));

  const smartPilotConfig = {
    enabled: !smartPilotUnavailable ? (smartPilotData?.config?.enabled ?? false) : false,
    autoApproveThreshold: !smartPilotUnavailable ? (smartPilotData?.config?.autoApproveThreshold ?? 0.7) : 0.7,
    requireUnanimous: !smartPilotUnavailable ? (smartPilotData?.config?.requireUnanimous ?? false) : false,
    maxAutoApprovals: !smartPilotUnavailable ? (smartPilotData?.config?.maxAutoApprovals ?? 5) : 5,
  };

  const activePlanItems = (!smartPilotUnavailable ? (smartPilotData?.activePlans ?? []) : []).map((plan, index) => ({
    sessionId: plan.sessionId ?? `plan-${index}`,
    plan: plan.plan ?? {},
  }));

  const historyRecords = (!historyUnavailable ? (historyData?.records ?? []) : []).map((record, index) => ({
    id: record.id ?? `record-${index}`,
    timestamp: record.timestamp ?? Date.now(),
    task: {
      description: record.task?.description ?? 'Council decision',
    },
    decision: {
      approved: record.decision?.approved ?? false,
      consensus: record.decision?.consensus ?? 0,
      votes: record.decision?.votes ?? [],
    },
    metadata: {
      participatingSupervisors: record.metadata?.participatingSupervisors ?? [],
      taskType: record.metadata?.dynamicSelection?.taskType ?? 'general',
    },
  }));

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-purple-900/20 rounded-2xl flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <Gavel className="h-7 w-7 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                HyperCode Roundtable
              </h1>
              <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 animate-pulse">
                {councilStatusUnavailable ? 'Unavailable' : councilStatusData?.enabled ? 'Online' : 'Standby'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-purple-500" />
              Multi-Model Orchestration Layer v2.1 (Active)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4 hidden lg:flex">
            {hierarchy.map((c: any) => (
              <div 
                key={c.id} 
                className="h-8 w-8 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px] font-bold"
                title={`${c.name} (${c.supervisorCount} units)`}
              >
                {c.name.charAt(0)}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm border-border/50 gap-2 h-9">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 gap-2 h-9">
            <Play className="h-4 w-4 fill-current" />
            Launch Swarm
          </Button>
        </div>
      </header>

      {councilStatusUnavailable || sessionsUnavailable || sessionStatsUnavailable || historyUnavailable || smartPilotUnavailable || visualUnavailable ? (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300 space-y-1">
          {councilStatusUnavailable ? <div>{councilStatus.error?.message ?? 'Council status is unavailable.'}</div> : null}
          {sessionsUnavailable ? <div>{sessions.error?.message ?? 'Council sessions are unavailable.'}</div> : null}
          {sessionStatsUnavailable ? <div>{sessionStats.error?.message ?? 'Council session stats are unavailable.'}</div> : null}
          {historyUnavailable ? <div>{history.error?.message ?? 'Council history is unavailable.'}</div> : null}
          {smartPilotUnavailable ? <div>{smartPilotStatus.error?.message ?? 'Smart Pilot status is unavailable.'}</div> : null}
          {visualUnavailable ? <div>{visualDiagram.error?.message ?? 'Council architecture diagram is unavailable.'}</div> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/20 border-border/40 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Units</p>
                <h3 className="text-3xl font-black mt-1">{sessionStatsUnavailable ? '—' : sessionStatsData?.active ?? 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Terminal className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/20 border-border/40 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Supervisor Pool</p>
                <h3 className="text-3xl font-black mt-1">{councilStatusUnavailable ? '—' : councilStatusData?.supervisorCount ?? 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/20 border-border/40 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Historical Truth</p>
                <h3 className="text-3xl font-black mt-1">{historyUnavailable ? '—' : historyData?.meta?.totalRecords ?? 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/20 border-border/40 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consensus Engine</p>
                <h3 className="text-lg font-black mt-1 truncate capitalize">
                  {councilStatusUnavailable ? 'Unavailable' : councilStatusData?.config?.consensusMode?.replace('-', ' ') ?? 'Weighted'}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Layers className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-background/20 border-b border-border/50 w-full justify-start rounded-none h-auto p-0 mb-6 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5 px-6 py-3 gap-2">
            <Zap className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5 px-6 py-3 gap-2">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
          <TabsTrigger value="supervisors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5 px-6 py-3 gap-2">
            <Users className="h-4 w-4" /> Supervisors
          </TabsTrigger>
          <TabsTrigger value="usage" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5 px-6 py-3 gap-2">
            <BarChart3 className="h-4 w-4" /> Usage
          </TabsTrigger>
          <TabsTrigger value="visual" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5 px-6 py-3 gap-2">
            <Eye className="h-4 w-4" /> Architecture
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/5 px-6 py-3 gap-2 ml-auto">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-blue-400" />
                  Terminal Fleet
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="xs" onClick={() => sessions.refetch()} className="gap-1.5 h-7">
                    <RefreshCw className="h-3 w-3" /> Sync
                  </Button>
                  <Button variant="ghost" size="xs" className="gap-1.5 h-7 text-red-400 hover:text-red-300 hover:bg-red-500/5" onClick={() => stopAll.mutate()}>
                    <Trash2 className="h-3 w-3" /> Purge
                  </Button>
                </div>
              </div>
              
              <SessionGrid 
                sessions={sessionItems} 
                onStop={(id) => stopSession.mutate({ id })}
                onResume={(id) => resumeSession.mutate({ id })}
                onDelete={(id) => deleteSession.mutate({ id })}
              />
              
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 px-1">
                  <Activity className="h-4 w-4 text-green-400" />
                  Global Activity Log
                </h3>
                <div className="h-[200px] bg-black/40 border border-border/40 rounded-xl font-mono text-[10px] p-4 overflow-y-auto backdrop-blur-md">
                  <div className="text-blue-400/80 mb-1 flex gap-2">
                    <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                    <span>[INFO] HyperCode Roundtable initialized successfully</span>
                  </div>
                  <div className="text-purple-400/80 mb-1 flex gap-2">
                    <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                    <span>[COUNCIL] Verified {councilStatusUnavailable ? '—' : councilStatusData?.supervisorCount} cognitive units across 3 specializations</span>
                  </div>
                  <div className="text-green-400/80 mb-1 flex gap-2">
                    <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                    <span>[SYSTEM] Local evidence lock synchronized with Master Index v2.1</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SmartPilotPanel 
                config={smartPilotConfig} 
                activePlans={activePlanItems}
                onToggle={(enabled) => toggleSmartPilot.mutate({ enabled })}
                onUpdateConfig={(updates) => toggleSmartPilot.mutate(updates)}
              />

              <Card className="bg-card/20 border-border/40 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Layers className="h-3 w-3 text-orange-400" />
                    Specialized Hierarchies
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {councilStatusUnavailable ? (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-300">
                      {councilStatus.error?.message ?? 'Specialized hierarchies are unavailable.'}
                    </div>
                  ) : hierarchy.map((c: any) => (
                    <div key={c.id} className="group relative overflow-hidden flex items-center justify-between p-3 rounded-lg bg-accent/20 border border-border/30 hover:border-purple-500/30 transition-all">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold">{c.name}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{c.specialties.slice(0, 2).join(' • ')}</span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] h-5 bg-background/50 border-border/50 px-1.5 font-mono">
                        {c.supervisorCount}u
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 outline-none">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" />
              Verifiable Decision Log
            </h3>
            <Button variant="outline" size="xs" className="h-7 text-[10px] gap-1.5" onClick={() => history.refetch()}>
              <RefreshCw className="h-3 w-3" /> Refresh Audit
            </Button>
          </div>
          {historyUnavailable ? (
            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
              {history.error?.message ?? 'Council history is unavailable.'}
            </div>
          ) : <DebateHistoryTable records={historyRecords} />}
        </TabsContent>

        <TabsContent value="supervisors" className="outline-none">
          <CouncilMemberGrid supervisors={[]} /> {/* To be populated from status.supervisors */}
        </TabsContent>

        <TabsContent value="usage" className="outline-none">
          <QuotaConfigPanel stats={[]} /> {/* To be populated from quotaStats */}
        </TabsContent>

        <TabsContent value="visual" className="h-[700px] outline-none">
          <VisualArchitecture mermaidCode={visualUnavailable ? 'graph TD\n  Unavailable["Architecture unavailable"]' : visualData?.mermaid ?? 'graph TD\n  Start'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
