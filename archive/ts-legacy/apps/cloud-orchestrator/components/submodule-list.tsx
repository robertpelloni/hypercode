'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { 
  GitBranch, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Search,
  ExternalLink,
  Code,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Submodule {
  name: string;
  path: string;
  hash: string;
  fullHash: string;
  ref: string;
  status: 'synced' | 'modified' | 'uninitialized';
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function SubmoduleList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/system/submodules', fetcher, {
    refreshInterval: 30000, // Auto-refresh every 30 seconds
    revalidateOnFocus: true
  });

  const submodules = useMemo(() => data?.submodules || [], [data]);

  const filtered = useMemo(() => submodules.filter((s: Submodule) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.path.toLowerCase().includes(searchQuery.toLowerCase())
  ), [submodules, searchQuery]);

  const syncedCount = submodules.filter((s: Submodule) => s.status === 'synced').length;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input 
            placeholder="Search submodules..." 
            className="h-9 pl-9 bg-black/40 border-white/10 text-xs font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">Fleet Integrity</span>
            <span className="text-[10px] font-bold text-white font-mono">
              {syncedCount}/{submodules.length} SYNCED
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => mutate()}
            disabled={isValidating}
            className="h-9 border-white/10 hover:bg-white/5 font-mono uppercase text-[10px] tracking-widest relative"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", (isLoading || isValidating) && "animate-spin")} />
            {isValidating ? "Scanning" : "Sync Status"}
            {isValidating && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-white/5 rounded-xl bg-black/20 overflow-hidden shadow-2xl">
        <ScrollArea className="h-full">
          <div className="p-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Repository</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Commit SHA</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {isLoading && submodules.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
                        <span className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Mapping Local Fleet...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-red-500/50 text-[10px] uppercase tracking-widest">
                      Failed to communicate with the local daemon.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-zinc-600 text-[10px] uppercase tracking-widest italic">
                      No submodules match your current query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((sub: Submodule) => (
                    <tr key={sub.path} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-tight">{sub.name}</span>
                            <a href={`https://github.com/robertpelloni/${sub.name}`} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="h-2.5 w-2.5 text-zinc-500 hover:text-white" />
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                            <Code className="h-2.5 w-2.5" />
                            <span>{sub.path}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-3 w-3 text-zinc-600" />
                          <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{sub.hash}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {sub.status === 'synced' ? (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-500 uppercase tracking-widest">
                              <CheckCircle2 className="h-3 w-3" />
                              Synced
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-yellow-500 uppercase tracking-widest">
                              <AlertCircle className="h-3 w-3" />
                              Modified
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-3 flex-1">
          <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-300/80 leading-relaxed font-mono">
            <span className="text-white font-bold uppercase tracking-tighter mr-1">Borg Integrity Node:</span> 
            Live status tracking is now active. The daemon executes native Git commands to verify the fleet architecture every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
          <Clock className="h-3 w-3" />
          <span>Last Sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

// Add Loader2 import if missing
const Loader2 = ({ className }: { className?: string }) => (
  <RefreshCw className={cn(className, "animate-spin")} />
);

