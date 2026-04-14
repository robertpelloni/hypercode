"use client";

import Link from 'next/link';
import type { ComponentType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@hypercode/ui';
import {
    Bot,
    ExternalLink,
    Search,
    Sparkles,
    Wrench,
} from 'lucide-react';

type TestingCardProps = {
    title: string;
    description: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    accentClass: string;
};

function TestingCard(props: TestingCardProps) {
    const Icon = props.icon;

    return (
        <Link href={props.href} className="group">
            <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${props.accentClass}`} />
                        <div className="text-sm font-semibold text-white">{props.title}</div>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed">{props.description}</p>
                    <div className="inline-flex items-center gap-1 text-xs text-zinc-400 group-hover:text-white">
                        Open
                        <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function MCPTestingPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">MCP Testing Lab</h1>
                <p className="text-zinc-500 mt-2 max-w-3xl">
                    Experimental and operator-testing surfaces live here so the main MCP dashboard can stay focused on the router and aggregator control plane.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <TestingCard
                    title="Inspector"
                    description="Manual search → load → inspect → run flow with working-set visibility and embedded traffic inspection."
                    href="/dashboard/mcp/inspector"
                    icon={Wrench}
                    accentClass="text-blue-400"
                />
                <TestingCard
                    title="Server Probes"
                    description="Interactive client-style probes for every downstream server and for the HyperCode router itself, with request/response transcripts."
                    href="/dashboard/mcp/testing/servers"
                    icon={Wrench}
                    accentClass="text-cyan-400"
                />
                <TestingCard
                    title="Search"
                    description="Natural-language tool discovery and working-set control for progressive disclosure testing."
                    href="/dashboard/mcp/search"
                    icon={Search}
                    accentClass="text-teal-400"
                />
                <TestingCard
                    title="Agent Playground"
                    description="Conversational testing surface for agent/tool interaction experiments."
                    href="/dashboard/mcp/agent"
                    icon={Bot}
                    accentClass="text-pink-400"
                />
                <TestingCard
                    title="AI Tools & Extensions"
                    description="Broader tool and extension surfaces that are useful, but not central to the router control-plane story."
                    href="/dashboard/mcp/ai-tools"
                    icon={Sparkles}
                    accentClass="text-fuchsia-400"
                />
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Why this split exists</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-zinc-500">
                    <p>
                        The main MCP page should explain HyperCode as the <span className="text-zinc-200 font-medium">ultimate MCP aggregator/router</span>: aggregation, semantic search and grouping, lifecycle supervision, observability, and client config sync.
                    </p>
                    <p>
                        Inspector, search, and playground surfaces are still valuable, but they belong in a testing lab so the primary dashboard does not read like a bag of random demos.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
