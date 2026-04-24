"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ScrollArea } from '@hypercode/ui';
=======
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ScrollArea } from '@borg/ui';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
=======
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ScrollArea } from '@borg/ui';
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
import { trpc } from '@/utils/trpc';
import { AlertTriangle, ArrowRight, BookOpenText, BrainCircuit, CheckCircle2, FileCode2, Layers3, Loader2, RefreshCw, Route } from 'lucide-react';

import { CLAUDE_MEM_CAPABILITIES, CLAUDE_MEM_IMPLEMENTATION_FILES, getClaudeMemOperatorGuidance, getClaudeMemStatusSummary, type ClaudeMemCapabilityStatus } from './claude-mem-status';

type ClaudeMemStoreStatus = {
	exists: boolean;
	storePath: string;
	totalEntries: number;
	sectionCount: number;
	defaultSectionCount: number;
	presentDefaultSectionCount: number;
	populatedSectionCount: number;
	missingSections: string[];
	runtimePipeline: {
		configuredMode: string;
		providerNames: string[];
		providerCount: number;
		claudeMemEnabled: boolean;
	};
	sections: Array<{
		section: string;
		entryCount: number;
	}>;
	lastUpdatedAt: string | null;
};

function getStatusClasses(status: ClaudeMemCapabilityStatus): string {
	if (status === 'shipped') {
		return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
	}

	if (status === 'partial') {
		return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
	}

	return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
}

export default function ClaudeMemDashboardPage() {
	const toolsClient = trpc.tools as any;
	const startupStatusQuery = trpc.startupStatus.useQuery(undefined, { refetchInterval: 10000 });
	const installArtifactsQuery = toolsClient?.detectInstallSurfaces?.useQuery
		? toolsClient.detectInstallSurfaces.useQuery(undefined, { refetchInterval: 10000 })
		: ({ data: null, refetch: async () => undefined } as { data: null; refetch: () => Promise<unknown> });
	const [claudeMemStatus, setClaudeMemStatus] = useState<ClaudeMemStoreStatus | null>(null);
	const [claudeMemStatusLoading, setClaudeMemStatusLoading] = useState(true);
	const [claudeMemStatusError, setClaudeMemStatusError] = useState<string | null>(null);
	const summary = getClaudeMemStatusSummary(startupStatusQuery.data ?? null, installArtifactsQuery.data ?? null);
	const operatorGuidance = getClaudeMemOperatorGuidance(claudeMemStatus);
	const upstreamGaps = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'missing');

	const fetchClaudeMemStatus = useCallback(async () => {
		setClaudeMemStatusLoading(true);
		setClaudeMemStatusError(null);

		try {
			const response = await fetch('/api/trpc/memory.getClaudeMemStatus');
			if (!response.ok) {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
				throw new Error(`Failed to read hypercode-memory store status (${response.status} ${response.statusText})`);
			}
			const payload = await response.json();
			if (payload?.error) {
				throw new Error(typeof payload.error?.message === 'string' ? payload.error.message : 'Failed to read hypercode-memory store status');
=======
				throw new Error(`Failed to read borg-memory store status (${response.status} ${response.statusText})`);
			}
			const payload = await response.json();
			if (payload?.error) {
				throw new Error(typeof payload.error?.message === 'string' ? payload.error.message : 'Failed to read borg-memory store status');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
			}
			setClaudeMemStatus((payload?.result?.data ?? null) as ClaudeMemStoreStatus | null);
		} catch (error) {
			setClaudeMemStatus(null);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
			setClaudeMemStatusError(error instanceof Error ? error.message : 'Failed to read hypercode-memory store status');
=======
			setClaudeMemStatusError(error instanceof Error ? error.message : 'Failed to read borg-memory store status');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
		} finally {
			setClaudeMemStatusLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchClaudeMemStatus();
	}, [fetchClaudeMemStatus]);

	return (
		<div className="w-full h-full flex flex-col">
			<div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
				<div>
					<h1 className="text-xl font-bold text-white flex items-center gap-2">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
						<BrainCircuit className="w-5 h-5 text-cyan-400" /> hypercode-memory Integration (Adapter)
					</h1>
					<p className="text-gray-400 text-sm">
						HyperCode&apos;s memory system is sovereign. The hypercode-memory layer is an adapter around HyperCode-native observations, prompts, summaries, and interchange workflows.
=======
						<BrainCircuit className="w-5 h-5 text-cyan-400" /> borg-memory Integration (Adapter)
					</h1>
					<p className="text-gray-400 text-sm">
						borg&apos;s memory system is sovereign. The borg-memory layer is an adapter around borg-native observations, prompts, summaries, and interchange workflows.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
=======
						<BrainCircuit className="w-5 h-5 text-cyan-400" /> claude-mem Integration (Adapter)
					</h1>
					<p className="text-gray-400 text-sm">
						Borg&apos;s memory system is sovereign. The claude-mem layer is an adapter around Borg-native observations, prompts, summaries, and interchange workflows.
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
					</p>
				</div>
				<div className="flex gap-2 items-center">
					{startupStatusQuery.isLoading ? (
						<Badge variant="outline" className="border-blue-600 text-blue-400">
							<Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading
						</Badge>
					) : null}
					{claudeMemStatusLoading ? (
						<Badge variant="outline" className="border-cyan-600 text-cyan-400">
							<Loader2 className="w-3 h-3 mr-1 animate-spin" /> Store status
						</Badge>
					) : null}
					{startupStatusQuery.isError ? (
						<Badge variant="outline" className="border-rose-600 text-rose-400">
							<AlertTriangle className="w-3 h-3 mr-1" /> Partial data
						</Badge>
					) : null}
					{claudeMemStatusError ? (
						<Badge variant="outline" className="border-rose-600 text-rose-400">
							<AlertTriangle className="w-3 h-3 mr-1" /> Store unreadable
						</Badge>
					) : null}
					<Badge variant="outline" className={summary.stage === 'compatibility-layer' ? 'border-amber-500/30 text-amber-300' : 'border-emerald-500/30 text-emerald-300'}>
						<Layers3 className="w-3 h-3 mr-1" /> {summary.stageLabel}
					</Badge>
					<Badge variant="outline" className={summary.coreStatusTone === 'ready'
						? 'border-emerald-500/30 text-emerald-300'
						: summary.coreStatusTone === 'pending' || summary.coreStatusTone === 'degraded'
							? 'border-amber-500/30 text-amber-300'
							: 'border-zinc-700 text-zinc-300'}>
						<CheckCircle2 className="w-3 h-3 mr-1" /> {summary.coreStatusLabel}
					</Badge>
					<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
						void startupStatusQuery.refetch();
						void installArtifactsQuery.refetch();
						void fetchClaudeMemStatus();
					}}>
						<RefreshCw className="w-3 h-3 mr-1" /> Refresh
					</Button>
				</div>
			</div>

			<div className="flex-1 p-6 overflow-auto">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<BookOpenText className="w-4 h-4 text-cyan-400" /> Adapter store
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-white">{claudeMemStatusError ? 'Store unreadable' : claudeMemStatus?.exists ? `${claudeMemStatus.totalEntries} entries` : 'No store yet'}</div>
							<p className="text-xs text-gray-400 mt-1">{claudeMemStatusError
								? claudeMemStatusError
								: claudeMemStatus?.exists
									? claudeMemStatus.runtimePipeline?.claudeMemEnabled
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
										? `${claudeMemStatus.sectionCount} section buckets under HyperCode-managed claude_mem.json`
										: 'Existing claude_mem.json detected, but the active runtime pipeline is not currently writing through hypercode-memory'
=======
										? `${claudeMemStatus.sectionCount} section buckets under borg-managed claude_mem.json`
										: 'Existing claude_mem.json detected, but the active runtime pipeline is not currently writing through borg-memory'
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
									: 'The adapter file has not been created yet for this workspace'}</p>
							{claudeMemStatus ? (
								<div className="mt-2">
									<Badge variant="outline" className={claudeMemStatus.runtimePipeline?.claudeMemEnabled ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300'}>
										{claudeMemStatus.runtimePipeline?.claudeMemEnabled ? 'Runtime active' : 'Runtime inactive'}
									</Badge>
								</div>
							) : null}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
								<Route className="w-4 h-4 text-emerald-400" /> HyperCode-native memory model
=======
								<Route className="w-4 h-4 text-emerald-400" /> borg-native memory model
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
=======
								<Route className="w-4 h-4 text-emerald-400" /> Borg-native memory model
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-zinc-300">
							<p>
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
								HyperCode already captures <strong>typed observations, structured prompts, and session summaries</strong> natively. The hypercode-memory layer exists to mirror and exchange that data with adjacent tools when needed.
							</p>
							<p>
								What is still missing is the deeper hypercode-memory runtime story: Claude Code lifecycle hooks, richer model-driven compression workers, observation timelines, progressive context injection, and transcript rewriting.
							</p>
							<div className="flex flex-wrap gap-2 pt-1">
								<Link href="/dashboard/memory" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/15">
									Open HyperCode memory dashboard <ArrowRight className="h-3.5 w-3.5" />
=======
								borg already captures <strong>typed observations, structured prompts, and session summaries</strong> natively. The borg-memory layer exists to mirror and exchange that data with adjacent tools when needed.
							</p>
							<p>
								What is still missing is the deeper borg-memory runtime story: Claude Code lifecycle hooks, richer model-driven compression workers, observation timelines, progressive context injection, and transcript rewriting.
							</p>
							<div className="flex flex-wrap gap-2 pt-1">
								<Link href="/dashboard/memory" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/15">
									Open borg memory dashboard <ArrowRight className="h-3.5 w-3.5" />
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
=======
								Borg already captures <strong>typed observations, structured prompts, and session summaries</strong> natively. The claude-mem layer exists to mirror and exchange that data with adjacent tools when needed.
							</p>
							<p>
								What is still missing is the deeper claude-mem runtime story: Claude Code lifecycle hooks, richer model-driven compression workers, observation timelines, progressive context injection, and transcript rewriting.
							</p>
							<div className="flex flex-wrap gap-2 pt-1">
								<Link href="/dashboard/memory" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/15">
									Open Borg memory dashboard <ArrowRight className="h-3.5 w-3.5" />
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle>Live adapter state</CardTitle>
							<CardDescription>
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
								Actual HyperCode-managed hypercode-memory store status from core.
=======
								Actual borg-managed borg-memory store status from core.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-zinc-300">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
							{claudeMemStatusError ? (
								<div className="rounded border border-rose-500/20 bg-rose-950/10 px-3 py-3">
									<div className="font-medium text-white">Store status unavailable</div>
									<div className="mt-2 text-xs text-rose-200">{claudeMemStatusError}</div>
								</div>
							) : null}
=======
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
							{summary.coreStatusDetail ? (
								<div className={summary.coreStatusTone === 'degraded'
									? 'rounded border border-amber-500/20 bg-amber-950/10 px-3 py-3'
									: 'rounded border border-zinc-800 bg-zinc-950 px-3 py-3'}>
									<div className="font-medium text-white">{summary.coreStatusLabel}</div>
									<div className="text-xs text-gray-400 mt-2">{summary.coreStatusDetail}</div>
								</div>
							) : null}
							<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3">
								<div className="text-xs text-zinc-500">Store path</div>
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
								<div className="text-[11px] font-mono text-cyan-400 mt-1 break-all">{claudeMemStatus?.storePath ?? '.hypercode/claude_mem.json'}</div>
=======
								<div className="text-[11px] font-mono text-cyan-400 mt-1 break-all">{claudeMemStatus?.storePath ?? '.borg/claude_mem.json'}</div>
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3">
									<div className="text-xs text-zinc-500">Last updated</div>
									<div className="text-sm text-white mt-1">{claudeMemStatus?.lastUpdatedAt ? new Date(claudeMemStatus.lastUpdatedAt).toLocaleString() : 'No entries yet'}</div>
								</div>
								<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3">
									<div className="text-xs text-zinc-500">Default buckets</div>
									<div className="text-sm text-white mt-1">
										{`${claudeMemStatus?.presentDefaultSectionCount ?? 0}/${claudeMemStatus?.defaultSectionCount ?? 0} present`}
									</div>
									<div className="text-[11px] text-zinc-500 mt-1">
										{`${claudeMemStatus?.populatedSectionCount ?? 0} populated · ${claudeMemStatus?.missingSections?.length ?? 0} missing`}
									</div>
								</div>
							</div>
							<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3">
								<div className="text-xs text-zinc-500">Runtime pipeline</div>
								<div className="text-sm text-white mt-1">{claudeMemStatus?.runtimePipeline?.configuredMode ?? 'unknown'}</div>
								<div className="text-[11px] text-zinc-500 mt-1">
									{claudeMemStatus?.runtimePipeline?.providerNames?.length
										? claudeMemStatus.runtimePipeline.providerNames.join(', ')
										: 'No active provider detail reported'}
								</div>
								<div className="mt-2">
									<Badge variant="outline" className={claudeMemStatus?.runtimePipeline?.claudeMemEnabled ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300'}>
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
										{claudeMemStatus?.runtimePipeline?.claudeMemEnabled ? 'hypercode-memory active' : 'hypercode-memory inactive'}
=======
										{claudeMemStatus?.runtimePipeline?.claudeMemEnabled ? 'borg-memory active' : 'borg-memory inactive'}
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
									</Badge>
								</div>
							</div>
							{claudeMemStatus?.missingSections?.length ? (
								<div className="rounded border border-amber-500/20 bg-amber-950/10 px-3 py-3">
									<div className="text-xs text-zinc-500">Missing default buckets</div>
									<div className="text-[11px] font-mono text-amber-300 mt-1 break-words">{claudeMemStatus.missingSections.join(', ')}</div>
								</div>
							) : null}
							<div className={operatorGuidance.tone === 'ready'
								? 'rounded border border-emerald-500/20 bg-emerald-950/10 px-3 py-3'
								: operatorGuidance.tone === 'warming'
									? 'rounded border border-zinc-700 bg-zinc-950 px-3 py-3'
									: 'rounded border border-amber-500/20 bg-amber-950/10 px-3 py-3'}>
								<div className="font-medium text-white">{operatorGuidance.title}</div>
								<div className="text-xs text-gray-400 mt-2">{operatorGuidance.detail}</div>
							</div>
							<div className="rounded border border-cyan-500/20 bg-cyan-950/10 px-3 py-3">
								<div className="font-medium text-white">Recommended engineering next slice</div>
								<div className="text-xs text-gray-400 mt-2">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/memory/claude-mem/page.tsx
									Finish the observation search, session timeline, and provenance workflow so HyperCode&apos;s native memory model is visible end to end before deeper hypercode-memory hook parity work.
=======
									Finish the observation search, session timeline, and provenance workflow so borg&apos;s native memory model is visible end to end before deeper borg-memory hook parity work.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
=======
									Finish the observation search, session timeline, and provenance workflow so Borg&apos;s native memory model is visible end to end before deeper claude-mem hook parity work.
>>>>>>> origin/rewrite/main-sanitized:apps/web/src/app/dashboard/memory/claude-mem/page.tsx
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

			</div>
		</div>
	);
}
