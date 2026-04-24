import { Button } from "@/components/ui/button";
import { 
  Search, 
  Plus, 
  Settings as SettingsIcon, 
  Terminal,
  User,
  Brain,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings-dialog";
import { BroadcastDialog } from "@/components/broadcast-dialog";
import { NotificationCenter } from "@/components/notification-center";
import { useJules } from "@/lib/jules/provider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Session } from "@jules/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APP_VERSION } from "@/lib/version";

interface AppHeaderProps {
  onSearchClick: () => void;
  onNewSession: () => void;
}

export function AppHeader({ onSearchClick, onNewSession }: AppHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { client, refreshTrigger } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!client) return;
      try {
        const data = await client.listSessions();
        setSessions(data);
      } catch (err) {
        console.error("[AppHeader] Failed to fetch sessions for broadcast:", err);
      }
    };
    fetchSessions();
  }, [client, refreshTrigger]);

  const handleFleetSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/fleet/sync', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        toast.success(`Fleet sync started: ${result.message}`);
      } else {
        toast.error(`Fleet sync failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Fleet sync request failed:", err);
      toast.error("Fleet sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-12 border-b border-white/[0.08] bg-zinc-950 flex items-center justify-between px-4 shrink-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-xs font-bold tracking-tighter uppercase text-white">
            Jules <span className="text-white/40">Autopilot</span>
          </h1>
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-white/10 text-white/40 font-mono">
            v{APP_VERSION}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-white/40 hover:text-white hover:bg-white/5 gap-2 px-3"
          onClick={onSearchClick}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wider hidden sm:inline">Search</span>
          <kbd className="hidden md:inline-flex h-4 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[8px] font-medium text-white/20">
            <span>⌘</span>K
          </kbd>
        </Button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-2 px-3 ${isSyncing ? 'text-primary' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          onClick={handleFleetSync}
          disabled={isSyncing}
          title="Sync All Repo Memories & Sessions"
        >
          {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-medium uppercase tracking-wider hidden lg:inline">Sync All</span>
        </Button>

        <BroadcastDialog sessions={sessions} />

        <NotificationCenter />

        <Button
          size="sm"
          className="h-8 bg-primary hover:bg-primary/90 text-white gap-2 px-3"
          onClick={onNewSession}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">New Session</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
          onClick={() => setIsSettingsOpen(true)}
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 overflow-hidden border border-white/10">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-zinc-900 text-[10px] text-white/40 font-bold uppercase">AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-950 border-white/10 text-white" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold leading-none uppercase tracking-wider">Local Admin</p>
                <p className="text-[10px] leading-none text-white/40 font-mono">admin@localhost</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-[10px] uppercase tracking-wider focus:bg-white/5 focus:text-white cursor-pointer">
              <User className="mr-2 h-3.5 w-3.5" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[10px] uppercase tracking-wider focus:bg-white/5 focus:text-white cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="mr-2 h-3.5 w-3.5" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </header>
  );
}
