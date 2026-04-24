'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DebateResult, Message } from '@jules/shared';
import { DebateDetailsDialog } from './debate-details-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DebateDialog } from '@/components/debate-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface StoredDebate {
    id: string;
    topic: string;
    summary: string | null;
    createdAt: string;
}

interface DebateHistoryListProps {
  onRefresh?: () => void;
}

export function DebateHistoryList({ onRefresh: _onRefresh }: DebateHistoryListProps) {
    const [debates, setDebates] = useState<StoredDebate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDebateId, setSelectedDebateId] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [resumeData, setResumeData] = useState<{ topic: string, history: Message[], sessionId?: string } | null>(null);

    const handleResume = (debate: DebateResult) => {
        const history: Message[] = [...(debate.history || [])];

        if (debate.rounds) {
            debate.rounds.forEach(round => {
                round.turns.forEach(turn => {
                    history.push({
                        role: 'assistant',
                        content: `[${turn.participantName} (${turn.role})]: ${turn.content}`
                    });
                });
            });
        }

        setResumeData({
            topic: `Continued: ${debate.topic}`,
            history,
            sessionId: (debate.metadata as { sessionId?: string })?.sessionId
        });
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            setIsDeleting(true);
            const res = await fetch(`/api/debate/${deleteId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setDebates(debates.filter(d => d.id !== deleteId));
                toast.success('Debate deleted successfully');
                setDeleteId(null);
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete debate');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        const fetchDebates = async () => {
            try {
                const res = await fetch('/api/debate/history');
                if (res.ok) {
                    const data = await res.json();
                    setDebates(data);
                }
            } catch (error) {
                console.error('Failed to fetch debate history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDebates();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (debates.length === 0) {
        return (
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center p-8 text-zinc-500">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p>No debates recorded yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <ScrollArea className="h-[600px] w-full pr-4">
                <div className="space-y-4">
                    {debates.map((debate) => (
                        <Card
                            key={debate.id}
                            className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer hover:bg-zinc-800/50"
                            onClick={() => {
                                setSelectedDebateId(debate.id);
                                setDetailsOpen(true);
                            }}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-medium text-zinc-100">
                                        {debate.topic}
                                    </CardTitle>
                                    <div className="flex items-start gap-2">
                                        <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {format(new Date(debate.createdAt), 'MMM d, h:mm a')}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 -mt-1 -mr-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteId(debate.id);
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-zinc-400 line-clamp-3">
                                    {debate.summary || "No summary available."}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>

            <DebateDetailsDialog
                debateId={selectedDebateId}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                onResume={handleResume}
            />

            {resumeData && (
                <DebateDialog
                    open={!!resumeData}
                    onOpenChange={(open) => !open && setResumeData(null)}
                    initialTopic={resumeData.topic}
                    initialHistory={resumeData.history}
                    sessionId={resumeData.sessionId}
                />
            )}

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white" aria-describedby="delete-debate-description">
                    <DialogHeader>
                        <DialogTitle>Delete Debate</DialogTitle>
                        <DialogDescription id="delete-debate-description" className="text-zinc-400">
                            Are you sure you want to delete this debate? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteId(null)}
                            disabled={isDeleting}
                            className="hover:bg-zinc-800 text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-900/50"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
