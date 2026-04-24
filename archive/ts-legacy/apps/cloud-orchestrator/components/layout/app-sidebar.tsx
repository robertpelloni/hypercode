import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";

import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  LayoutTemplate, 
  Trello, 
  Users,
  Terminal,
  Brain,
  Zap,
  Activity,
  HeartPulse,
  Shield
} from "lucide-react";
import { SessionList } from "@/components/session-list";
import { Session } from '@jules/shared';
import { useSessionKeeperStore } from "@/lib/stores/session-keeper";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSessionSelect: (session: Session | string) => void;
  selectedSessionId?: string;
  currentView: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins';
  onViewChange: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms' | 'plugins') => void;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  onSessionSelect,
  selectedSessionId,
  currentView,
  onViewChange
}: AppSidebarProps) {
  const {
    queue,
    config: { isEnabled },
  } = useSessionKeeperStore();
  const activeJobs = queue?.processing || 0;

  const navItems = [
    { id: 'sessions', label: 'Sessions', icon: MessageSquare },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'kanban', label: 'Kanban', icon: Trello },
    { id: 'debates', label: 'Debates', icon: Users },
    { id: 'logs', label: 'System Logs', icon: Terminal },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'audit', label: 'Audit Trail', icon: Shield },
    { id: 'swarms', label: 'Agent Swarms', icon: Users },
    { id: 'plugins', label: 'Plugins', icon: Box },
  ] as const;

  return (
    <aside
      className={`hidden md:flex border-r border-white/[0.08] flex-col bg-zinc-950 transition-all duration-200 relative z-20 ${
        collapsed ? "md:w-12" : "md:w-64"
      }`}
    >
      <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            COMMAND CENTER
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 hover:bg-white/5 text-white/60 ${
            collapsed ? "mx-auto" : ""
          }`}
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="p-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2 text-xs h-8 ${
              currentView === item.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
            }`}
            onClick={() => onViewChange(item.id)}
          >
            <item.icon className="h-3.5 w-3.5" />
            {!collapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex-1 overflow-hidden border-t border-white/[0.08] flex flex-col">
        {!collapsed && (
          <>
            <div className="px-4 py-2">
              <h2 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                SESSIONS
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <SessionList
                onSelectSession={onSessionSelect}
                selectedSessionId={selectedSessionId}
              />
            </div>
          </>
        )}
      </div>

      {/* Fleet Heartbeat */}
      <div className={cn(
        "p-3 border-t border-white/[0.08] bg-white/[0.01]",
        collapsed && "flex flex-col items-center gap-4"
      )}>
        {collapsed ? (
          <div className="relative">
            <Brain className={cn(
              "h-4 w-4 text-zinc-600",
              activeJobs > 0 && "text-purple-500 animate-pulse"
            )} />
            {activeJobs > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full border border-zinc-950" />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Brain className={cn(
                    "h-3.5 w-3.5 text-zinc-600",
                    activeJobs > 0 && "text-purple-500 animate-pulse"
                  )} />
                  {activeJobs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  )}
                </div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Fleet Pulse</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1 h-1 rounded-full",
                  isEnabled ? "bg-green-500" : "bg-zinc-700"
                )} />
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">HyperCode Node</span>
              </div>
            </div>
            
            {activeJobs > 0 ? (
              <div className="px-2 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-2.5 w-2.5 text-purple-400" />
                  <span className="text-[9px] font-mono text-purple-300 font-bold uppercase tracking-tight">Active Jobs</span>
                </div>
                <span className="text-[10px] font-bold text-white font-mono">{activeJobs}</span>
              </div>
            ) : (
              <div className="px-2 py-1.5 bg-white/[0.02] border border-white/[0.05] rounded-lg flex items-center justify-between opacity-50">
                <div className="flex items-center gap-2">
                  <Zap className="h-2.5 w-2.5 text-zinc-500" />
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tight">Idle</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-600 font-mono">0</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
