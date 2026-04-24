'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import type { Activity, Session } from '@jules/shared';
import { exportSessionToJSON, exportSessionToMarkdown } from '@/lib/export';
import { useNotifications } from '@/hooks/use-notifications';
import { useDaemonEvent } from '@/lib/hooks/use-daemon-events';
import type { ActivitiesUpdatedPayload, LogAddedPayload } from '@jules/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { 
  Archive, 
  ArchiveRestore, 
  Code, 
  Play, 
  GitBranch, 
  MoreVertical, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Users, 
  LayoutTemplate, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  FileText,
  Brain,
  Radio
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ActivityInput } from './activity-input';
import { SessionHealthBadge } from './session-health-badge';
import { ActivityContent } from './activity-content';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface ActivityFeedProps {
  session: Session;
  onArchive?: () => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
  onStartDebate?: () => void;
  onSaveTemplate?: () => void;
  refreshTrigger?: number;
}

interface KeeperEventDetails {
  event?: string;
  nudgeMessage?: string;
  sessionTitle?: string;
  inactiveMinutes?: number;
  riskScore?: number;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
  summary?: string;
  sourceId?: string;
  issueNumber?: number;
  confidence?: number;
  isFixable?: boolean;
  newChunks?: number;
  totalFilesScanned?: number;
  usedRAG?: boolean;
}

export function ActivityFeed({ 
  session, 
  onArchive, 
  showCodeDiffs, 
  onToggleCodeDiffs, 
  onActivitiesChange, 
  onStartDebate, 
  onSaveTemplate,
  refreshTrigger = 0 
}: ActivityFeedProps) {
  const { client } = useJules();
  const keeperLogs = useSessionKeeperStore((state) => state.logs);
  const [sending, setSending] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(session.status === 'paused');
  const { sendNotification, permission } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [highlightedKeeperLogId, setHighlightedKeeperLogId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  const loadActivities = useCallback(async (isInitialLoad = true) => {
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
        const sessionDetails = await client.getSession(session.id);
        const data = await client.listActivities(session.id);

        if (sessionDetails.prompt) {
           const hasPrompt = data.some(a => a.content === sessionDetails.prompt);
           if (!hasPrompt) {
              data.unshift({
                id: 'initial-prompt',
                sessionId: session.id,
                type: 'message',
                role: 'user',
                content: sessionDetails.prompt,
                createdAt: session.createdAt
              });
           }
        }
        setActivities(data);
      } else {
        // Optimized: Just get the last few to find new ones
        const latestData = await client.listActivities(session.id, 10);
        
        setActivities(prevActivities => {
          const prevIds = new Set(prevActivities.map(a => a.id));
          const newActivities = latestData.filter(newAct => !prevIds.has(newAct.id));
          
          if (newActivities.length > 0) {
            // Check for notifications
            const newAgentMessage = newActivities.find(a => a.role === 'agent' && (a.type === 'message' || a.type === 'plan' || a.type === 'error'));
            if (newAgentMessage && document.hidden && permission === 'granted') {
               const title = newAgentMessage.type === 'error' ? 'Jules Error' : 'Jules Update';
               sendNotification(title, {
                   body: newAgentMessage.content.substring(0, 100) + (newAgentMessage.content.length > 100 ? '...' : ''),
                   tag: session.id
               });
            }
            return [...prevActivities, ...newActivities];
          }
          return prevActivities;
        });
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
      if (err instanceof Error && err.message.includes('Resource not found')) {
        setActivities([]);
      } else {
        if (isInitialLoad) setActivities([]);
      }
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [client, session.id, session.createdAt, permission, sendNotification]);

  useEffect(() => {
    loadActivities(true);
  }, [session.id, loadActivities, refreshTrigger]);

  useDaemonEvent<ActivitiesUpdatedPayload>(
    'activities_updated',
    (data) => {
      if (data?.sessionId === session.id && !isArchived) {
        loadActivities(false);
      }
    },
    [session.id, isArchived, loadActivities]
  );

  useDaemonEvent<LogAddedPayload>(
    'log_added',
    (data) => {
      const log = data?.log;
      if (!log) return;
      if (log.sessionId !== session.id && log.sessionId !== 'global') return;

      setHighlightedKeeperLogId(String(log.id));
      window.setTimeout(() => {
        setHighlightedKeeperLogId((current) => (current === String(log.id) ? null : current));
      }, 2400);
    },
    [session.id]
  );

  useEffect(() => {
    onActivitiesChange(activities);

    // Auto-sync memory if [PROJECT_MEMORY] is detected
    const lastActivity = activities[activities.length - 1];
    if (lastActivity && lastActivity.role === 'agent' && lastActivity.content.includes('[PROJECT_MEMORY]')) {
      const content = lastActivity.content.replace('[PROJECT_MEMORY]', '').trim();
      if (content) {
        const syncMemory = async () => {
          try {
            const res = await fetch(`/api/sessions/${session.id}/save-memory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            });
            if (res.ok) {
              toast.success("Project memory automatically synced to repo!");
            }
          } catch (err) {
            console.error("Auto-sync memory failed:", err);
          }
        };
        syncMemory();
      }
    }
  }, [activities, onActivitiesChange, session.id]);

  const handleApprovePlan = async () => {
    if (!client || approvingPlan || isArchived) return;
    try {
      setApprovingPlan(true);
      await client.approvePlan(session.id);
      setTimeout(() => loadActivities(false), 1000);
    } catch (err) {
      console.error('Failed to approve plan:', err);
      toast.error('Failed to approve plan');
    } finally {
      setApprovingPlan(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!client || sending || isArchived) return;
    try {
      setSending(true);
      const userMessage = await client.createActivity({
        sessionId: session.id,
        content: content.trim(),
      });
      
      setActivities(prev => [...prev, userMessage]);
      setTimeout(() => loadActivities(false), 2000);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleQuickReview = async () => {
    if (!client || sending) return;
    try {
        setSending(true);
        const userMessage = await client.createActivity({
            sessionId: session.id,
            content: "Start a comprehensive code review.",
            role: 'user',
            type: 'message'
        });
        setActivities(prev => [...prev, userMessage]);

        let codeContext = "";
        try {
             codeContext = await client.gatherRepositoryContext('.');
        } catch (e) {
             console.warn("Could not gather local context:", e);
             codeContext = "Could not access local files. Reviewing based on current state.";
        }

        const response = await fetch('/api/local/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codeContext,
                provider: 'openai', 
                model: 'gpt-4o',
                apiKey: localStorage.getItem('openai_api_key') || '',
                reviewType: 'comprehensive'
            })
        });

        if (!response.ok) throw new Error('Review failed');
        const reviewResult = await response.json();

        const agentActivity = await client.createActivity({
            sessionId: session.id,
            content: reviewResult.content,
            role: 'agent',
            type: 'result'
        });

        setActivities(prev => [...prev, agentActivity]);
    } catch (err) {
        console.error('Failed to run review:', err);
        toast.error('Failed to run review');
    } finally {
        setSending(false);
    }
  };

  const handleArchive = async () => {
    if (!client) return;
    try {
      await client.updateSession(session.id, { status: 'paused' });
      setIsArchived(true);
      onArchive?.();
      toast.success('Session archived');
    } catch {
      toast.error('Failed to archive session');
    }
  };

  const handleUnarchive = async () => {
    if (!client) return;
    try {
      await client.resumeSession(session.id);
      setIsArchived(false);
      onArchive?.();
      toast.success('Session unarchived');
    } catch {
      toast.error('Failed to unarchive session');
    }
  };

  const toggleCodeDiffsSidebar = () => {
    onToggleCodeDiffs(!showCodeDiffs);
  };

  const handleSyncMemory = async () => {
    if (!client || sending) return;
    try {
      setSending(true);
      toast.info("Requesting project memory from Jules...");
      
      const prompt = "Please provide a comprehensive summary of everything you've learned about this project's architecture, patterns, and decisions in Markdown format. Start your response with [PROJECT_MEMORY].";
      
      await client.createActivity({
        sessionId: session.id,
        content: prompt,
        role: 'user',
        type: 'message'
      });

      // The backend logic will handle the [PROJECT_MEMORY] tag later,
      // but for now, we just trigger the request.
      setTimeout(() => loadActivities(false), 3000);
    } catch (err) {
      console.error("Failed to sync memory:", err);
      toast.error("Failed to sync memory");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = async (format: 'json' | 'txt' | 'md') => {
    if (format === 'json') {
      exportSessionToJSON(session, activities);
    } else {
      exportSessionToMarkdown(session, activities);
      
      if (format === 'md') {
        try {
          const response = await fetch(`/api/sessions/${session.id}/export-to-repo`, {
            method: 'POST'
          });
          if (response.ok) {
            const result = await response.json();
            toast.success(`Session automatically saved to repo: ${result.path}`);
          }
        } catch (err) {
          console.error("Failed to auto-save to repo:", err);
        }
      }
    }
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const handleJumpToTop = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  };

  const handleJumpToBottom = () => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  const filteredActivities = useMemo(() => activities.filter((activity) => {
    if (activity.bashOutput || activity.diff || activity.media) return true;
    const content = activity.content?.trim();
    if (!content) return false;
    const cleanContent = content.replace(/\s/g, '');
    if (cleanContent === '{}' || cleanContent === '[]') return false;
    return true;
  }), [activities]);

  const groupedActivities = useMemo(() => {
    const grouped: Array<Activity | Activity[]> = [];
    let currentGroup: Activity[] | null = null;

    filteredActivities.forEach((activity, index) => {
      const shouldGroup = activity.type === 'progress' && activity.role === 'agent';
      const prevActivity = index > 0 ? filteredActivities[index - 1] : null;
      const prevShouldGroup = prevActivity && prevActivity.type === 'progress' && prevActivity.role === 'agent';

      if (shouldGroup) {
        if (prevShouldGroup && currentGroup) currentGroup.push(activity);
        else {
          currentGroup = [activity];
          grouped.push(currentGroup);
        }
      } else {
        currentGroup = null;
        grouped.push(activity);
      }
    });
    return grouped;
  }, [filteredActivities]);

  const virtualizer = useVirtualizer({
    count: groupedActivities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250,
    overscan: 10,
  });

  // Auto-scroll to bottom on new activities
  useEffect(() => {
    if (parentRef.current && activities.length > 0) {
      const scrollElement = parentRef.current;
      // Use requestAnimationFrame to ensure the virtualizer has finished rendering
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  }, [activities.length]);

  const hasDiffs = activities.some(activity => activity.diff);

  const sessionScopedKeeperLogs = useMemo(
    () => keeperLogs.filter((log) => log.sessionId === session.id || log.sessionId === 'global').slice(0, 5),
    [keeperLogs, session.id]
  );

  const getKeeperEventDetails = (details?: Record<string, unknown>): KeeperEventDetails | null => {
    if (!details) return null;
    return details as KeeperEventDetails;
  };

  const getEventBadgeLabel = (eventName?: string) => {
    if (!eventName) return null;
    return eventName
      .replace(/^session_/, '')
      .replace(/^issue_/, 'issue:')
      .replace(/^codebase_/, 'index:')
      .replaceAll('_', ' ');
  };

  const getEventBadgeStyles = (eventName: string) => {
    if (eventName.includes('debate') || eventName.includes('escalat')) return 'bg-pink-500/10 text-pink-300 border-pink-500/20';
    if (eventName.includes('recovery')) return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
    if (eventName.includes('circuit_breaker')) return 'bg-red-500/10 text-red-300 border-red-500/20';
    if (eventName.includes('approved')) return 'bg-green-500/10 text-green-300 border-green-500/20';
    if (eventName.includes('rejected')) return 'bg-red-500/10 text-red-300 border-red-500/20';
    if (eventName.includes('nudged')) return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    if (eventName.includes('index')) return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    if (eventName.includes('spawned') || eventName.includes('issue')) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
    return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
  };

  const getActivityIcon = (activity: Activity) => {
    if (activity.role === 'user') {
      return <AvatarFallback className="bg-purple-500 text-white text-[9px] font-bold uppercase tracking-wider">U</AvatarFallback>;
    }
    return <AvatarFallback className="bg-white text-black text-[9px] font-bold uppercase tracking-wider">J</AvatarFallback>;
  };

  const getActivityTypeColor = (type: Activity['type']) => {
    switch (type) {
      case 'message': return 'bg-blue-500';
      case 'plan': return 'bg-purple-500';
      case 'progress': return 'bg-yellow-500';
      case 'result': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'debate': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getRepoShortName = (sourceId: string) => {
    const parts = sourceId.split("/");
    return parts[parts.length - 1] || sourceId;
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/20" />
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Loading activities...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="border-b border-border bg-card/95 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wide truncate text-foreground">{session.title}</h2>
              <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded bg-blue-500/10 text-blue-500">
                <Sparkles className="h-3 w-3" />
                <span>Jules</span>
              </div>
              <SessionHealthBadge session={session} />
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground uppercase tracking-wide">
              <span>Started {formatDate(session.createdAt)}</span>
              <span>•</span>
              {session.sourceId && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-purple-400 font-bold tracking-tighter border border-white/5 uppercase">
                  <Sparkles className="h-2 w-2" />
                  <span>{getRepoShortName(session.sourceId)}</span>
                </div>
              )}
              <span>•</span>
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span>{session.branch || 'main'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleSyncMemory} disabled={sending} className="h-7 w-7 hover:bg-accent text-muted-foreground" title="Sync Internal Memory to Repo">
              <Brain className="h-3.5 w-3.5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => handleExport('md')} className="h-7 w-7 hover:bg-accent text-muted-foreground" title="Export to Markdown">
              <FileText className="h-3.5 w-3.5" />
            </Button>

            {hasDiffs && (
              <Button variant="ghost" size="icon" onClick={toggleCodeDiffsSidebar} className={`h-7 w-7 hover:bg-accent ${showCodeDiffs ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
                <Code className="h-3.5 w-3.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent text-muted-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-popover-foreground">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export Chat
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover border-border text-popover-foreground">
                    <DropdownMenuItem onClick={() => handleExport('md')} className="text-xs cursor-pointer">Markdown</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('txt')} className="text-xs cursor-pointer">Text</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json')} className="text-xs cursor-pointer">JSON</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => handleCopy(JSON.stringify(activities, null, 2), 'full')} className="text-xs cursor-pointer">
                  {copiedId === 'full' ? <Check className="mr-2 h-3.5 w-3.5 text-green-500" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                  Copy Full JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                
                {session.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={handleQuickReview} disabled={sending} className="focus:bg-accent focus:text-accent-foreground text-xs cursor-pointer">
                      <Play className="mr-2 h-3.5 w-3.5" />
                      <span>Start Code Review</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStartDebate?.(); }} className="focus:bg-accent focus:text-accent-foreground text-xs cursor-pointer">
                      <Users className="mr-2 h-3.5 w-3.5" />
                      <span>Start Debate</span>
                    </DropdownMenuItem>
                    {onSaveTemplate && (
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onSaveTemplate(); }} className="focus:bg-accent focus:text-accent-foreground text-xs cursor-pointer text-primary focus:text-primary">
                        <LayoutTemplate className="mr-2 h-3.5 w-3.5" />
                        <span>Save as Template</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {isArchived ? (
                  <DropdownMenuItem onClick={handleUnarchive} className="text-xs cursor-pointer text-primary focus:text-primary">
                    <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                    Unarchive Session
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleArchive} className="text-xs cursor-pointer text-destructive focus:text-destructive">
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Archive Session
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {sessionScopedKeeperLogs.length > 0 && (
        <div className="border-b border-border bg-zinc-950/50 px-4 py-2.5">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
            <Radio className="h-3 w-3 text-purple-400" />
            <span>Live Keeper Feed</span>
          </div>
          <div className="space-y-1.5">
            {sessionScopedKeeperLogs.map((log) => {
              const eventDetails = getKeeperEventDetails(log.details);

              return (
                <div
                  key={log.id}
                  className={`rounded-md border px-2.5 py-2 text-[10px] font-mono transition-colors ${
                    highlightedKeeperLogId === log.id
                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-100'
                      : 'border-white/5 bg-white/[0.03] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-4 border-white/10 bg-black/20 px-1.5 text-[8px] uppercase tracking-widest text-zinc-400">
                        {log.sessionId === 'global' ? 'global' : 'session'}
                      </Badge>
                      <span className="text-zinc-400">{log.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {eventDetails?.event && (
                        <Badge variant="outline" className={`h-4 px-1.5 text-[8px] uppercase tracking-widest ${getEventBadgeStyles(eventDetails.event)}`}>
                          {getEventBadgeLabel(eventDetails.event)}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`h-4 px-1.5 text-[8px] uppercase tracking-widest ${log.type === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' : log.type === 'action' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'border-white/10 text-zinc-500'}`}>
                        {log.type}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 leading-relaxed">{log.message}</p>
                  {(eventDetails?.sessionTitle || eventDetails?.nudgeMessage || eventDetails?.summary || typeof eventDetails?.riskScore === 'number' || eventDetails?.approvalStatus || eventDetails?.sourceId || typeof eventDetails?.issueNumber === 'number' || typeof eventDetails?.confidence === 'number' || typeof eventDetails?.newChunks === 'number' || typeof eventDetails?.totalFilesScanned === 'number' || typeof eventDetails?.usedRAG === 'boolean') && (
                    <div className="mt-2 space-y-1 text-[9px] text-zinc-400">
                      {eventDetails.sessionTitle && (
                        <p className="truncate uppercase tracking-wide">Target: {eventDetails.sessionTitle}</p>
                      )}
                      {eventDetails.sourceId && (
                        <p className="truncate uppercase tracking-wide">Source: {eventDetails.sourceId}</p>
                      )}
                      {typeof eventDetails.issueNumber === 'number' && (
                        <p className="uppercase tracking-wide">Issue: #{eventDetails.issueNumber}</p>
                      )}
                      {typeof eventDetails.confidence === 'number' && (
                        <div className="flex items-center gap-2">
                          <span className="uppercase tracking-wide">Confidence:</span>
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${eventDetails.confidence >= 80 ? 'bg-green-500' : eventDetails.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${eventDetails.confidence}%` }} />
                          </div>
                          <span>{eventDetails.confidence}%</span>
                        </div>
                      )}
                      {typeof eventDetails.isFixable === 'boolean' && (
                        <p className="uppercase tracking-wide">Fixable: {eventDetails.isFixable ? 'yes' : 'no'}</p>
                      )}
                      {typeof eventDetails.riskScore === 'number' && (
                        <div className="flex items-center gap-2">
                          <span className="uppercase tracking-wide">Risk:</span>
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${eventDetails.riskScore >= 70 ? 'bg-red-500' : eventDetails.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${eventDetails.riskScore}%` }} />
                          </div>
                          <span className={`font-bold ${eventDetails.riskScore >= 70 ? 'text-red-400' : eventDetails.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>{eventDetails.riskScore}/100</span>
                        </div>
                      )}
                      {eventDetails.approvalStatus && (
                        <p className={`uppercase tracking-wide font-bold ${eventDetails.approvalStatus === 'approved' ? 'text-green-400' : eventDetails.approvalStatus === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                          Decision: {eventDetails.approvalStatus}
                        </p>
                      )}
                      {typeof eventDetails.newChunks === 'number' && (
                        <p className="uppercase tracking-wide">New Chunks: {eventDetails.newChunks}</p>
                      )}
                      {typeof eventDetails.totalFilesScanned === 'number' && (
                        <p className="uppercase tracking-wide">Files Scanned: {eventDetails.totalFilesScanned}</p>
                      )}
                      {typeof eventDetails.usedRAG === 'boolean' && (
                        <p className="uppercase tracking-wide">RAG Context: {eventDetails.usedRAG ? 'included' : 'not used'}</p>
                      )}
                      {eventDetails.nudgeMessage && (
                        <p className="line-clamp-2 normal-case tracking-normal text-zinc-300/90">{eventDetails.nudgeMessage}</p>
                      )}
                      {eventDetails.summary && (
                        <p className="line-clamp-3 normal-case tracking-normal text-zinc-300/90">{eventDetails.summary}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative group">
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleJumpToTop}
            className="h-8 w-8 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-primary hover:text-white transition-all"
            title="Jump to Top"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleJumpToBottom}
            className="h-8 w-8 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-primary hover:text-white transition-all"
            title="Jump to Bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-full" ref={parentRef} id="activity-feed-scroll-area">
          <div className="p-3 pb-40 relative" style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = groupedActivities[virtualItem.index];
              if (!item) return null;

              return (
                <div key={virtualItem.key} data-index={virtualItem.index} ref={virtualizer.measureElement} className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${virtualItem.start}px)`, paddingBottom: '10px' }}>
                  {Array.isArray(item) ? (
                    <div className="flex gap-2.5 px-3">
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-800 border border-white/10">{getActivityIcon(item[0])}</Avatar>
                      <Card className="flex-1 border-white/5 bg-zinc-900/90 shadow-xl">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider bg-yellow-500/90 border-transparent text-black font-bold">progress</Badge>
                            <span className="text-[9px] font-mono text-white/40 tracking-wide">{item.length} updates</span>
                          </div>
                          <div className="space-y-2">
                            {item.map((activity, idx) => (
                              <div key={activity.id} className={idx > 0 ? 'pt-2 border-t border-white/5' : ''}>
                                <div className="text-sm leading-relaxed text-zinc-100 break-words">
                                  <ActivityContent content={activity.content} metadata={activity.metadata} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className={`flex gap-2.5 px-3 ${item.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-800 border border-white/10">{getActivityIcon(item)}</Avatar>
                      <Card className={`flex-1 border-white/5 shadow-xl ${item.role === 'user' ? 'bg-purple-500/20 border-purple-500/30' : 'bg-zinc-900/90'}`}>
                        <CardContent className="p-3 group/card relative">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(item.type)} border-transparent text-white font-bold`}>{item.type}</Badge>
                            <span className="text-[9px] font-mono text-white/40 tracking-wide">{formatDate(item.createdAt)}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity text-white/40 hover:text-white" onClick={() => handleCopy(item.content, item.id)}>
                              {copiedId === item.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="text-sm leading-relaxed text-zinc-100 break-words">
                            <ActivityContent content={item.content} metadata={item.metadata} />
                          </div>
                          {item.diff && (
                            <div className="mt-3 pt-3 border-t border-border">
                               <p className="text-[10px] font-mono text-blue-500 mb-2 uppercase tracking-widest">Git Patch Included</p>
                            </div>
                          )}
                          {item.type === 'plan' && session.status === 'awaiting_approval' && !isArchived && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <Button onClick={handleApprovePlan} disabled={approvingPlan} size="sm" className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white border-0"
                              >
                                {approvingPlan ? 'Approving...' : 'Approve Plan'}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {!isArchived && (
        <ActivityInput onSendMessage={handleSendMessage} disabled={sending} placeholder="Send a message to Jules..." />
      )}
    </div>
  );
}
