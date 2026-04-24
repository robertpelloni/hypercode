"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Badge, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@hypercode/ui';
import { trpc } from '@/utils/trpc';
import { Terminal, Globe, Wrench, Layers, ExternalLink, ShieldCheck, Cpu, Box, Clock, Search, Filter, RefreshCw } from 'lucide-react';
import { normalizeShellHistory } from './tools-page-normalizers';

export default function ToolsRegistryDashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [grouping, setGrouping] = useState<'server' | 'group'>('server');

    const shellHistoryQuery = trpc.shell.getSystemHistory.useQuery({ limit: 10 }, { refetchInterval: 5000 });
    const toolsQuery = trpc.mcp.listTools.useQuery(undefined, { refetchInterval: 10000 });

    const { data: shellHistory, isLoading: isLoadingHistory } = shellHistoryQuery;
    const { data: tools, isLoading: isLoadingTools } = toolsQuery;

    const normalizedShellHistory = normalizeShellHistory(shellHistory);
    const shellHistoryUnavailable = shellHistoryQuery.isError || (shellHistory != null && !Array.isArray(shellHistory));

    const filteredTools = useMemo(() => {
        if (!tools) return [];
        if (!searchQuery) return tools;
        const q = searchQuery.toLowerCase();
        return tools.filter(t => 
            t.name.toLowerCase().includes(q) || 
            t.description.toLowerCase().includes(q) ||
            t.server.toLowerCase().includes(q)
        );
    }, [tools, searchQuery]);

    const groupedTools = useMemo(() => {
        const groups: Record<string, typeof filteredTools> = {};
        filteredTools.forEach(tool => {
            const key = grouping === 'server' ? tool.serverDisplayName || tool.server : tool.semanticGroupLabel || tool.semanticGroup;
            if (!groups[key]) groups[key] = [];
            groups[key].push(tool);
        });
        return groups; groupNames: Object.keys(groups).sort()
    }, [filteredTools, grouping]);

    return (
        <div className="p-8 space-y-8 h-full flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Cpu className="h-8 w-8 text-fuchsia-500" />
                        Tools & Extensions
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Unified governance hub for Agent capabilities and external environment access
                    </p>
                </div>
            </div>

            {/* Quick Links Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                <Link href="/dashboard/mcp/tool-sets" className="group">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-indigo-500/50 transition-colors h-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                                Tool Sets
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-zinc-500">Manage curated collections of capabilities assigned to specific Agent personas.</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/browser" className="group">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors h-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                Semantic Browser
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-zinc-500">Monitor active headless Viewports granting Agents read/write access to the Web.</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/marketplace" className="group">
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors h-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                <Box className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                Extensions Marketplace
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-zinc-500">Discover, install, and audit verified tools from the community and official repos.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Tool Inventory Section */}
            <Card className="bg-zinc-900 border-zinc-800 flex flex-col shadow-xl">
                <CardHeader className="bg-black/20 border-b border-white/5 pb-4 shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-blue-400" />
                                Registered MCP Tools ({filteredTools.length})
                            </CardTitle>
                            <p className="text-xs text-zinc-500 mt-1">
                                Search and inspect all available capabilities across connected servers
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input 
                                    placeholder="Search tools..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-black/40 border-zinc-800 h-9 text-xs"
                                />
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 border-zinc-800 text-xs"
                                onClick={() => setGrouping(grouping === 'server' ? 'group' : 'server')}
                            >
                                <Filter className="h-3.5 w-3.5 mr-2" />
                                Group by {grouping === 'server' ? 'Category' : 'Server'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                    {isLoadingTools ? (
                        <div className="p-12 text-center text-zinc-500 animate-pulse flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            Indexing available tools...
                        </div>
                    ) : filteredTools.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500 italic">
                            No tools found matching your search.
                        </div>
                    ) : (
                        <div className="max-h-[600px] overflow-y-auto">
                            {Object.entries(groupedTools as any).map(([groupName, groupTools]: [string, any]) => (
                                <div key={groupName} className="border-b border-white/5 last:border-0">
                                    <div className="bg-zinc-800/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                                        {groupName}
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-[9px] h-4">
                                            {groupTools.length} tools
                                        </Badge>
                                    </div>
                                    <Table>
                                        <TableBody>
                                            {groupTools.map((tool: any) => (
                                                <TableRow key={tool.name} className="hover:bg-white/[0.02] border-zinc-800/50">
                                                    <TableCell className="w-1/3 py-3">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-mono text-xs font-bold text-blue-400">{tool.originalName || tool.name}</span>
                                                            <span className="text-[10px] text-zinc-500 truncate max-w-[300px]" title={tool.name}>{tool.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <p className="text-xs text-zinc-300 line-clamp-2">{tool.description}</p>
                                                    </TableCell>
                                                    <TableCell className="w-24 text-right py-3">
                                                        {tool.alwaysOn && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">ALWAYS ON</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Shell Router History Component */}
            <Card className="bg-zinc-900 border-zinc-800 flex flex-col shadow-xl min-h-[300px]">
                <CardHeader className="bg-black/20 border-b border-white/5 pb-4 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-fuchsia-400" />
                                Recent Shell Activity
                            </CardTitle>
                        </div>
                        <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10 flex gap-2 items-center">
                            <ShieldCheck className="h-3 w-3" />
                            Secure Mode
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="overflow-auto p-0 bg-[#0c0c0c] font-mono text-[11px] lg:text-xs">
                    {isLoadingHistory ? (
                        <div className="p-8 text-zinc-600 animate-pulse">Loading shell history...</div>
                    ) : normalizedShellHistory.length === 0 ? (
                        <div className="p-8 text-zinc-600 italic">No recent shell activity.</div>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {normalizedShellHistory.map((entry: any) => (
                                <li key={entry.id} className="p-3 hover:bg-white/[0.02]">
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="truncate">
                                            <span className="text-emerald-500">agent</span>
                                            <span className="text-zinc-600">$</span>
                                            <span className="text-zinc-200 ml-1">{entry.command}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-600 shrink-0">{entry.duration}ms</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const Loader2 = ({ className }: { className?: string }) => (
    <RefreshCw className={`animate-spin ${className}`} />
);
