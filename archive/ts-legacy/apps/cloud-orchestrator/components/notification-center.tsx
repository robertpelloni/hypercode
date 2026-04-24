'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Bell, Check, X, Trash2, AlertTriangle, AlertCircle, Info, CheckCircle2, Zap, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  dismissAllNotifications,
  type Notification,
} from '@/lib/api/notifications';

const typeConfig: Record<string, { icon: typeof Bell; color: string; bgColor: string }> = {
  info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  success: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  action: { icon: Zap, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
};

const categoryLabels: Record<string, string> = {
  session: 'Session',
  debate: 'Debate',
  recovery: 'Recovery',
  indexing: 'Indexing',
  issues: 'Issues',
  circuit_breaker: 'Circuit Breaker',
  scheduler: 'Scheduler',
  webhook: 'Webhook',
  system: 'System',
};

function NotificationCard({ notification, onRead, onDismiss }: {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      className={`group relative rounded-lg border transition-all cursor-pointer ${
        notification.isRead
          ? 'border-zinc-800/50 bg-zinc-900/30'
          : `${config.bgColor} border-zinc-700/50`
      }`}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      <div className="flex items-start gap-3 p-3">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-200 truncate">
              {notification.title}
            </span>
            {notification.priority > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                {notification.priority === 2 ? 'CRITICAL' : 'HIGH'}
              </Badge>
            )}
            {!notification.isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-zinc-400 line-clamp-2">{notification.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-zinc-500">{timeAgo}</span>
            {notification.category && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-zinc-700">
                {categoryLabels[notification.category] || notification.category}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const { data: countData, mutate: mutateCount } = useSWR(
    '/api/notifications/unread-count',
    () => fetchUnreadNotificationCount(),
    { refreshInterval: 15000 }
  );

  const { data, mutate, isLoading } = useSWR(
    open ? `/api/notifications?filter=${filter}` : null,
    () => fetchNotifications({
      includeRead: filter === 'all' || filter === 'read',
      includeDismissed: false,
      limit: 50,
    }),
    { refreshInterval: 10000 }
  );

  const unreadCount = countData || 0;
  const notifications = data?.notifications || [];

  const filteredNotifications = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications.filter(n => n.type === filter);

  const handleRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    mutate();
    mutateCount();
  }, [mutate, mutateCount]);

  const handleDismiss = useCallback(async (id: string) => {
    await dismissNotification(id);
    mutate();
    mutateCount();
  }, [mutate, mutateCount]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    mutate();
    mutateCount();
  }, [mutate, mutateCount]);

  const handleDismissAll = useCallback(async () => {
    await dismissAllNotifications();
    mutate();
    mutateCount();
  }, [mutate, mutateCount]);

  // Listen for real-time notification events
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'notification_created') {
        mutate();
        mutateCount();
      }
    };
    window.addEventListener('daemon-event', handler);
    return () => window.removeEventListener('daemon-event', handler);
  }, [mutate, mutateCount]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] p-0 bg-zinc-950 border-zinc-800">
        <SheetHeader className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-zinc-100">
              Notification Center
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-zinc-400 hover:text-zinc-200"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-zinc-400 hover:text-zinc-200"
                onClick={handleDismissAll}
                disabled={notifications.length === 0}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          <Tabs value={filter} onValueChange={setFilter} className="mt-2">
            <TabsList className="h-7 bg-zinc-900 p-0.5">
              <TabsTrigger value="all" className="text-[10px] h-6 px-2">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-[10px] h-6 px-2">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="error" className="text-[10px] h-6 px-2">
                <AlertCircle className="h-2.5 w-2.5 mr-1" />
                Errors
              </TabsTrigger>
              <TabsTrigger value="action" className="text-[10px] h-6 px-2">
                <Activity className="h-2.5 w-2.5 mr-1" />
                Actions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-400" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                  onDismiss={handleDismiss}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
