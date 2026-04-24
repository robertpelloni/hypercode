'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useJules } from '@/lib/jules/provider';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

import { Message, Participant, DebateResult } from '@jules/shared';
import { DebateViewer } from '@/components/debate-viewer';

export interface DebateDialogProps {
  sessionId?: string;
  trigger?: React.ReactNode;
  onDebateStart?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTopic?: string;
  initialContext?: string;
  initialHistory?: Message[];
  initialParticipants?: UIParticipant[];
}

export interface UIParticipant extends Participant {
  apiKeyKey: string;
  envFallback: string;
}

const PROVIDER_OPTIONS: Record<string, {
  label: string;
  models: string[];
  apiKeyKey: string;
  envFallback: string;
}> = {
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    apiKeyKey: 'openai_api_key',
    envFallback: 'NEXT_PUBLIC_OPENAI_KEY'
  },
  anthropic: {
    label: 'Anthropic',
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    apiKeyKey: 'anthropic_api_key',
    envFallback: 'NEXT_PUBLIC_ANTHROPIC_KEY'
  },
  gemini: {
    label: 'Google (Gemini)',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    apiKeyKey: 'google_api_key',
    envFallback: 'NEXT_PUBLIC_GEMINI_KEY'
  }
};

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant participating in a debate.";

const DEFAULT_PARTICIPANTS: UIParticipant[] = [
  {
    id: 'proposer',
    name: 'Architect',
    role: 'Solution Architect',
    provider: 'openai',
    model: 'gpt-4o',
    apiKeyKey: 'openai_api_key',
    envFallback: 'NEXT_PUBLIC_OPENAI_KEY',
    systemPrompt: `Analyze the current codebase and proposed changes. Propose a robust architectural solution. Focus on scalability and maintainability.`
  },
  {
    id: 'critic',
    name: 'Security Engineer',
    role: 'Security Reviewer',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20240620',
    apiKeyKey: 'anthropic_api_key',
    envFallback: 'NEXT_PUBLIC_ANTHROPIC_KEY',
    systemPrompt: `Critique the proposed solution from a security perspective. Identify potential vulnerabilities and suggest mitigations.`
  }
];

export function DebateDialog({ 
  sessionId, 
  trigger, 
  onDebateStart, 
  open: controlledOpen, 
  onOpenChange: setControlledOpen,
  initialTopic = '',
  initialHistory,
  initialParticipants
}: DebateDialogProps) {
  const { client } = useJules();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;
  
  const [participants, setParticipants] = useState<UIParticipant[]>(initialParticipants || DEFAULT_PARTICIPANTS);

  useEffect(() => {
    if (open) {
      setErrorDetail(null);
    }
  }, [open]);

  const addParticipant = () => {
    const newId = `participant-${Date.now()}`;
    setParticipants([...participants, {
      id: newId,
      name: 'New Agent',
      role: 'Observer',
      provider: 'openai',
      model: 'gpt-4o',
      apiKeyKey: 'openai_api_key',
      envFallback: 'NEXT_PUBLIC_OPENAI_KEY',
      systemPrompt: DEFAULT_SYSTEM_PROMPT
    }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) {
      toast.error("At least one participant is required.");
      return;
    }
    const newP = [...participants];
    newP.splice(index, 1);
    setParticipants(newP);
  };

  const updateParticipant = (index: number, updates: Partial<UIParticipant>) => {
    const newP = [...participants];
    newP[index] = { ...newP[index], ...updates };
    setParticipants(newP);
  };

  const handleStartDebate = async () => {
    if (!client) return;
    
    if (!topic.trim()) {
      setErrorDetail("Topic is required.");
      return;
    }
    if (participants.length < 2) {
      setErrorDetail("At least two participants are recommended for a debate.");
    }

    try {
      setLoading(true);
      setErrorDetail(null);
      setDebateResult(null);
      toast.info('Starting debate session...');

      let messages: Message[] = [];
      let repoContext = '';

      if (sessionId) {
        if (!initialHistory) {
             const history = await client.listActivities(sessionId);
             messages = history
                .filter(h => h.type === 'message' && (h.role === 'user' || h.role === 'agent'))
                .map(h => ({
                    role: (h.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
                    content: h.content
                }));
        }
      } else if (!initialHistory) {
         throw new Error("Cannot start debate: No session ID and no initial history provided.");
      }
      
      if (!repoContext) {
           try {
              repoContext = await client.gatherRepositoryContext('.');
           } catch (err) {
              console.warn('Failed to gather repo context for debate:', err);
           }
      }

      if (messages.length === 0 && initialHistory) {
         messages = [...initialHistory];
      }

      if (repoContext) {
        const contextMsg: Message = {
          role: 'user', 
          content: `SYSTEM CONTEXT:\nThe following is the current repository structure and key file contents. Use this context to inform your debate arguments.\n\n${repoContext}`
        };

        if (initialHistory && initialHistory.length > 0) {
            messages.push(contextMsg);
        } else {
            messages.unshift(contextMsg);
        }
      }

      const debateParticipants = participants.map(p => {
        const key = localStorage.getItem(p.apiKeyKey) || process.env[p.envFallback] || 'env';
        
        return {
          id: p.id,
          name: p.name,
          role: p.role,
          provider: p.provider,
          model: p.model,
          apiKey: key,
          systemPrompt: p.systemPrompt
        };
      });

      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          history: messages,
          participants: debateParticipants,
          metadata: sessionId ? { sessionId } : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorText;
        } catch {
            // Fall back to the raw text response when JSON parsing fails.
        }
        
        if (response.status === 401) {
            errorMessage = `Authentication failed: ${errorMessage}`;
        } else if (response.status === 403) {
            errorMessage = `Permission denied: ${errorMessage}`;
        } else if (response.status === 404) {
             errorMessage = `Resource not found: ${errorMessage}`;
        } else if (response.status === 429) {
            errorMessage = `Rate limit exceeded: ${errorMessage}`;
        } else if (response.status === 500) {
            errorMessage = `Server error: ${errorMessage}`;
        } else if (response.status === 504) {
            errorMessage = `Gateway Timeout: The debate took too long to complete.`;
        }

        throw new Error(errorMessage);
      }

      const result: DebateResult = await response.json();
      setDebateResult(result);

      if (sessionId) {
          await client.createActivity({
              sessionId,
              content: result.summary || "Debate completed.",
              type: 'debate',
              metadata: { debate: result }
          });
      }

      toast.success('Debate completed!');
      onDebateStart?.();

    } catch (error) {
      console.error('Debate failed:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetail(msg);
      toast.error(`Debate failed: ${msg}`);
      setDebateResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col bg-zinc-950 border-zinc-800 text-white p-0 gap-0" aria-describedby="debate-dialog-description">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle>Start Multi-Agent Debate</DialogTitle>
          <DialogDescription id="debate-dialog-description">
            Configure participants and topic for the debate session.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6">
            {debateResult ? (
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-zinc-400">Debate Results</h3>
                   </div>
                   <DebateViewer result={debateResult} />
                </div>
            ) : (
            <>
            {errorDetail && (
                <div className="bg-red-900/30 border border-red-800 text-red-200 p-3 rounded text-sm mb-6 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{errorDetail}</span>
                </div>
            )}

            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="topic">Debate Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Auth Implementation Trade-offs"
                  className="bg-zinc-900 border-zinc-700"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Participants ({participants.length})</Label>
                    <Button onClick={addParticipant} variant="outline" size="sm" className="h-7 text-xs border-dashed border-zinc-600 hover:border-zinc-500">
                        <Plus className="h-3 w-3 mr-1" /> Add Agent
                    </Button>
                </div>
                
                <div className="space-y-3">
                    {participants.map((p, idx) => (
                        <Card key={p.id} className="bg-zinc-900/50 border-zinc-800">
                            <CardContent className="p-3 space-y-3">
                                <div className="flex gap-2 items-start">
                                    <div className="grid gap-3 flex-1">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">Role</Label>
                                                <Input 
                                                    value={p.role} 
                                                    onChange={(e) => updateParticipant(idx, { role: e.target.value })}
                                                    className="h-8 bg-zinc-950 border-zinc-700 text-xs"
                                                    placeholder="Role (e.g. Architect)"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">Name</Label>
                                                <Input 
                                                    value={p.name} 
                                                    onChange={(e) => updateParticipant(idx, { name: e.target.value })}
                                                    className="h-8 bg-zinc-950 border-zinc-700 text-xs"
                                                    placeholder="Name"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">Provider</Label>
                                                <Select
                                                    value={p.provider}
                                                    onValueChange={(val) => {
                                                        const config = PROVIDER_OPTIONS[val];
                                                        if (config) {
                                                            updateParticipant(idx, {
                                                                provider: val as Participant['provider'],
                                                                model: config.models[0],
                                                                apiKeyKey: config.apiKeyKey,
                                                                envFallback: config.envFallback
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 bg-zinc-950 border-zinc-700 text-xs">
                                                        <SelectValue placeholder="Provider" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                        {Object.entries(PROVIDER_OPTIONS).map(([key, config]) => (
                                                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500">Model</Label>
                                                 <Select
                                                    value={p.model}
                                                    onValueChange={(val) => updateParticipant(idx, { model: val })}
                                                >
                                                    <SelectTrigger className="h-8 bg-zinc-950 border-zinc-700 text-xs">
                                                        <SelectValue placeholder="Model" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                        {(PROVIDER_OPTIONS[p.provider]?.models || []).map((m) => (
                                                            <SelectItem key={m} value={m} className="focus:bg-zinc-800 focus:text-zinc-100">{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeParticipant(idx)}
                                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 mt-6"
                                        disabled={participants.length <= 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                <div className="space-y-1">
                                    <Label className="text-xs text-zinc-500">System Prompt</Label>
                                    <Textarea 
                                        value={p.systemPrompt}
                                        onChange={(e) => updateParticipant(idx, { systemPrompt: e.target.value })}
                                        className="min-h-[60px] bg-zinc-950 border-zinc-700 text-xs font-mono"
                                        placeholder="Instructions for this agent..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
              </div>
            </div>
            </>
            )}
        </ScrollArea>
        
        <DialogFooter className="p-6 pt-4 border-t border-zinc-800 bg-zinc-950">
          <Button variant="outline" onClick={() => setOpen?.(false)} disabled={loading} className="border-zinc-700 hover:bg-zinc-900 text-zinc-300">
            Cancel
          </Button>
          {!debateResult && (
            <Button type="submit" onClick={handleStartDebate} disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Debating...' : 'Start Debate'}
            </Button>
          )}
          {debateResult && (
             <Button onClick={() => setOpen?.(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                Close
             </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
