import { describe, expect, it } from 'vitest';

import type { LocalExecutionEnvironment } from './execution-environment.js';
import { buildExecutionPolicyEnv, selectSessionExecutionPolicy } from './session-execution-policy.js';

type TestEnvironmentOverrides = Omit<Partial<LocalExecutionEnvironment>, 'summary'> & {
    summary?: Partial<LocalExecutionEnvironment['summary']>;
};

function createEnvironment(overrides: TestEnvironmentOverrides = {}): LocalExecutionEnvironment {
    const { summary: summaryOverrides, ...environmentOverrides } = overrides;

    return {
        os: 'win32',
        summary: {
            ready: summaryOverrides?.ready ?? true,
            preferredShellId: summaryOverrides?.preferredShellId ?? 'pwsh',
            preferredShellLabel: summaryOverrides?.preferredShellLabel ?? 'PowerShell 7',
            shellCount: summaryOverrides?.shellCount ?? 3,
            verifiedShellCount: summaryOverrides?.verifiedShellCount ?? 3,
            toolCount: summaryOverrides?.toolCount ?? 4,
            verifiedToolCount: summaryOverrides?.verifiedToolCount ?? 4,
            harnessCount: summaryOverrides?.harnessCount ?? 2,
            verifiedHarnessCount: summaryOverrides?.verifiedHarnessCount ?? 2,
            supportsPowerShell: summaryOverrides?.supportsPowerShell ?? true,
            supportsPosixShell: summaryOverrides?.supportsPosixShell ?? true,
            notes: summaryOverrides?.notes ?? [],
        },
        shells: [
            {
                id: 'pwsh',
                name: 'PowerShell 7',
                family: 'powershell',
                installed: true,
                verified: true,
                resolvedPath: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                version: '7.5.0',
                preferred: true,
                notes: [],
            },
            {
                id: 'cygwin-bash',
                name: 'Cygwin Bash',
                family: 'posix',
                installed: true,
                verified: true,
                resolvedPath: 'C:\\cygwin64\\bin\\bash.exe',
                version: '3.5.4',
                preferred: false,
                notes: [],
            },
            {
                id: 'cmd',
                name: 'Command Prompt',
                family: 'cmd',
                installed: true,
                verified: true,
                resolvedPath: 'C:\\Windows\\System32\\cmd.exe',
                version: '10.0',
                preferred: false,
                notes: [],
            },
        ],
        tools: [],
        harnesses: [],
        ...environmentOverrides,
    };
}

describe('selectSessionExecutionPolicy', () => {
    it('prefers PowerShell automatically on Windows hosts', () => {
        const policy = selectSessionExecutionPolicy(createEnvironment(), 'auto');

        expect(policy).toEqual(expect.objectContaining({
            requestedProfile: 'auto',
            effectiveProfile: 'powershell',
            shellId: 'pwsh',
            shellLabel: 'PowerShell 7',
        }));
    });

    it('selects a POSIX shell when requested', () => {
        const policy = selectSessionExecutionPolicy(createEnvironment(), 'posix');

        expect(policy).toEqual(expect.objectContaining({
            requestedProfile: 'posix',
            effectiveProfile: 'posix',
            shellId: 'cygwin-bash',
            shellFamily: 'posix',
        }));
    });

    it('falls back when a requested shell family is unavailable', () => {
        const policy = selectSessionExecutionPolicy(createEnvironment({
            summary: {
                supportsPosixShell: false,
                verifiedShellCount: 1,
            },
            shells: [createEnvironment().shells[0]!],
        }), 'posix');

        expect(policy).toEqual(expect.objectContaining({
            requestedProfile: 'posix',
            effectiveProfile: 'fallback',
            shellId: 'pwsh',
        }));
        expect(policy.reason).toContain('falling back to PowerShell 7');
    });

    it('exports reserved HyperCode execution environment variables', () => {
        const policy = selectSessionExecutionPolicy(createEnvironment(), 'compatibility');
        const env = buildExecutionPolicyEnv(policy);

        expect(env).toEqual(expect.objectContaining({
            BORG_EXECUTION_PROFILE_REQUESTED: 'compatibility',
            BORG_EXECUTION_SHELL_ID: 'cmd',
            BORG_EXECUTION_SHELL_FAMILY: 'cmd',
            SHELL: 'C:\\Windows\\System32\\cmd.exe',
            COMSPEC: 'C:\\Windows\\System32\\cmd.exe',
            npm_config_script_shell: 'C:\\Windows\\System32\\cmd.exe',
            BORG_SUPPORTS_POWERSHELL: '1',
            BORG_SUPPORTS_POSIX_SHELL: '1',
        }));
    });

    it('exports shell path hints for PowerShell-driven sessions', () => {
        const policy = selectSessionExecutionPolicy(createEnvironment(), 'powershell');
        const env = buildExecutionPolicyEnv(policy);

        expect(env).toEqual(expect.objectContaining({
            BORG_EXECUTION_SHELL_ID: 'pwsh',
            SHELL: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
            npm_config_script_shell: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        }));
        expect(env.COMSPEC).toBeUndefined();
    });
});