'use client';

import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import { Card } from '@hypercode/ui';
import { Input } from '@hypercode/ui';
import { Button } from '@hypercode/ui';
import { ScrollArea } from '@hypercode/ui';
import { Badge } from '@hypercode/ui';
import { Textarea } from '@hypercode/ui';
import { PageStatusBanner } from '@/components/PageStatusBanner';

function isSymbolResult(value: unknown): value is {
    kind?: number;
    name?: string;
    containerName?: string;
    location?: { uri?: string; range?: { start?: { line?: number } } };
} {
    return typeof value === 'object' && value !== null;
}

function isCodeModeStatus(value: unknown): value is {
    enabled: boolean;
    toolCount: number;
    tools: Array<{ name: string; description?: string }>;
    reduction: {
        traditional: number;
        codeMode: number;
        reductionPct: number;
    };
} {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { enabled?: unknown }).enabled === 'boolean'
        && typeof (value as { toolCount?: unknown }).toolCount === 'number'
        && Array.isArray((value as { tools?: unknown }).tools)
        && typeof (value as { reduction?: unknown }).reduction === 'object'
        && (value as { reduction?: unknown }).reduction !== null
        && typeof ((value as { reduction: { traditional?: unknown } }).reduction.traditional) === 'number'
        && typeof ((value as { reduction: { codeMode?: unknown } }).reduction.codeMode) === 'number'
        && typeof ((value as { reduction: { reductionPct?: unknown } }).reduction.reductionPct) === 'number';
}

export default function CodeDashboard() {
    const [filePath, setFilePath] = useState('packages/core/src/MCPServer.ts');
    const [query, setQuery] = useState('');
    const [codeInput, setCodeInput] = useState('// Example: call a registered tool\nawait read_file({ path: "README.md" });');

    // LSP queries
    const symbolsQuery = trpc.lsp.getSymbols.useQuery(
        { filePath },
        { enabled: !!filePath && !query }
    );

    const searchQuery = trpc.lsp.searchSymbols.useQuery(
        { query },
        { enabled: !!query }
    );

    const indexMutation = trpc.lsp.indexProject.useMutation();

    // Code Mode queries/mutations
    const statusQuery = trpc.codeMode.getStatus.useQuery(undefined, { refetchInterval: 3000 });
    const enableMutation = trpc.codeMode.enable.useMutation({ onSuccess: () => statusQuery.refetch() });
    const disableMutation = trpc.codeMode.disable.useMutation({ onSuccess: () => statusQuery.refetch() });
    const executeMutation = trpc.codeMode.execute.useMutation();

    const rawResults = query ? searchQuery.data : symbolsQuery.data;
    const isPending = query ? searchQuery.isPending : symbolsQuery.isPending;
    const symbolsError = query ? searchQuery.error : symbolsQuery.error;
    const resultsUnavailable = Boolean(symbolsError) || (rawResults !== undefined && (!Array.isArray(rawResults) || !rawResults.every(isSymbolResult)));
    const results = !resultsUnavailable && Array.isArray(rawResults) ? rawResults : [];

    const statusUnavailable = Boolean(statusQuery.error) || (statusQuery.data !== undefined && !isCodeModeStatus(statusQuery.data));
    const status = !statusUnavailable && isCodeModeStatus(statusQuery.data) ? statusQuery.data : undefined;
    const isEnabled = status?.enabled ?? false;
    const togglePending = enableMutation.isPending || disableMutation.isPending;

    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <PageStatusBanner status="beta" message="Code Intelligence" note="LSP symbol search and Code Mode escape hatch are live. Full graph exploration and deeper language-provider parity are in progress." />

            {/* ── LSP Section ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-400">Code Intelligence</h1>
                    <p className="text-muted-foreground">LSP Symbol Navigation & Search</p>
                </div>
                <Button
                    onClick={() => indexMutation.mutate()}
                    disabled={indexMutation.isPending}
                    variant="outline"
                >
                    {indexMutation.isPending ? 'Indexing...' : 'Re-Index Project'}
                </Button>
            </div>

            <Card className="p-4 flex gap-4 bg-gray-800 border-gray-700">
                <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">File Path (Relative to Root)</label>
                    <Input
                        value={filePath}
                        onChange={(e) => { setFilePath(e.target.value); setQuery(''); }}
                        className="bg-gray-900 border-gray-600 font-mono text-sm"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Search Symbols (Global)</label>
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-gray-900 border-gray-600 font-mono text-sm"
                        placeholder="e.g. MCPServer"
                    />
                </div>
            </Card>

            <Card className="flex-1 min-h-0 bg-gray-800 border-gray-700 overflow-hidden flex flex-col" style={{ minHeight: '240px' }}>
                <div className="p-3 border-b border-gray-700 bg-gray-900/50">
                    <h3 className="font-semibold text-sm text-gray-300">
                        {query ? `Search Results for "${query}"` : `Symbols in ${filePath}`}
                    </h3>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {isPending && <div className="text-gray-500 animate-pulse">Loading symbols...</div>}

                    {!isPending && resultsUnavailable && (
                        <div className="text-red-300 italic">Symbol search unavailable: {symbolsError?.message ?? 'Symbol search returned an invalid payload.'}</div>
                    )}

                    {!isPending && !resultsUnavailable && results.length === 0 && (
                        <div className="text-gray-500 italic">No symbols found. Try indexing the project.</div>
                    )}

                    <div className="space-y-2">
                        {results.map((symbol: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 group border border-transparent hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-1.5 py-0.5 rounded border ${symbol.kind === 6 ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                        symbol.kind === 5 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                            symbol.kind === 13 ? 'bg-purple-900/30 text-purple-400 border-purple-800' :
                                                'bg-gray-800 text-gray-400 border-gray-700'
                                        }`}>
                                        {getSymbolKindName(symbol.kind)}
                                    </span>
                                    <span className="font-mono text-sm text-gray-200">
                                        {symbol.containerName ? <span className="text-gray-500">{symbol.containerName}.</span> : ''}
                                        {symbol.name}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono opacity-50 group-hover:opacity-100">
                                    {symbol.location?.uri.split('/').pop()}:{symbol.location?.range?.start?.line + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* ── Code Mode Escape Hatch ── */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-orange-400 mb-1">Code Mode</h2>
                <p className="text-muted-foreground text-sm mb-4">
                    Escape hatch: let LLMs call tools via executable TypeScript instead of JSON schemas, achieving up to 94% context reduction.
                </p>

                {/* Status card */}
                <Card className="p-4 bg-gray-800 border-gray-700 mb-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-600'}`} />
                            <span className="font-semibold text-gray-200">
                                Code Mode is <span className={isEnabled ? 'text-green-400' : 'text-gray-400'}>{isEnabled ? 'ENABLED' : 'DISABLED'}</span>
                            </span>
                            {statusUnavailable ? (
                                <Badge variant="outline" className="text-xs border-red-800 text-red-300">
                                    unavailable
                                </Badge>
                            ) : status ? (
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                    {status.toolCount} tools registered
                                </Badge>
                            ) : null}
                            {status && isEnabled && (
                                <Badge variant="outline" className="text-xs border-orange-800 text-orange-400">
                                    {status.reduction.reductionPct}% context reduction
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant={isEnabled ? 'outline' : 'default'}
                                disabled={togglePending || statusQuery.isPending || statusUnavailable}
                                onClick={() => isEnabled ? disableMutation.mutate() : enableMutation.mutate()}
                                className={isEnabled ? 'border-gray-600' : 'bg-orange-600 hover:bg-orange-500 text-white'}
                            >
                                {togglePending ? '...' : isEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </div>
                    </div>

                    {statusUnavailable ? (
                        <div className="mt-3 text-sm text-red-300">
                            Code Mode status unavailable: {statusQuery.error?.message ?? 'Code Mode status returned an invalid payload.'}
                        </div>
                    ) : null}

                    {status && isEnabled && (
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-gray-900/60 rounded p-2">
                                <div className="text-xs text-gray-500 mb-1">Traditional (chars)</div>
                                <div className="font-mono text-sm text-red-400">{status.reduction.traditional.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-900/60 rounded p-2">
                                <div className="text-xs text-gray-500 mb-1">Code Mode (chars)</div>
                                <div className="font-mono text-sm text-green-400">{status.reduction.codeMode.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-900/60 rounded p-2">
                                <div className="text-xs text-gray-500 mb-1">Reduction</div>
                                <div className="font-mono text-sm text-orange-400">{status.reduction.reductionPct}%</div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Registered tools list */}
                {status && status.tools.length > 0 && (
                    <Card className="p-4 bg-gray-800 border-gray-700 mb-4">
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Registered Code Mode Tools ({status.tools.length})</h3>
                        <ScrollArea className="max-h-48">
                            <div className="space-y-1">
                                {status.tools.map((tool) => (
                                    <div key={tool.name} className="flex items-start gap-2 text-sm py-1 border-b border-gray-700/50 last:border-0">
                                        <span className="font-mono text-orange-300 shrink-0">{tool.name}</span>
                                        <span className="text-gray-500 text-xs">{tool.description}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </Card>
                )}

                {/* Direct code execution */}
                <Card className="p-4 bg-gray-800 border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Execute Code Directly</h3>
                    <Textarea
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        className="font-mono text-sm bg-gray-900 border-gray-600 min-h-[120px] mb-3"
                        placeholder="// Write executable code against the Code Mode SDK"
                    />
                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            disabled={!isEnabled || executeMutation.isPending || !codeInput.trim()}
                            onClick={() => executeMutation.mutate({ code: codeInput })}
                            className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40"
                        >
                            {executeMutation.isPending ? 'Running...' : '▶ Run'}
                        </Button>
                        {!isEnabled && (
                            <span className="text-xs text-gray-500">Enable Code Mode above to execute code.</span>
                        )}
                    </div>

                    {executeMutation.data && (
                        <div className={`mt-3 p-3 rounded text-sm font-mono whitespace-pre-wrap border ${executeMutation.data.success ? 'bg-green-950/40 border-green-800 text-green-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
                            {executeMutation.data.success
                                ? JSON.stringify(executeMutation.data.result ?? executeMutation.data.output, null, 2)
                                : executeMutation.data.error}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function getSymbolKindName(kind: number): string {
    const kinds: Record<number, string> = {
        1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
        6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
        11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant', 15: 'String'
    };
    return kinds[kind] || `Kind(${kind})`;
}
