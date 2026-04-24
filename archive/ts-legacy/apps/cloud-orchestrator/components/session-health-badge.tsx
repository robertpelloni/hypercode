"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { Session } from '@jules/shared';

interface SessionHealthBadgeProps {
  session: Session;
}

export function SessionHealthBadge({ session }: SessionHealthBadgeProps) {
  const health = useMemo(() => {
    if (session.status === 'failed') return { label: 'CRITICAL', color: 'text-red-500', bgColor: 'bg-red-500/10' };
    if (session.status === 'paused') return { label: 'STALLED', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    if (session.status === 'active') return { label: 'HEALTHY', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    return { label: 'STABLE', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  }, [session.status]);

  return (
    <Badge
      variant="outline"
      className={`h-4 px-1.5 text-[8px] font-mono font-bold uppercase tracking-tighter border-transparent ${health.bgColor} ${health.color}`}
    >
      {health.label}
    </Badge>
  );
}
