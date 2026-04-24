"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useJules } from "@/lib/jules/provider";
import type { Session } from '@jules/shared';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  Clock, 
  RefreshCw, 
  Plus, 
  MessageSquare,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { NewSessionDialog } from "./new-session-dialog";

interface SessionBoardProps {
  onSelectSession: (session: Session) => void;
  onOpenNewSession: () => void;
}

export function SessionBoard({ onSelectSession, onOpenNewSession }: SessionBoardProps) {
  const { client, refreshTrigger } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!client) return;
    try {
      setLoading(true);
      const data = await client.listSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError("Failed to load sessions. Is the Jules API key configured?");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]);

  const stats = useMemo(() => {
    const active = sessions.filter(s => s.status === 'active').length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const failed = sessions.filter(s => s.status === 'failed').length;
    return { active, completed, failed, total: sessions.length };
  }, [sessions]);

  if (loading && sessions.length === 0) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <p className="text-sm text-white/50 animate-pulse font-mono uppercase tracking-widest">
          Synchronizing Sessions...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Sessions</h2>
          <div className="flex gap-4 mt-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              {stats.active} Active
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              {stats.completed} Completed
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              {stats.total} Total
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadSessions} className="h-8 text-[10px] font-mono uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 border border-white/10">
            <RefreshCw className="mr-2 h-3 w-3" /> Refresh
          </Button>
          <NewSessionDialog onSessionCreated={loadSessions} trigger={
            <Button size="sm" className="h-8 text-[10px] font-mono uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white border-0">
              <Plus className="h-3 w-3 mr-1.5" /> New Session
            </Button>
          }/>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-lg flex items-center gap-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-xs text-red-200">{error}</p>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <MessageSquare className="h-8 w-8 text-white/10 mb-4" />
            <p className="text-sm text-white/40 font-mono uppercase tracking-widest mb-4">No sessions found</p>
            <Button variant="outline" onClick={onOpenNewSession} className="border-white/10 text-white hover:bg-white/5 uppercase tracking-widest text-[10px] font-mono">
              Create your first session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <Card 
                key={session.id} 
                className="bg-zinc-900 border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                onClick={() => onSelectSession(session)}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wide group-hover:text-purple-400 transition-colors">
                        {session.title || 'Untitled Session'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[8px] h-4 px-1.5 font-mono uppercase border-transparent text-white font-bold ${
                          session.status === 'active' ? 'bg-green-500' : 
                          session.status === 'completed' ? 'bg-blue-500' : 'bg-zinc-700'
                        }`}>
                          {session.status}
                        </Badge>
                        <span className="text-[9px] text-white/30 font-mono truncate max-w-[120px]">
                          {session.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/20 group-hover:text-white">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-white/50">
                      <GitBranch className="h-3 w-3" />
                      <span className="truncate">{session.sourceId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/50">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(session.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Unknown';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return 'Unknown';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}
