'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Clock, Cpu, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAuditEntries, fetchAuditStats, type AuditEntry } from '@/lib/api/notifications';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    success: 'bg-green-500/10 text-green-400 border-green-800/50',
    failure: 'bg-red-500/10 text-red-400 border-red-800/50',
    skipped: 'bg-zinc-500/10 text-zinc-400 border-zinc-800/50',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${variants[status] || 'border-zinc-700'}`}>
      {status}
    </Badge>
  );
}

function ActorBadge({ actor }: { actor: string }) {
  const config: Record<string, { icon: typeof Cpu; color: string }> = {
    daemon: { icon: Cpu, color: 'text-blue-400' },
    scheduler: { icon: Clock, color: 'text-yellow-400' },
    circuit_breaker: { icon: Shield, color: 'text-red-400' },
    operator: { icon: Activity, color: 'text-green-400' },
    system: { icon: Cpu, color: 'text-zinc-400' },
  };
  const c = config[actor] || config.system;
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px]">
      <Icon className={`h-2.5 w-2.5 ${c.color}`} />
      {actor}
    </span>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const time = new Date(entry.createdAt).toLocaleString();
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900/50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <StatusBadge status={entry.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-zinc-200">{entry.action}</span>
          <ActorBadge actor={entry.actor} />
          <span className="text-[10px] text-zinc-500">{time}</span>
        </div>
        <p className="text-xs text-zinc-400 truncate">{entry.summary}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-zinc-700">
            {entry.resourceType}
          </Badge>
          <span className="text-[10px] text-zinc-600 font-mono">{entry.resourceId.slice(0, 12)}</span>
          {entry.provider && (
            <span className="text-[10px] text-zinc-600">{entry.provider}</span>
          )}
          {entry.tokenUsage != null && entry.tokenUsage > 0 && (
            <span className="text-[10px] text-zinc-600">{entry.tokenUsage} tokens</span>
          )}
          {entry.durationMs != null && entry.durationMs > 0 && (
            <span className="text-[10px] text-zinc-600">{entry.durationMs}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-bold text-zinc-200">{value}</span>
    </div>
  );
}

export function AuditTrail() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const pageSize = 25;

  const { data: stats } = useSWR('/api/audit/stats', fetchAuditStats);
  const { data, isLoading } = useSWR(
    `/api/audit?page=${page}&action=${actionFilter}`,
    () => fetchAuditEntries({
      action: actionFilter === 'all' ? undefined : actionFilter,
      limit: pageSize,
      offset: page * pageSize,
    })
  );

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Audit Trail</h2>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-zinc-700">
              Immutable
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="h-7 w-[140px] text-xs bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="session_nudged">Nudges</SelectItem>
                <SelectItem value="session_approved">Approvals</SelectItem>
                <SelectItem value="session_debate_escalated">Debates</SelectItem>
                <SelectItem value="session_recovery_started">Recovery</SelectItem>
                <SelectItem value="codebase_index_completed">Indexing</SelectItem>
                <SelectItem value="issue_session_spawned">Issue Spawns</SelectItem>
                <SelectItem value="circuit_breaker_tripped">Circuit Breakers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <StatsCard label="Total Entries" value={stats.total} icon={Activity} />
            <StatsCard label="Last 24h" value={stats.last24h} icon={Clock} />
            <StatsCard label="Token Usage" value={stats.tokens.toLocaleString()} icon={Cpu} />
            <StatsCard label="Actors" value={Object.keys(stats.byActor || {}).length} icon={Shield} />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-400" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No audit entries found
            </div>
          ) : (
            entries.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="border-t border-zinc-800 p-2 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {total} entries • Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
