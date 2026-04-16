
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SkillManager } from '../src/managers/SkillManager';
import path from 'path';

// Mock McpmRegistry or file system if needed.
// However, SkillManager reads from a JSON file.
// We can mock fs to avoid reading real registry.
import fs from 'fs';

vi.mock('fs', async () => {
    return {
        default: {
            existsSync: vi.fn(),
            readFileSync: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            access: vi.fn(),
            mkdir: vi.fn()
        },
        promises: {
            readFile: vi.fn(),
            mkdir: vi.fn(),
            access: vi.fn()
        }
    };
});

describe('SkillManager', () => {
    let skillManager: SkillManager;
    const mockRegistryPath = '/mock/registry.json';

    beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        // Mock Registry Content
        const mockRegistry = {
            skills: [
                {
                    id: "test_skill",
                    name: "Test Skill",
                    type: "prompt",
                    description: "A test skill",
                    content: "You are a test."
                }
            ]
        };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockRegistry));

        skillManager = new SkillManager(mockRegistryPath);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize and load skills from registry', async () => {
        await skillManager.initialize();
        const skills = skillManager.listSkills();
        expect(skills).toHaveLength(1);
        expect(skills[0].name).toBe("Test Skill");
    });

    it('should load a specific skill definition', async () => {
        await skillManager.initialize();
        const skill = await skillManager.loadSkill("test_skill");
        expect(skill).toBeDefined();
        expect(skill?.content).toBe("You are a test.");
    });

    it('should return null for unknown skill', async () => {
        await skillManager.initialize();
        const skill = await skillManager.loadSkill("unknown_skill");
        expect(skill).toBeNull();
    });
});
