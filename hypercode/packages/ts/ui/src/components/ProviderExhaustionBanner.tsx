"use client";

import React from 'react';
import { trpc } from '../utils/trpc';
import { toast } from 'sonner';

export function ProviderExhaustionBanner() {
    trpc.healer.subscribeQuotaEvents.useSubscription(undefined, {
        onData(data: any) {
            if (!data || !data.type) return;

            if (data.type === 'system:llm_quota_exhausted') {
                const { provider, modelId, reason } = data.payload || {};
                toast.error(`API Balance Exhausted: ${provider}`, {
                    description: `The ${provider} API (${modelId}) failed due to insufficient funds or quota limits. Automatic failover initiated. (${reason})`,
                    duration: 10000,
                });
            } else if (data.type === 'system:llm_fallback') {
                const { fromProvider, toProvider, toModelId } = data.payload || {};
                toast.info(`Model Re-routed`, {
                    description: `Failing gracefully from ${fromProvider} to ${toProvider} (${toModelId})`,
                    duration: 5000,
                });
            } else if (data.type === 'system:healer_halted') {
                toast.error(`Auto-Healer Halted`, {
                    description: `The healer attempted to execute but failed because LLM budgets are empty. Please check your billing dashboard.`,
                    duration: 10000,
                });
            }
        },
        onError(err: any) {
            console.error('Quota Subscription Error:', err);
        }
    });

    return null; // Headless component providing global quota alerting
}
