import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { isDirectExecution, isHttpProbeResponsive } from './dev_tabby_ready_helpers.mjs';

describe('isDirectExecution', () => {
    it('matches the current script path when invoked directly', () => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'dev_tabby_ready.mjs');
        const scriptUrl = pathToFileURL(scriptPath).href;

        expect(isDirectExecution(scriptUrl, scriptPath)).toBe(true);
    });

    it('returns false when argv1 points at a different script', () => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'dev_tabby_ready.mjs');
        const scriptUrl = pathToFileURL(scriptPath).href;
        const otherPath = path.join(process.cwd(), 'scripts', 'verify_dev_readiness.mjs');

        expect(isDirectExecution(scriptUrl, otherPath)).toBe(false);
    });

    it('handles drive-letter case differences on Windows-style paths', () => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'dev_tabby_ready.mjs');
        const scriptUrl = pathToFileURL(scriptPath).href;

        if (process.platform !== 'win32' || !/^[a-z]:/i.test(scriptPath)) {
            expect(isDirectExecution(scriptUrl, scriptPath)).toBe(true);
            return;
        }

        const flippedDrivePath = `${scriptPath[0] === scriptPath[0].toLowerCase() ? scriptPath[0].toUpperCase() : scriptPath[0].toLowerCase()}${scriptPath.slice(1)}`;
        expect(isDirectExecution(scriptUrl, flippedDrivePath)).toBe(true);
    });

    it('treats any HTTP response as proof that a probe target is alive', () => {
        expect(isHttpProbeResponsive({ ok: true, status: 200 })).toBe(true);
        expect(isHttpProbeResponsive({ ok: false, status: 500 })).toBe(true);
        expect(isHttpProbeResponsive({ ok: false, status: 404 })).toBe(true);
        expect(isHttpProbeResponsive({ ok: false, status: null })).toBe(false);
        expect(isHttpProbeResponsive(null)).toBe(false);
    });
});