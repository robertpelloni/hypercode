"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { CheckCircle2, Download, FileJson, Loader2, RefreshCcw, Save, RotateCcw } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { normalizeConfigItems, normalizeSyncTargets } from './settings-page-normalizers';

type ConfigItem = { key: string; value: string; description?: string };
type SupportedClient = 'claude-desktop' | 'cursor' | 'vscode';
type SyncTarget = {
    client: SupportedClient;
    path: string;
    candidates: string[];
    exists: boolean;
};
type ClientConfigPreview = {
    client: SupportedClient;
    targetPath: string;
    existed: boolean;
    serverCount: number;
    document: Record<string, unknown>;
    json: string;
};
type ClientConfigSyncResult = ClientConfigPreview & {
    written: boolean;
};

const CLIENT_LABELS: Record<SupportedClient, string> = {
    'claude-desktop': 'Claude Desktop',
    'cursor': 'Cursor',
    'vscode': 'VS Code',
};

export default function MCPSettings() {
    const mcpServersClient = trpc.mcpServers as any;
    const configQuery = trpc.config.list.useQuery();
    const { data: rawConfig, isLoading, refetch } = configQuery;
    const {
        data: rawSyncTargets,
        isLoading: areTargetsLoading,
        refetch: refetchTargets,
        error: syncTargetsError,
    } = mcpServersClient.syncTargets.useQuery();
    const config = normalizeConfigItems(rawConfig);
    const syncTargets = normalizeSyncTargets(rawSyncTargets);
    const configUnavailable = configQuery.isError || (rawConfig != null && !Array.isArray(rawConfig));
    const syncTargetsUnavailable = Boolean(syncTargetsError) || (rawSyncTargets != null && !Array.isArray(rawSyncTargets));
    const [editing, setEditing] = useState<Record<string, string>>({});
    const [selectedClient, setSelectedClient] = useState<SupportedClient>('claude-desktop');

    const previewQuery = mcpServersClient.exportClientConfig.useQuery(
        { client: selectedClient },
        {
            enabled: true,
        },
    ) as {
        data?: ClientConfigPreview;
        isLoading: boolean;
        isRefetching: boolean;
        refetch: () => Promise<unknown>;
    };

    const updateMutation = trpc.config.update.useMutation({
        onSuccess: () => {
            toast.success("Configuration updated");
            setEditing({});
            refetch();
        },
        onError: (err) => {
            toast.error(`Update failed: ${err.message}`);
        }
    });

    const syncMutation = mcpServersClient.syncClientConfig.useMutation({
        onSuccess: (result: ClientConfigSyncResult) => {
            toast.success(`Synced ${CLIENT_LABELS[result.client]} config to ${result.targetPath}`);
            void refetchTargets();
            void previewQuery.refetch();
        },
        onError: (error: Error) => {
            toast.error(`Sync failed: ${error.message}`);
        },
    }) as {
        isPending: boolean;
        mutate: (input: { client: SupportedClient }) => void;
    };

    function handleSave(key: string): void {
        if (editing[key] === undefined) return;
        updateMutation.mutate({ key, value: editing[key] });

    }

    function handleRefreshAll(): void {
        void refetch();
        void refetchTargets();
        void previewQuery.refetch();
    }

    function handleSyncClient(): void {
        syncMutation.mutate({ client: selectedClient });
    }

    const activeTarget = syncTargets.find((target) => target.client === selectedClient);
    const previewDocument = previewQuery.data;
    const serverCount = previewDocument?.serverCount ?? 0;
    const isPreviewLoading = previewQuery.isLoading || previewQuery.isRefetching;
    const isSyncing = syncMutation.isPending;
    const previewUnavailable = previewQuery.data != null && (typeof previewQuery.data !== 'object' || Array.isArray(previewQuery.data));

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Global Configuration</h1>
                    <p className="text-zinc-500">
                        System-wide settings and feature flags
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleRefreshAll} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                        <RotateCcw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-zinc-200">Client Config Sync</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3 md:grid-cols-3">
                        {syncTargets.map((target) => {
                            const isSelected = target.client === selectedClient;

                            return (
                                <button
                                    key={target.client}
                                    type="button"
                                    onClick={() => setSelectedClient(target.client as SupportedClient)}
                                    className={`rounded-lg border p-4 text-left transition ${isSelected
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-medium text-white">{CLIENT_LABELS[target.client as SupportedClient]}</div>
                                            <div className="mt-1 text-xs text-zinc-500">
                                                {target.exists ? 'Existing config detected' : 'Will create a new config file'}
                                            </div>
                                        </div>
                                        {target.exists ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                            <FileJson className="h-4 w-4 text-zinc-500" />
                                        )}
                                    </div>
                                    <div className="mt-3 break-all font-mono text-xs text-zinc-400">{target.path}</div>
                                </button>
                            );
                        })}
                    </div>

                    {areTargetsLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                        </div>
                    ) : syncTargetsUnavailable ? (
                        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                            Sync targets unavailable{syncTargetsError ? `: ${syncTargetsError.message}` : ' due to malformed data'}.
                        </div>
                    ) : syncTargets.length === 0 ? (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                            No supported MCP client targets were detected.
                        </div>
                    ) : (
                        <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-white">{CLIENT_LABELS[selectedClient]}</div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                        HyperCode will merge the current MCP server registry into this client config without discarding unrelated settings.
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div>
                                        <div className="text-zinc-500">Target path</div>
                                        <div className="break-all font-mono text-xs text-zinc-300">
                                            {activeTarget?.path ?? 'Loading…'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500">Current status</div>
                                        <div className="text-zinc-300">
                                            {activeTarget?.exists ? 'Existing config file found' : 'Config file will be created on sync'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500">MCP servers included</div>
                                        <div className="text-zinc-300">{serverCount}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={() => void previewQuery.refetch()}
                                        variant="outline"
                                        className="border-zinc-700 hover:bg-zinc-800"
                                        disabled={isPreviewLoading}
                                    >
                                        {isPreviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                        Refresh preview
                                    </Button>
                                    <Button
                                        onClick={handleSyncClient}
                                        className="bg-blue-600 hover:bg-blue-500 text-white"
                                        disabled={isSyncing || isPreviewLoading}
                                    >
                                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        Write config
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium text-white">Generated preview</div>
                                        <div className="text-xs text-zinc-500">
                                            This is the exact JSON HyperCode will write for {CLIENT_LABELS[selectedClient]}.
                                        </div>
                                    </div>
                                    {previewDocument?.existed ? (
                                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                                            merging into existing file
                                        </span>
                                    ) : (
                                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
                                            new file preview
                                        </span>
                                    )}
                                </div>

                                {isPreviewLoading ? (
                                    <div className="flex justify-center p-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                                    </div>
                                ) : previewUnavailable ? (
                                    <div className="rounded-md border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-300">
                                        Preview unavailable due to malformed data.
                                    </div>
                                ) : previewDocument ? (
                                    <pre className="max-h-[520px] overflow-auto rounded-md border border-zinc-800 bg-black/30 p-4 text-xs text-zinc-200">
                                        {previewDocument.json}
                                    </pre>
                                ) : (
                                    <div className="rounded-md border border-zinc-800 bg-black/20 p-6 text-sm text-zinc-500">
                                        Preview unavailable.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-zinc-200">System Parameters</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                        </div>
                    ) : configUnavailable ? (
                        <div className="text-center p-8 text-red-300 bg-red-950/20 rounded-lg border border-red-900/40">
                            Configuration inventory unavailable{configQuery.isError ? `: ${configQuery.error.message}` : ' due to malformed data'}.
                        </div>
                    ) : config.length === 0 ? (
                        <div className="text-center p-8 text-zinc-500">
                            No configuration parameters defined.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {config.map((item) => (
                                <div key={item.key} className="py-4 flex items-center justify-between group">
                                    <div className="flex-1 pr-8">
                                        <div className="font-mono text-sm text-blue-400 font-medium mb-1">{item.key}</div>
                                        <p className="text-xs text-zinc-500">{item.description || "No description provided."}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={editing[item.key] !== undefined ? editing[item.key] : item.value}
                                            onChange={(e) => setEditing({ ...editing, [item.key]: e.target.value })}
                                            className={`bg-zinc-950 border rounded px-3 py-1.5 text-sm text-white font-mono min-w-[300px] outline-none ${editing[item.key] !== undefined && editing[item.key] !== item.value
                                                ? 'border-yellow-500/50 ring-1 ring-yellow-500/20'
                                                : 'border-zinc-800 focus:border-blue-500'
                                                }`}
                                        />
                                        {editing[item.key] !== undefined && editing[item.key] !== item.value && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(item.key)}
                                                disabled={updateMutation.isPending}
                                                className="bg-green-600 hover:bg-green-500 h-8"
                                            >
                                                {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
