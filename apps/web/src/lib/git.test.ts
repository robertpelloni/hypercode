import { afterEach, describe, expect, it, vi } from 'vitest';

const readFileMock = vi.fn();

vi.mock('fs/promises', () => ({
    default: {
        readFile: readFileMock,
        access: vi.fn(),
    },
    readFile: readFileMock,
    access: vi.fn(),
}));

vi.mock('child_process', () => ({
    exec: vi.fn(),
}));

vi.mock('util', () => ({
    default: {
        promisify: () => vi.fn(),
    },
}));

describe('getSubmodules', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        readFileMock.mockReset();
    });

    it('returns an empty list when .gitmodules is missing', async () => {
        readFileMock.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));

        const { getSubmodules } = await import('./git');

        await expect(getSubmodules('C:\\workspace\\repo')).resolves.toEqual([]);
    });

    it('throws a concise error when .gitmodules cannot be parsed', async () => {
        readFileMock.mockResolvedValueOnce('[submodule "broken"]\npath = packages/core\n');

        const { getSubmodules } = await import('./git');

        await expect(getSubmodules('C:\\workspace\\repo')).rejects.toThrow(
            'Submodule inventory is unavailable: Malformed .gitmodules file',
        );
    });
});
