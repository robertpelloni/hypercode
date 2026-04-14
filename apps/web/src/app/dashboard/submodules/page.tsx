'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, Tabs, TabsContent, TabsList, TabsTrigger } from "@hypercode/ui";
import { useEffect, useState } from "react";
import { fetchSubmodulesAction, healSubmodulesAction, fetchUserLinksAction, fetchWorkspaceInventoryAction } from "./actions";
import { Button } from "@hypercode/ui";
import { Loader2, RefreshCw, GitCommit, Calendar, ExternalLink, Copy, Check, FolderTree, Package2, ScrollText } from "lucide-react";
import {
    normalizeSubmodules,
    normalizeUserLinks,
    normalizeWorkspaceInventory,
    summarizeSubmoduleCounts,
    type NormalizedLinkCategory,
    type NormalizedSubmoduleInfo,
    type NormalizedWorkspaceInventorySection,
} from './submodules-page-normalizers';

export default function SubmodulesPage() {
    const [submodules, setSubmodules] = useState<NormalizedSubmoduleInfo[]>([]);
    const [userLinks, setUserLinks] = useState<NormalizedLinkCategory[]>([]);
    const [workspaceInventory, setWorkspaceInventory] = useState<NormalizedWorkspaceInventorySection[]>([]);
    const [submoduleError, setSubmoduleError] = useState<string | null>(null);
    const [resourcesError, setResourcesError] = useState<string | null>(null);
    const [workspaceInventoryError, setWorkspaceInventoryError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.allSettled([
            fetchSubmodulesAction(),
            fetchUserLinksAction(),
            fetchWorkspaceInventoryAction(),
        ]).then(([subs, links, inventory]) => {
            if (cancelled) {
                return;
            }

            if (subs.status === 'fulfilled') {
                if (Array.isArray(subs.value)) {
                    setSubmodules(normalizeSubmodules(subs.value));
                    setSubmoduleError(null);
                } else {
                    setSubmodules([]);
                    setSubmoduleError('Submodule inventory unavailable due to malformed data.');
                }
            } else {
                setSubmodules([]);
                setSubmoduleError(subs.reason instanceof Error ? subs.reason.message : String(subs.reason));
            }

            if (links.status === 'fulfilled') {
                if (Array.isArray(links.value)) {
                    setUserLinks(normalizeUserLinks(links.value));
                    setResourcesError(null);
                } else {
                    setUserLinks([]);
                    setResourcesError('User resources unavailable due to malformed data.');
                }
            } else {
                setUserLinks([]);
                setResourcesError(links.reason instanceof Error ? links.reason.message : String(links.reason));
            }

            if (inventory.status === 'fulfilled') {
                if (Array.isArray(inventory.value)) {
                    setWorkspaceInventory(normalizeWorkspaceInventory(inventory.value));
                    setWorkspaceInventoryError(null);
                } else {
                    setWorkspaceInventory([]);
                    setWorkspaceInventoryError('Workspace inventory unavailable due to malformed data.');
                }
            } else {
                setWorkspaceInventory([]);
                setWorkspaceInventoryError(inventory.reason instanceof Error ? inventory.reason.message : String(inventory.reason));
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const summaryCounts = summarizeSubmoduleCounts(submodules, userLinks);

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Knowledge & Modules</h1>
                    <p className="text-muted-foreground mt-1">Manage git submodules, project structure, and external resources.</p>
                </div>
                <HealButton />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatusCard title="Clean" value={submoduleError ? '—' : summaryCounts.clean} color="text-green-500" />
                <StatusCard title="Dirty" value={submoduleError ? '—' : summaryCounts.dirty} color="text-yellow-500" />
                <StatusCard title="Missing" value={submoduleError ? '—' : summaryCounts.missing} color="text-red-500" />
                <StatusCard title="Resources" value={resourcesError ? '—' : summaryCounts.resources} color="text-blue-500" />
            </div>

            <Tabs defaultValue="modules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="modules">Git Submodules</TabsTrigger>
                    <TabsTrigger value="resources">User Resources</TabsTrigger>
                    <TabsTrigger value="structure">Project Structure</TabsTrigger>
                </TabsList>

                <TabsContent value="modules" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Repository Map ({submoduleError ? '—' : submodules.length})</CardTitle>
                            <CardDescription>
                                Active git submodules tracked in .gitmodules
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Scanning repository...
                                </div>
                            ) : submoduleError ? (
                                <div className="rounded-md border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                    {submoduleError}
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                                            <tr>
                                                <th className="p-4">Module Name</th>
                                                <th className="p-4">Package</th>
                                                <th className="p-4">Version</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4">HEAD Commit</th>
                                                <th className="p-4">Last Update</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {submodules.map((sub) => (
                                                <tr key={sub.path} className="hover:bg-muted/20 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-medium text-base">{sub.path.split('/').pop()}</div>
                                                        <div className="text-muted-foreground text-xs font-mono mt-1">{sub.path}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-mono text-xs text-blue-400">{sub.pkgName || '-'}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded w-fit">{sub.version || '-'}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <StatusBadge status={sub.status} />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 font-mono text-xs bg-zinc-100 dark:bg-zinc-800 w-fit px-2 py-1 rounded">
                                                                <GitCommit className="h-3 w-3" />
                                                                {sub.lastCommit?.substring(0, 7) || 'N/A'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate max-w-[300px]" title={sub.lastCommitMessage}>
                                                                {sub.lastCommitMessage || 'No commit message'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                            <Calendar className="h-3 w-3" />
                                                            {sub.lastCommitDate || 'Unknown'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {submodules.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                        No submodules found in .gitmodules
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Provided Resources</CardTitle>
                            <CardDescription>
                                Archived links and tools for assimilation. Source: `docs/USER_LINKS_ARCHIVE.md`
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {resourcesError ? (
                                <div className="rounded-md border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                    {resourcesError}
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {userLinks.map((cat, idx) => (
                                        <Card key={idx} className="h-fit">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-semibold">{cat.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid gap-2 text-sm">
                                                {cat.links.map((link, i) => (
                                                    <ResourceLink key={i} url={link} />
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {userLinks.length === 0 ? (
                                        <div className="text-sm text-muted-foreground italic">No user resources documented.</div>
                                    ) : null}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="structure">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>HyperCode Project Structure</CardTitle>
                                <CardDescription>
                                    Live workspace inventory for apps, packages, docs, scripts, and reference repos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-3">
                                <StatusCard title="Sections" value={workspaceInventoryError ? '—' : workspaceInventory.length} color="text-cyan-500" />
                                <StatusCard title="Tracked entries" value={workspaceInventoryError ? '—' : workspaceInventory.reduce((sum, section) => sum + section.entries.length, 0)} color="text-violet-500" />
                                <StatusCard title="Documented resources" value={resourcesError ? '—' : userLinks.length} color="text-amber-500" />
                            </CardContent>
                        </Card>

                        {workspaceInventoryError ? (
                            <div className="rounded-md border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                {workspaceInventoryError}
                            </div>
                        ) : workspaceInventory.map((section) => (
                            <Card key={section.id}>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <SectionIcon sectionId={section.id} />
                                        <CardTitle>{section.title}</CardTitle>
                                    </div>
                                    <CardDescription>{section.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {section.entries.map((entry) => (
                                            <div key={entry.path} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium">{entry.name}</div>
                                                        <div className="text-xs text-muted-foreground font-mono mt-1">{entry.path}</div>
                                                    </div>
                                                    <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                        {entry.kind}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{entry.summary}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {entry.packageName && (
                                                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-300 font-mono">
                                                            {entry.packageName}
                                                        </span>
                                                    )}
                                                    {entry.version && (
                                                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 font-mono">
                                                            v{entry.version}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {!workspaceInventoryError && workspaceInventory.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic">No workspace inventory sections reported.</div>
                        ) : null}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SectionIcon({ sectionId }: { sectionId: string }) {
    if (sectionId === 'apps') {
        return <FolderTree className="h-4 w-4 text-cyan-400" />;
    }

    if (sectionId === 'packages') {
        return <Package2 className="h-4 w-4 text-violet-400" />;
    }

    return <ScrollText className="h-4 w-4 text-amber-400" />;
}

function ResourceLink({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Extract domain for display
    let display = url;
    try {
        const u = new URL(url);
        display = u.hostname + (u.pathname.length > 1 ? u.pathname : '');
        if (display.length > 40) display = display.substring(0, 37) + '...';
    } catch { }

    return (
        <div className="flex items-center justify-between group rounded p-2 hover:bg-muted/50 transition-colors">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline truncate mr-2" title={url}>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{display}</span>
            </a>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={copy}>
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
            </Button>
        </div>
    )
}

function StatusCard({ title, value, color }: { title: string, value: number | string, color: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
        </Card>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        clean: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        dirty: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        missing: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        error: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.error}`}>
            {status.toUpperCase()}
        </span>
    );
}

function HealButton() {
    const [healing, setHealing] = useState(false);

    const handleHeal = async () => {
        setHealing(true);
        try {
            const res = await healSubmodulesAction();
            if (res.success) {
                alert("Submodules Healed! Refreshing page...");
                window.location.reload();
            } else {
                alert("Heal Failed: " + res.message);
            }
        } catch (e) {
            alert("Error: " + e);
        } finally {
            setHealing(false);
        }
    };

    return (
        <Button onClick={handleHeal} disabled={healing} variant="default">
            {healing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {healing ? "Healing..." : "Heal Submodules"}
        </Button>
    );
}

