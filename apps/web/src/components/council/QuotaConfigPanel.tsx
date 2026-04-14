'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { 
  BarChart3, 
  RefreshCcw, 
  Unlock, 
  Settings2, 
  TrendingUp,
  AlertOctagon,
  Clock
} from "lucide-react";

interface ProviderStats {
  provider: string;
  requests: { min: number; hour: number };
  tokens: { min: number; day: number };
  cost: { today: number };
  isThrottled: boolean;
  limits: any;
}

interface QuotaConfigPanelProps {
  stats: ProviderStats[];
  onReset?: (provider: string) => void;
  onUnthrottle?: (provider: string) => void;
  onEditLimits?: (provider: string) => void;
}

export function QuotaConfigPanel({ stats, onReset, onUnthrottle, onEditLimits }: QuotaConfigPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.map((item) => (
          <Card key={item.provider} className="bg-card/30 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold capitalize">{item.provider}</CardTitle>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-2 w-2" />
                    Live Metrics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.isThrottled && (
                  <Badge variant="destructive" className="text-[9px] animate-pulse">
                    <AlertOctagon className="h-2.5 w-2.5 mr-1" />
                    Throttled
                  </Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditLimits?.(item.provider)}>
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase">Today&apos;s Cost</p>
                  <p className="text-sm font-bold text-green-400">${item.cost.today.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase">Requests (Hr)</p>
                  <p className="text-sm font-bold">{item.requests.hour}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase">Tokens (Day)</p>
                  <p className="text-sm font-bold">{(item.tokens.day / 1000).toFixed(1)}k</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1 h-7 text-[10px] gap-1.5" onClick={() => onReset?.(item.provider)}>
                  <RefreshCcw className="h-3 w-3" />
                  Reset
                </Button>
                {item.isThrottled && (
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1.5 border-orange-500/30 text-orange-400" onClick={() => onUnthrottle?.(item.provider)}>
                    <Unlock className="h-3 w-3" />
                    Unthrottle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
