"use client";

import { useState } from 'react';
import { PageStatusBanner } from '@/components/PageStatusBanner';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypercode/ui";
import { Activity, Trash2, Search, RefreshCcw, BarChart3, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { filterLogEntries, filterLogEntriesByLevel, normalizeLogEntries, normalizeLogSummary } from './logs-page-normalizers';

function formatDuration(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

export default function LogsDashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [serverNameFilter, setServerNameFilter] = useState("");
    const [sessionIdFilter, setSessionIdFilter] = useState("");
    const [limit, setLimit] = useState(100);
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);

    const utils = trpc.useUtils();

    const listQueryInput = {
        limit,
        ...(serverNameFilter.trim().length > 0 ? { serverName: serverNameFilter.trim() } : {}),
        ...(sessionIdFilter.trim().length > 0 ? { sessionId: sessionIdFilter.trim() } : {}),
    };

    const summaryQuery = trpc.logs.summary.useQuery(
        { limit: 5000 },
        { refetchInterval: autoRefresh ? 10_000 : false },
    );

    const logsQuery = trpc.logs.list.useQuery(
        listQueryInput,
        { refetchInterval: autoRefresh ? 5_000 : false },
    );

    const clearLogs = trpc.logs.clear.useMutation({
        onSuccess: () => {
            toast.success("Logs cleared successfully");
            utils.logs.summary.invalidate();
            utils.logs.list.invalidate();
        },
        onError: (err) => toast.error(`Failed to clear logs: ${err.message}`),
    });

    const handleRefresh = async () => {
        await Promise.all([summaryQuery.refetch(), logsQuery.refetch()]);
        toast.success("Logs refreshed");
    };

    const isRefreshing = summaryQuery.isFetching || logsQuery.isFetching;
    const summaryUnavailable = summaryQuery.isError || (summaryQuery.data !== undefined && (!summaryQuery.data || typeof summaryQuery.data !== 'object' || Array.isArray(summaryQuery.data)));
    const logsUnavailable = logsQuery.isError || (logsQuery.data !== undefined && !Array.isArray(logsQuery.data));
    const normalizedSummary = !summaryUnavailable ? normalizeLogSummary(summaryQuery.data) : normalizeLogSummary(undefined);
    const normalizedLogs = !logsUnavailable ? normalizeLogEntries(logsQuery.data) : [];
    const logsErrorMessage = logsQuery.error?.message ?? 'Execution log history is unavailable.';
    const summaryErrorMessage = summaryQuery.error?.message ?? 'Execution log summary is unavailable.';

    const filteredLogs = filterLogEntriesByLevel(filterLogEntries(normalizedLogs, searchQuery), levelFilter);
    const topTools = normalizedSummary.topTools;
    const topToolMaxCount = topTools[0]?.count ?? 0;

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto w-full max-w-[1600px] mx-auto">
            <PageStatusBanner status="beta" message="Execution logs are filterable and searchable. Log streaming and advanced querying are planned." />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Activity className="h-8 w-8 text-cyan-500" />
                        Execution Logs
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Review real-time tool execution history, error rates, and performance metrics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={() => setAutoRefresh((current) => !current)}
                        variant="outline"
                        className="border-zinc-700 hover:bg-zinc-800"
                    >
                        {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
                    </Button>
                    <Button 
                        onClick={handleRefresh} 
                        disabled={isRefreshing}
                        variant="outline" 
                        className="border-zinc-700 hover:bg-zinc-800"
                    >
                        <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
                        Refresh
                    </Button>
                    <Button 
                        onClick={() => clearLogs.mutate()} 
                        disabled={clearLogs.isPending || normalizedSummary.totals.totalCalls === 0}
                        variant="destructive" 
                        className="bg-red-950/50 text-red-500 hover:bg-red-900/50 border border-red-900"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> 
                        Clear Logs
                    </Button>
                </div>
            </div>

            {summaryUnavailable || logsUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300 space-y-1">
                    {summaryUnavailable ? <div>{summaryErrorMessage}</div> : null}
                    {logsUnavailable ? <div>{logsErrorMessage}</div> : null}
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 font-medium text-sm">Total Calls</span>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {summaryUnavailable ? '—' : normalizedSummary.totals.totalCalls}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 font-medium text-sm">Success Rate</span>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {summaryUnavailable ? '—' : `${normalizedSummary.totals.successRate}%`}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 font-medium text-sm">Error Count</span>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {summaryUnavailable ? '—' : normalizedSummary.totals.errorCount}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 font-medium text-sm">Avg Duration</span>
                            <Clock className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {summaryUnavailable ? '—' : normalizedSummary.totals.avgDurationMs > 0 ? formatDuration(normalizedSummary.totals.avgDurationMs) : '0ms'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input 
                                placeholder="Filter by tool, server, or error..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                        <Input
                            value={serverNameFilter}
                            onChange={(e) => setServerNameFilter(e.target.value)}
                            placeholder="Server name filter"
                            className="lg:col-span-3 bg-zinc-900 border-zinc-800 text-white"
                        />
                        <Input
                            value={sessionIdFilter}
                            onChange={(e) => setSessionIdFilter(e.target.value)}
                            placeholder="Session ID filter"
                            className="lg:col-span-3 bg-zinc-900 border-zinc-800 text-white"
                        />
                        <div className="flex items-center gap-2 text-sm text-zinc-500 lg:col-span-3 justify-end">
                            <span>{logsUnavailable ? 'Showing — of —' : `Showing ${filteredLogs.length} of ${normalizedLogs.length}`}</span>
                            <select 
                                value={limit} 
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none"
                            >
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={500}>500</option>
                                <option value={1000}>1000</option>
                            </select>
                            <select
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none"
                                aria-label="Filter by level"
                            >
                                <option value="all">All levels</option>
                                <option value="info">Info</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                    </div>

                    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-zinc-950">
                                    <TableRow className="border-zinc-800 hover:bg-transparent">
                                        <TableHead className="w-[120px] text-zinc-400">Time</TableHead>
                                        <TableHead className="w-[80px] text-zinc-400">Status</TableHead>
                                        <TableHead className="w-[180px] text-zinc-400">Server</TableHead>
                                        <TableHead className="w-[200px] text-zinc-400">Tool</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 text-right">Duration</TableHead>
                                        <TableHead className="w-[320px] text-zinc-400">Message</TableHead>
                                        <TableHead className="text-zinc-400">Result / Error</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logsUnavailable ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-red-300">
                                                {logsErrorMessage}
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                                                No logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => {
                                            const isError = log.level === 'error' || Boolean(log.error);
                                            return (
                                                <TableRow key={log.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                                                    <TableCell className="font-mono text-xs text-zinc-500 whitespace-nowrap">
                                                        <div>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                                        <div className="text-[10px] text-zinc-600">{new Date(log.timestamp).toLocaleDateString()}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isError ? (
                                                            <Badge variant="destructive" className="h-5 text-[10px]">ERROR</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="h-5 text-[10px] border-green-500/30 text-green-400 bg-green-500/10">OK</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-zinc-300 truncate max-w-[180px]" title={log.serverName}>
                                                        {log.serverName || 'System'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-blue-400 truncate max-w-[200px]" title={log.toolName}>
                                                        {log.toolName}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-zinc-400 text-right">
                                                        {formatDuration(log.durationMs || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-zinc-500 truncate max-w-[320px]" title={log.message}>
                                                        {log.message ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-zinc-400 truncate max-w-[400px]" title={isError ? log.error : 'Success'}>
                                                        {isError ? (
                                                            <span className="text-red-400">{log.error || 'Unknown error'}</span>
                                                        ) : (
                                                            <span className="text-zinc-500">Execution completed</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-zinc-400" />
                                Top Activity
                            </CardTitle>
                            <CardDescription>Most frequently executed tools</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {summaryUnavailable ? (
                                    <div className="text-center text-sm text-red-300 py-4">{summaryErrorMessage}</div>
                                ) : topTools.length === 0 ? (
                                    <div className="text-center text-sm text-zinc-600 py-4">No tool activity recorded yet.</div>
                                ) : (
                                    topTools.map((tool) => (
                                        <div key={tool.name} className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-mono text-zinc-300 truncate max-w-[180px]" title={tool.name}>
                                                    {tool.name}
                                                </span>
                                                <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                                                    {tool.count}
                                                </span>
                                            </div>
                                            {/* Small activity bar relative to max item */}
                                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                                                <div 
                                                    className="bg-blue-500 h-full" 
                                                    style={{ width: `${topToolMaxCount > 0 && tool.count > 0 ? Math.max(2, (tool.count / topToolMaxCount) * 100 * (1 - (tool.errors / tool.count))) : 0}%` }} 
                                                />
                                                {tool.errors > 0 && (
                                                    <div 
                                                        className="bg-red-500 h-full opacity-60" 
                                                        style={{ width: `${tool.count > 0 ? Math.max(2, (tool.errors / tool.count) * 100) : 0}%` }} 
                                                        title={`${tool.errors} errors`}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
