"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useJules } from "@/lib/jules/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, Megaphone } from "lucide-react";
import type { Session } from '@jules/shared';
import { toast } from "sonner";

interface BroadcastDialogProps {
  sessions: Session[];
}

interface DeliveryTarget {
  id: string;
  label: string;
}

interface DeliveryReport {
  total: number;
  successSessions: DeliveryTarget[];
  failedSessions: DeliveryTarget[];
}

interface RecoveredRetryOutcome {
  successCount: number;
  failedCount: number;
  timestamp: number;
}

const TEMPLATES = [
  {
    label: "Super Protocol (All-in-One)",
    text: "Please execute the following protocol: 1) Merge all feature branches into main, update submodules, and merge upstream changes (including forks). 2) Reanalyze the project and history to identify missing features. 3) Comprehensively update the roadmap and documentation to reflect all progress. 4) Create or update a dashboard page (or documentation) listing all submodules with their versions and locations, including a project structure explanation. 5) Update the changelog and increment the version number. 6) Commit and push all changes to the remote repository. 7) Redeploy the application."
  },
  {
    label: "Merge & Update",
    text: "Please merge all feature branches into main. Update all submodules and merge upstream changes (including forked submodules). Resolve any issues, then update your local branch to main to ensure you are working with the latest changes. Additionally, please create or update a dashboard page (or documentation) that lists all submodules with their versions, dates, and build numbers, including a clear explanation of the project directory structure and submodule locations."
  },
  {
    label: "Reanalyze & Check Features",
    text: "Outstanding work. Please reanalyze the project state and conversation history to identify any further features that need implementation."
  },
  {
    label: "Roadmap & Documentation",
    text: "Please analyze the entire conversation history and project status. Organize every feature, package, and implementation detail into the roadmap and documentation. Clearly distinguish between what has been accomplished and what remains to be done, then proceed to the next feature."
  },
  {
    label: "Update Docs & Push",
    text: "Please update the changelog, increment the version number, and ensure the documentation and roadmap are current. Commit all changes and push to the remote repository."
  },
  {
    label: "Update, Fix & Redeploy",
    text: "Please update all submodules and merge upstream changes (including forks). Fix any new issues. Update the changelog, version number, documentation, and roadmap. Additionally, create or update a dashboard page (or documentation) listing all submodules with their versions and locations, along with an explanation of the project structure. Commit and push changes for each repository, then redeploy."
  }
];

const AUTO_REFRESH_RECOVERED_STORAGE_KEY = "jules.broadcast.recovered.autoRefresh";
const AUTO_REFRESH_RECOVERED_INTERVAL_STORAGE_KEY = "jules.broadcast.recovered.autoRefreshIntervalMs";
const AUTO_REFRESH_INTERVAL_OPTIONS = [15000, 30000, 60000] as const;
const HOTKEY_REFRESH_COOLDOWN_MS = 1500;
const FORCE_REFRESH_TOAST_COOLDOWN_MS = 3000;

export function BroadcastDialog({ sessions }: BroadcastDialogProps) {
  const { client, triggerRefresh } = useJules();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deliveryReport, setDeliveryReport] = useState<DeliveryReport | null>(null);
  const [isBackgroundRetrying, setIsBackgroundRetrying] = useState(false);
  const [backgroundRetryTotal, setBackgroundRetryTotal] = useState(0);
  const [backgroundRetryCompleted, setBackgroundRetryCompleted] = useState(0);
  const [lastFailedSessionIds, setLastFailedSessionIds] = useState<string[]>([]);
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [lastFailedAt, setLastFailedAt] = useState<number | null>(null);
  const [lastAvailabilityRefreshAt, setLastAvailabilityRefreshAt] = useState<number | null>(null);
  const [lastRecoveredRetryOutcome, setLastRecoveredRetryOutcome] = useState<RecoveredRetryOutcome | null>(null);
  const [recoveredNow, setRecoveredNow] = useState(Date.now());
  const [refreshingRecoveredAvailability, setRefreshingRecoveredAvailability] = useState(false);
  const [autoRefreshRecoveredAvailability, setAutoRefreshRecoveredAvailability] = useState(false);
  const [autoRefreshRecoveredIntervalMs, setAutoRefreshRecoveredIntervalMs] = useState<number>(30000);
  const [nextAutoRefreshAt, setNextAutoRefreshAt] = useState<number | null>(null);
  const [hotkeyRefreshCooldownUntil, setHotkeyRefreshCooldownUntil] = useState<number | null>(null);
  const lastHotkeyRefreshAtRef = useRef<number>(0);
  const lastForceRefreshToastAtRef = useRef<number>(0);

  // Use all provided sessions regardless of status, assuming the parent filters for "open" (unarchived) sessions
  const targetSessions = sessions;
  const recoveredAvailableTargets = getTargetsByIds(lastFailedSessionIds);
  const recoveredAvailableCount = recoveredAvailableTargets.length;
  const recoveredMissingCount = Math.max(0, lastFailedSessionIds.length - recoveredAvailableCount);
  const isAvailabilityStale =
    !!lastAvailabilityRefreshAt && recoveredNow - lastAvailabilityRefreshAt > 60000;
  const nextRefreshCountdownSeconds =
    nextAutoRefreshAt && autoRefreshRecoveredAvailability
      ? Math.max(0, Math.ceil((nextAutoRefreshAt - recoveredNow) / 1000))
      : null;
  const hotkeyRefreshCooldownSeconds =
    hotkeyRefreshCooldownUntil !== null
      ? Math.max(0, Math.ceil((hotkeyRefreshCooldownUntil - recoveredNow) / 1000))
      : 0;

  // Reset progress when dialog closes
  useEffect(() => {
    if (!open) {
      setSending(false);
      setProgress(0);
      setDeliveryReport(null);
      setIsBackgroundRetrying(false);
      setBackgroundRetryTotal(0);
      setBackgroundRetryCompleted(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || (!lastFailedAt && !lastAvailabilityRefreshAt)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecoveredNow(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [open, lastFailedAt, lastAvailabilityRefreshAt]);

  useEffect(() => {
    if (!open || !autoRefreshRecoveredAvailability || nextAutoRefreshAt === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecoveredNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [autoRefreshRecoveredAvailability, nextAutoRefreshAt, open]);

  useEffect(() => {
    if (!open || hotkeyRefreshCooldownUntil === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setRecoveredNow(now);
      if (now >= hotkeyRefreshCooldownUntil) {
        setHotkeyRefreshCooldownUntil(null);
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [hotkeyRefreshCooldownUntil, open]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(AUTO_REFRESH_RECOVERED_STORAGE_KEY);
    if (!storedValue) {
      const storedInterval = window.localStorage.getItem(AUTO_REFRESH_RECOVERED_INTERVAL_STORAGE_KEY);
      if (!storedInterval) {
        return;
      }

      const parsedInterval = Number.parseInt(storedInterval, 10);
      if (AUTO_REFRESH_INTERVAL_OPTIONS.includes(parsedInterval as (typeof AUTO_REFRESH_INTERVAL_OPTIONS)[number])) {
        setAutoRefreshRecoveredIntervalMs(parsedInterval);
      }

      return;
    }

    setAutoRefreshRecoveredAvailability(storedValue === "true");

    const storedInterval = window.localStorage.getItem(AUTO_REFRESH_RECOVERED_INTERVAL_STORAGE_KEY);
    if (!storedInterval) {
      return;
    }

    const parsedInterval = Number.parseInt(storedInterval, 10);
    if (AUTO_REFRESH_INTERVAL_OPTIONS.includes(parsedInterval as (typeof AUTO_REFRESH_INTERVAL_OPTIONS)[number])) {
      setAutoRefreshRecoveredIntervalMs(parsedInterval);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      AUTO_REFRESH_RECOVERED_STORAGE_KEY,
      autoRefreshRecoveredAvailability ? "true" : "false"
    );
  }, [autoRefreshRecoveredAvailability]);

  useEffect(() => {
    window.localStorage.setItem(
      AUTO_REFRESH_RECOVERED_INTERVAL_STORAGE_KEY,
      String(autoRefreshRecoveredIntervalMs)
    );
  }, [autoRefreshRecoveredIntervalMs]);

  useEffect(() => {
    if (!open || !autoRefreshRecoveredAvailability || lastFailedSessionIds.length === 0) {
      setNextAutoRefreshAt(null);
      return;
    }

    setNextAutoRefreshAt(Date.now() + autoRefreshRecoveredIntervalMs);

    const intervalId = window.setInterval(() => {
      if (sending || isBackgroundRetrying || refreshingRecoveredAvailability) {
        return;
      }

      triggerRefresh();
      const now = Date.now();
      setLastAvailabilityRefreshAt(now);
      setNextAutoRefreshAt(now + autoRefreshRecoveredIntervalMs);
    }, autoRefreshRecoveredIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [
    autoRefreshRecoveredAvailability,
    isBackgroundRetrying,
    lastFailedSessionIds.length,
    open,
    refreshingRecoveredAvailability,
    sending,
    triggerRefresh,
    autoRefreshRecoveredIntervalMs,
  ]);

  const sendMessageWithRetry = async (sessionId: string, content: string, maxAttempts = 2) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await client?.createActivity({
          sessionId,
          content,
          type: 'message'
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    }

    throw lastError;
  };

  const sendToSessions = async (sessionsToSend: Session[], content: string): Promise<DeliveryReport> => {
    setSending(true);
    setProgress(0);

    const successSessions: DeliveryTarget[] = [];
    const failedSessions: DeliveryTarget[] = [];

    for (let i = 0; i < sessionsToSend.length; i++) {
      const session = sessionsToSend[i];
      const target: DeliveryTarget = {
        id: session.id,
        label: session.title?.trim() || session.id,
      };

      try {
        await sendMessageWithRetry(session.id, content);
        successSessions.push(target);
      } catch (error) {
        console.error(`Failed to send to session ${session.id}:`, error);
        failedSessions.push(target);
      }

      setProgress(Math.round(((i + 1) / sessionsToSend.length) * 100));
    }

    setSending(false);
    setProgress(0);

    return {
      total: sessionsToSend.length,
      successSessions,
      failedSessions,
    };
  };

  const rememberFailedTargets = (report: DeliveryReport, content: string) => {
    if (report.failedSessions.length === 0) {
      clearRecoveredFailures();
      return;
    }

    setLastFailedSessionIds(report.failedSessions.map((target) => target.id));
    setLastFailedMessage(content);
    const now = Date.now();
    setLastFailedAt(now);
    setLastAvailabilityRefreshAt(now);
  };

  const clearRecoveredFailures = () => {
    setLastFailedSessionIds([]);
    setLastFailedMessage("");
    setLastFailedAt(null);
    setLastAvailabilityRefreshAt(null);
    setLastRecoveredRetryOutcome(null);
  };

  function getRelativeAgeLabel(timestamp: number | null) {
    if (!timestamp) {
      return "";
    }

    const ageMs = Math.max(0, recoveredNow - timestamp);
    const ageSeconds = Math.floor(ageMs / 1000);

    if (ageSeconds < 5) {
      return "just now";
    }

    if (ageSeconds < 60) {
      return `${ageSeconds}s ago`;
    }

    const ageMinutes = Math.floor(ageSeconds / 60);
    if (ageMinutes < 60) {
      return `${ageMinutes}m ago`;
    }

    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ago`;
  }

  function getTargetsByIds(sessionIds: string[]) {
    const idSet = new Set(sessionIds);
    return targetSessions.filter((session) => idSet.has(session.id));
  }

  const handleSend = async () => {
    if (!client || !message.trim()) return;

    if (targetSessions.length === 0) {
      toast.error("No target sessions available for broadcast.");
      return;
    }

    const report = await sendToSessions(targetSessions, message);
    setDeliveryReport(report);
    rememberFailedTargets(report, message);

    const successCount = report.successSessions.length;
    const failCount = report.failedSessions.length;

    if (successCount > 0 && failCount === 0) {
      toast.success(`Broadcast delivered to ${successCount} session${successCount === 1 ? '' : 's'}.`);
    } else if (successCount > 0 && failCount > 0) {
      const preview = report.failedSessions.slice(0, 2).map(s => s.label).join(', ');
      const suffix = report.failedSessions.length > 2 ? ', …' : '';
      toast.warning(`Broadcast sent to ${successCount} session${successCount === 1 ? '' : 's'}, ${failCount} failed (${preview}${suffix}).`);
    } else {
      toast.error("Broadcast failed for all sessions.");
    }

    if (successCount > 0) {
      triggerRefresh();
    }

    if (failCount === 0) {
      setOpen(false);
      setMessage("");
    }
  };

  const handleRetryFailed = async () => {
    if (!client || !message.trim() || !deliveryReport || deliveryReport.failedSessions.length === 0) {
      return;
    }

    const retryTargets = getTargetsByIds(deliveryReport.failedSessions.map((session) => session.id));

    if (retryTargets.length === 0) {
      toast.error("No failed sessions available to retry.");
      return;
    }

    const report = await sendToSessions(retryTargets, message);
    setDeliveryReport(report);
    rememberFailedTargets(report, message);

    const successCount = report.successSessions.length;
    const failCount = report.failedSessions.length;
    setLastRecoveredRetryOutcome({
      successCount,
      failedCount: failCount,
      timestamp: Date.now(),
    });

    if (successCount > 0 && failCount === 0) {
      toast.success(`Retry delivered to all ${successCount} failed session${successCount === 1 ? '' : 's'}.`);
      triggerRefresh();
      setOpen(false);
      setMessage("");
      return;
    }

    if (successCount > 0) {
      triggerRefresh();
      const preview = report.failedSessions.slice(0, 2).map(s => s.label).join(', ');
      const suffix = report.failedSessions.length > 2 ? ', …' : '';
      toast.warning(`Retry sent to ${successCount} session${successCount === 1 ? '' : 's'}, ${failCount} still failed (${preview}${suffix}).`);
    } else {
      toast.error("Retry failed for all targeted sessions.");
    }
  };

  const handleCopyFailedIds = async () => {
    if (!deliveryReport || deliveryReport.failedSessions.length === 0) {
      toast.error("No failed session IDs to copy.");
      return;
    }

    const idsText = deliveryReport.failedSessions.map((target) => target.id).join('\n');

    try {
      await navigator.clipboard.writeText(idsText);
      toast.success(`Copied ${deliveryReport.failedSessions.length} failed session ID${deliveryReport.failedSessions.length === 1 ? '' : 's'}.`);
    } catch {
      toast.error("Unable to copy failed session IDs.");
    }
  };

  const handleCopyRecoverySummary = async () => {
    if (lastFailedSessionIds.length === 0) {
      toast.error("No recovered session context to copy.");
      return;
    }

    const lines: string[] = [];
    lines.push(`Recovered targets: ${lastFailedSessionIds.length}`);
    lines.push(`Available now: ${recoveredAvailableCount}`);
    lines.push(`Unavailable now: ${recoveredMissingCount}`);

    if (lastAvailabilityRefreshAt) {
      lines.push(`Availability refreshed: ${getRelativeAgeLabel(lastAvailabilityRefreshAt)}`);
    }

    if (lastRecoveredRetryOutcome) {
      lines.push(
        `Last recovered retry: ${lastRecoveredRetryOutcome.successCount} sent, ${lastRecoveredRetryOutcome.failedCount} failed (${getRelativeAgeLabel(lastRecoveredRetryOutcome.timestamp)})`
      );
    }

    lines.push(
      `Auto-refresh: ${autoRefreshRecoveredAvailability ? "on" : "off"} (${Math.floor(autoRefreshRecoveredIntervalMs / 1000)}s interval)`
    );

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied recovery summary.");
    } catch {
      toast.error("Unable to copy recovery summary.");
    }
  };

  const handleRetryLastFailed = async () => {
    if (!client || sending || isBackgroundRetrying || lastFailedSessionIds.length === 0) {
      return;
    }

    const retryMessage = message.trim() || lastFailedMessage.trim();

    if (!retryMessage) {
      toast.error("No message available for recovered retry.");
      return;
    }

    const retryTargets = recoveredAvailableTargets;

    if (retryTargets.length === 0) {
      toast.error("Recovered failed sessions are no longer available.");
      return;
    }

    if (!message.trim()) {
      setMessage(retryMessage);
    }

    const report = await sendToSessions(retryTargets, retryMessage);
    setDeliveryReport(report);
    rememberFailedTargets(report, retryMessage);

    const successCount = report.successSessions.length;
    const failCount = report.failedSessions.length;

    if (successCount > 0) {
      setLastAvailabilityRefreshAt(Date.now());
      triggerRefresh();
    }

    if (successCount > 0 && failCount === 0) {
      toast.success(`Recovered retry delivered to all ${successCount} session${successCount === 1 ? '' : 's'}.`);
      setOpen(false);
      setMessage("");
      return;
    }

    if (successCount > 0 && failCount > 0) {
      const preview = report.failedSessions.slice(0, 2).map((s) => s.label).join(', ');
      const suffix = report.failedSessions.length > 2 ? ', …' : '';
      toast.warning(`Recovered retry sent to ${successCount}, ${failCount} still failed (${preview}${suffix}).`);
      return;
    }

    toast.error("Recovered retry failed for all targeted sessions.");
  };

  const handleClearRecoveredFailed = () => {
    clearRecoveredFailures();
    toast.success("Cleared recovered failed-session context.");
  };

  const handleRefreshRecoveredAvailability = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (refreshingRecoveredAvailability || sending || isBackgroundRetrying) {
      return;
    }

    setRefreshingRecoveredAvailability(true);
    triggerRefresh();

    await new Promise((resolve) => {
      window.setTimeout(resolve, 300);
    });

    setLastAvailabilityRefreshAt(Date.now());
    setNextAutoRefreshAt(Date.now() + autoRefreshRecoveredIntervalMs);
    setRefreshingRecoveredAvailability(false);
    if (!silent) {
      toast.success("Refreshed session availability.");
    }
  }, [autoRefreshRecoveredIntervalMs, isBackgroundRetrying, refreshingRecoveredAvailability, sending, triggerRefresh]);

  const handleResetRecoveredPreferences = () => {
    setAutoRefreshRecoveredAvailability(false);
    setAutoRefreshRecoveredIntervalMs(30000);
    setNextAutoRefreshAt(null);
    window.localStorage.removeItem(AUTO_REFRESH_RECOVERED_STORAGE_KEY);
    window.localStorage.removeItem(AUTO_REFRESH_RECOVERED_INTERVAL_STORAGE_KEY);
    toast.success("Recovered preferences reset.");
  };

  useEffect(() => {
    if (!open || lastFailedSessionIds.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if (event.key.toLowerCase() !== "r") {
        return;
      }

      const now = Date.now();
      const isForceRefreshShortcut = event.shiftKey;
      if (!isForceRefreshShortcut && now - lastHotkeyRefreshAtRef.current < HOTKEY_REFRESH_COOLDOWN_MS) {
        return;
      }

      event.preventDefault();
      lastHotkeyRefreshAtRef.current = now;
      setHotkeyRefreshCooldownUntil(now + HOTKEY_REFRESH_COOLDOWN_MS);
      if (isForceRefreshShortcut && now - lastForceRefreshToastAtRef.current >= FORCE_REFRESH_TOAST_COOLDOWN_MS) {
        lastForceRefreshToastAtRef.current = now;
        toast.info("Force refresh triggered.");
      }
      void handleRefreshRecoveredAvailability({ silent: true });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRefreshRecoveredAvailability, lastFailedSessionIds.length, open]);

  const handleRetryFailedInBackground = async () => {
    if (!client || !message.trim() || !deliveryReport || deliveryReport.failedSessions.length === 0 || isBackgroundRetrying) {
      return;
    }

    const failedSessionIds = new Set(deliveryReport.failedSessions.map((s) => s.id));
    const retryTargets = targetSessions.filter((session) => failedSessionIds.has(session.id));

    if (retryTargets.length === 0) {
      toast.error("No failed sessions available to retry.");
      return;
    }

    setIsBackgroundRetrying(true);
    setBackgroundRetryTotal(retryTargets.length);
    setBackgroundRetryCompleted(0);
    toast.info(`Background retry started for ${retryTargets.length} failed session${retryTargets.length === 1 ? '' : 's'}.`);

    const report = {
      total: retryTargets.length,
      successSessions: [] as DeliveryTarget[],
      failedSessions: [] as DeliveryTarget[],
    };

    for (const session of retryTargets) {
      const target: DeliveryTarget = {
        id: session.id,
        label: session.title?.trim() || session.id,
      };

      try {
        await sendMessageWithRetry(session.id, message);
        report.successSessions.push(target);
      } catch (error) {
        console.error(`Background retry failed for session ${session.id}:`, error);
        report.failedSessions.push(target);
      } finally {
        setBackgroundRetryCompleted((prev) => prev + 1);
      }
    }

    setIsBackgroundRetrying(false);
    setDeliveryReport(report);
    rememberFailedTargets(report, message);

    const successCount = report.successSessions.length;
    const failCount = report.failedSessions.length;

    if (successCount > 0) {
      triggerRefresh();
    }

    if (successCount > 0 && failCount === 0) {
      toast.success(`Background retry delivered to all ${successCount} failed session${successCount === 1 ? '' : 's'}.`);
      setOpen(false);
      setMessage("");
      return;
    }

    if (successCount > 0 && failCount > 0) {
      const preview = report.failedSessions.slice(0, 2).map((s) => s.label).join(', ');
      const suffix = report.failedSessions.length > 2 ? ', …' : '';
      toast.warning(`Background retry sent to ${successCount}, ${failCount} still failed (${preview}${suffix}).`);
      return;
    }

    toast.error("Background retry failed for all targeted sessions.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" title="Broadcast to all open sessions">
          <Megaphone className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-white" aria-describedby="broadcast-dialog-description">
        <DialogHeader>
          <DialogTitle>Broadcast Message</DialogTitle>
          <DialogDescription id="broadcast-dialog-description" className="text-zinc-400">
            Send a message to all {targetSessions.length} open sessions simultaneously.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-white">Template</Label>
            <Select onValueChange={(value) => setMessage(value)}>
              <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {TEMPLATES.map((template, index) => (
                  <SelectItem key={index} value={template.text} className="focus:bg-white/10 focus:text-white cursor-pointer">
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-white">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message here..."
              className="bg-zinc-900 border-white/10 text-white min-h-[100px]"
            />
          </div>
          {sending && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Sending...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!sending && deliveryReport && (
            <div className="rounded-md border border-white/10 bg-black/30 p-3 space-y-2">
              <div className="text-xs text-zinc-300 font-medium">Delivery Report</div>
              <div className="text-[11px] text-zinc-400">
                Delivered to <span className="text-green-400 font-medium">{deliveryReport.successSessions.length}</span> / {deliveryReport.total} session{deliveryReport.total === 1 ? '' : 's'}.
              </div>
              {isBackgroundRetrying && (
                <div className="text-[11px] text-purple-300 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Background retry running… {backgroundRetryCompleted}/{backgroundRetryTotal}
                </div>
              )}
              {deliveryReport.failedSessions.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] text-yellow-400 font-medium">Failed sessions</div>
                  <div className="max-h-20 overflow-auto text-[11px] text-zinc-300 space-y-0.5">
                    {deliveryReport.failedSessions.map((target) => (
                      <div key={target.id} className="truncate">• {target.label}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <div className="rounded-md border border-purple-500/30 bg-purple-500/10 p-3 space-y-1">
              <div className="text-xs text-purple-200 font-medium">Recovered failed targets</div>
              <div className="text-[11px] text-purple-100/80">
                Found {lastFailedSessionIds.length} previously failed session{lastFailedSessionIds.length === 1 ? '' : 's'} from this tab.
              </div>
              <div className="text-[11px] text-purple-100/70">
                {recoveredAvailableCount} currently available for retry{recoveredMissingCount > 0 ? ` (${recoveredMissingCount} unavailable).` : '.'}
              </div>
              {lastFailedAt && (
                <div className="text-[11px] text-purple-100/70">Recovered {getRelativeAgeLabel(lastFailedAt)}.</div>
              )}
              {lastAvailabilityRefreshAt && (
                <div className="text-[11px] text-purple-100/70 flex items-center gap-1.5">
                  <span>Availability refreshed {getRelativeAgeLabel(lastAvailabilityRefreshAt)}.</span>
                  {isAvailabilityStale && (
                    <span className="rounded border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300">
                      stale
                    </span>
                  )}
                </div>
              )}
              {isAvailabilityStale && (
                <div className="text-[11px] text-yellow-300/90">
                  Availability may be outdated. Use “Refresh Availability” before retrying.
                </div>
              )}
              {lastRecoveredRetryOutcome && (
                <div className="text-[11px] text-purple-100/70">
                  Last recovered retry: {lastRecoveredRetryOutcome.successCount} sent, {lastRecoveredRetryOutcome.failedCount} failed ({getRelativeAgeLabel(lastRecoveredRetryOutcome.timestamp)}).
                </div>
              )}
              {nextRefreshCountdownSeconds !== null && (
                <div className="text-[11px] text-cyan-300/90">
                  Next auto-refresh in {nextRefreshCountdownSeconds}s.
                </div>
              )}
              <div className="text-[11px] text-zinc-400/90">
                Tip: Press <span className="font-mono text-zinc-300">R</span> to refresh availability, or <span className="font-mono text-zinc-300">Shift+R</span> to force refresh
                {hotkeyRefreshCooldownUntil !== null && hotkeyRefreshCooldownSeconds > 0
                  ? ` (${hotkeyRefreshCooldownSeconds}s cooldown)`
                  : "."}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && recoveredAvailableCount === 0 && (
            <div className="w-full text-[11px] text-zinc-400">
              Recovered retry is unavailable because no recovered sessions are currently open.
            </div>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <Button
              onClick={handleResetRecoveredPreferences}
              disabled={sending || isBackgroundRetrying}
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              Reset Preferences
            </Button>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <div className="w-[160px]">
              <Select
                disabled={sending || isBackgroundRetrying}
                value={String(autoRefreshRecoveredIntervalMs)}
                onValueChange={(value) => setAutoRefreshRecoveredIntervalMs(Number.parseInt(value, 10))}
              >
                <SelectTrigger className="h-9 bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="15000" className="focus:bg-white/10 focus:text-white cursor-pointer">
                    Interval: 15s
                  </SelectItem>
                  <SelectItem value="30000" className="focus:bg-white/10 focus:text-white cursor-pointer">
                    Interval: 30s
                  </SelectItem>
                  <SelectItem value="60000" className="focus:bg-white/10 focus:text-white cursor-pointer">
                    Interval: 60s
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <Button
              onClick={() => setAutoRefreshRecoveredAvailability((prev) => !prev)}
              disabled={sending || isBackgroundRetrying}
              variant="outline"
              className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
            >
              {autoRefreshRecoveredAvailability ? 'Auto-refresh: On' : 'Auto-refresh: Off'}
            </Button>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <Button
              onClick={handleCopyRecoverySummary}
              disabled={sending || isBackgroundRetrying}
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              Copy Recovery Summary
            </Button>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <Button
              onClick={() => handleRefreshRecoveredAvailability()}
              disabled={sending || isBackgroundRetrying || refreshingRecoveredAvailability}
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              {refreshingRecoveredAvailability ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh Availability'
              )}
            </Button>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <Button
              onClick={handleClearRecoveredFailed}
              disabled={sending || isBackgroundRetrying}
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              Clear Recovered
            </Button>
          )}
          {!sending && !deliveryReport && lastFailedSessionIds.length > 0 && (
            <Button
              onClick={handleRetryLastFailed}
              disabled={sending || isBackgroundRetrying || recoveredAvailableCount === 0}
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              Retry Recovered Failed
            </Button>
          )}
          {!sending && deliveryReport && deliveryReport.failedSessions.length > 0 && (
            <Button
              onClick={handleCopyFailedIds}
              disabled={sending || isBackgroundRetrying}
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy Failed IDs
            </Button>
          )}
          {!sending && deliveryReport && deliveryReport.failedSessions.length > 0 && (
            <Button
              onClick={handleRetryFailed}
              disabled={sending || isBackgroundRetrying || !message.trim()}
              variant="outline"
              className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
            >
              Retry Failed Only
            </Button>
          )}
          {!sending && deliveryReport && deliveryReport.failedSessions.length > 0 && (
            <Button
              onClick={handleRetryFailedInBackground}
              disabled={sending || isBackgroundRetrying || !message.trim()}
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              {isBackgroundRetrying ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Retrying…
                </>
              ) : (
                'Retry Failed in Background'
              )}
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={sending || isBackgroundRetrying || !message.trim() || targetSessions.length === 0}
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Broadcast"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
