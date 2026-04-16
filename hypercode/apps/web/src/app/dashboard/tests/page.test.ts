import { describe, expect, it } from 'vitest';

import { filterResults, isRerunnableResult, normalizeResults, normalizeStatus } from './page-helpers';

describe('tests dashboard helpers', () => {
    it('normalizes result entries defensively', () => {
        expect(normalizeResults([
            { file: 'alpha.test.ts', status: 'pass', timestamp: 123, output: 'ok' },
            null,
            { file: 123, status: 999, timestamp: 'bad' },
        ])).toEqual([
            { file: 'alpha.test.ts', status: 'pass', timestamp: 123, output: 'ok' },
            { file: '', status: 'unknown', timestamp: 0 },
            { file: '', status: 'unknown', timestamp: 0, output: undefined },
        ]);
    });

    it('normalizes watcher status safely', () => {
        expect(normalizeStatus({ isRunning: true, results: { 'alpha.test.ts': { status: 'pass', timestamp: 1 } } })).toEqual({
            isRunning: true,
            results: {
                'alpha.test.ts': { status: 'pass', timestamp: 1 },
            },
        });

        expect(normalizeStatus(null)).toEqual({ isRunning: false, results: {} });
    });

    it('filters by status and text query across file and output', () => {
        const results = [
            { file: 'alpha.test.ts', status: 'fail', timestamp: 1, output: 'network timeout' },
            { file: 'beta.test.ts', status: 'pass', timestamp: 2, output: 'all good' },
            { file: 'gamma.test.ts', status: 'running', timestamp: 3, output: 'executing' },
        ];

        expect(filterResults(results, { query: 'timeout', statusFilter: 'all' })).toEqual([results[0]]);
        expect(filterResults(results, { query: 'beta', statusFilter: 'pass' })).toEqual([results[1]]);
        expect(filterResults(results, { query: '', statusFilter: 'running' })).toEqual([results[2]]);
    });

    it('marks only pass/fail results as rerunnable', () => {
        expect(isRerunnableResult('pass')).toBe(true);
        expect(isRerunnableResult('fail')).toBe(true);
        expect(isRerunnableResult('running')).toBe(false);
        expect(isRerunnableResult('queued')).toBe(false);
    });
});
