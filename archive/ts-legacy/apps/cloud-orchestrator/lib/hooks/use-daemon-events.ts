'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DaemonEventType, DaemonEvent } from '@jules/shared';

type EventCallback<T = unknown> = (data: T) => void;
type EventSubscribers = Map<DaemonEventType, Set<EventCallback>>;

const subscribers: EventSubscribers = new Map();

/**
 * Emit a daemon event to all subscribers
 * Called by useDaemonWebSocket when a message is received
 */
export function emitDaemonEvent(event: DaemonEvent) {
  const callbacks = subscribers.get(event.type);
  if (callbacks) {
    callbacks.forEach((callback) => {
      try {
        callback(event.data);
      } catch (error) {
        console.error(`Error in daemon event handler for ${event.type}:`, error);
      }
    });
  }
}

/**
 * Subscribe to a specific daemon event type
 * Returns an unsubscribe function
 */
export function subscribeToDaemonEvent<T = unknown>(
  eventType: DaemonEventType,
  callback: EventCallback<T>
): () => void {
  if (!subscribers.has(eventType)) {
    subscribers.set(eventType, new Set());
  }
  
  const callbacks = subscribers.get(eventType)!;
  callbacks.add(callback as EventCallback);
  
  return () => {
    callbacks.delete(callback as EventCallback);
    if (callbacks.size === 0) {
      subscribers.delete(eventType);
    }
  };
}

/**
 * Hook to subscribe to daemon events
 * 
 * @param eventType - The type of daemon event to listen for
 * @param callback - Function called when the event is received
 * @param deps - Dependencies that should trigger re-subscription (like useEffect deps)
 * 
 * @example
 * // Subscribe to session updates for a specific session
 * useDaemonEvent('session_updated', (data) => {
 *   if (data.sessionId === mySessionId) {
 *     loadActivities();
 *   }
 * }, [mySessionId]);
 * 
 * @example
 * // Subscribe to activities updates
 * useDaemonEvent('activities_updated', (data) => {
 *   if (data.sessionId === mySessionId) {
 *     setActivities(data.activities);
 *   }
 * }, [mySessionId]);
 */
export function useDaemonEvent<T = unknown>(
  eventType: DaemonEventType,
  callback: EventCallback<T>,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const stableCallback = useCallback((data: T) => {
    callbackRef.current(data);
  }, []);
  
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvent(eventType, stableCallback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, stableCallback, ...deps]);
}

/**
 * Hook to subscribe to multiple daemon events at once
 * 
 * @param subscriptions - Map of event types to callbacks
 * @param deps - Dependencies that should trigger re-subscription
 * 
 * @example
 * useDaemonEvents({
 *   'session_updated': (data) => handleSessionUpdate(data),
 *   'activities_updated': (data) => handleActivitiesUpdate(data),
 *   'session_nudged': (data) => handleNudge(data),
 * }, [sessionId]);
 */
export function useDaemonEvents(
  subscriptions: Partial<Record<DaemonEventType, EventCallback>>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    
    for (const [eventType, callback] of Object.entries(subscriptions)) {
      if (callback) {
        const unsubscribe = subscribeToDaemonEvent(
          eventType as DaemonEventType,
          callback
        );
        unsubscribers.push(unsubscribe);
      }
    }
    
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
