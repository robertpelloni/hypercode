'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button, Input, Card } from '@hypercode/ui';

type ProviderListItem = {
    id: string;
    name: string;
    configured: boolean;
    envVar: string;
    keyPreview?: string;
};

function normalizeProviders(value: unknown): ProviderListItem[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    return value.filter((entry): entry is ProviderListItem => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }

        const provider = entry as Partial<ProviderListItem>;
        return (
            typeof provider.id === 'string'
            && typeof provider.name === 'string'
            && typeof provider.configured === 'boolean'
            && typeof provider.envVar === 'string'
            && (provider.keyPreview === undefined || typeof provider.keyPreview === 'string')
        );
    });
}

export function ModelProvidersList() {
    const providersQuery = trpc.settings.getProviders.useQuery();
    const updateKeyMutation = trpc.settings.updateProviderKey.useMutation({
        onSuccess: () => providersQuery.refetch()
    });
    const testMutation = trpc.settings.testConnection.useMutation();

    const [editingProvider, setEditingProvider] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; ms?: number; err?: string }>>({});
    const providers = normalizeProviders(providersQuery.data);
    const providersUnavailable = Boolean(providersQuery.error) || (providersQuery.data !== undefined && providers === null);

    const handleSave = async (providerId: string) => {
        if (!editValue.trim()) return;
        await updateKeyMutation.mutateAsync({ provider: providerId, key: editValue });
        setEditingProvider(null);
        setEditValue('');
    };

    const handleTest = async (providerId: string) => {
        setTestResults(prev => ({ ...prev, [providerId]: { success: false, err: 'Testing...' } }));
        const res = await testMutation.mutateAsync({ provider: providerId });
        if (res.success) {
            setTestResults(prev => ({ ...prev, [providerId]: { success: true, ms: res.latencyMs } }));
        } else {
            setTestResults(prev => ({ ...prev, [providerId]: { success: false, err: res.error } }));
        }
    };

    if (providersQuery.isLoading) {
        return <div className="p-4 text-gray-500 font-mono animate-pulse">Loading providers...</div>;
    }

    if (providersUnavailable) {
        return <div className="p-4 text-red-400 font-mono">Provider settings unavailable: {providersQuery.error?.message ?? 'Provider settings returned an invalid payload.'}</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Model Providers</h2>
            <p className="text-sm text-gray-400 mb-6">Manage API keys for LLM providers. Keys are stored locally in your <code>.env</code> file.</p>
            
            {providers && providers.length === 0 ? (
                <div className="text-sm text-gray-500">No model providers available.</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(providers ?? []).map((p) => (
                    <Card key={p.id} className="p-4 bg-gray-900 border-gray-800 flex flex-col space-y-3">
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-200">{p.name}</h3>
                            {p.configured ? (
                                <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded border border-green-800/50">Configured</span>
                            ) : (
                                <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded border border-gray-700">Missing Key</span>
                            )}
                        </div>
                        
                        <div className="text-xs text-gray-500 font-mono">{p.envVar}</div>
                        
                        <div className="flex-1 mt-2">
                            {editingProvider === p.id ? (
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        placeholder="Paste API Key..."
                                        className="bg-black border-gray-700 text-sm h-8"
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleSave(p.id)} disabled={updateKeyMutation.isPending} className="h-7 text-xs flex-1">
                                            {updateKeyMutation.isPending ? 'Saving...' : 'Save'}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingProvider(null)} className="h-7 text-xs flex-1">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="text-sm font-mono text-gray-400 bg-black/50 p-1.5 rounded border border-gray-800 flex justify-between items-center h-8">
                                        <span>{p.keyPreview || 'Not set'}</span>
                                        <button 
                                            onClick={() => { setEditingProvider(p.id); setEditValue(''); }}
                                            className="text-blue-400 hover:text-blue-300 text-xs px-2"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    {p.configured && (
                                        <div className="flex items-center justify-between">
                                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleTest(p.id)} disabled={testMutation.isPending}>
                                                Test Connection
                                            </Button>
                                            {testResults[p.id] && (
                                                <span className={`text-xs ${testResults[p.id].success ? 'text-green-400' : 'text-red-400'} truncate max-w-[120px]`} title={testResults[p.id].err}>
                                                    {testResults[p.id].success ? `${testResults[p.id].ms}ms` : testResults[p.id].err}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
