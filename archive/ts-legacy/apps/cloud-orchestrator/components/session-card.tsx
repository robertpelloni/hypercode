"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ChevronRight, 
  Sparkles
} from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { Session } from '@jules/shared';

interface SessionCardProps {
  session: Session;
  isSelected?: boolean;
  onClick?: () => void;
}

export function SessionCard({ session, isSelected, onClick }: SessionCardProps) {
  const relativeDate = useMemo(() => {
    if (!session.updatedAt) return "Unknown";
    try {
      const date = parseISO(session.updatedAt);
      if (!isValid(date)) return "Unknown";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown";
    }
  }, [session.updatedAt]);

  const statusColor = useMemo(() => {
    switch (session.status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "paused": return "bg-yellow-500";
      default: return "bg-zinc-500";
    }
  }, [session.status]);

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 border-white/[0.08] hover:border-white/20 ${
        isSelected ? "bg-white/5 border-white/20" : "bg-transparent"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
              <h3 className="text-[11px] font-bold text-white uppercase tracking-wide truncate">
                {session.title || "Untitled Session"}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono uppercase tracking-tighter">
                <Sparkles className="h-2 w-2 mr-1" /> Jules
              </Badge>
              
              {session.status === 'failed' && (
                <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-red-500/50 bg-red-500/20 text-red-400 font-mono font-bold uppercase tracking-tighter animate-pulse">
                  Healing
                </Badge>
              )}

              {session.status === 'awaiting_approval' && (
                <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-orange-500/50 bg-orange-500/20 text-orange-400 font-mono font-bold uppercase tracking-tighter animate-pulse">
                  Evaluating
                </Badge>
              )}
              
              {session.sourceId && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-purple-400/80 uppercase font-bold tracking-tighter truncate max-w-[120px] border border-white/5">
                  <Sparkles className="h-2 w-2" />
                  <span className="truncate">{session.sourceId.split('/').pop()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[9px] text-white/20 font-mono uppercase tracking-tighter">
              <Clock className="h-2.5 w-2.5" />
              <span>{relativeDate}</span>
            </div>
          </div>

          <div className="mt-1">
            <ChevronRight className={`h-3 w-3 text-white/10 group-hover:text-white/40 transition-colors ${isSelected ? 'text-white/40' : ''}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
