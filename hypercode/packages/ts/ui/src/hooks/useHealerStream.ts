"use client";

import { trpc } from '../utils/trpc';
import { useState, useEffect } from 'react';

export interface HealerEvent {
    timestamp: number;
    error: string;
    fix: any;
    success: boolean;
}

export function useHealerStream() {
    const [events, setEvents] = useState<HealerEvent[]>([]);

    // Initial history
    const historyQuery = trpc.healer.getHistory.useQuery(undefined, {
        refetchOnWindowFocus: false
    });

    // Subscription
    // trpc.healer.subscribe.useSubscription(undefined, {
    //     onData(data: HealerEvent) {
    //         setEvents((prev) => [data, ...prev]);
    //     },
    //     onError(err: any) {
    //         console.error('Healer subscription error:', err);
    //     }
    // });

    useEffect(() => {
        if (historyQuery.data) {
            // Merge history, avoiding duplicates if any
            // For now just set initial
            setEvents((historyQuery.data as any[]).reverse());
        }
    }, [historyQuery.data]);

    return {
        events,
        isLoading: historyQuery.isLoading,
        error: historyQuery.error?.message ?? null,
    };
}
