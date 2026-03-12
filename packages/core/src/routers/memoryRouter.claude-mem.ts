import fs from 'fs/promises';
import path from 'path';

import { CLAUDE_MEM_DEFAULT_SECTIONS } from '../services/memory/ClaudeMemAdapter.js';
import type { MemoryPipelineSummary } from '../services/memory/MemoryManager.js';

export type ClaudeMemRuntimePipelineStatus = {
    configuredMode: MemoryPipelineSummary['configuredMode'] | 'unknown';
    providerNames: string[];
    providerCount: number;
    claudeMemEnabled: boolean;
};

export type ClaudeMemSectionStatus = {
    section: string;
    entryCount: number;
};

export type ClaudeMemStoreStatus = {
    exists: boolean;
    storePath: string;
    totalEntries: number;
    sectionCount: number;
    defaultSectionCount: number;
    presentDefaultSectionCount: number;
    populatedSectionCount: number;
    missingSections: string[];
    runtimePipeline: ClaudeMemRuntimePipelineStatus;
    sections: ClaudeMemSectionStatus[];
    lastUpdatedAt: string | null;
};

type RawClaudeMemStore = {
    sections?: Array<{
        section?: string;
        entries?: Array<{
            createdAt?: string;
        }>;
    }>;
};

export function summarizeClaudeMemRuntimePipeline(pipelineSummary?: MemoryPipelineSummary | null): ClaudeMemRuntimePipelineStatus {
    if (!pipelineSummary) {
        return {
            configuredMode: 'unknown',
            providerNames: [],
            providerCount: 0,
            claudeMemEnabled: false,
        };
    }

    return {
        configuredMode: pipelineSummary.configuredMode,
        providerNames: pipelineSummary.providerNames,
        providerCount: pipelineSummary.providerCount,
        claudeMemEnabled: pipelineSummary.claudeMemEnabled,
    };
}

export function summarizeClaudeMemStore(storePath: string, rawStore: RawClaudeMemStore | null | undefined, pipelineSummary?: MemoryPipelineSummary | null): ClaudeMemStoreStatus {
    const sections = Array.isArray(rawStore?.sections) ? rawStore.sections : [];
    const normalizedSections = sections.map((section, index) => ({
        section: typeof section?.section === 'string' && section.section.trim().length > 0
            ? section.section
            : `section_${index + 1}`,
        entryCount: Array.isArray(section?.entries) ? section.entries.length : 0,
    }));
    const presentSectionNames = new Set(normalizedSections.map((section) => section.section));
    const missingSections = CLAUDE_MEM_DEFAULT_SECTIONS.filter((section) => !presentSectionNames.has(section));
    const populatedSectionCount = normalizedSections.filter((section) => section.entryCount > 0).length;
    const presentDefaultSectionCount = CLAUDE_MEM_DEFAULT_SECTIONS.filter((section) => presentSectionNames.has(section)).length;

    let lastUpdatedAt: string | null = null;
    for (const section of sections) {
        const entries = Array.isArray(section?.entries) ? section.entries : [];
        for (const entry of entries) {
            if (typeof entry?.createdAt !== 'string') continue;
            const currentDate = new Date(entry.createdAt);
            if (Number.isNaN(currentDate.getTime())) continue;

            if (!lastUpdatedAt || currentDate.getTime() > new Date(lastUpdatedAt).getTime()) {
                lastUpdatedAt = currentDate.toISOString();
            }
        }
    }

    const totalEntries = normalizedSections.reduce((sum, section) => sum + section.entryCount, 0);

    return {
        exists: Boolean(rawStore),
        storePath,
        totalEntries,
        sectionCount: normalizedSections.length,
        defaultSectionCount: CLAUDE_MEM_DEFAULT_SECTIONS.length,
        presentDefaultSectionCount,
        populatedSectionCount,
        missingSections,
        runtimePipeline: summarizeClaudeMemRuntimePipeline(pipelineSummary),
        sections: normalizedSections,
        lastUpdatedAt,
    };
}

export async function readClaudeMemStoreStatus(workspaceRoot: string, pipelineSummary?: MemoryPipelineSummary | null): Promise<ClaudeMemStoreStatus> {
    const storePath = path.join(workspaceRoot, '.borg', 'claude_mem.json');

    try {
        const raw = await fs.readFile(storePath, 'utf-8');
        const parsed = JSON.parse(raw) as RawClaudeMemStore;
        return summarizeClaudeMemStore(storePath, parsed, pipelineSummary);
    } catch (error: unknown) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
        if (code === 'ENOENT') {
            return summarizeClaudeMemStore(storePath, null, pipelineSummary);
        }

        throw error;
    }
}