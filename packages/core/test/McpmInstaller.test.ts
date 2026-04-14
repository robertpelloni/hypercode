
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpmInstaller } from '../src/skills/McpmInstaller';
import fs from 'fs/promises';
import path from 'path';

// Mock McpmRegistry
// We need to mock the MODULE import
vi.mock('../src/skills/McpmRegistry.js', () => {
    return {
        McpmRegistry: vi.fn().mockImplementation(() => {
            return {
                search: vi.fn().mockResolvedValue([
                    { name: 'weather', url: 'https://github.com/example/weather.git' }
                ])
            };
        })
    };
});

// Mock @hypercode/mcp-registry so the installer falls through to the legacy git clone path
vi.mock('@hypercode/mcp-registry', () => {
    return {
        Registry: vi.fn().mockImplementation(() => ({
            list: vi.fn().mockReturnValue([]),
        })),
    };
});

// Mock fs
vi.mock('fs/promises', async () => {
    return {
        default: {
            mkdir: vi.fn(),
            access: vi.fn(),
        }
    };
});

// Mock child_process spawn
import { spawn } from 'child_process';
vi.mock('child_process', () => {
    return {
        spawn: vi.fn()
    };
});

describe('McpmInstaller', () => {
    let installer: McpmInstaller;
    const installDir = '/mock/skills';

    beforeEach(() => {
        installer = new McpmInstaller(installDir);
        vi.clearAllMocks();
    });

    it('should install a skill via git clone', async () => {
        // Mock spawn success
        const mockSpawn = {
            on: vi.fn((event, cb) => {
                if (event === 'close') cb(0); // Success
                return mockSpawn;
            })
        };
        vi.mocked(spawn).mockReturnValue(mockSpawn as unknown as never);

        // Mock access failing (dir doesn't exist yet)
        vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

        const result = await installer.install('weather');

        expect(result).toContain("Successfully installed 'weather'");
        expect(spawn).toHaveBeenCalledWith(
            expect.stringContaining('git clone https://github.com/example/weather.git'),
            expect.any(Object)
        );
    });

    it('should skip installation if already exists', async () => {
        // Mock access success (dir exists)
        vi.mocked(fs.access).mockResolvedValue(undefined);

        const result = await installer.install('weather');

        expect(result).toContain("already installed");
        expect(spawn).not.toHaveBeenCalled();
    });
});
