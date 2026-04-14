"use client";

/**
 * electron-orchestrator Dashboard Page
 *
 * Shows status and controls for the electron-orchestrator desktop shell.
 * electron-orchestrator is the native desktop companion for HyperCode — providing system tray
 * controls, OS-level integration, and native orchestration capabilities.
 *
 * This page checks whether electron-orchestrator is running by probing its IPC or HTTP
 * health endpoint, and provides links to launch/configure it.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
    MonitorPlay,
    RefreshCw,
    ExternalLink,
    Download,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Terminal,
    Cpu,
    HardDrive,
} from "lucide-react";
import { PageStatusBanner } from "@/components/PageStatusBanner";

// electron-orchestrator communicates via the same orchestrator port by default
const MAESTRO_URL = process.env.NEXT_PUBLIC_MAESTRO_URL || "http://localhost:3847";

interface MaestroHealth {
    version?: string;
    uptime?: number;
    platform?: string;
    arch?: string;
    nodeVersion?: string;
    electronVersion?: string;
}

function isMaestroHealthPayload(value: unknown): value is MaestroHealth {
    return typeof value === "object"
        && value !== null
        && !Array.isArray(value)
        && ((value as { version?: unknown }).version === undefined || typeof (value as { version?: unknown }).version === "string")
        && ((value as { uptime?: unknown }).uptime === undefined || typeof (value as { uptime?: unknown }).uptime === "number")
        && ((value as { platform?: unknown }).platform === undefined || typeof (value as { platform?: unknown }).platform === "string")
        && ((value as { arch?: unknown }).arch === undefined || typeof (value as { arch?: unknown }).arch === "string")
        && ((value as { nodeVersion?: unknown }).nodeVersion === undefined || typeof (value as { nodeVersion?: unknown }).nodeVersion === "string")
        && ((value as { electronVersion?: unknown }).electronVersion === undefined || typeof (value as { electronVersion?: unknown }).electronVersion === "string");
}

export default function MaestroDashboardPage() {
    const [status, setStatus] = useState<"checking" | "online" | "offline" | "unavailable">("checking");
    const [health, setHealth] = useState<MaestroHealth | null>(null);
    const [lastCheck, setLastCheck] = useState<string>("");
    const [lastError, setLastError] = useState<string>("");

    const checkHealth = useCallback(async () => {
        setStatus("checking");
        setLastError("");
        try {
            const res = await fetch(`${MAESTRO_URL}/api/health/server`, {
                signal: AbortSignal.timeout(3000),
            });
            if (res.ok) {
                const data: unknown = await res.json().catch(() => null);
                if (!isMaestroHealthPayload(data)) {
                    setHealth(null);
                    setStatus("unavailable");
                    setLastError("electron-orchestrator health returned an invalid payload.");
                    setLastCheck(new Date().toLocaleTimeString());
                    return;
                }
                setHealth({
                    version: data.version,
                    uptime: data.uptime,
                    platform: data.platform,
                    arch: data.arch,
                    nodeVersion: data.nodeVersion,
                    electronVersion: data.electronVersion,
                });
                setStatus("online");
            } else {
                setHealth(null);
                setStatus("unavailable");
                setLastError(`Health check returned HTTP ${res.status}.`);
            }
        } catch (error) {
            setHealth(null);
            setStatus("unavailable");
            setLastError(error instanceof Error ? error.message : "electron-orchestrator health check failed.");
        }
        setLastCheck(new Date().toLocaleTimeString());
    }, []);

    useEffect(() => {
        void checkHealth();
        const interval = setInterval(() => void checkHealth(), 10_000);
        return () => clearInterval(interval);
    }, [checkHealth]);

    return (
        <div className="w-full h-full flex flex-col bg-black text-white overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 p-4 border-b border-zinc-800 bg-zinc-900 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <MonitorPlay className="h-5 w-5 text-cyan-400" />
                        electron-orchestrator
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        Native desktop shell for HyperCode — system tray, OS integration, and local orchestration
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`inline-block h-2 w-2 rounded-full ${
                            status === "online"
                                ? "bg-emerald-400 animate-pulse"
                                : status === "checking"
                                  ? "bg-yellow-400 animate-pulse"
                                  : status === "unavailable"
                                    ? "bg-red-400 animate-pulse"
                                  : "bg-zinc-600"
                        }`}
                    />
                    <span className="text-xs text-zinc-500">
                        {status === "online"
                            ? `Online — ${MAESTRO_URL}`
                            : status === "checking"
                              ? "Checking…"
                              : status === "unavailable"
                                ? "Unavailable"
                              : "Offline"}
                    </span>
                    <button
                        onClick={() => void checkHealth()}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        title="Refresh"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${status === "checking" ? "animate-spin" : ""}`}
                        />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <PageStatusBanner
                    status="experimental"
                    message="electron-orchestrator desktop integration"
                    note="The electron-orchestrator desktop shell is an experimental companion app. It shares the HyperCode backend on port 3847 and provides native OS capabilities."
                />
            </div>

            <div className="flex-1 p-4 space-y-4">
                {/* Status Card */}
                {status === "unavailable" && (
                    <div className="border border-red-900/40 bg-red-950/20 rounded-lg px-4 py-3 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-red-200 font-medium text-sm">electron-orchestrator status is unavailable</p>
                            <p className="text-red-300/80 text-xs mt-1">
                                {lastError || `Failed to read electron-orchestrator health from ${MAESTRO_URL}.`}
                            </p>
                        </div>
                    </div>
                )}

                {status === "offline" && (
                    <div className="border border-amber-700/50 bg-amber-950/20 rounded-lg px-4 py-3 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-amber-200 font-medium text-sm">electron-orchestrator is not running</p>
                            <p className="text-amber-300/70 text-xs mt-1">
                                Start electron-orchestrator from the <code className="bg-amber-950/50 px-1 rounded">apps/maestro</code> directory,
                                or launch it from the system tray. electron-orchestrator connects to the HyperCode backend at{" "}
                                <code className="bg-amber-950/50 px-1 rounded">{MAESTRO_URL}</code>.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <a
                                    href="https://github.com/robertpelloni/Maestro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5"
                                >
                                    <Download className="h-3 w-3" />
                                    Get electron-orchestrator
                                </a>
                                <a
                                    href={MAESTRO_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Open Backend
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {status === "checking" && (
                    <div className="border border-zinc-700 bg-zinc-900 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Connecting to electron-orchestrator at {MAESTRO_URL}…
                    </div>
                )}

                {status === "online" && (
                    <>
                        <div className="border border-emerald-700/50 bg-emerald-950/20 rounded-lg px-4 py-3 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-emerald-200 font-medium text-sm">electron-orchestrator is running</p>
                                <p className="text-emerald-300/70 text-xs mt-1">
                                    Connected to HyperCode backend at {MAESTRO_URL}
                                </p>
                            </div>
                        </div>

                        {/* Health stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {health?.version && (
                                <div className="border border-zinc-800 rounded-lg bg-zinc-950 px-4 py-3">
                                    <p className="text-[11px] text-zinc-500">Version</p>
                                    <p className="text-lg font-bold text-cyan-300">{health.version}</p>
                                </div>
                            )}
                            {health?.uptime !== undefined && (
                                <div className="border border-zinc-800 rounded-lg bg-zinc-950 px-4 py-3">
                                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                        <Cpu className="h-3 w-3" /> Uptime
                                    </p>
                                    <p className="text-lg font-bold text-zinc-200">
                                        {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
                                    </p>
                                </div>
                            )}
                            {health?.platform && (
                                <div className="border border-zinc-800 rounded-lg bg-zinc-950 px-4 py-3">
                                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                        <HardDrive className="h-3 w-3" /> Platform
                                    </p>
                                    <p className="text-lg font-bold text-zinc-200">
                                        {health.platform} ({health.arch})
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Launch instructions */}
                        <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-4">
                            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                                <Terminal className="h-4 w-4 text-zinc-400" />
                                Quick Actions
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={MAESTRO_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-xs flex items-center gap-1.5"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Open Standalone UI
                                </a>
                                <a
                                    href="https://github.com/robertpelloni/Maestro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    GitHub
                                </a>
                            </div>
                        </div>
                    </>
                )}

                {lastCheck && (
                    <p className="text-[11px] text-zinc-600 text-right">Last check: {lastCheck}</p>
                )}
            </div>
        </div>
    );
}
