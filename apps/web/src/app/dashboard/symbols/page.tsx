"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from "@hypercode/ui";
import { Loader2, Code2, Trash2, Pin, Search, StickyNote, Star, Trash } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { filterSymbols, normalizeSymbols, type NormalizedSymbol, type SymbolType } from './symbols-page-normalizers';
import { PageStatusBanner } from '@/components/PageStatusBanner';

export default function SymbolsDashboard() {
    const { data: symbols, isLoading, error, refetch } = trpc.symbols.list.useQuery();
    const [searchQuery, setSearchQuery] = useState('');

    const unpinMutation = trpc.symbols.unpin.useMutation({
        onSuccess: () => {
            toast.success("Symbol unpinned");
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to unpin: ${err.message}`);
        }
    });

    const clearMutation = trpc.symbols.clear.useMutation({
        onSuccess: () => {
            toast.success("Pinned symbols cleared");
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to clear: ${err.message}`);
        }
    });

    const normalizedSymbols = normalizeSymbols(symbols);
    const filteredSymbols = filterSymbols(normalizedSymbols, searchQuery);
    const symbolsUnavailable = Boolean(error) || (symbols != null && !Array.isArray(symbols));

    return (
        <div className="p-8 space-y-8">
            <PageStatusBanner status="beta" message="Symbol Explorer" note="Pinned symbol workflows are active. Cross-repository indexing depth and richer LSP-derived metadata are still expanding." />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Code2 className="h-8 w-8 text-amber-500" />
                        Symbol Explorer
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Manage pinned code symbols, architectural references, and knowledge anchors
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-zinc-400 hover:text-red-400 border-zinc-800"
                        onClick={() => { if(confirm("Clear all pins?")) clearMutation.mutate(); }}
                        disabled={clearMutation.isPending || symbolsUnavailable || normalizedSymbols.length === 0}
                    >
                        <Trash className="mr-2 h-4 w-4" /> Clear All
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pinned symbols or files..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                />
            </div>

            {/* Symbol Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-full flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : symbolsUnavailable ? (
                    <div className="col-span-full text-center p-20 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Pin className="h-12 w-12 mx-auto mb-4 opacity-40 text-red-300" />
                        <p className="text-lg font-medium text-red-200">Symbol data unavailable.</p>
                        <p className="text-sm mt-1 text-red-300/80">{error?.message ?? 'Malformed symbol payload.'}</p>
                    </div>
                ) : filteredSymbols.length === 0 ? (
                    <div className="col-span-full text-center p-20 bg-zinc-900/30 rounded-lg border border-zinc-800 border-dashed">
                        <Pin className="h-12 w-12 mx-auto mb-4 opacity-10 rotate-12" />
                        <p className="text-lg font-medium text-zinc-500">No symbols pinned.</p>
                        <p className="text-sm mt-1 text-zinc-600">Pin critical functions or classes to anchor agent focus.</p>
                    </div>
                ) : (
                    filteredSymbols.map((symbol) => (
                        <SymbolCard key={symbol.id} symbol={symbol} onUnpin={() => unpinMutation.mutate({ id: symbol.id })} />
                    ))
                )}
            </div>
        </div>
    );
}

function SymbolCard({ symbol, onUnpin }: { symbol: NormalizedSymbol; onUnpin: () => void }) {
    return (
        <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onUnpin} className="text-zinc-500 hover:text-red-400 p-1">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getTypeColor(symbol.type)}`}>
                        {symbol.type}
                    </div>
                    <div className="flex items-center text-zinc-600">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < (symbol.priority || 1) ? 'text-amber-500 fill-amber-500' : 'text-zinc-800'}`} />
                        ))}
                    </div>
                </div>
                <CardTitle className="text-base font-bold text-zinc-100 font-mono truncate pt-1">
                    {symbol.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-[11px] text-zinc-500 font-mono break-all line-clamp-2 bg-zinc-950 p-2 rounded border border-zinc-800/50">
                    {symbol.file}
                    {symbol.lineStart && <span className="text-zinc-700 ml-1">:{symbol.lineStart}</span>}
                </div>
                
                {symbol.notes && (
                    <div className="flex gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded">
                        <StickyNote className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-400 italic">
                            {symbol.notes}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getTypeColor(type: SymbolType) {
    switch (type) {
        case 'function': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'class': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'interface': return 'bg-green-500/10 text-green-400 border-green-500/20';
        case 'variable': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
}
