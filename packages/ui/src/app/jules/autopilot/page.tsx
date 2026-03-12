"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { ApiKeySetup } from "@/components/api-key-setup";
import { CodeDiffSidebar } from "@/components/code-diff-sidebar";
import { KanbanBoard } from "@/components/kanban-board";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJules } from "@/lib/jules/provider";
import type { Activity, Session } from "@/types/jules";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { ArrowRightLeft, GitBranch, PanelLeftOpen, PanelRightOpen, Plus, Sparkles } from "lucide-react";

function getFinalDiff(activities: Activity[]): string | undefined {
	return activities.filter((activity) => activity.diff).slice(-1)[0]?.diff;
}

function getLatestActivityTime(activities: Activity[]): string | undefined {
	return activities[activities.length - 1]?.createdAt;
}

export default function JulesAutopilotPage() {
	const { apiKey, client, isLoading } = useJules();
	const [selectedSession, setSelectedSession] = useState<Session | null>(null);
	const [activities, setActivities] = useState<Activity[]>([]);
	const [showCodeDiffs, setShowCodeDiffs] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
	const [compareSessionId, setCompareSessionId] = useState("");
	const [compareSession, setCompareSession] = useState<Session | null>(null);
	const [compareActivities, setCompareActivities] = useState<Activity[]>([]);
	const [compareLoading, setCompareLoading] = useState(false);

	const repoUrl = useMemo(() => {
		if (!selectedSession?.sourceId) return undefined;
		return `https://github.com/${selectedSession.sourceId}`;
	}, [selectedSession?.sourceId]);

	const rightPanelVisible = showCodeDiffs || !!compareSession;
	const primaryDiff = useMemo(() => getFinalDiff(activities), [activities]);
	const secondaryDiff = useMemo(() => getFinalDiff(compareActivities), [compareActivities]);

	useEffect(() => {
		if (!client || !apiKey) return;

		let cancelled = false;

		const loadSessions = async () => {
			try {
				const sessions = await client.listSessions();
				if (!cancelled) {
					setAvailableSessions(sessions);
				}
			} catch {
				if (!cancelled) {
					setAvailableSessions([]);
				}
			}
		};

		void loadSessions();

		return () => {
			cancelled = true;
		};
	}, [client, apiKey, refreshKey]);

	useEffect(() => {
		if (!selectedSession || !compareSessionId) {
			setCompareSession(null);
			setCompareActivities([]);
			return;
		}

		if (compareSessionId === selectedSession.id) {
			setCompareSession(null);
			setCompareActivities([]);
			return;
		}

		const match = availableSessions.find((session) => session.id === compareSessionId) || null;
		setCompareSession(match);

		if (!client || !match) {
			setCompareActivities([]);
			return;
		}

		let cancelled = false;
		setCompareLoading(true);

		void client
			.listActivities(match.id)
			.then((loadedActivities) => {
				if (!cancelled) {
					setCompareActivities(loadedActivities);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setCompareActivities([]);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setCompareLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [availableSessions, client, compareSessionId, selectedSession]);

	const handleSessionCreated = () => {
		setRefreshKey((prev) => prev + 1);
	};

	const handleSessionArchived = () => {
		setRefreshKey((prev) => prev + 1);
		setSelectedSession(null);
		setActivities([]);
		setShowCodeDiffs(false);
		setCompareSessionId("");
		setCompareSession(null);
		setCompareActivities([]);
	};

	const compareOptions = useMemo(() => {
		return availableSessions.filter((session) => session.id !== selectedSession?.id);
	}, [availableSessions, selectedSession?.id]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-black text-white">
				<p className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
					Loading Jules workspace...
				</p>
			</div>
		);
	}

	if (!apiKey) {
		return <ApiKeySetup />;
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-black text-white">
			<header className="border-b border-white/[0.08] bg-zinc-950/95 px-4 py-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-lg font-bold tracking-tight text-white">Jules Autopilot</h1>
							<span className="inline-flex items-center gap-1 rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-cyan-300">
								<Sparkles className="h-3 w-3" />
								Live Workspace
							</span>
						</div>
						<p className="text-xs text-white/40">
							Real Jules sessions, live activity feed, and code diff inspection — no cardboard mockups allowed.
						</p>
					</div>

					<NewSessionDialog
						onSessionCreated={handleSessionCreated}
						trigger={
							<Button className="h-8 bg-purple-600 text-[10px] font-mono uppercase tracking-widest text-white hover:bg-purple-500">
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								New Session
							</Button>
						}
					/>
				</div>
			</header>

			<div className="grid min-h-0 flex-1 grid-cols-12">
				<aside className="col-span-4 min-h-0 border-r border-white/[0.08] bg-zinc-950/60 xl:col-span-3">
					<KanbanBoard key={refreshKey} onSelectSession={setSelectedSession} />
				</aside>

				<main className={`${selectedSession && rightPanelVisible ? "col-span-5 xl:col-span-6" : "col-span-8 xl:col-span-9"} min-h-0`}>
					{selectedSession ? (
						<div className="flex h-full min-h-0 flex-col">
							<div className="border-b border-white/[0.08] bg-zinc-950/70 px-4 py-3">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div className="min-w-0">
										<h2 className="truncate text-sm font-bold uppercase tracking-wide text-white">
											{selectedSession.title || "Untitled Session"}
										</h2>
										<div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-white/40">
											<span>{selectedSession.status}</span>
											<span className="flex items-center gap-1">
												<GitBranch className="h-3 w-3" />
												{selectedSession.branch || "main"}
											</span>
											{selectedSession.sourceId ? <span>{selectedSession.sourceId}</span> : null}
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2">
										<div className="flex items-center gap-2 rounded border border-white/10 bg-black/30 px-2 py-1.5">
											<ArrowRightLeft className="h-3.5 w-3.5 text-cyan-300" />
											<select
												value={compareSessionId}
												onChange={(e) => setCompareSessionId(e.target.value)}
												className="bg-transparent text-[10px] font-mono uppercase tracking-wider text-white/80 outline-none"
											>
												<option value="">Compare session…</option>
												{compareOptions.map((session) => (
													<option key={session.id} value={session.id}>
														{(session.title || "Untitled Session").slice(0, 40)}
													</option>
												))}
											</select>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setShowCodeDiffs((prev) => !prev)}
											className="h-8 border-white/10 bg-transparent text-[10px] font-mono uppercase tracking-widest text-white/70 hover:bg-white/5 hover:text-white"
										>
											{showCodeDiffs ? (
												<PanelRightOpen className="mr-1.5 h-3.5 w-3.5" />
											) : (
												<PanelLeftOpen className="mr-1.5 h-3.5 w-3.5" />
											)}
											{showCodeDiffs ? "Hide Diffs" : "Show Diffs"}
										</Button>
									</div>
								</div>

								{compareSession ? (
									<div className="mt-3 grid gap-3 md:grid-cols-2">
										<Card className="border-white/10 bg-black/30 text-white">
											<CardHeader className="pb-2">
												<CardTitle className="text-xs uppercase tracking-wider">Primary session</CardTitle>
												<CardDescription className="text-white/40">
													{selectedSession.title || "Untitled Session"}
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-1 text-[11px] text-white/70">
												<div>Activities: {activities.length}</div>
												<div>Diffs: {activities.filter((activity) => activity.diff).length}</div>
												<div>Latest: {getLatestActivityTime(activities) || "—"}</div>
											</CardContent>
										</Card>
										<Card className="border-cyan-500/20 bg-cyan-500/5 text-white">
											<CardHeader className="pb-2">
												<CardTitle className="text-xs uppercase tracking-wider">Comparison session</CardTitle>
												<CardDescription className="text-cyan-200/70">
													{compareSession.title || "Untitled Session"}
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-1 text-[11px] text-cyan-50/80">
												<div>Activities: {compareLoading ? "Loading…" : compareActivities.length}</div>
												<div>Diffs: {compareLoading ? "Loading…" : compareActivities.filter((activity) => activity.diff).length}</div>
												<div>Latest: {compareLoading ? "Loading…" : getLatestActivityTime(compareActivities) || "—"}</div>
											</CardContent>
										</Card>
									</div>
								) : null}
							</div>

							<div className="min-h-0 flex-1">
								<ActivityFeed
									key={selectedSession.id}
									session={selectedSession}
									onArchive={handleSessionArchived}
									showCodeDiffs={showCodeDiffs}
									onToggleCodeDiffs={setShowCodeDiffs}
									onActivitiesChange={setActivities}
								/>
							</div>
						</div>
					) : (
						<div className="flex h-full items-center justify-center p-8">
							<Card className="w-full max-w-xl border-white/[0.08] bg-zinc-950/60 text-white">
								<CardHeader>
									<CardTitle className="text-base uppercase tracking-wider">Select a session</CardTitle>
									<CardDescription className="text-white/40">
										Pick an existing Jules session from the board, or launch a new one to start sending work.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-white/60">
										This page now uses the live Jules provider-backed components already in the repo: session board, activity stream,
										plan approval, message sending, diff inspection, and lightweight session comparison.
									</div>
									<NewSessionDialog
										onSessionCreated={handleSessionCreated}
										trigger={
											<Button className="bg-purple-600 text-[10px] font-mono uppercase tracking-widest text-white hover:bg-purple-500">
												<Plus className="mr-1.5 h-3.5 w-3.5" />
												Create Session
											</Button>
										}
									/>
								</CardContent>
							</Card>
						</div>
					)}
				</main>

				{selectedSession && rightPanelVisible ? (
					<aside className="col-span-3 min-h-0 border-l border-white/[0.08] bg-zinc-950/60">
						<div className="border-b border-white/[0.08] px-4 py-3">
							<h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
								{compareSession ? "Session Compare" : "Code Changes"}
							</h3>
						</div>
						<div className="h-[calc(100%-49px)] min-h-0 overflow-auto p-4 space-y-4">
							{showCodeDiffs ? (
								<CodeDiffSidebar activities={activities} repoUrl={repoUrl} />
							) : null}

							{compareSession ? (
								<div className="space-y-4">
									<Card className="border-white/10 bg-black/30 text-white">
										<CardHeader className="pb-2">
											<CardTitle className="text-xs uppercase tracking-wider">Final diff comparison</CardTitle>
											<CardDescription className="text-white/40">
												Compare the latest code patches produced by each session.
											</CardDescription>
										</CardHeader>
									</Card>

									<div className="space-y-2">
										<h4 className="text-[10px] font-mono uppercase tracking-widest text-white/50">Primary</h4>
										{primaryDiff ? (
											<DiffViewer diff={primaryDiff} repoUrl={repoUrl} branch={selectedSession.branch || "main"} />
										) : (
											<div className="rounded border border-white/10 bg-black/20 p-3 text-[11px] text-white/40">
												No final diff available for the selected session.
											</div>
										)}
									</div>

									<div className="space-y-2">
										<h4 className="text-[10px] font-mono uppercase tracking-widest text-cyan-300/70">Comparison</h4>
										{compareLoading ? (
											<div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-3 text-[11px] text-cyan-100/70">
												Loading comparison session activity...
											</div>
										) : secondaryDiff ? (
											<DiffViewer diff={secondaryDiff} repoUrl={`https://github.com/${compareSession.sourceId}`} branch={compareSession.branch || "main"} />
										) : (
											<div className="rounded border border-white/10 bg-black/20 p-3 text-[11px] text-white/40">
												No final diff available for the comparison session.
											</div>
										)}
									</div>
								</div>
							) : null}
						</div>
					</aside>
				) : null}
			</div>
		</div>
	);
}