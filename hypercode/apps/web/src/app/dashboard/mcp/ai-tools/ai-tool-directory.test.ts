import { describe, expect, it } from 'vitest';

import { getCliHarnessCards, getProviderDirectoryCards } from './ai-tool-directory';

describe('getCliHarnessCards', () => {
    it('counts active and running sessions per detected harness', () => {
        const cards = getCliHarnessCards([
            {
                id: 'claude',
                name: 'Claude Code',
                command: 'claude',
                homepage: 'https://example.com/claude',
                docsUrl: 'https://example.com/docs/claude',
                installHint: 'install claude',
                sessionCapable: true,
                installed: true,
                resolvedPath: 'C:/bin/claude.cmd',
                version: 'claude 1.0.0',
                detectionError: null,
            },
        ], [
            { cliType: 'claude', status: 'running' },
            { cliType: 'claude', status: 'stopped' },
        ]);

        expect(cards[0]).toMatchObject({
            activeSessions: 2,
            runningSessions: 1,
            statusLabel: '1 running',
            statusTone: 'success',
        });
    });

    it('returns an empty list when detections payload is malformed', () => {
        const cards = getCliHarnessCards(
            { not: 'an-array' } as unknown as any[],
            [
                { cliType: 'claude', status: 'running' },
                { cliType: 'claude', status: 'stopped' },
            ],
        );

        expect(cards).toEqual([]);
    });
});

describe('getProviderDirectoryCards', () => {
    it('maps provider quota state into compact directory cards', () => {
        const cards = getProviderDirectoryCards([
            {
                provider: 'openai',
                name: 'OpenAI',
                configured: true,
                authenticated: true,
                authMethod: 'api_key',
                used: 42,
                limit: 100,
                resetDate: '2026-03-11T00:00:00.000Z',
                availability: 'healthy',
            },
        ]);

        const openai = cards.find((card) => card.provider === 'openai');

        expect(openai).toMatchObject({
            statusLabel: 'Connected',
            authLabel: 'api key',
            availabilityLabel: 'healthy',
            usageLabel: '42 / 100',
        });
    });

    it('falls back to portal defaults when quota payload is malformed', () => {
        const cards = getProviderDirectoryCards('invalid-quotas' as unknown as any[]);
        const openai = cards.find((card) => card.provider === 'openai');

        expect(cards.length).toBeGreaterThan(0);
        expect(openai).toMatchObject({
            statusLabel: 'Not connected',
            usageLabel: '0 used',
        });
    });
});