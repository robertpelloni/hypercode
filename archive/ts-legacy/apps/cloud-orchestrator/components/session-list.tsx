"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useJules } from "@/lib/jules/provider";
import { useDaemonEvent } from "@/lib/hooks/use-daemon-events";
import type { SessionsListUpdatedPayload } from "@jules/shared";
import type { Session } from '@jules/shared';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Sparkles, RefreshCw, History } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, parseISO, isValid, isToday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SessionReplayDialog } from "./session-replay-dialog";

interface SessionListProps {
  onSelectSession?: (sessionId: string | Session) => void;
  selectedSessionId?: string | null;
  className?: string;
}

export function SessionList({
  onSelectSession,
  selectedSessionId,
  className,
}: SessionListProps) {
  const { client, refreshTrigger } = useJules();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Unknown date";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown date";
    }
  };

  const loadSessions = useCallback(async () => {
    console.log(`[SessionList] loadSessions called (Client ready: ${!!client})`);
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("[SessionList] Fetching sessions from API...");
      const data = await client.listSessions();
      console.log(`[SessionList] Received ${data.length} sessions:`, JSON.stringify(data));
      
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      
      setSessions(sorted);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
      setSessions([]); 
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]);

  useDaemonEvent<SessionsListUpdatedPayload>(
    'sessions_list_updated',
    () => {
      loadSessions();
    },
    [loadSessions]
  );

  useDaemonEvent<{ sessionId?: string }>(
    'session_updated',
    () => {
      loadSessions();
    },
    [loadSessions]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "paused": return "bg-yellow-500";
      case "awaiting_approval": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "completed": return "Done";
      case "failed": return "Failed";
      case "paused": return "Paused";
      case "awaiting_approval": return "Pending";
      default: return status;
    }
  };

  const getDaysOld = (dateString: string) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      return differenceInDays(new Date(), date);
    } catch {
      return null;
    }
  };

  const getRepoShortName = (sourceId: string) => {
    const parts = sourceId.split("/");
    return parts[parts.length - 1] || sourceId;
  };

  const visibleSessions = useMemo(() => {
    console.log(`[SessionList] Computing visibleSessions. Total sessions: ${sessions.length}`);
    const filtered = sessions.filter((session) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const title = (session.title || "").toLowerCase();
      const repo = (session.sourceId || "").toLowerCase();
      return title.includes(query) || repo.includes(query);
    });
    console.log(`[SessionList] visibleSessions count: ${filtered.length}`);
    return filtered;
  }, [sessions, searchQuery]);

  if (loading && sessions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 gap-3", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest text-center">
          Synchronizing Sessions...
        </p>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}>
        <p className="text-xs text-destructive text-center">{error}</p>
        <Button variant="outline" size="sm" onClick={loadSessions} className="h-7 text-[10px] font-mono uppercase tracking-widest">
          Retry
        </Button>
      </div>
    );
  }

  const sessionLimit = 100;
  const dailySessionCount = sessions.filter((session) => {
    if (!session.createdAt) return false;
    try {
      return isToday(parseISO(session.createdAt));
    } catch {
      return false;
    }
  }).length;
  const percentage = Math.min((dailySessionCount / sessionLimit) * 100, 100);

  return (
    <TooltipProvider>
      <div className={cn("h-full flex flex-col bg-zinc-950 overflow-hidden border-r border-white/[0.08]", className)}>
        <SessionReplayDialog 
          sessionId={replaySessionId} 
          open={!!replaySessionId} 
          onOpenChange={(open) => !open && setReplaySessionId(null)} 
        />
        
        <div className="px-3 py-2 border-b border-white/[0.08] shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-1">
             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Navigation</span>
             <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={loadSessions} className="h-5 w-5 text-white/20 hover:text-white hover:bg-white/5">
                    <RefreshCw className="h-3 w-3" />
                </Button>
             </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter sessions..."
              aria-label="Filter sessions"
              className="h-7 w-full bg-black/50 pl-7 text-[10px] border-white/10 focus-visible:ring-purple-500/50 placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {visibleSessions.map((session) => {
              const daysOld = getDaysOld(session.createdAt);
              const displayDate = session.lastActivityAt || session.updatedAt || session.createdAt;
              
              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "w-full group flex flex-col gap-1.5 px-3 py-2.5 text-left rounded-md transition-all cursor-pointer outline-none border border-transparent",
                    selectedSessionId === session.id 
                      ? "bg-white/5 border-white/10" 
                      : "hover:bg-white/[0.02] hover:border-white/5"
                  )}
                  onClick={() => onSelectSession?.(session)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusColor(session.status))} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-bold leading-tight text-white uppercase tracking-wide truncate block">
                              {session.title || "Untitled"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-zinc-900 border-white/10 text-white text-[10px]">
                            {session.title || "Untitled"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 text-white/20 hover:text-purple-400 hover:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplaySessionId(session.id);
                        }}
                      >
                        <History className="h-2.5 w-2.5" />
                      </Button>
                      <Badge className="shrink-0 text-[8px] px-1 py-0 h-3.5 font-mono border-0 rounded-sm bg-white/5 text-white/50 group-hover:bg-white/10">
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[9px] text-white/30 font-mono tracking-tight truncate">
                      <span>{formatDate(displayDate)}</span>
                      {daysOld !== null && daysOld > 0 && <span>({daysOld}d)</span>}
                    </div>
                    {session.sourceId && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-purple-400/80 uppercase font-bold tracking-tighter truncate max-w-[100px] border border-white/5">
                        <Sparkles className="h-2 w-2" />
                        <span>{getRepoShortName(session.sourceId)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            
            {visibleSessions.length === 0 && !loading && (
               <div className="p-4 text-center">
                  <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono">No matching sessions</p>
                  <details className="mt-4 text-left">
                    <summary className="text-[8px] text-white/10 cursor-pointer">Debug Data</summary>
                    <pre className="text-[8px] text-white/20 overflow-auto max-h-32 mt-2 bg-black/50 p-2 rounded">
                      {JSON.stringify({ 
                        sessionsCount: sessions.length, 
                        visibleCount: visibleSessions.length,
                        searchQuery,
                        sessions: sessions.map(s => ({ id: s.id, status: s.status, title: s.title }))
                      }, null, 2)}
                    </pre>
                  </details>
               </div>
            )}
          </div>
        </ScrollArea>

        {/* Daily Capacity Indicator */}
        <div className="border-t border-white/[0.08] px-3 py-2.5 bg-black/50 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
              Daily Volume
            </span>
            <span className="text-[10px] font-mono font-bold text-white/60">
              {dailySessionCount}/{sessionLimit}
            </span>
          </div>
          <div className="w-full h-1 bg-white/5 overflow-hidden rounded-full">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
