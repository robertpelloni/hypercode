"use client";

import React from "react";
import { Network, ExternalLink, ShieldAlert } from "lucide-react";

export default function MetaMCPDashboardPage() {
    // MetaMCP frontend dev server runs on 12008 by default
    const metaMcpUrl = process.env.NEXT_PUBLIC_METAMCP_URL || "http://localhost:12008";

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Network className="h-5 w-5 text-indigo-400" />
                        MetaMCP Proxy
                    </h1>
                    <p className="text-zinc-400 text-sm">Master proxy orchestration for connected tool servers.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-medium">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Native Upstream Proxy Active
                    </div>
                    <a
                        href={metaMcpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1.5 rounded text-sm transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open Standalone
                    </a>
                </div>
            </div>
            <div className="flex-1 relative bg-black">
                <iframe
                    src={metaMcpUrl}
                    className="w-full h-full border-none"
                    title="MetaMCP Dashboard"
                    allow="clipboard-read; clipboard-write;"
                />
            </div>
        </div>
    );
}
