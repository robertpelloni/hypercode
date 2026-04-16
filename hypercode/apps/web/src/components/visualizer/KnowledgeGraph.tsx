
"use client";

import dynamic from 'next/dynamic';
import React, { useRef } from 'react';
import { trpc } from '@/utils/trpc'; // Assuming standard TRPC hook location or adjust
import { Card, CardHeader, CardTitle, CardContent } from '@hypercode/ui';

// ForceGraph must be dynamically imported as it uses window
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export function KnowledgeGraph() {
    // For now, we might fetch via a new TRPC procedure or a direct MCP call proxy.
    // Since Phase 29 didn't explicitly build a TRPC router yet, I'll mock the data fetch via "mcp_call" proxy or similar if available,
    // OR we can assume a `knowledge.getGraph` procedure exists.
    // Given previous patterns, I should probably add a TRPC router for this.
    // But for "Visual Grounding", let's visualize the "Knowledge Service" directly.

    // Use TRPC to fetch graph data
    const { data, error, isLoading } = trpc.knowledge.getGraph.useQuery({ query: undefined, depth: 2 }, {
        refetchOnWindowFocus: false
    });
    const graphUnavailable = Boolean(error) || (data !== undefined && (!data || typeof data !== 'object' || !Array.isArray((data as { nodes?: unknown }).nodes) || !Array.isArray((data as { edges?: unknown }).edges)));

    const graphData = React.useMemo(() => {
        if (!data || graphUnavailable) return { nodes: [], links: [] };
        return {
            nodes: data.nodes || [],
            links: (data.edges || []).map((e: { source: string; target: string; value?: number }) => ({
                source: e.source,
                target: e.target,
                value: e.value || 1
            }))
        };
    }, [data]);

    const fgRef = useRef();

    return (
        <Card className="h-[80vh] w-full flex flex-col">
            <CardHeader>
                <CardTitle>Memory Layout (Hippocampus)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative bg-zinc-950 overflow-hidden rounded-b-xl">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-zinc-400">Loading knowledge graph...</div>
                ) : graphUnavailable ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-red-300">
                        Knowledge graph unavailable: {error?.message ?? 'Knowledge graph returned an invalid payload.'}
                    </div>
                ) : graphData.nodes.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-zinc-500">No knowledge graph data available.</div>
                ) : (
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={graphData}
                        nodeLabel="id"
                        nodeColor={node => node.group === 1 ? '#ef4444' : '#3b82f6'}
                        linkColor={() => '#ffffff40'}
                        backgroundColor="#09090b" // Zinc-950
                    />
                )}
            </CardContent>
        </Card>
    );
}
