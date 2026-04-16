import { describe, expect, it } from 'vitest';

import { parseArgsInput, parseEnvInput } from './session-create-dialog-utils';

describe('session create dialog utils', () => {
    it('parses comma and newline separated args safely', () => {
        expect(parseArgsInput(' --watch, --json\n\n--pretty ')).toEqual(['--watch', '--json', '--pretty']);
    });

    it('parses env input and ignores malformed lines', () => {
        expect(parseEnvInput('OPENAI_API_KEY=test-key\nINVALID_LINE\nHYPERCODE_MODE = autopilot\n=missing')).toEqual({
            OPENAI_API_KEY: 'test-key',
            HYPERCODE_MODE: 'autopilot',
        });
    });
});