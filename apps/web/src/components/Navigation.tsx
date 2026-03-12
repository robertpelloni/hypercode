"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@borg/ui";
import { Button } from "@borg/ui";
import { Menu } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
    { href: '/', label: 'Mission Control', description: 'Global system overview and launch point', color: 'hover:text-blue-500', activeColor: 'text-blue-500' },
    { href: '/docs', label: 'Documentation', description: 'Guides, architecture, and API references', color: 'hover:text-blue-100', activeColor: 'text-blue-500' },
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
    { href: '/dashboard/mcp', label: 'MCP', description: 'MCP routing, aggregation, and tool orchestration', color: 'hover:text-teal-500', activeColor: 'text-teal-500' },
    { href: '/dashboard/workshop', label: 'Workshop', description: 'Build/test workspace for experimental features', color: 'hover:text-pink-500', activeColor: 'text-pink-500' },
    { href: '/dashboard/config', label: 'Settings', description: 'Platform configuration and operational preferences', color: 'hover:text-slate-500', activeColor: 'text-slate-500' },
];

export function Navigation() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    BORG
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex gap-4">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.description}
                            aria-label={`${item.label}: ${item.description}`}
                            className={`text-sm font-medium transition-colors ${item.color} ${isActive(item.href) ? item.activeColor : 'text-zinc-500 dark:text-zinc-400'}`}
                        >
                            {item.label}
                        </Link>
                    ))}
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
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    title={item.description}
                                    aria-label={`${item.label}: ${item.description}`}
                                    className={`text-lg font-medium transition-colors ${item.color} ${isActive(item.href) ? item.activeColor : 'text-zinc-500 dark:text-zinc-400'}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="mt-auto pt-8 border-t border-zinc-200 dark:border-zinc-800">
                                <span className="text-xs text-zinc-400">v0.1.0-alpha</span>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="hidden md:block text-xs text-zinc-400">
                v0.1.0-alpha
            </div>
        </nav>
    );
}
