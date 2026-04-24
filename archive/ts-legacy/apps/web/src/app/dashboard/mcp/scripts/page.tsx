"use client";

import { useState } from 'react';
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Loader2, Plus, FileCode, Trash2, Play, Edit2, TerminalSquare, XCircle } from "lucide-react";
=======
import { Card, CardHeader, CardTitle, CardContent } from "@borg/ui";
import { Button } from "@borg/ui";
import { Loader2, Plus, FileCode, Trash2, Play, Edit2 } from "lucide-react";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { normalizeSavedScripts } from './scripts-page-normalizers';

function isSavedScriptRowPayload(value: unknown): value is {
    uuid: string;
    name: string;
    description: string;
    code: string;
} {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { uuid?: unknown }).uuid === 'string'
        && typeof (value as { name?: unknown }).name === 'string'
        && typeof (value as { description?: unknown }).description === 'string'
        && typeof (value as { code?: unknown }).code === 'string';
}

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
type SavedScriptFormData = {
    uuid?: string;
    name: string;
    description: string;
    code: string;
};

type SavedScriptExecutionResult = {
    success: boolean;
    result?: string;
    error?: string;
    execution?: {
        scriptUuid?: string;
        scriptName?: string;
        startedAt?: string;
        finishedAt?: string;
        durationMs?: number;
    };
};

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
export default function ScriptsDashboard() {
    const scriptsQuery = trpc.savedScripts.list.useQuery();
    const { data: scripts, isLoading, refetch } = scriptsQuery;
    const [isCreateOpen, setIsCreateOpen] = useState(false);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
    const [editingScript, setEditingScript] = useState<SavedScriptFormData | null>(null);
    const [lastExecution, setLastExecution] = useState<SavedScriptExecutionResult | null>(null);
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
    const normalizedScripts = normalizeSavedScripts(scripts);
    const scriptsUnavailable = scriptsQuery.isError
        || (scripts != null && (!Array.isArray(scripts) || !scripts.every(isSavedScriptRowPayload)));

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
    const handleCreateSuccess = () => {
        setIsCreateOpen(false);
        refetch();
    };

    const handleEditSuccess = () => {
        setEditingScript(null);
        refetch();
    };

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Saved Scripts</h1>
                    <p className="text-zinc-500">
                        Manage and execute reusable automation scripts
                    </p>
                </div>
                <div className="flex gap-2">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
                    <Button onClick={() => {
                        setEditingScript(null);
                        setIsCreateOpen((open) => !open);
                    }} className="bg-blue-600 hover:bg-blue-500">
=======
                    <Button onClick={() => setIsCreateOpen(!isCreateOpen)} className="bg-blue-600 hover:bg-blue-500">
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
                        <Plus className="mr-2 h-4 w-4" /> New Script
                    </Button>
                </div>
            </div>

            {isCreateOpen && (
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
                <ScriptForm
                    mode="create"
                    onCancel={() => setIsCreateOpen(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {editingScript && (
                <ScriptForm
                    mode="edit"
                    initialData={editingScript}
                    onCancel={() => setEditingScript(null)}
                    onSuccess={handleEditSuccess}
                />
            )}

            {lastExecution && (
                <Card className="bg-zinc-900 border-zinc-700 border-l-4 border-l-emerald-600 shadow-xl">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <TerminalSquare className="h-5 w-5 text-emerald-400" />
                                Last Script Execution
                            </CardTitle>
                            <p className="text-sm text-zinc-400 mt-1">
                                {lastExecution.execution?.scriptName || 'Unknown script'}
                                {typeof lastExecution.execution?.durationMs === 'number' ? ` • ${lastExecution.execution.durationMs} ms` : ''}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLastExecution(null)}
                            className="text-zinc-500 hover:text-white h-8 w-8 p-0"
                            title="Dismiss execution result"
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className={`text-sm font-medium ${lastExecution.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {lastExecution.success ? 'Execution succeeded' : 'Execution failed'}
                        </div>
                        {(lastExecution.result || lastExecution.error) && (
                            <div className="bg-black/30 p-3 rounded border border-zinc-800">
                                <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words font-mono max-h-80 overflow-auto">
                                    {lastExecution.result || lastExecution.error}
                                </pre>
                            </div>
                        )}
                        {(lastExecution.execution?.startedAt || lastExecution.execution?.finishedAt) && (
                            <div className="text-xs text-zinc-500 space-y-1">
                                {lastExecution.execution?.startedAt && <p>Started: {lastExecution.execution.startedAt}</p>}
                                {lastExecution.execution?.finishedAt && <p>Finished: {lastExecution.execution.finishedAt}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
=======
                <CreateScriptForm onSuccess={() => { setIsCreateOpen(false); refetch(); }} />
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-3 flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : scriptsUnavailable ? (
                    <div className="col-span-3 text-center p-12 text-red-300 bg-red-950/20 rounded-lg border border-red-900/40">
                        <FileCode className="h-12 w-12 mx-auto mb-4 opacity-60" />
                        <p className="text-lg font-medium">Saved scripts unavailable</p>
                        <p className="text-sm mt-1">{scriptsQuery.isError ? scriptsQuery.error.message : 'Malformed saved scripts payload.'}</p>
                    </div>
                ) : normalizedScripts.length === 0 ? (
                    <div className="col-span-3 text-center p-12 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed">
                        <FileCode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No Scripts Saved</p>
                        <p className="text-sm mt-1">Save your common automation tasks here.</p>
                    </div>
                ) : normalizedScripts.map((script) => (
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
                    <ScriptCard
                        key={script.uuid}
                        script={script}
                        onUpdate={refetch}
                        onExecution={setLastExecution}
                        onEdit={(nextScript) => {
                            setIsCreateOpen(false);
                            setEditingScript(nextScript);
                        }}
                    />
=======
                    <ScriptCard key={script.uuid} script={script} onUpdate={refetch} />
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
                ))}
            </div>
        </div>
    );
}

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
function ScriptCard({
    script,
    onUpdate,
    onExecution,
    onEdit,
}: {
    script: SavedScriptFormData;
    onUpdate: () => void;
    onExecution: (result: SavedScriptExecutionResult) => void;
    onEdit: (script: SavedScriptFormData) => void;
}) {
=======
function ScriptCard({ script, onUpdate }: { script: any; onUpdate: () => void }) {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
    const deleteMutation = trpc.savedScripts.delete.useMutation({
        onSuccess: () => {
            toast.success("Script deleted");
            onUpdate();
        },
        onError: (err) => {
            toast.error(`Failed to delete: ${err.message}`);
        }
    });

    const runMutation = trpc.savedScripts.execute.useMutation({
        onSuccess: (result) => {
            toast.success("Script executed");
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
            onExecution(result as SavedScriptExecutionResult);
=======
            console.log("Script Result:", result);
            // Could show a modal result dialog here
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
        },
        onError: (err) => {
            toast.error(`Execution failed: ${err.message}`);
        }
    });

    return (
        <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2 truncate">
                    <FileCode className="h-5 w-5 text-yellow-500" />
                    <span className="truncate">{script.name}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            runMutation.mutate({ uuid: script.uuid });
                        }}
                        disabled={runMutation.isPending}
                        className="text-zinc-600 hover:text-green-400 transition-colors"
                        title="Run Script"
                    >
                        {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
                            onEdit(script);
                        }}
                        className="text-zinc-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit Script"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
                            if (confirm(`Delete script "${script.name}"?`)) {
                                deleteMutation.mutate({ uuid: script.uuid });
                            }
                        }}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-sm text-zinc-400 min-h-[40px] line-clamp-2">
                        {script.description || "No description."}
                    </p>
                    <div className="bg-black/30 p-2 rounded border border-zinc-800">
                        <pre className="text-[10px] text-zinc-500 font-mono h-20 overflow-hidden opacity-70">
                            {script.code}
                        </pre>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
function ScriptForm({
    mode,
    initialData,
    onCancel,
    onSuccess,
}: {
    mode: 'create' | 'edit';
    initialData?: SavedScriptFormData | null;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState<SavedScriptFormData>({
        uuid: initialData?.uuid,
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        code: initialData?.code ?? `// Write your script here
=======
function CreateScriptForm({ onSuccess }: { onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        code: `// Write your script here
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
// Use 'await mcp.toolName({...})' to call tools

console.log("Hello World");
`,
    });

    const createMutation = trpc.savedScripts.create.useMutation({
        onSuccess: () => {
            toast.success("Script saved");
            onSuccess();
        },
        onError: (err) => {
            toast.error(`Error saving script: ${err.message}`);
        }
    });

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
    const updateMutation = trpc.savedScripts.update.useMutation({
        onSuccess: () => {
            toast.success("Script updated");
            onSuccess();
        },
        onError: (err) => {
            toast.error(`Error updating script: ${err.message}`);
        }
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'edit' && formData.uuid) {
            updateMutation.mutate({
                uuid: formData.uuid,
                name: formData.name,
                description: formData.description,
                code: formData.code,
            });
            return;
        }
        createMutation.mutate({
            name: formData.name,
            description: formData.description,
            code: formData.code,
        });
=======
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
    };

    return (
        <Card className="bg-zinc-900 border-zinc-700 mb-8 border-l-4 border-l-yellow-600 shadow-xl">
            <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
                        {mode === 'create' ? <Plus className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                        {mode === 'create' ? 'New Script' : 'Edit Script'}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-500 hover:text-white h-6 w-6 p-0 rounded-full">
=======
                        <Plus className="h-3 w-3" /> New Script
                    </div>
                    <Button variant="ghost" size="sm" onClick={onSuccess} className="text-zinc-500 hover:text-white h-6 w-6 p-0 rounded-full">
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
                        X
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                            placeholder="e.g. daily-cleanup"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Description</label>
                        <input
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                            placeholder="Optional description"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Code (JS/TS)</label>
                        <textarea
                            required
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white font-mono h-64 focus:ring-1 focus:ring-yellow-500 outline-none"
                        />
                    </div>

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mcp/scripts/page.tsx
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending} className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? 'Save Script' : 'Update Script'}
=======
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={createMutation.isPending} className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium">
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Script
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mcp/scripts/page.tsx
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
