
'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
    id: string;
    label: string;
    type: 'topic' | 'document' | 'concept';
    val: number;
}

interface GraphEdge {
    source: string;
    target: string;
    value: number;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphEdge[];
}

export function KnowledgeGraph() {
    const { theme } = useTheme();
    const fgRef = useRef<any>();
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch graph data from backend
        // TODO: Replace with real MCP call or API endpoint
        // consistent with KnowledgeService
        const fetchData = async () => {
            setLoading(true);
            try {
                // Mocking the MCP call for now until we have a bridge
                // In a real app, we would use a client like `mcpClient.callTool('get_knowledge_graph')`
                // OR fetch a local API route that calls the MCPServer

                // Simulating response for "Deep Research" context
                const mockData: GraphData = {
                    nodes: [
                        { id: 'AI', label: 'Artificial Intelligence', type: 'topic', val: 10 },
                        { id: 'MiroMindAI', label: 'MiroMindAI', type: 'document', val: 5 },
                        { id: 'OpenCodeInterpreter', label: 'OpenCodeInterpreter', type: 'document', val: 5 },
                        { id: 'LobeHub', label: 'LobeHub', type: 'document', val: 5 },
                        { id: 'LLM', label: 'LLM', type: 'concept', val: 7 },
                        { id: 'Agents', label: 'Agents', type: 'concept', val: 8 },
                    ],
                    links: [
                        { source: 'AI', target: 'MiroMindAI', value: 1 },
                        { source: 'AI', target: 'OpenCodeInterpreter', value: 1 },
                        { source: 'AI', target: 'LobeHub', value: 1 },
                        { source: 'MiroMindAI', target: 'Agents', value: 2 },
                        { source: 'OpenCodeInterpreter', target: 'LLM', value: 2 },
                        { source: 'Agents', target: 'LobeHub', value: 1 },
                    ]
                };

                setData(mockData);
            } catch (e) {
                console.error("Failed to fetch graph", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const isDark = theme === 'dark';

    return (
        <div className="w-full h-full relative bg-zinc-50 dark:bg-black rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                    <div className="animate-pulse text-zinc-500">Loading Brain...</div>
                </div>
            )}

            <ForceGraph2D
                ref={fgRef}
                width={800} // TODO: Make responsive
                height={600}
                graphData={data}
                nodeLabel="label"
                nodeColor={(node: any) => {
                    const n = node as GraphNode;
                    switch (n.type) {
                        case 'topic': return isDark ? '#60a5fa' : '#3b82f6'; // Blue
                        case 'document': return isDark ? '#34d399' : '#10b981'; // Green
                        case 'concept': return isDark ? '#a78bfa' : '#8b5cf6'; // Purple
                        default: return '#9ca3af';
                    }
                }}
                nodeVal="val"
                linkColor={() => isDark ? '#52525b' : '#d4d4d8'}
                backgroundColor={isDark ? '#000000' : '#ffffff'}
                onNodeClick={(node: any) => {
                    // Zoom to node on click
                    fgRef.current?.centerAt(node.x, node.y, 1000);
                    fgRef.current?.zoom(3, 2000);
                }}
            />

            <div className="absolute bottom-4 left-4 p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl pointer-events-none">
                <h3 className="font-bold text-sm mb-2">Legend</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Topic
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Document
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Concept
                </div>
            </div>
        </div>
    );
}
