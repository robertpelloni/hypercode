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
  Plus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { trpc } from '@/utils/trpc';
import { RotationRoomsPanel } from './rotation-rooms-panel';

// Sub-components (to be implemented)
// import { SessionGrid } from './components/SessionGrid';
// import { DebateHistory } from './components/DebateHistory';
// import { SupervisorConfig } from './components/SupervisorConfig';
// import { QuotaManager } from './components/QuotaManager';
// import { VisualArchitecture } from './components/VisualArchitecture';
// import { SmartPilotPanel } from './components/SmartPilotPanel';

export function RoundtableView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Global Status Queries
  const councilStatus = trpc.council.base.status.useQuery(undefined, {
    refetchInterval: 10000
  });
  
  const sessionStats = trpc.council.sessions.stats.useQuery(undefined, {
    refetchInterval: 5000
  });
  const councilStatusUnavailable = councilStatus.isError || (councilStatus.data !== undefined && (!councilStatus.data || typeof councilStatus.data !== 'object' || Array.isArray(councilStatus.data)));
  const sessionStatsUnavailable = sessionStats.isError || (sessionStats.data !== undefined && (!sessionStats.data || typeof sessionStats.data !== 'object' || Array.isArray(sessionStats.data)));
  const hierarchy = !councilStatusUnavailable && Array.isArray(councilStatus.data?.hierarchy) ? councilStatus.data.hierarchy : [];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <header className="flex justify-between items-center border-b pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-purple-900/20 rounded-lg flex items-center justify-center border border-purple-500/30">
            <Gavel className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                HyperCode Roundtable
              </h1>
              <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                {councilStatusUnavailable ? 'Unavailable' : councilStatus.data?.enabled ? 'Online' : 'Standby'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Multi-Model Cognitive Orchestration & Verifiable Supervision
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Evidence Lock: {councilStatusUnavailable ? '—' : councilStatus.data?.availableCount ?? 0}
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 gap-2"
            onClick={() => document.getElementById('rotation-room-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </header>

      {councilStatusUnavailable || sessionStatsUnavailable ? (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {councilStatusUnavailable ? (councilStatus.error?.message ?? 'Council status is unavailable.') : null}
          {councilStatusUnavailable && sessionStatsUnavailable ? ' ' : null}
          {sessionStatsUnavailable ? (sessionStats.error?.message ?? 'Session stats are unavailable.') : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Active Sessions</p>
                <h3 className="text-2xl font-bold">{sessionStatsUnavailable ? '—' : sessionStats.data?.active ?? 0}</h3>
              </div>
              <Terminal className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Supervisors</p>
                <h3 className="text-2xl font-bold">{councilStatusUnavailable ? '—' : councilStatus.data?.supervisorCount ?? 0}</h3>
              </div>
              <Users className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Debates</p>
                <h3 className="text-2xl font-bold">--</h3>
              </div>
              <Activity className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Consensus Mode</p>
                <h3 className="text-lg font-bold truncate capitalize">
                  {councilStatusUnavailable ? 'Unavailable' : councilStatus.data?.config.consensusMode?.replace('-', ' ') ?? 'Weighted'}
                </h3>
              </div>
              <Layers className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-background/20 border mb-4 w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard" className="gap-2"><Zap className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="supervisors" className="gap-2"><Users className="h-4 w-4" /> Supervisors</TabsTrigger>
          <TabsTrigger value="smart-pilot" className="gap-2"><Play className="h-4 w-4" /> Smart Pilot</TabsTrigger>
          <TabsTrigger value="usage" className="gap-2"><BarChart3 className="h-4 w-4" /> Usage</TabsTrigger>
          <TabsTrigger value="visual" className="gap-2"><Eye className="h-4 w-4" /> Architecture</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Rotation rooms</CardTitle>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                    Experimental
                  </Badge>
                </CardHeader>
                <CardContent>
                  <RotationRoomsPanel />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Global Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] bg-black/50 rounded-lg font-mono text-xs p-4 overflow-y-auto">
                    <div className="text-blue-400">[INFO] HyperCode Roundtable initialized</div>
                    <div className="text-purple-400">[COUNCIL] Verifying evidence locks...</div>
                    <div className="text-green-400">[SYSTEM] All kernels healthy</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Bulk Operations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary">Start Fleet</Button>
                    <Button size="sm" variant="destructive">Stop All</Button>
                  </div>
                  <Button size="sm" className="w-full bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30">
                    Resume Suspended
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Specialized Councils</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {councilStatusUnavailable ? (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-300">
                      {councilStatus.error?.message ?? 'Specialized council hierarchy is unavailable.'}
                    </div>
                  ) : hierarchy.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-md bg-accent/30 border border-border/50">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{c.supervisorCount} Units</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Debate Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
                History Table Placeholder
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ... other tab contents ... */}
      </Tabs>
    </div>
  );
}
