"use client";

import React, { useState } from 'react';
import { trpc } from '../utils/trpc';

export function ContextWidget() {
    const [filePath, setFilePath] = useState('');
    const utils = trpc.useContext();

    const { data: rawFiles, error, isLoading } = trpc.borgContext.list.useQuery();
    const filesUnavailable = Boolean(error) || (rawFiles !== undefined && !Array.isArray(rawFiles));
    const files = !filesUnavailable ? (rawFiles as string[] | undefined) : undefined;
    const addMutation = trpc.borgContext.add.useMutation({
        onSuccess: () => {
            utils.borgContext.list.invalidate();
            setFilePath('');
        }
    });
    const removeMutation = trpc.borgContext.remove.useMutation({
        onSuccess: () => utils.borgContext.list.invalidate()
    });
    const clearMutation = trpc.borgContext.clear.useMutation({
        onSuccess: () => utils.borgContext.list.invalidate()
    });

    const handleAdd = () => {
        if (filePath) addMutation.mutate({ filePath });
    };

    const handleRemove = (path: string) => {
        removeMutation.mutate({ filePath: path });
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-mono font-semibold text-purple-400">📌 Working Set (Context)</h3>
                <button
                    onClick={() => clearMutation.mutate()}
                    className="text-xs text-red-500 hover:text-red-400 opacity-60 hover:opacity-100"
                    disabled={filesUnavailable || !files || files.length === 0}
                >
                    Clear All
                </button>
            </div>

            {isLoading ? (
                <div className="text-sm text-gray-500 animate-pulse">Loading context...</div>
            ) : filesUnavailable ? (
                <div className="text-sm text-red-400 italic">Context working set unavailable: {error?.message ?? 'Context working set returned an invalid payload.'}</div>
            ) : (
                <div className="space-y-2 mb-4">
                    {files && files.length > 0 ? (
                        files.map((file: string) => (
                            <div key={file} className="flex justify-between items-center bg-gray-800/50 p-2 rounded text-xs font-mono">
                                <span className="text-gray-300 truncate max-w-[80%]" title={file}>
                                    {file.split(/[\\/]/).pop()}
                                    <span className="text-gray-600 ml-2 text-[10px]">{file}</span>
                                </span>
                                <button
                                    onClick={() => handleRemove(file)}
                                    className="text-red-500 hover:text-red-400"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-gray-600 italic">No pinned files. The agent is analyzing the void.</div>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="File path (e.g. packages/core/src/MCPServer.ts)"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-purple-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={addMutation.isPending || !filePath}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                >
                    {addMutation.isPending ? '...' : 'Add'}
                </button>
            </div>
            {addMutation.error && <p className="text-xs text-red-400 mt-2">{addMutation.error.message}</p>}
        </div>
    );
}
