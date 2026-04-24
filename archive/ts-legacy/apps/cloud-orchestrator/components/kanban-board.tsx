"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useJules } from "@/lib/jules/provider";
import type { Session } from '@jules/shared';
import { 
  KanbanProvider, 
  KanbanBoard as KanbanBoardRoot, 
  KanbanColumnProps, 
  KanbanHeader, 
  KanbanCards, 
  KanbanCard,
  type KanbanItemProps
} from "@/components/ui/kanban";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { ExternalLink, GitBranch, Clock, RefreshCw, Filter } from "lucide-react";

interface SessionKanbanItem extends KanbanItemProps {
  session: Session;
}

const COLUMNS: KanbanColumnProps[] = [
  { id: "active", name: "Active" },
  { id: "paused", name: "Paused" },
  { id: "completed", name: "Completed" },
  { id: "failed", name: "Failed" },
];

interface KanbanBoardProps {
  onSelectSession: (session: Session) => void;
}

export function KanbanBoard({ onSelectSession }: KanbanBoardProps) {
  const { client } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string>("all");

  const loadSessions = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await client.listSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const availableRepos = useMemo(() => {
    const repos = new Set<string>();
    sessions.forEach(session => {
      if (session.sourceId) repos.add(session.sourceId);
    });
    return Array.from(repos).sort();
  }, [sessions]);

  const repoCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(session => {
      if (session.sourceId) {
        counts[session.sourceId] = (counts[session.sourceId] || 0) + 1;
      }
    });
    return counts;
  }, [sessions]);

  const kanbanData = useMemo(() => {
    const validColumnIds = new Set(COLUMNS.map(col => col.id));
    
    return sessions
      .filter((session) => {
        const isValidColumn = validColumnIds.has(session.status);
        const matchesRepo = selectedRepo === "all" || session.sourceId === selectedRepo;
        return isValidColumn && matchesRepo;
      })
      .map((session) => ({
        id: session.id,
        name: session.title || "Untitled",
        column: session.status,
        session: session,
      })) as SessionKanbanItem[];
  }, [sessions, selectedRepo]);

  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    COLUMNS.forEach(col => {
      counts[col.id] = kanbanData.filter(d => d.column === col.id).length;
    });
    return counts;
  }, [kanbanData]);

  const handleDataChange = async (newData: SessionKanbanItem[]) => {
    const changes: { id: string; newStatus: Session['status'] }[] = [];
    
    newData.forEach(item => {
      const currentSession = sessions.find(s => s.id === item.id);
      if (currentSession && currentSession.status !== item.column) {
        changes.push({ id: item.id, newStatus: item.column as Session['status'] });
      }
    });

    setSessions(prevSessions => {
      const updatedSessions = [...prevSessions];
      newData.forEach(item => {
        const index = updatedSessions.findIndex(s => s.id === item.id);
        if (index !== -1 && updatedSessions[index].status !== item.column) {
          updatedSessions[index] = { ...updatedSessions[index], status: item.column as Session["status"] };
        }
      });
      return updatedSessions;
    });
    
    if (client && changes.length > 0) {
      for (const change of changes) {
        try {
          await client.updateSession(change.id, { status: change.newStatus });
        } catch (err) {
          console.error(`Failed to update session ${change.id}:`, err);
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "paused": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <p className="text-sm text-white/50 animate-pulse font-mono uppercase tracking-widest">
          Loading Control Tower...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Control Tower</h2>
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-white/10 bg-white/5 text-white/40 font-mono">
              {sessions.length} TOTAL
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableRepos.length > 0 && (
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger className="h-8 min-w-[180px] bg-black border-white/10 text-white/80 text-[10px] font-mono uppercase tracking-widest hover:bg-white/5">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-3 w-3 opacity-50" />
                  <SelectValue placeholder="All Repositories" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                <SelectItem value="all" className="text-[10px] font-mono uppercase tracking-wider">
                  All Repositories ({sessions.length})
                </SelectItem>
                {availableRepos.map((repo) => (
                  <SelectItem key={repo} value={repo} className="text-[10px] font-mono uppercase tracking-wider">
                    {repo} ({repoCountsMap[repo] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={loadSessions} className="h-8 text-[10px] font-mono uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 border border-white/10">
            <RefreshCw className="mr-2 h-3 w-3" /> Refresh
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6">
          <KanbanProvider<SessionKanbanItem> columns={COLUMNS} data={kanbanData} onDataChange={handleDataChange} className="h-full">
            {(column) => (
              <KanbanBoardRoot key={column.id} id={column.id} className="bg-zinc-950 border-white/[0.08] rounded-none">
                <KanbanHeader className="border-b border-white/[0.08] flex items-center justify-between px-3 py-2.5 bg-black/40">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(column.id)}`} />
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{column.name}</span>
                  </div>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-white/10 bg-white/5 text-white/40">
                      {columnCounts[column.id] || 0}
                  </Badge>
                </KanbanHeader>
                <KanbanCards<SessionKanbanItem> id={column.id} className="bg-transparent gap-3 p-3">
                  {(item) => (
                    <KanbanCard<SessionKanbanItem> key={item.id} {...item} className="bg-zinc-900 border-white/10 hover:border-white/20 p-0 overflow-hidden group cursor-pointer" onClick={() => onSelectSession(item.session)}>
                      <SessionCardContent session={item.session} onSelect={onSelectSession} statusColorClass={getStatusColor(item.session.status)} />
                    </KanbanCard>
                  )}
                </KanbanCards>
              </KanbanBoardRoot>
            )}
          </KanbanProvider>
      </div>
    </div>
  );
}

function SessionCardContent({ session, onSelect, statusColorClass }: { session: Session; onSelect: (session: Session) => void; statusColorClass: string; }) {
  const formatDateStr = (d?: string) => {
    if (!d) return "Unknown";
    try {
      const date = parseISO(d);
      return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : "Unknown";
    } catch { return "Unknown"; }
  };

  return (
    <div className="p-3.5 space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${statusColorClass}`} />
          <h4 className="text-[11px] font-bold text-white leading-snug line-clamp-2 uppercase tracking-wide">
            {session.title || "Untitled Session"}
          </h4>
        </div>
        {session.sourceId && (
          <div className="flex items-center gap-1.5 text-[9px] text-white/40 font-mono w-fit max-w-full">
            <GitBranch className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate uppercase tracking-tight">{session.sourceId}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-mono uppercase tracking-tighter">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatDateStr(session.lastActivityAt || session.updatedAt)}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] font-mono uppercase tracking-widest text-white/40 group-hover:text-white group-hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all border border-white/5" onClick={(e) => { e.stopPropagation(); onSelect(session); }}>
          View <ExternalLink className="ml-1.5 h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
