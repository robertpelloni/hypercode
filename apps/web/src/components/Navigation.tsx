"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Menu, ChevronDown, FlaskConical } from "lucide-react";
import { useState } from "react";

const CORE_NAV_ITEMS = [
    { href: '/', label: 'Mission Control', description: 'Global system overview and launch point', color: 'hover:text-blue-500', activeColor: 'text-blue-500' },
    { href: '/dashboard/orchestrator', label: 'Orchestrator', description: 'Multi-agent council governance and supervised swarm', color: 'hover:text-purple-500', activeColor: 'text-purple-500' },
    { href: '/dashboard/mcp', label: 'MCP', description: 'MCP routing, aggregation, and tool orchestration', color: 'hover:text-teal-500', activeColor: 'text-teal-500' },
    { href: '/dashboard/billing', label: 'Providers', description: 'Provider billing, quotas, and fallback chains', color: 'hover:text-indigo-500', activeColor: 'text-indigo-500' },
    { href: '/dashboard/config', label: 'Settings', description: 'Platform configuration and operational preferences', color: 'hover:text-slate-500', activeColor: 'text-slate-500' },
    { href: '/docs', label: 'Docs', description: 'Guides, architecture, and API references', color: 'hover:text-blue-100', activeColor: 'text-blue-500' },
];

const LABS_NAV_ITEMS = [
    { href: '/dashboard/council', label: 'Council', description: 'Multi-model consensus and decision sessions', color: 'hover:text-purple-500', activeColor: 'text-purple-500' },
    { href: '/dashboard/director', label: 'Director', description: 'Autonomy supervisor and orchestration controls', color: 'hover:text-amber-500', activeColor: 'text-amber-500' },
    { href: '/dashboard/research', label: 'Deep Research', description: 'Recursive research workflows and findings', color: 'hover:text-cyan-500', activeColor: 'text-cyan-500' },
    { href: '/dashboard/skills', label: 'Skills', description: 'Skill catalog, installation, and execution controls', color: 'hover:text-green-500', activeColor: 'text-green-500' },
    { href: '/dashboard/library', label: 'Library', description: 'Reference assets, indexed resources, and docs', color: 'hover:text-indigo-500', activeColor: 'text-indigo-500' },
    { href: '/dashboard/reader', label: 'Reader', description: 'Read, inspect, and parse content sources', color: 'hover:text-orange-500', activeColor: 'text-orange-500' },
    { href: '/dashboard/command', label: 'Command Center', description: 'Operational commands and execution controls', color: 'hover:text-red-500', activeColor: 'text-red-500' },
    { href: '/dashboard/inspector', label: 'Traffic', description: 'Inspect MCP/events traffic and runtime telemetry', color: 'hover:text-yellow-500', activeColor: 'text-yellow-500' },
    { href: '/dashboard/security', label: 'Security', description: 'Security posture, policy checks, and guardrails', color: 'hover:text-orange-600', activeColor: 'text-orange-600' },
    { href: '/dashboard/chronicle', label: 'Chronicle', description: 'Historical timeline of actions and outcomes', color: 'hover:text-purple-400', activeColor: 'text-purple-400' },
    { href: '/dashboard/squads', label: 'Squads', description: 'Parallel agents, assignments, and status', color: 'hover:text-blue-400', activeColor: 'text-blue-400' },
    { href: '/dashboard/submodules', label: 'Submodules', description: 'Submodule inventory and maintenance visibility', color: 'hover:text-cyan-500', activeColor: 'text-cyan-500' },
    { href: '/dashboard/workshop', label: 'Workshop', description: 'Build/test workspace for experimental features', color: 'hover:text-pink-500', activeColor: 'text-pink-500' },
];

export function Navigation() {
    const pathname = usePathname() || '';
    const [open, setOpen] = useState(false);
    const versionLabel = (process.env.NEXT_PUBLIC_BORG_VERSION ?? '1.0.0-alpha.1').replace(/^v/i, '');

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    return (
        <nav suppressHydrationWarning className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    HYPERCODE
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-5">
                    {CORE_NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.description}
                            aria-label={`${item.label}: ${item.description}`}
                            suppressHydrationWarning
                            className={`text-sm font-medium transition-colors ${item.color} ${isActive(item.href) ? item.activeColor : 'text-zinc-500 dark:text-zinc-400'}`}
                        >
                            {item.label}
                        </Link>
                    ))}

                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 border-r" />

                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-cyan-400 transition-colors outline-none focus:ring-0">
                            <FlaskConical className="w-3.5 h-3.5" />
                            Labs
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] max-h-[400px] overflow-y-auto bg-zinc-950 border-zinc-800">
                            {LABS_NAV_ITEMS.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className={`cursor-pointer ${isActive(item.href) ? 'bg-zinc-800/60' : ''}`}>
                                    <Link href={item.href} className="flex flex-col items-start w-full py-2">
                                        <span className={`text-sm font-medium ${item.color} ${isActive(item.href) ? item.activeColor : 'text-zinc-300'}`}>
                                            {item.label}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 leading-tight mt-0.5 max-w-[170px] truncate">
                                            {item.description}
                                        </span>
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" title="Open navigation menu" aria-label="Open navigation menu">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                        <div className="flex flex-col gap-4 mt-8">
                            <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold px-2">Core System</div>
                            {CORE_NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    title={item.description}
                                    aria-label={`${item.label}: ${item.description}`}
                                    suppressHydrationWarning
                                    className={`text-lg font-medium transition-colors px-2 ${item.color} ${isActive(item.href) ? item.activeColor : 'text-zinc-500 dark:text-zinc-400'}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold px-2 mt-4">Labs & Experimental</div>
                            {LABS_NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    title={item.description}
                                    aria-label={`${item.label}: ${item.description}`}
                                    suppressHydrationWarning
                                    className={`text-lg font-medium transition-colors ${item.color} ${isActive(item.href) ? item.activeColor : 'text-zinc-500 dark:text-zinc-400'}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="mt-auto pt-8 border-t border-zinc-200 dark:border-zinc-800">
                                <span className="text-xs text-zinc-400">v{versionLabel}</span>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="hidden md:block text-xs text-zinc-400" suppressHydrationWarning>
                v{versionLabel}
            </div>
        </nav>
    );
}
