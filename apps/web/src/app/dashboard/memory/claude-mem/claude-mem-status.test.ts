import { describe, expect, it } from 'vitest';

import { CLAUDE_MEM_CAPABILITIES, getClaudeMemOperatorGuidance, getClaudeMemStatusSummary } from './claude-mem-status';

describe('claude-mem status helpers', () => {
    it('summarizes the current Borg claude-mem parity state honestly', () => {
        expect(getClaudeMemStatusSummary({ ready: true })).toEqual({
            shippedCount: CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'shipped').length,
            partialCount: CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'partial').length,
            missingCount: CLAUDE_MEM_CAPABILITIES.filter((item) => item.status === 'missing').length,
            stage: 'compatibility-layer',
            stageLabel: 'Compatibility layer',
            coreReady: true,
            coreStatusLabel: 'Core ready',
            coreStatusTone: 'ready',
            pendingStartupChecks: 0,
        });
    });

    it('reports startup state when core readiness is still pending', () => {
        expect(getClaudeMemStatusSummary({ ready: false }).coreStatusLabel).toBe('Core warming up');
        expect(getClaudeMemStatusSummary({ ready: false }).coreStatusTone).toBe('warming');
        expect(getClaudeMemStatusSummary(null).coreReady).toBe(false);
    });

    it('surfaces pending startup checks even after core reaches ready state', () => {
        expect(getClaudeMemStatusSummary({
            ready: true,
            checks: {
                configSync: { ready: true },
                extensionBridge: { ready: false },
            },
        })).toMatchObject({
            coreReady: true,
            pendingStartupChecks: 1,
            coreStatusTone: 'pending',
            coreStatusLabel: 'Core ready · 1 startup check pending',
        });
    });

    it('guides operators when the adapter store has not been created yet', () => {
        expect(getClaudeMemOperatorGuidance({
            exists: false,
            defaultSectionCount: 5,
            presentDefaultSectionCount: 0,
            populatedSectionCount: 0,
            missingSections: ['project_context', 'user_facts', 'style_preferences', 'commands', 'general'],
            runtimePipeline: {
                configuredMode: 'redundant',
                providerNames: ['json', 'claude-mem'],
                providerCount: 2,
                claudeMemEnabled: true,
            },
        })).toEqual({
            title: 'Adapter store not created yet',
            detail: 'No Borg-managed claude_mem store exists yet. When the adapter initializes, it seeds 5 default buckets for project context, user facts, style preferences, commands, and general notes.',
            tone: 'warning',
        });
    });

    it('guides operators when data exists but default bucket coverage is incomplete', () => {
        expect(getClaudeMemOperatorGuidance({
            exists: true,
            totalEntries: 3,
            defaultSectionCount: 5,
            presentDefaultSectionCount: 2,
            populatedSectionCount: 2,
            missingSections: ['user_facts', 'style_preferences', 'general'],
            runtimePipeline: {
                configuredMode: 'redundant',
                providerNames: ['json', 'claude-mem'],
                providerCount: 2,
                claudeMemEnabled: true,
            },
        })).toEqual({
            title: 'Adapter store active, bucket coverage incomplete',
            detail: '2 buckets currently hold data, but 3 default buckets are still missing: user_facts, style_preferences, general.',
            tone: 'pending',
        });
    });

    it('warns when claude-mem is not part of the active memory pipeline', () => {
        expect(getClaudeMemOperatorGuidance({
            exists: true,
            totalEntries: 3,
            defaultSectionCount: 5,
            presentDefaultSectionCount: 5,
            populatedSectionCount: 2,
            missingSections: [],
            runtimePipeline: {
                configuredMode: 'json',
                providerNames: ['json'],
                providerCount: 1,
                claudeMemEnabled: false,
            },
        })).toEqual({
            title: 'Claude-mem adapter not active in the runtime pipeline',
            detail: 'Core reports the active memory pipeline as json with json. The adapter file can still exist on disk, but Borg is not currently writing new memories through claude-mem.',
            tone: 'warning',
        });
    });
});