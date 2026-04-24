import { Plugin } from "./plugin-marketplace";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Box, Settings, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PluginCardProps {
  plugin: Plugin;
  onToggle: () => void;
  onUninstall: () => void;
}

export function PluginCard({ plugin, onToggle, onUninstall }: PluginCardProps) {
  const isEnabled = plugin.status === 'enabled';
  const isError = plugin.status === 'error';

  return (
    <div className={cn(
      "flex flex-col border rounded-xl overflow-hidden transition-all bg-zinc-900",
      isEnabled ? "border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.1)]" : "border-zinc-800",
      isError ? "border-red-500/30" : ""
    )}>
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isEnabled ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-500",
              isError ? "bg-red-500/20 text-red-400" : ""
            )}>
              {isError ? <AlertTriangle className="w-5 h-5" /> : <Box className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
                {plugin.name}
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">v{plugin.version}</span>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-indigo-500"
          />
        </div>

        <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px] mb-3">
          {plugin.description || "No description provided."}
        </p>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Wasm Isolated
          </span>
          {plugin.author && (
            <span className="text-[10px] text-zinc-500 truncate">
              by {plugin.author}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isEnabled ? "bg-emerald-500" : "bg-zinc-600",
            isError ? "bg-red-500" : ""
          )} />
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            {plugin.status}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-500">
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-red-500/10 hover:text-red-400 text-zinc-500"
            onClick={onUninstall}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
