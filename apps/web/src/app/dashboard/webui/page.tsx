"use client";

import React, { useState } from "react";
import { Bot, ExternalLink, Shield } from "lucide-react";
import { PageStatusBanner } from "@/components/PageStatusBanner";

export default function OpenWebUIDashboardPage() {
    // Assuming Open-WebUI serves its front-end on port 8080 by default
    const webuiUrl = process.env.NEXT_PUBLIC_OPEN_WEBUI_URL || "http://localhost:8080";

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900">
                <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-400" />
                        Open-WebUI
                    </h1>
                    <p className="text-zinc-400 text-sm">Unified LLM Chat Interface & Tool Aggregation</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-medium">
                        <Shield className="h-3.5 w-3.5" />
                        Native HyperCode Integration Active
                    </div>
                    <a
                        href={webuiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1.5 rounded text-sm transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open Standalone
                    </a>
                </div>
                </div>
                <PageStatusBanner
                    status="external-embed"
                    message="Embeds the Open-WebUI service running at the configured URL. Start Open-WebUI before using this page."
                    note={`Configured URL: ${webuiUrl}`}
                />
            </div>
            <div className="flex-1 relative bg-black">
                <iframe
                    src={webuiUrl}
                    className="w-full h-full border-none"
                    title="Open-WebUI Dashboard"
                    allow="clipboard-read; clipboard-write; microphone; camera"
                />
            </div>
        </div>
    );
}
