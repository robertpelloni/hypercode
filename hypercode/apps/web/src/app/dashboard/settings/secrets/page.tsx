'use client';

import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import { Card, Button, Input } from '@hypercode/ui';

function isSecretRecord(value: unknown): value is { key: string; updated_at: string | number | Date } {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { key?: unknown }).key === 'string'
        && ['string', 'number', 'object'].includes(typeof (value as { updated_at?: unknown }).updated_at);
}

export default function SecretsVault() {
    const utils = trpc.useUtils();
    const secretsQuery = trpc.secrets.list.useQuery();
    const secretsUnavailable = Boolean(secretsQuery.error)
        || (secretsQuery.data !== undefined && (!Array.isArray(secretsQuery.data) || !secretsQuery.data.every(isSecretRecord)));
    const secrets = !secretsUnavailable && Array.isArray(secretsQuery.data) ? secretsQuery.data : [];
    const setMutation = trpc.secrets.set.useMutation({
        onSuccess: () => utils.secrets.list.invalidate(),
    });
    const deleteMutation = trpc.secrets.delete.useMutation({
        onSuccess: () => utils.secrets.list.invalidate(),
    });

    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [log, setLog] = useState('');

    const handleAdd = async () => {
        if (!key.trim() || !value.trim()) return;
        try {
            await setMutation.mutateAsync({ key: key.trim(), value: value.trim() });
            setKey('');
            setValue('');
            setLog(`✅ Secret ${key.trim()} saved.`);
        } catch (error: any) {
            setLog(`❌ Error: ${error.message}`);
        }
    };

    const handleDelete = async (deleteKey: string) => {
        try {
            await deleteMutation.mutateAsync({ key: deleteKey });
            setLog(`✅ Secret ${deleteKey} deleted.`);
        } catch (error: any) {
            setLog(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-yellow-400">Secrets Vault</h1>
                <p className="text-muted-foreground">Manage environment variables and API keys safely injected into all MCP servers.</p>
            </div>

            <Card className="p-6 bg-gray-900 border-gray-700 flex flex-col gap-4">
                <h2 className="text-xl font-semibold text-white">Add New Secret</h2>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-sm text-gray-400">Key (e.g., OPENAI_API_KEY)</label>
                        <Input 
                            value={key} 
                            onChange={(e) => setKey(e.target.value)} 
                            placeholder="Key" 
                            className="bg-black border-gray-800 text-white mt-1"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-sm text-gray-400">Value</label>
                        <Input 
                            value={value} 
                            type="password"
                            onChange={(e) => setValue(e.target.value)} 
                            placeholder="Value" 
                            className="bg-black border-gray-800 text-white mt-1"
                        />
                    </div>
                    <Button 
                        onClick={handleAdd}
                        disabled={setMutation.isPending || !key.trim() || !value.trim()}
                        className="bg-yellow-600 hover:bg-yellow-500 mb-0.5"
                    >
                        {setMutation.isPending ? 'Saving...' : 'Add Secret'}
                    </Button>
                </div>
                {log && (
                    <div className={`mt-2 p-2 rounded text-sm font-mono ${log.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {log}
                    </div>
                )}
            </Card>

            <Card className="flex-1 min-h-0 bg-gray-900 border-gray-700 flex flex-col p-6 overflow-auto">
                <h2 className="text-xl font-semibold text-white mb-4">Stored Secrets</h2>
                {secretsQuery.isPending ? (
                    <div className="text-gray-500 font-mono">Loading secrets...</div>
                ) : secretsUnavailable ? (
                    <div className="text-red-300 text-sm rounded border border-red-900/40 bg-red-950/20 p-3">
                        {secretsQuery.error?.message ?? 'Secrets inventory is unavailable.'}
                    </div>
                ) : secrets.length === 0 ? (
                    <div className="text-gray-500 italic">No secrets configured.</div>
                ) : (
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-800 text-gray-400 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Key</th>
                                    <th className="px-4 py-3">Updated At</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {secrets.map((secret) => (
                                    <tr key={secret.key} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-mono text-green-400">{secret.key}</td>
                                        <td className="px-4 py-3">
                                            {new Date(secret.updated_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleDelete(secret.key)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
