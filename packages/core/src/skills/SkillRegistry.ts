
import glob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface Skill {
    id: string;
    name: string;
    description: string;
    content: string; // The markdown instructions
    path: string;
}

export class SkillRegistry {
    private skills: Map<string, Skill> = new Map();
    private searchPaths: string[];
    private masterIndexPath?: string;

    constructor(searchPaths: string[]) {
        this.searchPaths = searchPaths;
    }

    setMasterIndexPath(indexPath: string) {
        this.masterIndexPath = indexPath;
    }

    async getLibraryIndex() {
        if (!this.masterIndexPath) {
            return { categories: { mcp_servers: [], universal_harness: [], skills: [] } };
        }

        try {
            const content = await fs.readFile(this.masterIndexPath, 'utf-8');
            // Remove comments (JSONC)
            const cleanJSON = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
            return JSON.parse(cleanJSON);
        } catch (e) {
            console.error("Error reading master index:", e);
            return { categories: { mcp_servers: [], universal_harness: [], skills: [] } };
        }
    }

    hasSkill(id: string): boolean {
        // Skill IDs in the map are usually the folders/names
        return this.skills.has(id);
    }

    getSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    async loadSkills() {
        this.skills.clear();

        for (const loc of this.searchPaths) {
            try {
                // Find all SKILL.md files (case-insensitive for Windows, but explicit for Linux)
                const entries = await glob(['**/SKILL.md', '**/skill.md'], {
                    cwd: loc,
                    absolute: true,
                    deep: 3 // Go deeper just in case
                });

                for (const file of entries) {
                    await this.parseSkill(file);
                }
            } catch (e) {
                // Ignore missing directories
            }
        }
        console.log(`Borg Core: Loaded ${this.skills.size} skills.`);
    }

    private async parseSkill(filePath: string) {
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const { data, content } = matter(raw);

            // Use 'name' from frontmatter or folder name
            const id = data.name || path.basename(path.dirname(filePath));

            const skill: Skill = {
                id,
                name: data.name || id,
                description: data.description || "No description provided",
                content,
                path: filePath
            };

            this.skills.set(id, skill);
        } catch (e) {
            console.error(`Failed to parse skill at ${filePath}`, e);
        }
    }

    getSkillTools() {
        return [
            {
                name: "list_skills",
                description: "List all available skills (runbooks)",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "read_skill",
                description: "Read the content/instructions of a specific skill",
                inputSchema: {
                    type: "object",
                    properties: {
                        skillName: { type: "string" }
                    },
                    required: ["skillName"]
                }
            },
            {
                name: "create_skill",
                description: "Create a new skill (runbook)",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Unique ID (folder name)" },
                        name: { type: "string" },
                        description: { type: "string" }
                    },
                    required: ["id", "name", "description"]
                }
            },
            {
                name: "update_skill",
                description: "Update content of an existing skill",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        content: { type: "string" }
                    },
                    required: ["id", "content"]
                }
            }
        ];
    }

    async listSkills() {
        const skillList = Array.from(this.skills.values()).map(s => ({
            name: s.name,
            description: s.description
        }));

        return {
            content: [{
                type: "text",
                text: JSON.stringify(skillList, null, 2)
            }]
        };
    }

    async readSkill(skillName: string) {
        const skill = this.skills.get(skillName);
        if (!skill) {
            return {
                content: [{ type: "text", text: `Skill '${skillName}' not found.` }]
            };
        }

        return {
            content: [{
                type: "text",
                text: skill.content
            }]
        };
    }

    async createSkill(id: string, name: string, description: string) {
        // Default to the first search path (usually .borg/skills in cwd)
        const targetDir = this.searchPaths[0];
        const skillDir = path.join(targetDir, id);
        const skillFile = path.join(skillDir, 'SKILL.md');

        try {
            await fs.mkdir(skillDir, { recursive: true });

            const content = `---
name: ${name}
description: ${description}
---

# ${name}

${description}

## Instructions
1. ...
`;
            await fs.writeFile(skillFile, content, 'utf-8');

            // Reload to pick up new skill
            await this.parseSkill(skillFile);

            return {
                content: [{ type: "text", text: `Created skill '${name}' at ${skillFile}` }]
            };
        } catch (e: any) {
            return { content: [{ type: "text", text: `Error creating skill: ${e.message}` }] };
        }
    }

    async saveSkill(id: string, content: string) {
        const skill = this.skills.get(id);
        if (!skill) {
            return { content: [{ type: "text", text: `Skill '${id}' not found.` }] };
        }

        try {
            await fs.writeFile(skill.path, content, 'utf-8');

            // Update in-memory
            skill.content = content;
            // Re-parse to update frontmatter if changed
            await this.parseSkill(skill.path);

            return { content: [{ type: "text", text: `Saved skill '${id}'.` }] };
        } catch (e: any) {
            return { content: [{ type: "text", text: `Error saving skill: ${e.message}` }] };
        }
    }
}
