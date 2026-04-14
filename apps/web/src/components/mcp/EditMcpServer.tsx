"use client";

import { useState } from 'react';
import { Button } from "@hypercode/ui";
import { Database, Loader2, X, Server } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

interface EditMcpServerProps {
    server?: any; // If provided, edit mode. If null, create mode.
    onSuccess: () => void;
    onCancel: () => void;
}

export function EditMcpServer({ server, onSuccess, onCancel }: EditMcpServerProps) {
    const isEdit = !!server;
    const mcpServersClient = trpc.mcpServers as any;
    const initialType = server?.type ?? 'STDIO';
    const [formData, setFormData] = useState({
        name: server?.name || '',
        type: initialType,
        command: server?.command || '',
        args: (server?.args || []).join(' '),
        url: server?.url || '',
        bearerToken: server?.bearerToken || '',
        headersJson: JSON.stringify(server?.headers || {}, null, 2),
        envJson: JSON.stringify(server?.env || {}, null, 2),
    });
    const metadata = server?._meta;

    const createMutation = mcpServersClient.create.useMutation({
        onSuccess: () => {
            toast.success(`Server ${formData.name} created`);
            onSuccess();
        },
        onError: (err: any) => toast.error(`Failed to create: ${err.message}`)
    });

    const updateMutation = mcpServersClient.update.useMutation({ // Assuming update endpoint exists or we use addServer to overwrite
        onSuccess: () => {
            toast.success(`Server ${formData.name} updated`);
            onSuccess();
        },
        onError: (err: any) => toast.error(`Failed to update: ${err.message}`)
    });

    // Note: mcpServersRouter might strictly use 'create' (addServer) for both? 
    // Let's assume create works for upsert if logic allows, or we handled it in the router.
    // Checking back: router has create/update/delete.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const env = formData.envJson ? JSON.parse(formData.envJson) : {};
            const headers = formData.headersJson ? JSON.parse(formData.headersJson) : {};
            const args = formData.args.split(' ').filter(Boolean);

            const payload = {
                name: formData.name,
                type: formData.type as 'STDIO' | 'SSE' | 'STREAMABLE_HTTP',
                command: formData.type === 'STDIO' ? formData.command : undefined,
                args: formData.type === 'STDIO' ? args : undefined,
                url: formData.type === 'STDIO' ? undefined : formData.url,
                bearerToken: formData.type === 'STDIO' ? undefined : (formData.bearerToken.trim() || undefined),
                headers: formData.type === 'STDIO' ? undefined : headers,
                env: env,
                metadataStrategy: 'auto',
            };

            if (isEdit) {
                updateMutation.mutate({
                    uuid: server.uuid,
                    ...payload
                } as any);
            } else {
                createMutation.mutate(payload as any);
            }

        } catch (e: any) {
            toast.error(`Invalid JSON in Environment or Headers: ${e.message}`);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl mx-auto shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Server className="h-5 w-5 text-blue-500" />
                    {isEdit ? 'Edit Server' : 'Add New Server'}
                </h2>
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Server Name</label>
                        <input
                            required
                            disabled={isEdit} // Often names are IDs
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none disabled:opacity-50"
                            placeholder="e.g. filesystem"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Connection Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'STDIO' | 'SSE' | 'STREAMABLE_HTTP' })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                        >
                            <option value="STDIO">STDIO</option>
                            <option value="SSE">SSE</option>
                            <option value="STREAMABLE_HTTP">STREAMABLE_HTTP</option>
                        </select>
                    </div>
                </div>

                {formData.type === 'STDIO' ? (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Command</label>
                            <input
                                required
                                value={formData.command}
                                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                placeholder="e.g. npx"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Arguments (Space separated)</label>
                            <input
                                value={formData.args}
                                onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                placeholder="-y @modelcontextprotocol/server-filesystem /path/to/allow"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">URL</label>
                            <input
                                required
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                placeholder="https://example.com/mcp"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Bearer Token</label>
                                <input
                                    value={formData.bearerToken}
                                    onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none font-mono"
                                    placeholder="Optional bearer token"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Headers (JSON)</label>
                                <textarea
                                    value={formData.headersJson}
                                    onChange={(e) => setFormData({ ...formData, headersJson: e.target.value })}
                                    className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none font-mono text-sm"
                                    placeholder={'{\n  "Authorization": "Bearer ..."\n}'}
                                />
                            </div>
                        </div>
                    </>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Environment Variables (JSON)</label>
                    <textarea
                        value={formData.envJson}
                        onChange={(e) => setFormData({ ...formData, envJson: e.target.value })}
                        className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-blue-500 outline-none font-mono text-sm"
                        placeholder={'{\n  "KEY": "VALUE"\n}'}
                    />
                </div>

                <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                    This form always saves servers with <span className="font-semibold text-white">Auto</span> discovery. Use the dashboard’s <span className="font-semibold text-white">Clear cache</span> or <span className="font-semibold text-white">Refresh binary</span> actions when you need to override the normal behavior.
                </div>

                {isEdit ? (
                    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Database className="h-4 w-4 text-cyan-400" />
                            Current metadata snapshot
                        </div>
                        <div className="grid gap-2 text-xs text-zinc-400 md:grid-cols-2">
                            <div>Cache status: <span className="font-semibold text-white">{String(metadata?.status ?? 'pending')}</span></div>
                            <div>Source: <span className="font-semibold text-white">{String(metadata?.metadataSource ?? 'none')}</span></div>
                            <div>Cached tools: <span className="font-semibold text-white">{String(metadata?.toolCount ?? 0)}</span></div>
                            <div className="break-all">Last binary load: <span className="font-semibold text-white">{String(metadata?.lastSuccessfulBinaryLoadAt ?? 'never')}</span></div>
                        </div>
                    </div>
                ) : null}

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-500"
                    >
                        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEdit ? 'Save Changes' : 'Create Server'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
