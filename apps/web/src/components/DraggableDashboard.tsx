'use client';

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';

import { WidgetContainer } from './WidgetContainer';
import { SquadWidget } from "../components/SquadWidget";
import { CouncilWidget } from "../components/CouncilWidget";
import ConnectionStatus from "../components/ConnectionStatus";
import IndexingStatus from "../components/IndexingStatus";
import DirectorConfig from "../components/DirectorConfig";
import { TraceViewer } from "../components/TraceViewer";
import { CommandRunner } from "../components/CommandRunner";
import { AutonomyControl } from "../components/AutonomyControl";
import { DirectorChat } from "../components/DirectorChat";
import { TrafficInspector } from "../components/TrafficInspector";
import { SkillsViewer } from "../components/SkillsViewer";
import { ContextWidget } from "../components/ContextWidget";
import { CommandCheatsheet } from "../components/CommandCheatsheet";
import { AuditLogViewer } from "../components/AuditLogViewer";
import { SandboxWidget } from "../components/SandboxWidget";
import { TestStatusWidget } from "../components/TestStatusWidget";
import { GraphWidget } from "../components/GraphWidget";
import { ShellHistoryWidget } from "../components/ShellHistoryWidget";
import SuggestionsPanel from "../components/SuggestionsPanel";
import { HealerWidget } from "../components/HealerWidget";
import IngestionStatus from "../components/IngestionStatus";
import { ActivityPulse, SystemHealth, LatencyMonitor, SecurityWidget } from "@hypercode/ui";
import { trpc } from "@/utils/trpc"; // Need tRPC to fetch stats
import { HelpWidget } from "../components/HelpWidget";
import { MirrorView } from "../components/MirrorView";

// Widget Registry
const WIDGETS: Record<string, { title: string, component: React.ReactNode, defaultColSpan?: string }> = {
    'help': { title: '📖 Feature Guide', component: <HelpWidget />, defaultColSpan: 'col-span-2' },
    'suggestions': { title: 'Engagement Suggestions', component: <SuggestionsPanel /> },
    'connection': { title: 'System Status', component: <ConnectionStatus /> },
    'indexing': { title: 'Indexing Status', component: <IndexingStatus /> },
    'ingestion': { title: 'Ops: Data Ingestion', component: <IngestionStatus /> },
    'healer': { title: 'Ops: Self-Healing Events', component: <HealerWidget />, defaultColSpan: 'col-span-2' },
    'autonomy': { title: 'Autonomy Controls', component: <AutonomyControl /> },
    'director_chat': { title: 'Director Chat', component: <DirectorChat /> },
    'council': { title: 'The Council', component: <CouncilWidget /> },
    'audit': { title: 'Audit Logs', component: <AuditLogViewer /> },
    'context': { title: 'Context Management', component: <ContextWidget /> },
    'cheatsheet': { title: 'Command Reference', component: <CommandCheatsheet /> },
    'shell': { title: 'Shell History', component: <ShellHistoryWidget />, defaultColSpan: 'col-span-full' },
    'skills': { title: 'Skills Registry', component: <SkillsViewer /> },
    'squad': { title: 'Squad Status', component: <SquadWidget /> },
    'tests': { title: 'Test Results', component: <TestStatusWidget /> },
    'sandbox': { title: 'Code Sandbox', component: <SandboxWidget /> },
    'graph_1': { title: 'Knowledge Graph (Primary)', component: <GraphWidget /> },
    'graph_2': { title: 'Knowledge Graph (Secondary)', component: <GraphWidget /> },
    'config': { title: 'System Config', component: <DirectorConfig /> },
    'runner': { title: 'Command Runner', component: <CommandRunner /> },
    'trace': { title: 'Trace Viewer', component: <TraceViewer /> },
    'traffic': { title: 'Traffic Inspector', component: <TrafficInspector /> },
    'activity_pulse': { title: 'Activity Pulse', component: <ConnectedActivityPulse />, defaultColSpan: 'col-span-2' },
    'system_health': { title: 'System Health', component: <ConnectedSystemHealth /> },
    'latency': { title: 'Latency', component: <ConnectedLatency /> },
    'security': { title: 'Security Shield', component: <WrappedSecurityWidget /> },
    'mirror': { title: 'Live Tab Mirror', component: <MirrorView />, defaultColSpan: 'col-span-2' }
};

function WrappedSecurityWidget() {
    return <SecurityWidget />;
}

function MetricsUnavailable({ message }: { message: string }) {
    return <div className="text-sm text-rose-300">{message}</div>;
}

function isMetricsStatsPayload(value: unknown): value is {
    series?: unknown[];
    counts?: Record<string, unknown>;
    averages?: Record<string, unknown>;
} {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeNumberRecord(value: unknown): Record<string, number> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return null;
    }

    const entries = Object.entries(value);
    if (entries.some(([, entryValue]) => typeof entryValue !== 'number')) {
        return null;
    }

    return Object.fromEntries(entries) as Record<string, number>;
}

// Wrapper Components for Data Fetching
function ConnectedActivityPulse() {
    const { data, error } = trpc.metrics.getStats.useQuery(undefined, { refetchInterval: 2000 });
    const unavailable = Boolean(error) || (data !== undefined && !isMetricsStatsPayload(data)) || (isMetricsStatsPayload(data) && data.series !== undefined && !Array.isArray(data.series));
    if (unavailable) return <MetricsUnavailable message={`Metrics unavailable: ${error?.message ?? 'Metrics returned an invalid payload.'}`} />;
    return <ActivityPulse series={Array.isArray(data?.series) ? data.series : []} />;
}

function ConnectedSystemHealth() {
    const { data, error } = trpc.metrics.getStats.useQuery(undefined, { refetchInterval: 5000 });
    const counts = isMetricsStatsPayload(data) ? normalizeNumberRecord(data.counts) : null;
    const unavailable = Boolean(error) || (data !== undefined && !isMetricsStatsPayload(data)) || (isMetricsStatsPayload(data) && data.counts !== undefined && counts === null);
    if (unavailable) return <MetricsUnavailable message={`Metrics unavailable: ${error?.message ?? 'Metrics returned an invalid payload.'}`} />;
    return <SystemHealth counts={counts ?? {}} />;
}

function ConnectedLatency() {
    const { data, error } = trpc.metrics.getStats.useQuery(undefined, { refetchInterval: 5000 });
    const averages = isMetricsStatsPayload(data) ? normalizeNumberRecord(data.averages) : null;
    const unavailable = Boolean(error) || (data !== undefined && !isMetricsStatsPayload(data)) || (isMetricsStatsPayload(data) && data.averages !== undefined && averages === null);
    if (unavailable) return <MetricsUnavailable message={`Metrics unavailable: ${error?.message ?? 'Metrics returned an invalid payload.'}`} />;
    return <LatencyMonitor averages={averages ?? {}} />;
}

// Default Order
const DEFAULT_LAYOUT = [
    'help',
    'suggestions',
    'security', 'system_health', 'latency',
    'mirror',
    'activity_pulse',
    'connection', 'indexing',
    'ingestion',
    'healer',
    'autonomy', 'council',
    'director_chat',
    'audit',
    'context', 'cheatsheet',
    'shell',
    'skills',
    'squad', 'tests',
    'sandbox',
    'graph_1', 'graph_2',
    'config',
    'runner',
    'trace', 'traffic'
];

export default function DraggableDashboard() {
    const [items, setItems] = useState(DEFAULT_LAYOUT);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const getSafeLocalStorage = (): Storage | null => {
        if (typeof window === 'undefined') return null;
        try {
            const storage = window.localStorage;
            // Touch a property so restricted contexts fail here and get handled.
            void storage.length;
            return storage;
        } catch {
            return null;
        }
    };

    const safeStorageGet = (key: string): string | null => {
        const storage = getSafeLocalStorage();
        if (!storage) return null;
        try {
            return storage.getItem(key);
        } catch {
            return null;
        }
    };

    const safeStorageSet = (key: string, value: string) => {
        const storage = getSafeLocalStorage();
        if (!storage) return;
        try {
            storage.setItem(key, value);
        } catch {
            // Intentionally ignore restricted storage contexts
        }
    };

    // Load from LocalStorage
    useEffect(() => {
        const saved = safeStorageGet('borg_dashboard_layout');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with default to ensure no missing widgets if code changed
                const allKeys = new Set([...parsed, ...DEFAULT_LAYOUT]);
                setItems(Array.from(allKeys));
            } catch (e) { console.error("Failed to load layout", e); }
        }
        setIsLoaded(true);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px drag before activation to prevent accidental clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);

                const newOrder = arrayMove(items, oldIndex, newIndex);
                safeStorageSet('borg_dashboard_layout', JSON.stringify(newOrder));
                return newOrder;
            });
        }

        setActiveId(null);
    };

    if (!isLoaded) return <div className="p-12 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="p-6">
                <SortableContext items={items} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1920px] mx-auto">
                        {items.map((id) => {
                            const widget = WIDGETS[id];
                            if (!widget) return null;

                            // Special spanning logic can be applied here using classes if needed
                            // For now, we wrap everything in the grid flow
                            return (
                                <WidgetContainer key={id} id={id} title={widget.title} className={widget.defaultColSpan}>
                                    {widget.component}
                                </WidgetContainer>
                            );
                        })}
                    </div>
                </SortableContext>

                {/* Drag Overlay for smooth visual */}
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-90 scale-105 cursor-grabbing">
                            <WidgetContainer id={activeId} title={WIDGETS[activeId]?.title || '...'} className="shadow-2xl ring-2 ring-blue-500">
                                {WIDGETS[activeId]?.component}
                            </WidgetContainer>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}
