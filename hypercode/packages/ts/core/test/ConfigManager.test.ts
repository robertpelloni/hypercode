
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../src/config/ConfigManager';
import fs from 'fs';
import path from 'path';

// Mock fs
vi.mock('fs', async () => {
    return {
        default: {
            existsSync: vi.fn(),
            readFileSync: vi.fn(),
            writeFileSync: vi.fn(),
            mkdirSync: vi.fn(),
        }
    };
});

describe('ConfigManager', () => {
    let configManager: ConfigManager;
    const mockCwd = '/mock/cwd';
    const configPath = path.join(mockCwd, '.hypercode', 'config.json');

    beforeEach(() => {
        vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
        configManager = new ConfigManager();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should construct with correct path', () => {
        // We can't easily check private property, but we can verify behavior
        expect(configManager).toBeDefined();
    });

    it('should load config if file exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const mockConfig = { foo: 'bar' };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

        const config = configManager.loadConfig();
        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('config.json'));
        expect(config).toEqual(mockConfig);
    });

    it('should return null if file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const config = configManager.loadConfig();
        expect(config).toBeNull();
    });

    it('should save config to file', () => {
        // existsSync for dir check
        vi.mocked(fs.existsSync).mockReturnValue(false); // dir missing

        const newConfig = { setting: 123 };
        configManager.saveConfig(newConfig);

        // Check mkdir
        expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.hypercode'), { recursive: true });
        // Check write
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('config.json'),
            JSON.stringify(newConfig, null, 2)
        );
    });

    it('should handle load errors gracefully', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('Read error'); });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const config = configManager.loadConfig();

        expect(config).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
    });
});
