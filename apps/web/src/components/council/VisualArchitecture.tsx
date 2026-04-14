'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent, CardHeader, CardTitle } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Maximize2, Download, RefreshCw, Eye } from "lucide-react";

interface VisualArchitectureProps {
  mermaidCode: string;
  onRefresh?: () => void;
}

export function VisualArchitecture({ mermaidCode, onRefresh }: VisualArchitectureProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'ui-monospace, monospace',
    });
  }, []);

  useEffect(() => {
    if (containerRef.current && mermaidCode) {
      containerRef.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [mermaidCode]);

  return (
    <Card className="bg-card/30 border-border/50 overflow-hidden flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Eye className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">System Architecture</CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Verifiable Infrastructure Map</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative bg-black/40 overflow-auto min-h-[500px]">
        <div 
          ref={containerRef} 
          className="mermaid flex items-center justify-center p-8 transition-opacity duration-500"
        >
          {mermaidCode}
        </div>
        
        <div className="absolute bottom-4 left-4 flex gap-2">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] uppercase">
            Real-time Sync
          </Badge>
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] uppercase">
            Auto-Generated
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
