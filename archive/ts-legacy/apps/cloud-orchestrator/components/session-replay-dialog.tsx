'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Terminal, 
  FileCode, 
  MessageSquare, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ReplayEvent {
  id: string;
  timestamp: string;
  role: string;
  type: string;
  content: string;
  hasDiff: boolean;
  hasCommand: boolean;
}

interface ReplayData {
  sessionId: string;
  title: string;
  status: string;
  createdAt: string;
  timeline: ReplayEvent[];
}

interface SessionReplayDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionReplayDialog({ sessionId, open, onOpenChange }: SessionReplayDialogProps) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReplay = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}/replay`);
      if (!response.ok) throw new Error('Failed to fetch replay data');
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      loadReplay();
    }
  }, [loadReplay, open, sessionId]);

  const getEventIcon = (event: ReplayEvent) => {
    if (event.type === 'plan') return <Brain className="h-3 w-3 text-purple-400" />;
    if (event.hasCommand) return <Terminal className="h-3 w-3 text-yellow-400" />;
    if (event.hasDiff) return <FileCode className="h-3 w-3 text-blue-400" />;
    if (event.role === 'user') return <MessageSquare className="h-3 w-3 text-zinc-400" />;
    return <ChevronRight className="h-3 w-3 text-zinc-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] bg-zinc-950 border-white/10 text-white flex flex-col p-0 shadow-2xl" aria-describedby="session-replay-description">
        <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-purple-500" />
                <DialogTitle className="text-lg font-bold tracking-tight uppercase">Cognitive Replay</DialogTitle>
              </div>
              <DialogDescription id="session-replay-description" className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                {data?.title || "Loading Session Timeline..."}
              </DialogDescription>
            </div>
            {data && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Total Events</p>
                  <p className="text-lg font-bold font-mono leading-none">{data.timeline.length}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <Badge variant="outline" className={cn(
                  "h-6 px-2 font-mono text-[10px] uppercase",
                  data.status === 'completed' ? "border-green-500/50 text-green-400 bg-green-500/10" :
                  data.status === 'failed' ? "border-red-500/50 text-red-400 bg-red-500/10" :
                  "border-blue-500/50 text-blue-400 bg-blue-500/10"
                )}>
                  {data.status}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Timeline Sidebar */}
          <div className="w-64 border-r border-white/5 bg-black/20 overflow-y-auto">
            <div className="p-4 space-y-4">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <Clock className="h-3.5 w-3.5 text-zinc-600" />
                  <span className="text-zinc-400">Created {data ? formatDistanceToNow(new Date(data.createdAt), { addSuffix: true }) : '...'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-zinc-400">{data?.timeline.filter(e => e.type === 'result').length} Results Delivered</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-zinc-400">{data?.timeline.filter(e => e.type === 'error').length} Errors Detected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Replay Feed */}
          <ScrollArea className="flex-1 bg-black/40">
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Reconstructing Timeline...</p>
                </div>
              ) : (
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                  {data?.timeline.map((event) => (
                    <div key={event.id} className="relative flex items-start gap-6 group">
                      <div className={cn(
                        "absolute left-0 mt-1 h-10 w-10 rounded-full flex items-center justify-center border transition-all shadow-xl z-10",
                        event.role === 'user' ? "bg-zinc-950 border-white/10" : "bg-zinc-900 border-purple-500/30"
                      )}>
                        {getEventIcon(event)}
                      </div>
                      
                      <div className="flex-1 ml-12 pt-1.5 pb-2">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                            {event.role === 'user' ? 'Human Instruction' : 'Agent Action'}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-600">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          {event.type !== 'message' && (
                            <Badge variant="outline" className="text-[8px] h-4 border-white/5 bg-white/5 text-zinc-400 uppercase tracking-tighter">
                              {event.type}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors">
                          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                            {event.content}
                          </p>
                          {(event.hasDiff || event.hasCommand) && (
                            <div className="mt-3 flex gap-2">
                              {event.hasDiff && (
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px]">DIFF ATTACHED</Badge>
                              )}
                              {event.hasCommand && (
                                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[8px]">SHELL COMMAND</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
