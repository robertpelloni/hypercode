
'use client';

import React from 'react';
import { KnowledgeGraph } from '@hypercode/ui';
import { trpc } from '@/utils/trpc';

function isSymbolGraphPayload(value: unknown): value is { nodes: unknown[]; links: unknown[] } {
    return typeof value === 'object'
        && value !== null
        && Array.isArray((value as { nodes?: unknown }).nodes)
        && Array.isArray((value as { links?: unknown }).links);
}

export default function BrainPage() {
    const graphQuery = trpc.graph.getSymbolsGraph.useQuery();
    const graphUnavailable = Boolean(graphQuery.error) || (graphQuery.data !== undefined && !isSymbolGraphPayload(graphQuery.data));
    const graphData = !graphUnavailable && isSymbolGraphPayload(graphQuery.data) ? graphQuery.data : { nodes: [], links: [] };

    const nodes = graphData.nodes.map((node: any) => ({
        id: node.id,
        label: node.name,
        type: 'concept' as const,
        val: node.val || 1
    }));

    const links = graphData.links.map((link: any) => ({
        source: link.source,
        target: link.target,
        value: 1
    }));

    return (
        <div className="h-full w-full p-6 flex flex-col">
            <header className="mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    The HyperCode Brain
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Visualizing the collective knowledge graph ({graphUnavailable ? '—' : nodes.length} nodes).
                </p>
            </header>

            {graphUnavailable ? (
                <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    Symbol graph unavailable: {graphQuery.error?.message ?? 'Symbol graph returned an invalid payload.'}
                </div>
            ) : null}

            <div className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-inner relative">
                <div className="absolute inset-0">
                    <KnowledgeGraph
                        nodes={nodes}
                        links={links}
                        loading={graphQuery.isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
