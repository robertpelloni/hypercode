"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from '@borg/ui';
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
	const startupStatusQuery = trpc.startupStatus.useQuery(undefined, { refetchInterval: 10000 });
	const [claudeMemStatus, setClaudeMemStatus] = useState<ClaudeMemStoreStatus | null>(null);
	const [claudeMemStatusLoading, setClaudeMemStatusLoading] = useState(true);
	const [claudeMemStatusError, setClaudeMemStatusError] = useState<string | null>(null);
	const summary = getClaudeMemStatusSummary(startupStatusQuery.data ?? null);
	const operatorGuidance = getClaudeMemOperatorGuidance(claudeMemStatus);
	const upstreamGaps = CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'missing');

	const fetchClaudeMemStatus = useCallback(async () => {
		setClaudeMemStatusLoading(true);
		setClaudeMemStatusError(null);

		try {
			const response = await fetch('/api/trpc/memory.getClaudeMemStatus');
			const payload = await response.json();
			setClaudeMemStatus((payload?.result?.data ?? null) as ClaudeMemStoreStatus | null);
		} catch (error) {
			setClaudeMemStatusError(error instanceof Error ? error.message : 'Failed to read claude-mem store status');
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
						<BrainCircuit className="w-5 h-5 text-cyan-400" /> claude-mem Status
					</h1>
					<p className="text-gray-400 text-sm">
						Honest parity surface for Borg&apos;s current claude-mem assimilation: real adapter today, full hook/runtime parity later.
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
					<Badge variant="outline" className={summary.coreStatusTone === 'ready' ? 'border-emerald-500/30 text-emerald-300' : summary.coreStatusTone === 'pending' ? 'border-amber-500/30 text-amber-300' : 'border-zinc-700 text-zinc-300'}>
						<CheckCircle2 className="w-3 h-3 mr-1" /> {summary.coreStatusLabel}
					</Badge>
					<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
						void startupStatusQuery.refetch();
						void fetchClaudeMemStatus();
					}}>
						<RefreshCw className="w-3 h-3 mr-1" /> Refresh
					</Button>
				</div>
			</div>

			<div className="flex-1 p-6 overflow-auto">
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<CheckCircle2 className="w-4 h-4 text-emerald-400" /> Shipped now
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-white">{summary.shippedCount}</div>
							<p className="text-xs text-gray-400 mt-1">Concrete Borg capabilities already backed by source code</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<Route className="w-4 h-4 text-amber-400" /> Partial
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-white">{summary.partialCount}</div>
							<p className="text-xs text-gray-400 mt-1">Adjacent memory foundations that help, but do not equal upstream parity</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<AlertTriangle className="w-4 h-4 text-rose-400" /> Missing
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-white">{summary.missingCount}</div>
							<p className="text-xs text-gray-400 mt-1">Major upstream differentiators still absent from Borg today</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<BookOpenText className="w-4 h-4 text-cyan-400" /> Adapter store
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-white">{claudeMemStatus?.exists ? `${claudeMemStatus.totalEntries} entries` : 'No store yet'}</div>
							<p className="text-xs text-gray-400 mt-1">{claudeMemStatus?.exists
								? claudeMemStatus.runtimePipeline?.claudeMemEnabled
									? `${claudeMemStatus.sectionCount} section buckets under Borg-managed claude_mem.json`
									: 'Existing claude_mem.json detected, but the active runtime pipeline is not currently writing through claude-mem'
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
				</div>

				<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
					<Card>
						<CardHeader>
							<CardTitle>What changed here</CardTitle>
							<CardDescription>
								This route used to forward directly to the generic vector explorer. It now states the current claude-mem assimilation truth plainly.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-zinc-300">
							<p>
								Borg already has a real `ClaudeMemAdapter` plus a `RedundantMemoryManager`, which means there is meaningful source-level work in place.
							</p>
							<p>
								But upstream claude-mem parity still requires hook registration, structured observation compression, progressive-disclosure context injection, observation search/timeline tools, and transcript compression. Tiny dashboard, big honesty. We like that in a control plane.
							</p>
							<div className="flex flex-wrap gap-2 pt-1">
								<Link href="/dashboard/memory/vector" className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/15">
									Open vector memory explorer <ArrowRight className="h-3.5 w-3.5" />
								</Link>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Live adapter state</CardTitle>
							<CardDescription>
								Actual Borg-managed claude-mem store status from core.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-zinc-300">
							<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3">
								<div className="text-xs text-zinc-500">Store path</div>
								<div className="text-[11px] font-mono text-cyan-400 mt-1 break-all">{claudeMemStatus?.storePath ?? '.borg/claude_mem.json'}</div>
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
										{claudeMemStatus?.runtimePipeline?.claudeMemEnabled ? 'claude-mem active' : 'claude-mem inactive'}
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
									Build a Borg-native observation search/timeline layer so this adapter moves from raw persistence compatibility into real workflow parity.
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Tabs defaultValue="matrix" className="w-full mt-4">
					<TabsList>
						<TabsTrigger value="matrix">Parity matrix</TabsTrigger>
						<TabsTrigger value="evidence">Implementation evidence</TabsTrigger>
						<TabsTrigger value="gaps">Upstream gaps</TabsTrigger>
					</TabsList>

					<TabsContent value="matrix" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle>Current Borg vs claude-mem parity</CardTitle>
								<CardDescription>Each row maps to a concrete current capability or a known missing upstream differentiator.</CardDescription>
							</CardHeader>
							<CardContent>
								<ScrollArea className="h-[520px]">
									<div className="space-y-3">
										{CLAUDE_MEM_CAPABILITIES.map((item) => (
											<div key={item.title} className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-3">
												<div className="flex items-start justify-between gap-3">
													<div>
														<div className="font-medium text-white">{item.title}</div>
														<div className="text-xs text-gray-400 mt-2">{item.note}</div>
														<div className="text-[11px] text-cyan-400 mt-2 font-mono">{item.evidence}</div>
													</div>
													<Badge variant="outline" className={getStatusClasses(item.status)}>
														{item.status === 'shipped' ? 'Shipped' : item.status === 'partial' ? 'Partial' : 'Missing'}
													</Badge>
												</div>
											</div>
										))}
									</div>
								</ScrollArea>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="evidence" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle>Files that currently define the Borg side</CardTitle>
								<CardDescription>Useful jumping-off points for the next claude-mem slice.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{CLAUDE_MEM_IMPLEMENTATION_FILES.map((item) => (
									<div key={item.path} className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-3">
										<div className="flex items-start gap-3">
											<FileCode2 className="h-4 w-4 text-cyan-400 mt-0.5" />
											<div>
												<div className="font-medium text-white">{item.label}</div>
												<div className="text-[11px] font-mono text-cyan-400 mt-1">{item.path}</div>
												<div className="text-xs text-gray-400 mt-2">{item.note}</div>
											</div>
										</div>
									</div>
								))}
								{claudeMemStatus?.sections?.length ? (
									<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3">
										<div className="font-medium text-white">Current section counts</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
											{claudeMemStatus.sections.map((section) => (
												<div key={section.section} className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 flex items-center justify-between gap-3">
													<span className="text-xs text-zinc-300 font-mono">{section.section}</span>
													<Badge variant="outline" className="border-cyan-500/30 text-cyan-300">{section.entryCount}</Badge>
												</div>
											))}
										</div>
									</div>
								) : null}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="gaps" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle>Still missing from upstream claude-mem</CardTitle>
								<CardDescription>These are the major parity gaps that still separate Borg from a full claude-mem replacement.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{upstreamGaps.map((item) => (
									<div key={item.title} className="rounded border border-rose-500/20 bg-rose-950/10 px-3 py-3">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="font-medium text-white">{item.title}</div>
												<div className="text-xs text-gray-400 mt-2">{item.note}</div>
											</div>
											<Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-300">
												Missing
											</Badge>
										</div>
									</div>
								))}
								<div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs text-zinc-400">
									Short version: Borg has the adapter shell and surrounding memory primitives, but not yet the claude-mem hook, worker, search, or transcript-compression machinery. That distinction matters.
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
