'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Users, MoreVertical, Edit2, Shield, Brain, Zap } from "lucide-react";

interface Supervisor {
  name: string;
  provider: string;
  model?: string;
  weight?: number;
  status: 'active' | 'offline' | 'error';
}

interface CouncilMemberGridProps {
  supervisors: Supervisor[];
  onEdit?: (name: string) => void;
}

export function CouncilMemberGrid({ supervisors, onEdit }: CouncilMemberGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {supervisors.map((supervisor) => (
        <Card key={supervisor.name} className="border-border/50 bg-card/30 backdrop-blur-sm hover:border-purple-500/50 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${
                supervisor.provider === 'anthropic' ? 'bg-orange-500/10 border-orange-500/30' :
                supervisor.provider === 'openai' ? 'bg-green-500/10 border-green-500/30' :
                'bg-blue-500/10 border-blue-500/30'
              }`}>
                {supervisor.provider === 'anthropic' ? <Brain className="h-5 w-5 text-orange-400" /> :
                 supervisor.provider === 'openai' ? <Zap className="h-5 w-5 text-green-400" /> :
                 <Shield className="h-5 w-5 text-blue-400" />}
              </div>
              <div>
                <CardTitle className="text-sm font-bold">{supervisor.name}</CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{supervisor.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${
                supervisor.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                'border-red-500/30 text-red-400 bg-red-500/10'
              }`}>
                {supervisor.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onEdit?.(supervisor.name)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Model</span>
              <span className="font-mono">{supervisor.model || 'Default'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Influence Weight</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500" 
                    style={{ width: `${(supervisor.weight || 1.0) * 50}%` }} 
                  />
                </div>
                <span className="font-bold">{(supervisor.weight || 1.0).toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Card className="border-dashed border-2 flex items-center justify-center p-6 bg-transparent hover:bg-accent/10 transition-colors cursor-pointer group">
        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary">
          <div className="h-10 w-10 rounded-full border-2 border-dashed flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Add Supervisor</span>
        </div>
      </Card>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
