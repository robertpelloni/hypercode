"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button"
import { Input } from "./ui/input"

interface Prompt {
    id: string;
    version: number;
    description: string;
    template: string;
    updatedAt: string;
}

export function PromptLibrary() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [selected, setSelected] = useState<Prompt | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editedTemplate, setEditedTemplate] = useState("");
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/prompts');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            if (data.prompts) setPrompts(data.prompts);
            else setPrompts([]);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unable to fetch prompts';
            setError(message);
            setPrompts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selected) return;

        await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selected.id,
                description: selected.description,
                template: editedTemplate
            })
        });

        await fetchPrompts();
        setEditMode(false);
    };

    const filteredPrompts = prompts.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return p.id.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });

    return (
        <div className="flex h-[80vh] border border-white/10 rounded-xl overflow-hidden glass-panel">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-white/10 bg-black/20 overflow-y-auto">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Prompts</h2>
                    <div className="mt-3 space-y-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter prompts..."
                            className="bg-black/30 border-white/10"
                        />
                        {error ? (
                            <div className="text-xs text-red-400 flex items-center justify-between">
                                <span>Load failed: {error}</span>
                                <Button size="sm" variant="ghost" onClick={fetchPrompts}>Retry</Button>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div>
                    {loading ? (
                        <div className="p-4 text-sm text-gray-400">Loading prompts...</div>
                    ) : filteredPrompts.map(p => (
                        <div
                            key={p.id}
                            onClick={() => { setSelected(p); setEditedTemplate(p.template); setEditMode(false); }}
                            className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selected?.id === p.id ? 'bg-blue-500/10 border-l-2 border-l-blue-400' : ''}`}
                        >
                            <div className="font-mono font-bold text-sm text-blue-200">{p.id}</div>
                            <div className="text-xs text-gray-400 truncate">{p.description}</div>
                            <div className="text-[10px] text-gray-600 mt-1">v{p.version} • {new Date(p.updatedAt).toLocaleDateString()}</div>
                        </div>
                    ))}
                    {!loading && !error && filteredPrompts.length === 0 ? (
                        <div className="p-4 text-xs text-gray-500">No prompts match current filter.</div>
                    ) : null}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-black/40">
                {selected ? (
                    <>
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-lg font-bold text-white">{selected.id}</h3>
                                <p className="text-xs text-gray-400">{selected.description}</p>
                            </div>
                            <div className="space-x-2">
                                {editMode ? (
                                    <>
                                        <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                                        <Button variant="default" onClick={handleSave}>Save Changes</Button>
                                    </>
                                ) : (
                                    <Button variant="outline" onClick={() => setEditMode(true)}>Edit Template</Button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 p-4 overflow-hidden">
                            {editMode ? (
                                <textarea
                                    className="w-full h-full bg-black/30 border border-white/10 rounded p-4 font-mono text-sm text-green-300 focus:outline-none focus:border-blue-500 resize-none"
                                    value={editedTemplate}
                                    onChange={(e) => setEditedTemplate(e.target.value)}
                                />
                            ) : (
                                <pre className="w-full h-full overflow-auto whitespace-pre-wrap font-mono text-sm text-gray-300 p-4">
                                    {selected.template}
                                </pre>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a prompt to edit
                    </div>
                )}
            </div>
        </div>
    );
}
