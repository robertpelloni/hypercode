'use server';

import { getSubmodules, SubmoduleInfo } from '@/lib/git';
import path from 'path';
import fs from 'fs/promises';

// Resolve the monorepo root safely without overly broad path traversals
function getMonorepoRoot(): string {
    return process.env.BORG_ROOT || path.resolve(process.cwd(), '..', '..');
}

export async function fetchSubmodulesAction(): Promise<SubmoduleInfo[]> {
    const root = getMonorepoRoot();
    console.log("Scanning submodules in:", root);
    return await getSubmodules(root);
}

export interface LinkCategory {
    name: string;
    links: string[];
}

export interface WorkspaceInventoryEntry {
    name: string;
    path: string;
    kind: 'app' | 'package' | 'submodule' | 'directory' | 'document' | 'script' | 'config';
    summary: string;
    packageName?: string;
    version?: string;
}

export interface WorkspaceInventorySection {
    id: string;
    title: string;
    description: string;
    entries: WorkspaceInventoryEntry[];
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
    apps: 'Operator-facing applications and external integration surfaces.',
    packages: 'Shared runtime libraries, services, engines, and reusable UI packages.',
    submodules: 'Reference repos and mirrored upstream code tracked alongside HyperCode.',
    docs: 'Long-lived architecture, deployment, planning, and research documents.',
    scripts: 'Repo automation, build orchestration, maintenance, and tooling entrypoints.',
};

const ENTRY_SUMMARIES: Record<string, string> = {
    'apps/web': 'Next.js operator dashboard and web control plane.',
    'apps/hypercode-extension': 'Browser extension workspace for Chromium and Firefox bridge builds.',
    'apps/maestro': 'electron-orchestrator desktop shell for multi-agent coordination.',
    'apps/mobile': 'React Native companion app for remote monitoring and control.',
    'packages/core': 'Core backend runtime, council orchestration, MCP server, and tRPC APIs.',
    'packages/cli': 'CLI harness and operator command entrypoint.',
    'packages/ui': 'Shared React UI primitives and dashboard components.',
    'packages/ai': 'Provider abstractions, model services, and routing helpers.',
    'packages/memory': 'Memory storage and retrieval subsystem building blocks.',
    'packages/search': 'Search and indexing utilities.',
    'packages/agents': 'Agent orchestration and multi-actor runtime helpers.',
    'packages/adk': 'Agent Development Kit - core interfaces and swarm membership helpers.',
    'packages/mcp-client': 'High-performance Model Context Protocol client and aggregator.',
    'packages/mcp-registry': 'Unified directory for local and community MCP servers.',
    'packages/mcp-router-cli': 'Direct-to-tRPC bridge for low-level MCP orchestration.',
    'packages/tools': 'Foundational toolset including FS, PTY, and browser controls.',
    'packages/types': 'Shared TypeScript definitions across the monorepo.',
    'packages/tsconfig': 'Unified TypeScript configurations.',
    'scripts': 'Build, validation, and operator automation scripts.',
    'docs': 'Vision, roadmap, deployment, and reference research.',
    'submodules': 'Upstream/reference repositories mirrored for comparison and future parity work.',
    'submodules/prism-mcp': 'Prism MCP upstream reference for persistent memory, dashboard, and migration feature assimilation.',
    'AGENTS.md': 'Top-level agent operating guidance for the repo.',
    'VISION.md': 'Authoritative long-range product direction and control-plane goals.',
    'ROADMAP.md': 'Major phases and medium/long-range implementation sequencing.',
    'TODO.md': 'Short-horizon implementation queue and polish backlog.',
    'CHANGELOG.md': 'Release-level historical log of notable changes.',
    'DEPLOY.md': 'Deployment and startup instructions.',
    'MEMORY.md': 'Persistent project observations and preferences.',
    'README.md': 'Primary project overview and onboarding entrypoint.',
};

async function readPackageMetadata(basePath: string): Promise<{ packageName?: string; version?: string; description?: string }> {
    try {
        const pkgPath = path.join(basePath, 'package.json');
        const pkgContent = await fs.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgContent) as { name?: string; version?: string; description?: string };
        return {
            packageName: typeof pkg.name === 'string' ? pkg.name : undefined,
            version: typeof pkg.version === 'string' ? pkg.version : undefined,
            description: typeof pkg.description === 'string' ? pkg.description : undefined,
        };
    } catch {
        return {};
    }
}

async function readWorkspaceEntries(root: string, relativeDir: string, kind: WorkspaceInventoryEntry['kind']): Promise<WorkspaceInventoryEntry[]> {
    const fullDir = path.join(root, relativeDir);

    try {
        const dirEntries = await fs.readdir(fullDir, { withFileTypes: true });
        const visibleEntries = dirEntries
            .filter((entry) => !entry.name.startsWith('.'))
            .filter((entry) => ['document', 'script', 'config'].includes(kind) || entry.isDirectory())
            .sort((a, b) => a.name.localeCompare(b.name));

        return await Promise.all(visibleEntries.map(async (entry) => {
            const relPath = path.join(relativeDir, entry.name).replace(/\\/g, '/');
            const metadata = entry.isDirectory()
                ? await readPackageMetadata(path.join(fullDir, entry.name))
                : {};

            return {
                name: entry.name,
                path: relPath,
                kind,
                summary: ENTRY_SUMMARIES[relPath] || metadata.description || `${entry.name} under ${relativeDir}.`,
                packageName: metadata.packageName,
                version: metadata.version,
            };
        }));
    } catch {
        return [];
    }
}

export async function fetchWorkspaceInventoryAction(): Promise<WorkspaceInventorySection[]> {
    const root = getMonorepoRoot();
    const rootDocs = ['README.md', 'VISION.md', 'ROADMAP.md', 'TODO.md', 'CHANGELOG.md', 'DEPLOY.md', 'MEMORY.md', 'AGENTS.md'];
    const rootEntries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    const rootEntryNames = new Set(rootEntries.map((entry) => entry.name));
    const rootDocEntries = rootDocs.map((fileName) => {
        if (!rootEntryNames.has(fileName)) {
            return null;
        }

        return {
            name: fileName,
            path: fileName,
            kind: fileName.endsWith('.md') ? 'document' as const : 'config' as const,
            summary: ENTRY_SUMMARIES[fileName] || `${fileName} at repository root.`,
        };
    });

    return [
        {
            id: 'apps',
            title: 'Applications',
            description: SECTION_DESCRIPTIONS.apps,
            entries: await readWorkspaceEntries(root, 'apps', 'app'),
        },
        {
            id: 'packages',
            title: 'Packages',
            description: SECTION_DESCRIPTIONS.packages,
            entries: await readWorkspaceEntries(root, 'packages', 'package'),
        },
        {
            id: 'submodules',
            title: 'Reference repositories',
            description: SECTION_DESCRIPTIONS.submodules,
            entries: await readWorkspaceEntries(root, 'submodules', 'submodule'),
        },
        {
            id: 'scripts',
            title: 'Automation scripts',
            description: SECTION_DESCRIPTIONS.scripts,
            entries: await readWorkspaceEntries(root, 'scripts', 'script'),
        },
        {
            id: 'docs',
            title: 'Root docs & control files',
            description: SECTION_DESCRIPTIONS.docs,
            entries: rootDocEntries.filter((entry) => entry !== null) as WorkspaceInventoryEntry[],
        },
    ].filter((section) => section.entries.length > 0);
}

export async function fetchUserLinksAction(): Promise<LinkCategory[]> {
    const root = getMonorepoRoot();
    const linksPath = path.join(root, 'docs', 'USER_LINKS_ARCHIVE.md');

    try {
        const content = await fs.readFile(linksPath, 'utf-8');
        const lines = content.split('\n');
        const categories: LinkCategory[] = [];
        let currentCategory: LinkCategory | null = null;

        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (currentCategory) {
                    categories.push(currentCategory);
                }
                currentCategory = { name: line.substring(3).trim(), links: [] };
            } else if (line.trim().startsWith('- http')) {
                if (currentCategory) {
                    currentCategory.links.push(line.trim().substring(2).trim());
                }
            }
        }
        if (currentCategory) {
            categories.push(currentCategory);
        }
        return categories;
    } catch (e) {
        console.error("Failed to read user links:", e);
        return [];
    }
}

export async function healSubmodulesAction(): Promise<{ success: boolean, message: string }> {
    const root = getMonorepoRoot();
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
        console.log("Healing submodules in:", root);
        // This command initializes and updates all submodules, fixing "missing" or "empty" states.
        // We use --remote to fetch latest if desired, but standard update is safer for stability.
        await execAsync('git submodule update --init --recursive', { cwd: root });
        return { success: true, message: "Submodule heal command executed successfully." };
    } catch (e: any) {
        console.error("Heal failed:", e);
        return { success: false, message: `Failed to heal submodules: ${e.message}` };
    }
}
