'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Terminal, StopCircle, Play, Trash2, Tag, ExternalLink } from "lucide-react";

interface Session {
  id: string;
  status: 'idle' | 'starting' | 'running' | 'paused' | 'stopped' | 'error' | 'completed';
  cliType?: string;
  startedAt?: number;
  tags?: string[];
}

interface SessionGridProps {
  sessions: Session[];
  onStop?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export function SessionGrid({ sessions, onStop, onResume, onDelete, onView }: SessionGridProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] border border-dashed rounded-xl bg-card/10 text-muted-foreground gap-4">
        <Terminal className="h-12 w-12 opacity-20" />
        <div className="text-center">
          <p className="font-medium">No active sessions</p>
          <p className="text-xs">Start a new session or a bulk fleet to begin.</p>
        </div>
        <Button variant="outline" size="sm">Deploy Fleet</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sessions.map((session) => (
        <Card key={session.id} className="border-border/50 bg-card/30 backdrop-blur-sm group overflow-hidden">
          <div className={`h-1 w-full ${
            session.status === 'running' ? 'bg-green-500' :
            session.status === 'error' ? 'bg-red-500' :
            session.status === 'starting' ? 'bg-yellow-500' :
            'bg-zinc-600'
          }`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{session.id.split('_').pop()}</span>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-purple-400" />
                  {session.cliType ?? 'Session'}
                </CardTitle>
                <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${
                  session.status === 'running' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                  'border-zinc-500/30 text-zinc-400 bg-zinc-500/5'
                }`}>
                  {session.status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView?.(session.id)}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
               {(session.tags ?? []).map(tag => (
                 <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300">
                   <Tag className="h-2.5 w-2.5" />
                   {tag}
                 </span>
               ))}
             </div>
             
             <div className="flex gap-2">
               {session.status === 'running' || session.status === 'starting' ? (
                 <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] gap-1.5" onClick={() => onStop?.(session.id)}>
                   <StopCircle className="h-3.5 w-3.5" />
                   Terminate
                </Button>
              ) : (
                <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] gap-1.5" onClick={() => onResume?.(session.id)}>
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => onDelete?.(session.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
