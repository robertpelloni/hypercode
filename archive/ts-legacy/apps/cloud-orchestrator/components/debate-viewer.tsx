'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DebateResult } from '@jules/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DebateViewerProps {
  result: DebateResult;
}

export const DebateViewer = memo(function DebateViewer({ result }: DebateViewerProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="py-3 px-4 border-b border-zinc-800">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Summary & Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.summary || 'No summary available.'}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
          Debate Rounds
        </h3>
        {result.rounds.map((round, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase">Round {round.roundNumber}</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            
            {round.turns.map((turn, tIdx) => (
              <div key={tIdx} className="flex gap-3 px-1">
                <Avatar className="h-6 w-6 border border-zinc-800 shrink-0">
                  <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400">
                    {turn.participantName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-300">{turn.participantName}</span>
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase border-zinc-800 text-zinc-500">
                      {turn.role}
                    </Badge>
                  </div>
                  <div className="text-[11px] leading-relaxed text-zinc-400 bg-zinc-950/30 p-2 rounded border border-zinc-900/50">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {turn.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
