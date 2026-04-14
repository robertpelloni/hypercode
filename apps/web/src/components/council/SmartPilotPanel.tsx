'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Switch } from "@hypercode/ui";
import { Slider } from "@hypercode/ui";
import { 
  Play, 
  Settings2, 
  Cpu, 
  Workflow, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface SmartPilotConfig {
  enabled: boolean;
  autoApproveThreshold: number;
  requireUnanimous: boolean;
  maxAutoApprovals: number;
}

interface ActivePlan {
  sessionId: string;
  plan: any;
}

interface SmartPilotPanelProps {
  config: SmartPilotConfig;
  activePlans: ActivePlan[];
  onToggle?: (enabled: boolean) => void;
  onUpdateConfig?: (config: Partial<SmartPilotConfig>) => void;
}

export function SmartPilotPanel({ config, activePlans, onToggle, onUpdateConfig }: SmartPilotPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-card/30 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${
              config.enabled ? 'bg-purple-500/10 border-purple-500/30' : 'bg-zinc-500/10 border-zinc-500/30'
            }`}>
              <Cpu className={`h-6 w-6 ${config.enabled ? 'text-purple-400' : 'text-zinc-400'}`} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Autonomous Smart Pilot
              </CardTitle>
              <p className="text-xs text-muted-foreground">Self-driving agent orchestration</p>
            </div>
          </div>
          <Switch 
            checked={config.enabled} 
            onCheckedChange={onToggle}
          />
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium flex items-center gap-2">
                Auto-Approval Threshold
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {Math.round(config.autoApproveThreshold * 100)}%
                </Badge>
              </label>
            </div>
            <Slider 
              value={[config.autoApproveThreshold * 100]} 
              min={50} 
              max={100} 
              step={1}
              onValueChange={(v) => onUpdateConfig?.({ autoApproveThreshold: v[0] / 100 })}
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Decisions reaching this consensus level will be automatically approved and sent back to the agent without human intervention.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Max Daily Auto-Approvals</label>
              <input 
                type="number" 
                className="w-full bg-background/50 border rounded px-2 py-1 text-sm font-mono" 
                value={config.maxAutoApprovals}
                onChange={(e) => onUpdateConfig?.({ maxAutoApprovals: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <label className="text-xs font-medium flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={config.requireUnanimous} 
                  onChange={(e) => onUpdateConfig?.({ requireUnanimous: e.target.checked })}
                />
                Require Unanimous
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2 px-1">
          <Workflow className="h-4 w-4 text-purple-400" />
          Active Swarm Plans
          {activePlans.length > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 animate-pulse bg-purple-500/5 border-purple-500/20 text-purple-400">
              {activePlans.length} Running
            </Badge>
          )}
        </h3>
        
        {activePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[120px] border border-dashed rounded-xl bg-card/10 text-muted-foreground">
            <p className="text-xs">No active swarms detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activePlans.map((p) => (
              <Card key={p.sessionId} className="bg-card/20 border-border/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Play className="h-4 w-4 text-primary fill-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold font-mono uppercase">{p.sessionId.split('_').pop()}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        Executing {p.plan?.subtasks?.length ?? 0} task swarm...
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]">
                    Inspect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
