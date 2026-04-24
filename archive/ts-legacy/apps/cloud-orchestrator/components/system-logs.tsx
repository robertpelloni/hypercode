'use client';

import { useEffect, useRef } from 'react';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SystemLogs() {
  const logs = useSessionKeeperStore((state) => state.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black border-l border-white/5">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-purple-400" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400">System Activity</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Live</span>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4 font-mono text-[11px] leading-relaxed">
        <div className="space-y-2 pb-8">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-2">
              <Activity className="h-8 w-8 opacity-20" />
              <p className="uppercase tracking-tighter">Waiting for system events...</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="group flex gap-3 items-start animate-in fade-in slide-in-from-left-1 duration-300">
                <span className="text-zinc-600 shrink-0 select-none w-16">{log.time}</span>
                
                <div className="flex-1 flex gap-2">
                  <span className={cn(
                    "shrink-0 px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase",
                    log.type === 'error' && "bg-red-500/10 text-red-400 border border-red-500/20",
                    log.type === 'info' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                    log.type === 'action' && "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  )}>
                    {log.type}
                  </span>
                  
                  <span className={cn(
                    "break-all",
                    log.type === 'error' ? "text-red-300" : "text-zinc-300"
                  )}>
                    {log.message}
                  </span>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="hidden group-hover:block absolute right-4 mt-6 p-2 bg-zinc-900 border border-white/10 rounded shadow-2xl z-50 text-[10px] text-zinc-400">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
