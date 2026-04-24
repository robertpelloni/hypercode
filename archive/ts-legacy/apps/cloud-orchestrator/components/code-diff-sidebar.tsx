"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DiffViewer } from "@/components/ui/diff-viewer";
import type { Activity } from '@jules/shared';
import { FileCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeDiffSidebarProps {
  activities: Activity[];
  onClose: () => void;
}

export function CodeDiffSidebar({ activities, onClose }: CodeDiffSidebarProps) {
  // Get only the final diff (last activity with a diff)
  const finalDiff = useMemo(() => {
    return activities.filter((activity) => activity.diff).slice(-1);
  }, [activities]);

  return (
    <aside className="w-[600px] border-l border-white/10 bg-zinc-950 flex flex-col h-full shrink-0 relative z-10 shadow-2xl">
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-primary" />
          <h2 className="text-[10px] font-bold text-white uppercase tracking-widest">
            CODE CHANGES
          </h2>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {finalDiff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 py-20">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <FileCode className="h-6 w-6 text-white/20" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">
                No Changes
              </h3>
              <p className="text-[11px] text-white/30 font-mono leading-relaxed">
                This session has not produced any file modifications yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6 pb-20">
            {finalDiff.map((activity) => (
              <div key={activity.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">
                    Latest Patch
                  </div>
                  <div className="text-[10px] font-mono text-white/20">
                    {new Date(activity.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <DiffViewer 
                  diff={activity.diff || ''} 
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
