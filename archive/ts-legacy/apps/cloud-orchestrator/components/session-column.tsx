"use client";

import { useMemo } from "react";
import { SessionCard } from "./session-card";
import { Badge } from "@/components/ui/badge";
import type { Session } from '@jules/shared';

interface SessionColumnProps {
  id: string;
  name: string;
  sessions: Session[];
  onSelectSession: (session: Session) => void;
  selectedSessionId?: string | null;
}

export function SessionColumn({
  id,
  name,
  sessions,
  onSelectSession,
  selectedSessionId,
}: SessionColumnProps) {
  const columnSessions = useMemo(() => {
    return sessions.filter((s) => s.status === id);
  }, [sessions, id]);

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 border border-white/[0.08] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">{name}</h3>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-white/10 bg-white/5 text-white/40">
            {columnSessions.length}
          </Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {columnSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isSelected={selectedSessionId === session.id}
            onClick={() => onSelectSession(session)}
          />
        ))}
        {columnSessions.length === 0 && (
          <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-lg">
            <span className="text-[10px] text-white/10 uppercase tracking-widest font-mono">Empty</span>
          </div>
        )}
      </div>
    </div>
  );
}
