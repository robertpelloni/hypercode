'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DebateViewer } from '@/components/debate-viewer';
import { DebateResult } from '@jules/shared';
import { Loader2, Download, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface DebateDetailsDialogProps {
  debateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: (debate: DebateResult) => void;
}

export function DebateDetailsDialog({
  debateId,
  open,
  onOpenChange,
  onResume,
}: DebateDetailsDialogProps) {
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && debateId) {
      const fetchDebate = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/debate/${debateId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch debate details');
          }
          const data = await response.json();
          setDebate(data);
        } catch (error) {
          console.error('Error fetching debate:', error);
          toast.error('Failed to load debate details');
          onOpenChange(false);
        } finally {
          setLoading(false);
        }
      };

      fetchDebate();
    } else {
        setDebate(null);
    }
  }, [debateId, open, onOpenChange]);

  const handleDownload = () => {
    if (!debate) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debate-export-${timestamp}.md`;

    let markdown = `# ${debate.topic || 'Debate Session'}\n\n`;
    
    if (debate.summary) {
      markdown += `## Summary\n${debate.summary}\n\n`;
    }

    markdown += `## Transcript\n\n`;
    
    debate.rounds.forEach((round) => {
      markdown += `### Round ${round.roundNumber}\n\n`;
      round.turns.forEach((turn) => {
        markdown += `**${turn.participantName} (${turn.role})**:\n${turn.content}\n\n---\n\n`;
      });
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Debate exported to Markdown');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white" aria-describedby="debate-details-description">
        <DialogHeader>
          <div className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <DialogTitle>Debate Details</DialogTitle>
              <DialogDescription id="debate-details-description">
                {loading ? 'Loading debate...' : debate?.topic || 'Debate Session'}
              </DialogDescription>
            </div>
            {!loading && debate && (
              <div className="flex gap-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                        onResume(debate);
                        onOpenChange(false);
                    }}
                    className="border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200"
                 >
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                 </Button>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownload} 
                    className="border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200"
                 >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                 </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : debate ? (
          <div className="mt-4">
             <DebateViewer result={debate} />
          </div>
        ) : (
            <div className="text-center py-8 text-zinc-500">
                No debate data available.
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
