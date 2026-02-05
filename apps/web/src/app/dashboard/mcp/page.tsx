"use client";

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Server, Trash2, Globe, Terminal } from "lucide-react";

export default function MCPDashboard() {
    const { data: servers, isLoading, refetch } = trpc.mcp.list.useQuery();
    const [isAddOpen, setIsAddOpen] = useState(false);

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">MCP Aggregator</h1>
                    <p className="text-zinc-500">Manage downstream Model Context Protocol servers</p>
                </div>
                <Button onClick={() => setIsAddOpen(!isAddOpen)} className="bg-blue-600 hover:bg-blue-500">
                    <Plus className="mr-2 h-4 w-4" /> Add Server
                </Button>
            </div>

            {isAddOpen && (
                <AddServerForm onSuccess={() => { setIsAddOpen(false); refetch(); }} />
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-3 flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : servers?.map((server: any) => (
                    <ServerCard key={server.name} server={server} />
                ))}
            </div>
        </div>
    );
}

function ServerCard({ server }: { server: any }) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                    <Server className="h-5 w-5 text-zinc-500" />
                    {server.name}
                </CardTitle>
                <Badge status={server.status} />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="text-xs font-mono text-zinc-500 bg-black/50 p-2 rounded truncate">
                        {server.config.command} {server.config.args?.join(' ')}
                    </div>

                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>Tools:</span>
                        <span className="font-bold text-white">{server.toolCount}</span>
                    </div>

                    {server.config.env && (
                        <div className="flex flex-wrap gap-1">
                            {Object.keys(server.config.env).map(k => (
                                <span key={k} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-500">{k}</span>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function Badge({ status }: { status: string }) {
    const colors = {
        connected: "bg-green-500/10 text-green-500 border-green-500/20",
        stopped: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
        error: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs border ${colors[status as keyof typeof colors] || colors.stopped}`}>
            {status.toUpperCase()}
        </span>
    );
}

function AddServerForm({ onSuccess }: { onSuccess: () => void }) {
    const [mode, setMode] = useState<'git' | 'manual'>('git');
    const [formData, setFormData] = useState({
        name: '',
        repoUrl: '',
        command: 'npx',
        args: '',
        env: ''
    });

    const addMutation = trpc.mcp.add.useMutation({
        onSuccess: () => {
            onSuccess();
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const args = formData.args.split(' ').filter(Boolean);
        const env = formData.env ? JSON.parse(formData.env) : undefined;

        addMutation.mutate({
            name: formData.name,
            command: formData.command,
            args,
            env,
            repoUrl: mode === 'git' ? formData.repoUrl : undefined
        });
    };

    return (
        <Card className="bg-zinc-900 border-zinc-700 mb-8 border-l-4 border-l-blue-600">
            <CardContent className="pt-6">
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setMode('git')}
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${mode === 'git' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                        <Globe className="h-4 w-4" /> From Git Repo
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                        <Terminal className="h-4 w-4" /> Manual Config
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Server Name</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                placeholder="e.g. weather-server"
                            />
                        </div>
                        {mode === 'git' && (
                            <div>
                                <label className="text-xs text-zinc-500 uppercase font-bold">Repo URL</label>
                                <input
                                    required
                                    value={formData.repoUrl}
                                    onChange={e => setFormData({ ...formData, repoUrl: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white"
                                    placeholder="https://github.com/..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Command</label>
                            <input
                                required
                                value={formData.command}
                                onChange={e => setFormData({ ...formData, command: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white font-mono"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Args (space separated)</label>
                            <input
                                value={formData.args}
                                onChange={e => setFormData({ ...formData, args: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white font-mono"
                                placeholder="-y @modelcontextprotocol/server-memory"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold">Environment (JSON)</label>
                        <textarea
                            value={formData.env}
                            onChange={e => setFormData({ ...formData, env: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white font-mono h-20"
                            placeholder='{"API_KEY": "xyz"}'
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={addMutation.isPending} className="bg-green-600 hover:bg-green-500">
                            {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'git' ? 'Clone & Add Server' : 'Add Server Configuration'}
                        </Button>
                    </div>

                    {addMutation.error && (
                        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                            {addMutation.error.message}
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
