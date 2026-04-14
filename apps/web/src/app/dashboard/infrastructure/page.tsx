"use client";

import React from "react";
import { Server, Settings, Activity, TerminalSquare, AlertTriangle, CheckCircle2, ChevronRight, Download } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@hypercode/ui";
import { toast } from "sonner";

export default function InfrastructureDashboardPage() {
    const infrastructureClient = trpc.infrastructure as any;
    const { data: status, isLoading: isLoadingStatus, error: statusError, refetch } = infrastructureClient.getInfrastructureStatus.useQuery();
    const statusUnavailable = Boolean(statusError) || (status !== undefined && (!status || typeof status !== "object"));

    const applyMutation = trpc.infrastructure.applyConfigurations.useMutation({
        onSuccess: (data: any) => {
            if (data.success) {
                toast.success("Applied infrastructure configuration successfully.");
                refetch();
            } else {
                toast.error(`Failed to apply configuration: ${data.output}`);
            }
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`)
    });

    const doctorMutation = trpc.infrastructure.runDoctor.useMutation({
        onSuccess: (data: any) => {
            if (data.success) {
                toast.success("Health check completed.");
                console.log(data.output);
                // In a richer UI, output could be printed to a modal or terminal panel
            } else {
                toast.error(`Health check failed: ${data.output}`);
            }
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`)
    });

    return (
        <div className="p-8 space-y-8 bg-black min-h-screen text-white">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Server className="h-7 w-7 text-emerald-400" />
                    Daemon Orchestration
                </h1>
                <p className="text-zinc-500 mt-2">
                    Manage HyperCode infrastructure deployments from the Supervisor namespace.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-zinc-400" />
                            Infrastructure Daemon Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStatus ? (
                            <div className="animate-pulse space-y-3 pt-4">
                                <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                                <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                            </div>
                        ) : statusUnavailable ? (
                            <div className="space-y-4 pt-4">
                                <div className="rounded-md border border-red-900/30 bg-red-950/10 p-3 text-sm text-red-300">
                                    {statusError?.message ?? "Infrastructure daemon status is unavailable."}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-4">
                                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-md border border-zinc-800/50">
                                    <span className="text-sm font-medium text-zinc-400">Binary Installed</span>
                                    {status?.installed ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    )}
                                </div>

                                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-md border border-zinc-800/50">
                                    <span className="text-sm font-medium text-zinc-400">Config Discovered</span>
                                    {status?.hasConfig ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    )}
                                </div>
                                {!status?.installed && (
                                    <div className="text-xs text-amber-400/80 bg-amber-500/10 p-3 rounded border border-amber-500/20">
                                        Infrastructure binary not found in PATH or the local submodule bin directory.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="h-5 w-5 text-zinc-400" />
                            Configuration Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-zinc-400 mb-6">
                            Apply settings from your HyperCode infrastructure configuration across connected environments instantly.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                onClick={() => applyMutation.mutate()}
                                disabled={applyMutation.isPending || (status && !status.installed)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 justify-start px-4 flex items-center justify-between group transition-all"
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <Download className="h-4 w-4" /> Deploy Configuration
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Button>

                            <Button
                                onClick={() => doctorMutation.mutate()}
                                variant="outline"
                                disabled={doctorMutation.isPending || (status && !status.installed)}
                                className="w-full border-zinc-700 hover:bg-zinc-800 h-12 justify-start px-4 text-zinc-300 flex items-center justify-between group transition-all"
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <Activity className="h-4 w-4" /> Run Health Check
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TerminalSquare className="h-5 w-5 text-zinc-400" />
                        Native Dashboard Tunnel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-zinc-800/70 bg-black overflow-hidden relative" style={{ height: '500px' }}>
                        {status?.installed ? (
                            <iframe
                                src={process.env.NEXT_PUBLIC_MCPENETES_URL || "http://localhost:3000"}
                                className="w-full h-full border-none pointer-events-auto"
                                title="Infrastructure Dashboard"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/50 backdrop-blur-sm">
                                <AlertTriangle className="h-10 w-10 mb-4 opacity-50 text-amber-500" />
                                <h3 className="text-xl font-medium mb-2 text-zinc-300">Daemon Unavailable</h3>
                                <p className="text-sm">The infrastructure backend must be running on port 3000 to display the Web UI natively.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
