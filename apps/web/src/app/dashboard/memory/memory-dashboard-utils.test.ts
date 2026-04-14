import { describe, expect, it } from 'vitest';

import {
    filterMemoryRecords,
    getMemoryBadgeLabel,
    getMemoryDetailSections,
    getMemoryModeHint,
    getMemoryPivotSections,
    getMemoryPreview,
    getMemoryProvenance,
    getMemoryRecordKind,
    getMemoryRecordKey,
    getRelatedMemoryRecords,
    getMemoryTimestamp,
    getMemoryTitle,
    groupMemoryWindowAroundAnchor,
    groupMemoryRecordsByDay,
    sortMemoryRecordsByTimestamp,
} from './memory-dashboard-utils';

describe('memory dashboard utils', () => {
    const factRecord = {
        content: 'Remember that HyperCode boots the control plane before opening the dashboard.',
        createdAt: '2026-03-12T10:00:00.000Z',
        metadata: { source: 'dashboard', type: 'working' },
    };

    const observationRecord = {
        content: 'Observation fallback',
        createdAt: 123,
        metadata: {
            source: 'search',
            sessionId: 'session-77',
            structuredObservation: {
                type: 'discovery',
                title: 'Search located memory router procedures',
                subtitle: 'The router already has the specific search procedures we need.',
                narrative: 'Confirmed searchObservations, searchUserPrompts, and searchSessionSummaries exist.',
                facts: ['searchObservations exists', 'searchUserPrompts exists'],
                concepts: ['memory', 'search'],
                filesRead: ['packages/core/src/routers/memoryRouter.ts'],
                filesModified: ['apps/web/src/app/dashboard/memory/page.tsx'],
                toolName: 'grep_search',
            },
        },
    };

    const promptRecord = {
        content: 'Prompt fallback',
        createdAt: new Date('2026-03-12T11:00:00.000Z'),
        metadata: {
            source: 'user_prompt',
            structuredUserPrompt: {
                role: 'goal',
                content: 'Make the memory page reflect one coherent HyperCode-owned model.',
                promptNumber: 4,
                sessionId: 'session-77',
            },
        },
    };

    const summaryRecord = {
        content: 'Summary fallback',
        timestamp: '2026-03-12T12:00:00.000Z',
        metadata: {
            source: 'session_summary',
            structuredSessionSummary: {
                name: 'Morning memory review',
                sessionId: 'session-77',
                status: 'running',
                cliType: 'claude',
                activeGoal: 'Ship the memory dashboard cleanup.',
                restartCount: 2,
            },
        },
    };

    const relatedObservationRecord = {
        content: 'Related observation fallback',
        createdAt: '2026-03-12T11:30:00.000Z',
        metadata: {
            source: 'search',
            sessionId: 'session-77',
            structuredObservation: {
                type: 'progress',
                title: 'Patched memory dashboard query routing',
                narrative: 'Updated the dashboard to use the correct prompt and summary procedures.',
                facts: ['dashboard query routing patched'],
                concepts: ['memory', 'search'],
                filesRead: ['packages/core/src/routers/memoryRouter.ts'],
                filesModified: ['apps/web/src/app/dashboard/memory/page.tsx'],
                toolName: 'grep_search',
            },
        },
    };

    it('classifies HyperCode memory record kinds correctly', () => {
        expect(getMemoryRecordKind(factRecord)).toBe('fact');
        expect(getMemoryRecordKind(observationRecord)).toBe('observation');
        expect(getMemoryRecordKind(promptRecord)).toBe('prompt');
        expect(getMemoryRecordKind(summaryRecord)).toBe('session_summary');
    });

    it('filters records by requested search mode', () => {
        const records = [factRecord, observationRecord, promptRecord, summaryRecord];

        expect(filterMemoryRecords(records, 'all')).toHaveLength(4);
        expect(filterMemoryRecords(records, 'facts')).toEqual([factRecord]);
        expect(filterMemoryRecords(records, 'observations')).toEqual([observationRecord]);
        expect(filterMemoryRecords(records, 'prompts')).toEqual([promptRecord]);
        expect(filterMemoryRecords(records, 'session_summaries')).toEqual([summaryRecord]);
    });

    it('builds coherent titles, previews, and badges for each record type', () => {
        expect(getMemoryBadgeLabel(factRecord)).toBe('working');
        expect(getMemoryTitle(factRecord)).toContain('Remember that HyperCode boots');
        expect(getMemoryPreview(factRecord)).toContain('control plane');

        expect(getMemoryBadgeLabel(observationRecord)).toBe('discovery');
        expect(getMemoryTitle(observationRecord)).toBe('Search located memory router procedures');
        expect(getMemoryPreview(observationRecord)).toContain('searchObservations');

        expect(getMemoryBadgeLabel(promptRecord)).toBe('goal');
        expect(getMemoryTitle(promptRecord)).toBe('Prompt #4');
        expect(getMemoryPreview(promptRecord)).toContain('coherent HyperCode-owned model');

        expect(getMemoryBadgeLabel(summaryRecord)).toBe('running');
        expect(getMemoryTitle(summaryRecord)).toBe('Morning memory review');
        expect(getMemoryPreview(summaryRecord)).toBe('Ship the memory dashboard cleanup.');
    });

    it('collects provenance tokens and normalizes timestamps', () => {
        expect(getMemoryProvenance(observationRecord)).toEqual([
            'source=search',
            'tool=grep_search',
            'read=1',
            'modified=1',
            'facts=2',
        ]);

        expect(getMemoryProvenance(promptRecord)).toEqual([
            'source=user_prompt',
            'session=session-77',
        ]);

        expect(getMemoryProvenance(summaryRecord)).toEqual([
            'source=session_summary',
            'cli=claude',
            'session=session-77',
            'restarts=2',
        ]);

        expect(getMemoryTimestamp(factRecord)).toBe(Date.parse('2026-03-12T10:00:00.000Z'));
        expect(getMemoryTimestamp(observationRecord)).toBe(123);
        expect(getMemoryTimestamp(promptRecord)).toBe(new Date('2026-03-12T11:00:00.000Z').getTime());
        expect(getMemoryTimestamp(summaryRecord)).toBe(Date.parse('2026-03-12T12:00:00.000Z'));
    });

    it('describes each search mode in operator-facing language', () => {
        expect(getMemoryModeHint('all', 'working')).toContain('working tier');
        expect(getMemoryModeHint('facts', 'long_term')).toContain('long_term tier');
        expect(getMemoryModeHint('observations', 'working')).toContain('runtime observations');
        expect(getMemoryModeHint('prompts', 'session')).toContain('prompt and goal captures');
        expect(getMemoryModeHint('session_summaries', 'session')).toContain('session summaries');
    });

    it('builds timeline groups and stable record keys', () => {
        const records = [summaryRecord, factRecord, observationRecord, promptRecord];
        const sorted = sortMemoryRecordsByTimestamp(records);

        expect(sorted[0]).toBe(summaryRecord);
        expect(sorted.at(-1)).toBe(observationRecord);
        expect(getMemoryRecordKey(summaryRecord)).toContain('Morning memory review');

        const groups = groupMemoryRecordsByDay(records, Date.parse('2026-03-12T15:00:00.000Z'));
        expect(groups).toHaveLength(2);
        expect(groups[0]?.label).toBe('Today');
        expect(groups[0]?.items).toHaveLength(3);
        expect(groups[1]?.items).toEqual([observationRecord]);
    });

    it('derives detail sections from structured memory records', () => {
        expect(getMemoryDetailSections(observationRecord)).toEqual([
            {
                title: 'Narrative',
                body: 'Confirmed searchObservations, searchUserPrompts, and searchSessionSummaries exist.',
            },
            {
                title: 'Subtitle',
                body: 'The router already has the specific search procedures we need.',
            },
            {
                title: 'Extracted facts',
                items: ['searchObservations exists', 'searchUserPrompts exists'],
            },
            {
                title: 'Concepts',
                items: ['memory', 'search'],
            },
            {
                title: 'Files read',
                items: ['packages/core/src/routers/memoryRouter.ts'],
            },
            {
                title: 'Files modified',
                items: ['apps/web/src/app/dashboard/memory/page.tsx'],
            },
            {
                title: 'Canonical record',
                body: 'Observation fallback',
            },
        ]);

        expect(getMemoryDetailSections(promptRecord)).toEqual([
            {
                title: 'Prompt content',
                body: 'Make the memory page reflect one coherent HyperCode-owned model.',
            },
            {
                title: 'Canonical record',
                body: 'Prompt fallback',
            },
        ]);

        expect(getMemoryDetailSections(summaryRecord)).toEqual([
            {
                title: 'Active goal',
                body: 'Ship the memory dashboard cleanup.',
            },
            {
                title: 'Runtime details',
                items: ['Session: session-77', 'CLI: claude', 'Status: running', 'Restarts: 2'],
            },
            {
                title: 'Canonical record',
                body: 'Summary fallback',
            },
        ]);
    });

    it('finds and ranks related records by session, tool, concepts, and files', () => {
        const related = getRelatedMemoryRecords(observationRecord, [
            observationRecord,
            promptRecord,
            summaryRecord,
            relatedObservationRecord,
            factRecord,
        ]);

        expect(related).toHaveLength(3);
        expect(related[0]).toMatchObject({
            memory: relatedObservationRecord,
            reasons: expect.arrayContaining([
                'same tool (grep_search)',
                'same source (search)',
                'shared concepts: memory, search',
                'shared file: packages/core/src/routers/memoryRouter.ts',
            ]),
        });
        expect(related.slice(1)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                memory: promptRecord,
                reasons: ['same session (session-77)'],
            }),
            expect.objectContaining({
                memory: summaryRecord,
                reasons: ['same session (session-77)'],
            }),
        ]));
    });

    it('builds pivot actions for sessions, tools, concepts, and files', () => {
        expect(getMemoryPivotSections(observationRecord)).toEqual([
            {
                title: 'Session pivots',
                actions: [
                    {
                        key: 'session:session-77',
                        label: 'session-77',
                        query: 'session-77',
                        mode: 'all',
                        group: 'session',
                        description: 'Re-query all records tied to this session identifier.',
                    },
                ],
            },
            {
                title: 'Tool pivots',
                actions: [
                    {
                        key: 'tool:grep_search',
                        label: 'grep_search',
                        query: 'grep_search',
                        mode: 'all',
                        group: 'tool',
                        description: 'Search all related records anchored to observations from this tool.',
                    },
                ],
            },
            {
                title: 'Concept pivots',
                actions: [
                    {
                        key: 'concept:memory',
                        label: 'memory',
                        query: 'memory',
                        mode: 'all',
                        group: 'concept',
                        description: 'Search all related records anchored to this concept.',
                    },
                    {
                        key: 'concept:search',
                        label: 'search',
                        query: 'search',
                        mode: 'all',
                        group: 'concept',
                        description: 'Search all related records anchored to this concept.',
                    },
                ],
            },
            {
                title: 'File pivots',
                actions: [
                    {
                        key: 'file:packages/core/src/routers/memoryRouter.ts',
                        label: 'packages/core/src/routers/memoryRouter.ts',
                        query: 'packages/core/src/routers/memoryRouter.ts',
                        mode: 'all',
                        group: 'file',
                        description: 'Search all related records anchored to this file.',
                    },
                    {
                        key: 'file:apps/web/src/app/dashboard/memory/page.tsx',
                        label: 'apps/web/src/app/dashboard/memory/page.tsx',
                        query: 'apps/web/src/app/dashboard/memory/page.tsx',
                        mode: 'all',
                        group: 'file',
                        description: 'Search all related records anchored to this file.',
                    },
                ],
            },
        ]);

        expect(getMemoryPivotSections(factRecord)).toEqual([]);
    });

    it('surfaces goal and objective pivots from prompt and summary records', () => {
        const objectivePromptRecord = {
            content: 'Objective prompt fallback',
            createdAt: new Date('2026-03-12T11:15:00.000Z'),
            metadata: {
                source: 'user_prompt',
                structuredUserPrompt: {
                    role: 'objective',
                    content: 'Patch the billing router fallback path.',
                    promptNumber: 5,
                    sessionId: 'session-77',
                },
            },
        };

        expect(getMemoryPivotSections(promptRecord)).toEqual([
            {
                title: 'Session pivots',
                actions: [
                    {
                        key: 'session:session-77',
                        label: 'session-77',
                        query: 'session-77',
                        mode: 'all',
                        group: 'session',
                        description: 'Re-query all records tied to this session identifier.',
                    },
                ],
            },
            {
                title: 'Goal pivots',
                actions: [
                    {
                        key: 'goal:Make the memory page reflect one coherent HyperCode-owned model.',
                        label: 'Make the memory page reflect one coherent HyperCode-owned model.',
                        query: 'Make the memory page reflect one coherent HyperCode-owned model.',
                        mode: 'all',
                        group: 'goal',
                        description: 'Search all related records anchored to this active goal.',
                    },
                ],
            },
        ]);

        expect(getMemoryPivotSections(summaryRecord)).toEqual([
            {
                title: 'Session pivots',
                actions: [
                    {
                        key: 'session:session-77',
                        label: 'session-77',
                        query: 'session-77',
                        mode: 'all',
                        group: 'session',
                        description: 'Re-query all records tied to this session identifier.',
                    },
                ],
            },
            {
                title: 'Goal pivots',
                actions: [
                    {
                        key: 'goal:Ship the memory dashboard cleanup.',
                        label: 'Ship the memory dashboard cleanup.',
                        query: 'Ship the memory dashboard cleanup.',
                        mode: 'all',
                        group: 'goal',
                        description: 'Search all related records anchored to this active goal.',
                    },
                ],
            },
        ]);

        expect(getMemoryPivotSections(objectivePromptRecord)).toEqual([
            {
                title: 'Session pivots',
                actions: [
                    {
                        key: 'session:session-77',
                        label: 'session-77',
                        query: 'session-77',
                        mode: 'all',
                        group: 'session',
                        description: 'Re-query all records tied to this session identifier.',
                    },
                ],
            },
            {
                title: 'Objective pivots',
                actions: [
                    {
                        key: 'objective:Patch the billing router fallback path.',
                        label: 'Patch the billing router fallback path.',
                        query: 'Patch the billing router fallback path.',
                        mode: 'all',
                        group: 'objective',
                        description: 'Search all related records anchored to this recent objective.',
                    },
                ],
            },
        ]);
    });

    it('groups session window records around the selected anchor', () => {
        const earlierRecord = {
            content: 'Earlier context',
            createdAt: '2026-03-12T10:45:00.000Z',
            metadata: {
                sessionId: 'session-77',
                structuredObservation: {
                    title: 'Earlier observation',
                },
            },
        };
        const laterRecord = {
            content: 'Later context',
            createdAt: '2026-03-12T11:15:00.000Z',
            metadata: {
                sessionId: 'session-77',
                structuredObservation: {
                    title: 'Later observation',
                },
            },
        };
        const muchEarlierRecord = {
            content: 'Much earlier context',
            createdAt: '2026-03-12T09:00:00.000Z',
            metadata: {
                sessionId: 'session-77',
                structuredObservation: {
                    title: 'Much earlier observation',
                },
            },
        };

        expect(groupMemoryWindowAroundAnchor(promptRecord, [
            earlierRecord,
            laterRecord,
            muchEarlierRecord,
        ])).toEqual([
            {
                key: 'earlier',
                label: 'Earlier in session',
                items: [earlierRecord, muchEarlierRecord],
            },
            {
                key: 'later',
                label: 'Later in session',
                items: [laterRecord],
            },
        ]);
    });
});