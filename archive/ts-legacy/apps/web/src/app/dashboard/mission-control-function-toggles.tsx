"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { SIDEBAR_SECTIONS, type NavItem, type NavSection } from '../../components/mcp/nav-config';

export interface MissionControlFunctionEntry extends NavItem {
    sectionTitle: string;
}

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/mission-control-function-toggles.tsx
export const MISSION_CONTROL_FUNCTION_TOGGLE_STORAGE_KEY = 'hypercode_mission_control_function_toggles_v1';
=======
export const MISSION_CONTROL_FUNCTION_TOGGLE_STORAGE_KEY = 'borg_mission_control_function_toggles_v1';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/mission-control-function-toggles.tsx
const QUICK_LAUNCH_PREVIEW_LIMIT = 12;
const CORE_SECTION_TITLE_SUFFIX = 'Core';

function getSafeLocalStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const storage = window.localStorage;
        void storage.length;
        return storage;
    } catch {
        return null;
    }
}

function readStoredToggleState(): Record<string, boolean> | null {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return null;
    }

    try {
        const raw = storage.getItem(MISSION_CONTROL_FUNCTION_TOGGLE_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as Record<string, boolean>;
    } catch {
        return null;
    }
}

function writeStoredToggleState(value: Record<string, boolean>): void {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return;
    }

    try {
        storage.setItem(MISSION_CONTROL_FUNCTION_TOGGLE_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Ignore storage failures in restricted contexts.
    }
}

export function buildMissionControlFunctionEntries(sections: NavSection[]): MissionControlFunctionEntry[] {
    return sections.flatMap((section) => section.items.map((item) => ({
        ...item,
        sectionTitle: section.title,
    })));
}

export function createDefaultMissionControlToggleState(entries: MissionControlFunctionEntry[]): Record<string, boolean> {
    return entries.reduce<Record<string, boolean>>((state, entry) => {
        state[entry.href] = true;
        return state;
    }, {});
}

export function sanitizeMissionControlToggleState(
    rawState: unknown,
    entries: MissionControlFunctionEntry[],
): Record<string, boolean> {
    const fallback = createDefaultMissionControlToggleState(entries);
    if (!rawState || typeof rawState !== 'object') {
        return fallback;
    }

    for (const entry of entries) {
        const candidate = (rawState as Record<string, unknown>)[entry.href];
        if (typeof candidate === 'boolean') {
            fallback[entry.href] = candidate;
        }
    }

    return fallback;
}

export function countEnabledMissionControlFunctions(
    toggleState: Record<string, boolean>,
    entries: MissionControlFunctionEntry[],
): number {
    return entries.reduce((count, entry) => count + (toggleState[entry.href] === false ? 0 : 1), 0);
}

export function createCoreMissionControlToggleState(entries: MissionControlFunctionEntry[]): Record<string, boolean> {
    return entries.reduce<Record<string, boolean>>((state, entry) => {
        state[entry.href] = entry.sectionTitle.trim().endsWith(CORE_SECTION_TITLE_SUFFIX);
        return state;
    }, {});
}

function getBadgeLabel(badge?: NavItem['badge']): string | null {
    switch (badge) {
        case 'beta':
            return 'Beta';
        case 'experimental':
            return 'Experimental';
        case 'embed':
            return 'Embed';
        default:
            return null;
    }
}

function getBadgeTone(badge?: NavItem['badge']): string {
    switch (badge) {
        case 'beta':
            return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
        case 'experimental':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
        case 'embed':
            return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
        default:
            return 'border-slate-700 bg-slate-900/70 text-slate-300';
    }
}

export function MissionControlFunctionToggles() {
    const entries = useMemo(() => buildMissionControlFunctionEntries(SIDEBAR_SECTIONS), []);
    const defaultToggleState = useMemo(() => createDefaultMissionControlToggleState(entries), [entries]);
    const [toggleState, setToggleState] = useState<Record<string, boolean>>(defaultToggleState);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const storedState = readStoredToggleState();
        setToggleState(sanitizeMissionControlToggleState(storedState, entries));
        setIsHydrated(true);
    }, [entries]);

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        writeStoredToggleState(toggleState);
    }, [isHydrated, toggleState]);

    const enabledCount = useMemo(
        () => countEnabledMissionControlFunctions(toggleState, entries),
        [entries, toggleState],
    );

    const enabledEntries = useMemo(
        () => entries.filter((entry) => toggleState[entry.href] !== false),
        [entries, toggleState],
    );

    const previewEntries = enabledEntries.slice(0, QUICK_LAUNCH_PREVIEW_LIMIT);
    const hiddenPreviewCount = Math.max(0, enabledEntries.length - QUICK_LAUNCH_PREVIEW_LIMIT);

    return (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Function toggles</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Main dashboard function matrix</h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-400">
                        Every major dashboard function lives here with its own toggle. Use the switches to decide which surfaces stay pinned in Mission Control quick launch.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5">
                        {enabledCount}/{entries.length} enabled
                    </span>
                    <button
                        type="button"
                        onClick={() => setToggleState(defaultToggleState)}
                        className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-slate-900"
                    >
                        Enable all
                    </button>
                    <button
                        type="button"
                        onClick={() => setToggleState(createCoreMissionControlToggleState(entries))}
                        className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-slate-900"
                    >
                        Core only
                    </button>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Quick launch preview</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Enabled functions surface here first, so you can trim the launch strip without spelunking through the sidebar jungle.
                        </p>
                    </div>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        {enabledEntries.length === 0 ? 'No quick launches' : `${previewEntries.length} shown`}
                    </span>
                </div>

                {enabledEntries.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
                        All function toggles are currently off. Re-enable any surface to pin it back into Mission Control.
                    </div>
                ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {previewEntries.map((entry) => (
                            <Link
                                key={entry.href}
                                href={entry.href}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
                            >
                                <span>{entry.title}</span>
                                <span className="text-xs text-slate-500">{entry.sectionTitle}</span>
                            </Link>
                        ))}
                        {hiddenPreviewCount > 0 ? (
                            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-400">
                                +{hiddenPreviewCount} more enabled
                            </span>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {SIDEBAR_SECTIONS.map((section) => {
                    const sectionEntries = entries.filter((entry) => entry.sectionTitle === section.title);
                    const sectionEnabledCount = sectionEntries.filter((entry) => toggleState[entry.href] !== false).length;

                    return (
                        <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-semibold text-white">{section.title}</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {sectionEnabledCount}/{sectionEntries.length} pinned to Mission Control quick launch.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setToggleState((current) => {
                                            const next = { ...current };
                                            const shouldEnableAll = sectionEntries.some((entry) => current[entry.href] === false);
                                            for (const entry of sectionEntries) {
                                                next[entry.href] = shouldEnableAll;
                                            }
                                            return next;
                                        });
                                    }}
                                    className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-slate-900"
                                >
                                    {sectionEnabledCount === sectionEntries.length ? 'Disable section' : 'Enable section'}
                                </button>
                            </div>

                            <div className="mt-4 space-y-3">
                                {sectionEntries.map((entry) => {
                                    const badgeLabel = getBadgeLabel(entry.badge);
                                    const description = entry.description ?? `${entry.title} operator surface.`;
                                    const isEnabled = toggleState[entry.href] !== false;

                                    return (
                                        <div key={entry.href} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-medium text-white">{entry.title}</span>
                                                        {badgeLabel ? (
                                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${getBadgeTone(entry.badge)}`}>
                                                                {badgeLabel}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-2 text-sm text-slate-400">{description}</p>
                                                    <p className="mt-2 font-mono text-xs text-slate-500">{entry.href}</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-3 lg:justify-end">
                                                    <Link
                                                        href={entry.href}
                                                        className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                                                    >
                                                        Open →
                                                    </Link>
                                                    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5">
                                                        <span className={`text-xs font-medium ${isEnabled ? 'text-emerald-200' : 'text-slate-400'}`}>
                                                            {isEnabled ? 'Pinned' : 'Hidden'}
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={isEnabled}
                                                            onChange={(event) => {
                                                                setToggleState((current) => ({
                                                                    ...current,
                                                                    [entry.href]: event.target.checked,
                                                                }));
                                                            }}
                                                            aria-label={`Toggle ${entry.title} on the main dashboard`}
                                                            className="h-4 w-4 accent-cyan-400"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </section>
    );
}
