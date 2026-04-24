"use client";

/**
 * providers/page.tsx – AI Providers Hub
 *
 * Central dashboard for every major AI provider: API keys, billing pages,
 * subscription management, cloud consoles, usage, and quick-access links.
 *
 * Sections:
 *  1. Quick-nav by action type (API keys / billing / plans / cloud consoles)
 *  2. Per-provider cards showing auth status + all portal actions
 *  3. Subscription / Pro plan links (Copilot+, Claude Pro, ChatGPT Plus, etc.)
 *  4. Cloud coding tool dashboards – direct links to Cloud Orchestrator, Copilot Workspace,
 *     Claude for cloud, OpenAI Codex Cloud, Devin, Blocks, Cursor, etc.
 *
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/providers/page.tsx
 * Auth status is pulled from the HyperCode billing router (`getProviderQuotas`)
=======
 * Auth status is pulled from the borg billing router (`getProviderQuotas`)
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/providers/page.tsx
 * so the page reflects real configuration state rather than hardcoded data.
 */

import { useMemo, useState } from "react";
import {
    Activity,
    Bot,
    CheckCircle2,
    Code2,
    CreditCard,
    ExternalLink,
    Globe,
    Key,
    Layers,
    RefreshCw,
    Rocket,
    Search,
    Settings,
    Shield,
    XCircle,
    Zap,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { PageStatusBanner } from "@/components/PageStatusBanner";
import {
    getProviderPortalCards,
    getProviderQuickAccessSections,
    type BillingProviderQuotaSummary,
    type ProviderPortalCard,
} from "../billing/billing-portal-data";

// ─── Static definitions that extend billing-portal-data ──────────────────────

/** Cloud coding environments — direct dashboard/app links */
const CLOUD_CODING_TOOLS: Array<{
    id: string;
    name: string;
    icon?: any;
    description: string;
    links: Array<{ label: string; href: string; primary?: boolean }>;
    color: string;
}> = [
    {
        id: "jules",
        name: "Cloud Orchestrator (Jules/Spark)",
        icon: Rocket,
        description: "Google's internal multi-agent coding system and Spark environment.",
        links: [
            { label: "Open Cloud Orchestrator", href: "https://jules.google.com/", primary: true },
            { label: "Settings", href: "https://jules.google.com/settings" },
            { label: "Docs", href: "https://jules.google.com/docs" },
        ],
        color: "text-blue-300",
    },
    {
        id: "copilot-workspace",
        name: "GitHub Copilot Workspace",
        description: "GitHub's cloud coding environment powered by Copilot. Full feature set for AI-assisted PRs.",
        links: [
            { label: "Open Workspace", href: "https://copilot-workspace.githubnext.com/", primary: true },
            { label: "Copilot Settings", href: "https://github.com/settings/copilot" },
            { label: "Billing", href: "https://github.com/settings/billing" },
        ],
        color: "text-purple-300",
    },
    {
        id: "claude-cloud",
        name: "Claude (Anthropic)",
        description: "Anthropic's Claude.ai web and API console for cloud coding and conversation.",
        links: [
            { label: "Claude.ai", href: "https://claude.ai/", primary: true },
            { label: "API Console", href: "https://console.anthropic.com/" },
            { label: "API Keys", href: "https://console.anthropic.com/settings/keys" },
            { label: "Usage", href: "https://console.anthropic.com/settings/usage" },
        ],
        color: "text-amber-300",
    },
    {
        id: "codex-cloud",
        name: "OpenAI Codex Cloud",
        description: "OpenAI's cloud coding environment and Codex CLI.",
        links: [
            { label: "ChatGPT", href: "https://chatgpt.com/", primary: true },
            { label: "Codex CLI", href: "https://platform.openai.com/codex", primary: false },
            { label: "Platform", href: "https://platform.openai.com/" },
            { label: "API Keys", href: "https://platform.openai.com/api-keys" },
            { label: "Usage", href: "https://platform.openai.com/usage" },
        ],
        color: "text-emerald-300",
    },
    {
        id: "gemini-cloud",
        name: "Google Gemini / AI Studio",
        description: "Google's AI Studio and Gemini API for cloud coding and multimodal tasks.",
        links: [
            { label: "AI Studio", href: "https://aistudio.google.com/", primary: true },
            { label: "Gemini App", href: "https://gemini.google.com/" },
            { label: "Vertex AI", href: "https://console.cloud.google.com/vertex-ai" },
            { label: "API Keys", href: "https://aistudio.google.com/app/apikey" },
        ],
        color: "text-cyan-300",
    },
    {
        id: "devin",
        name: "Devin (Cognition)",
        description: "Fully autonomous AI software engineer by Cognition.",
        links: [
            { label: "Devin App", href: "https://app.devin.ai/", primary: true },
            { label: "Docs", href: "https://docs.devin.ai/" },
        ],
        color: "text-rose-300",
    },
    {
        id: "cursor",
        name: "Cursor",
        description: "AI-first code editor built on VS Code with deep model integration.",
        links: [
            { label: "cursor.com", href: "https://cursor.com/", primary: true },
            { label: "Settings", href: "https://cursor.com/settings" },
            { label: "Pricing", href: "https://cursor.com/pricing" },
        ],
        color: "text-violet-300",
    },
    {
        id: "windsurf",
        name: "Windsurf (Codeium)",
        description: "Codeium's AI coding environment with cascade agents.",
        links: [
            { label: "Windsurf", href: "https://codeium.com/windsurf", primary: true },
            { label: "Login", href: "https://codeium.com/login" },
            { label: "Pricing", href: "https://codeium.com/pricing" },
        ],
        color: "text-teal-300",
    },
    {
        id: "blocks",
        name: "Blocks (Replit / 0x)",
        description: "Agent-based cloud coding environments including Replit Agent.",
        links: [
            { label: "Replit", href: "https://replit.com/", primary: true },
            { label: "Replit Agent", href: "https://replit.com/agent" },
            { label: "Deployment", href: "https://replit.com/deployments" },
        ],
        color: "text-orange-300",
    },
    {
        id: "kiro",
        name: "Kiro (AWS)",
        description: "Amazon's AI coding environment powered by Amazon Q / Builder ID.",
        links: [
            { label: "Kiro", href: "https://kiro.dev/", primary: true },
            { label: "AWS Builder ID", href: "https://view.awsapps.com/start" },
            { label: "Q Developer", href: "https://aws.amazon.com/q/developer/" },
        ],
        color: "text-yellow-300",
    },
    {
        id: "antigravity",
        name: "Google Code Assist (Antigravity)",
        description: "Google Cloud's AI coding tool for enterprise workloads.",
        links: [
            { label: "Code Assist", href: "https://cloud.google.com/code-assist", primary: true },
            { label: "Google Cloud", href: "https://console.cloud.google.com/" },
        ],
        color: "text-green-300",
    },
    {
        id: "bolt",
        name: "Bolt.new",
        description: "StackBlitz AI-powered instant full-stack coding environment.",
        links: [
            { label: "bolt.new", href: "https://bolt.new/", primary: true },
            { label: "StackBlitz", href: "https://stackblitz.com/" },
        ],
        color: "text-lime-300",
    },
];

/** Subscription / Pro plan links */
const PRO_SUBSCRIPTIONS: Array<{
    name: string;
    tier: string;
    href: string;
    description: string;
}> = [
    {
        name: "ChatGPT Plus / Team",
        tier: "chatgpt+",
        href: "https://chat.openai.com/settings/subscription",
        description: "OpenAI ChatGPT Plus, Team, and Pro plan management.",
    },
    {
        name: "Claude Pro / Team",
        tier: "claude-pro",
        href: "https://claude.ai/settings/subscription",
        description: "Anthropic Claude Pro and Team subscription management.",
    },
    {
        name: "GitHub Copilot",
        tier: "copilot",
        href: "https://github.com/settings/copilot",
        description: "Copilot Individual, Business, and Enterprise plan settings.",
    },
    {
        name: "GitHub Copilot+ (VS Code)",
        tier: "copilot-plus",
        href: "https://github.com/settings/billing",
        description: "Copilot+ subscription giving access to premium models.",
    },
    {
        name: "Cursor Pro",
        tier: "cursor-pro",
        href: "https://cursor.com/settings",
        description: "Cursor Pro and Business subscription management.",
    },
    {
        name: "Windsurf Pro",
        tier: "windsurf-pro",
        href: "https://codeium.com/profile",
        description: "Codeium Windsurf Pro subscription.",
    },
    {
        name: "Google AI Studio",
        tier: "aistudio",
        href: "https://aistudio.google.com/app/apikey",
        description: "Free-tier & paid Gemini API access through AI Studio.",
    },
    {
        name: "Devin Plan",
        tier: "devin",
        href: "https://app.devin.ai/settings",
        description: "Devin usage quota and subscription settings.",
    },
];

// ─── Action kind styling ──────────────────────────────────────────────────────

const KIND_INFO: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
    keys:      { label: "API Keys",  icon: <Key className="h-3 w-3" />,          class: "bg-cyan-950/30 text-cyan-300 border-cyan-700/40" },
    usage:     { label: "Usage",     icon: <Activity className="h-3 w-3" />,     class: "bg-blue-950/30 text-blue-300 border-blue-700/40" },
    billing:   { label: "Billing",   icon: <CreditCard className="h-3 w-3" />,   class: "bg-amber-950/30 text-amber-300 border-amber-700/40" },
    plan:      { label: "Plan",      icon: <Layers className="h-3 w-3" />,       class: "bg-purple-950/30 text-purple-300 border-purple-700/40" },
    credits:   { label: "Credits",   icon: <Zap className="h-3 w-3" />,          class: "bg-yellow-950/30 text-yellow-300 border-yellow-700/40" },
    console:   { label: "Console",   icon: <Settings className="h-3 w-3" />,     class: "bg-zinc-800 text-zinc-300 border-zinc-700" },
    cloud:     { label: "Cloud",     icon: <Globe className="h-3 w-3" />,        class: "bg-emerald-950/30 text-emerald-300 border-emerald-700/40" },
    workspace: { label: "Workspace", icon: <Code2 className="h-3 w-3" />,        class: "bg-violet-950/30 text-violet-300 border-violet-700/40" },
    token:     { label: "Tokens",    icon: <Shield className="h-3 w-3" />,       class: "bg-rose-950/30 text-rose-300 border-rose-700/40" },
    docs:      { label: "Docs",      icon: <Bot className="h-3 w-3" />,          class: "bg-zinc-900 text-zinc-400 border-zinc-700" },
};

function isBillingProviderQuotaSummary(value: unknown): value is BillingProviderQuotaSummary {
    return typeof value === "object"
        && value !== null
        && typeof (value as { provider?: unknown }).provider === "string"
        && typeof (value as { name?: unknown }).name === "string"
        && typeof (value as { configured?: unknown }).configured === "boolean";
}

function ActionBadge({ kind, label, href }: { kind: string; label: string; href: string }) {
    const info = KIND_INFO[kind] ?? KIND_INFO.console;
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] hover:opacity-80 transition-opacity ${info.class}`}
        >
            {info.icon}
            {label}
            <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
        </a>
    );
}

function ProviderCard({ card }: { card: ProviderPortalCard }) {
    return (
        <div className="border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
            <div className="px-4 py-3 bg-zinc-900 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-zinc-200">{card.label}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    card.statusTone === "success" ? "text-emerald-300 border-emerald-700/50 bg-emerald-950/30" :
                    card.statusTone === "warning" ? "text-amber-300 border-amber-700/50 bg-amber-950/30" :
                    "text-zinc-500 border-zinc-700 bg-zinc-900"
                }`}>
                    {card.statusLabel}
                </span>
            </div>
            <div className="px-4 py-2">
                <p className="text-xs text-zinc-500 mb-2">{card.notes}</p>
                <div className="flex flex-wrap gap-1.5">
                    {card.actions.map((action) => (
                        <ActionBadge
                            key={action.href}
                            kind={action.kind}
                            label={action.label}
                            href={action.href}
                        />
                    ))}
                </div>
                {card.errorLabel && (
                    <p className="mt-1.5 text-[11px] text-red-400">{card.errorLabel}</p>
                )}
            </div>
        </div>
    );
}

function CloudToolCard({
    tool,
}: {
    tool: (typeof CLOUD_CODING_TOOLS)[number];
}) {
    return (
        <div className="border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
            <div className="px-4 py-3 bg-zinc-900">
                <h3 className={`font-semibold text-sm ${tool.color}`}>{tool.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{tool.description}</p>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
                {tool.links.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs transition-opacity hover:opacity-80 ${
                            link.primary
                                ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                                : "bg-zinc-950 border-zinc-800 text-zinc-500"
                        }`}
                    >
                        {link.label}
                        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                    </a>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProvidersHubPage() {
    const [filter, setFilter] = useState("");

    const providerQuotasQuery = trpc.billing.getProviderQuotas.useQuery(undefined, {
        refetchInterval: 30000,
    });
    const quotasUnavailable = providerQuotasQuery.isError
        || (
            providerQuotasQuery.data !== undefined
            && (
                !Array.isArray(providerQuotasQuery.data)
                || !providerQuotasQuery.data.every(isBillingProviderQuotaSummary)
            )
        );
    const safeProviderQuotas = !quotasUnavailable && Array.isArray(providerQuotasQuery.data)
        ? providerQuotasQuery.data
        : undefined;

    const providerCards = useMemo(
        () => getProviderPortalCards(safeProviderQuotas),
        [safeProviderQuotas]
    );

    const quickAccessSections = useMemo(
        () => getProviderQuickAccessSections(safeProviderQuotas),
        [safeProviderQuotas]
    );

    const q = filter.trim().toLowerCase();

    const filteredCards = useMemo(
        () =>
            q
                ? providerCards.filter(
                      (c) =>
                          c.label.toLowerCase().includes(q) ||
                          c.notes.toLowerCase().includes(q) ||
                          c.actions.some((a) => a.label.toLowerCase().includes(q))
                  )
                : providerCards,
        [q, providerCards]
    );

    const filteredTools = useMemo(
        () =>
            q
                ? CLOUD_CODING_TOOLS.filter(
                      (t) =>
                          t.name.toLowerCase().includes(q) ||
                          t.description.toLowerCase().includes(q)
                  )
                : CLOUD_CODING_TOOLS,
        [q]
    );

    const configuredCount = providerCards.filter((c) => c.statusTone !== "muted").length;

    return (
        <div className="w-full h-full flex flex-col bg-black text-white overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 p-4 border-b border-zinc-800 bg-zinc-900 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Bot className="h-5 w-5 text-cyan-400" />
                        AI Providers Hub
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        API keys, billing, subscriptions, and cloud coding dashboards in one place.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                        {quotasUnavailable ? '— / — configured' : `${configuredCount} / ${providerCards.length} configured`}
                    </span>
                    <button
                        onClick={() => void providerQuotasQuery.refetch()}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${providerQuotasQuery.isFetching ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
                <PageStatusBanner
                    status="experimental"
                    message="AI Providers Hub"
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/providers/page.tsx
                    note="Provider auth status is live via the HyperCode billing router. All external links open the provider's own portal in a new tab."
=======
                    note="Provider auth status is live via the borg billing router. All external links open the provider's own portal in a new tab."
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/providers/page.tsx
                />
            </div>

            <div className="flex-1 p-4 space-y-8">
                {quotasUnavailable ? (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                        {providerQuotasQuery.error?.message ?? 'Provider quota status is unavailable.'}
                    </div>
                ) : null}

                {/* Search bar */}
                <div className="relative max-w-lg">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter providers, tools, and actions…"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-8 py-1.5 text-sm text-white outline-none focus:border-cyan-500"
                    />
                </div>

                {/* Quick-access sections */}
                {!q && quickAccessSections.length > 0 && (
                    <section>
                        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-cyan-400" /> Quick Access
                        </h2>
                        <div className="space-y-4">
                            {quickAccessSections.map((section) => (
                                <div key={section.id}>
                                    <div className="mb-2">
                                        <h3 className="text-sm font-semibold text-zinc-300">{section.title}</h3>
                                        <p className="text-xs text-zinc-500">{section.description}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {section.links.map((link) => (
                                            <a
                                                key={`${link.providerId}-${link.href}`}
                                                href={link.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded text-xs text-zinc-300 transition-colors"
                                            >
                                                <span className="text-zinc-500">{link.providerLabel}</span>
                                                <span className="mx-1 text-zinc-700">›</span>
                                                {link.actionLabel}
                                                <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-50" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Provider portal cards */}
                <section>
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <Key className="h-4 w-4 text-cyan-400" /> Providers &amp; Portals
                    </h2>
                    {quotasUnavailable ? (
                        <p className="text-sm text-red-300">{providerQuotasQuery.error?.message ?? 'Provider portal status is unavailable.'}</p>
                    ) : filteredCards.length === 0 ? (
                        <p className="text-sm text-zinc-600">No providers match &quot;{filter}&quot;.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredCards.map((card) => (
                                <ProviderCard key={card.id} card={card} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Pro Subscriptions */}
                {!q && (
                    <section>
                        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-cyan-400" /> Subscriptions &amp; Pro Plans
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {PRO_SUBSCRIPTIONS.map((sub) => (
                                <a
                                    key={sub.tier}
                                    href={sub.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border border-zinc-800 rounded-lg bg-zinc-950 px-4 py-3 hover:border-zinc-600 transition-colors group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-zinc-200">{sub.name}</span>
                                        <ExternalLink className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                    </div>
                                    <p className="text-xs text-zinc-500">{sub.description}</p>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Cloud coding tools */}
                <section>
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-cyan-400" /> Cloud Coding Environments
                    </h2>
                    {filteredTools.length === 0 ? (
                        <p className="text-sm text-zinc-600">No tools match &quot;{filter}&quot;.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredTools.map((tool) => (
                                <CloudToolCard key={tool.id} tool={tool} />
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
