
import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for our Internal Skill Registry
interface SkillDefinition {
    id: string;
    name: string;
    description: string;
    provider: 'anthropic' | 'openai' | 'community';
    category: string;
    path: string; // Relative to project root
    metadata?: Record<string, any>;
}

const ROOT_DIR = process.cwd();
const REGISTRY_PATH = path.join(ROOT_DIR, 'packages/core/data/skills_registry.json');
const ANTHROPIC_ROOT = path.join(ROOT_DIR, 'references/skills_repos/anthropic-skills/skills');
const OPENAI_ROOT = path.join(ROOT_DIR, 'references/skills_repos/openai-skills/skills');
const EXTERNAL_SKILLS_ROOT = path.join(ROOT_DIR, 'external/skills');

// Improved Frontmatter Parser that handles multi-line strings
function parseFrontmatter(content: string): Record<string, any> {
    const normalized = content.replace(/\r\n/g, '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const frontmatter: Record<string, any> = {};
    const lines = match[1].split('\n');

    let currentKey = '';
    let currentValue = '';
    let isMultiline = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for key: value
        const keyValMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (keyValMatch) {
            // If we were processing a previous key, save it
            if (currentKey) {
                frontmatter[currentKey] = currentValue.trim();
            }

            currentKey = keyValMatch[1].trim();
            const value = keyValMatch[2].trim();

            if (value === '|' || value === '>') {
                isMultiline = true;
                currentValue = '';
            } else {
                isMultiline = false;
                currentValue = value;
            }
        } else if (currentKey && isMultiline) {
            // Append line to current value
            currentValue += line + '\n';
        } else if (currentKey && !isMultiline && line.trim() !== '') {
            // Continuation of single line value (rare in YAML but possible)
            currentValue += ' ' + line.trim();
        }
    }
    // Save last key
    if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
    }

    return frontmatter;
}

async function scanSkills() {
    const registry: SkillDefinition[] = [];

    // 1. Scan Anthropic Skills
    if (fs.existsSync(ANTHROPIC_ROOT)) {
        console.log(`Scanning Anthropic skills at ${ANTHROPIC_ROOT}...`);
        try {
            const skills = fs.readdirSync(ANTHROPIC_ROOT);
            for (const skillDir of skills) {
                const fullPath = path.join(ANTHROPIC_ROOT, skillDir);
                if (!fs.statSync(fullPath).isDirectory()) continue;

                const skillMdPath = path.join(fullPath, 'SKILL.md');
                if (fs.existsSync(skillMdPath)) {
                    const content = fs.readFileSync(skillMdPath, 'utf-8');
                    const meta = parseFrontmatter(content);

                    registry.push({
                        id: `anthropic_${skillDir}`,
                        name: meta.name || skillDir,
                        description: meta.description || 'No description provided',
                        provider: 'anthropic',
                        category: 'community',
                        path: path.relative(ROOT_DIR, fullPath),
                        metadata: meta
                    });
                }
            }
        } catch (e) {
            console.error('Error scanning Anthropic skills:', e);
        }
    }

    // 2. Scan OpenAI Skills
    if (fs.existsSync(OPENAI_ROOT)) {
        console.log(`Scanning OpenAI skills at ${OPENAI_ROOT}...`);
        try {
            const categories = ['.curated', '.experimental', '.system'];

            for (const cat of categories) {
                const catPath = path.join(OPENAI_ROOT, cat);
                if (!fs.existsSync(catPath)) continue;

                const skills = fs.readdirSync(catPath);
                for (const skillDir of skills) {
                    const fullPath = path.join(catPath, skillDir);
                    if (!fs.statSync(fullPath).isDirectory()) continue;

                    const skillMdPath = path.join(fullPath, 'SKILL.md');
                    if (fs.existsSync(skillMdPath)) {
                        const content = fs.readFileSync(skillMdPath, 'utf-8');
                        const meta = parseFrontmatter(content);

                        registry.push({
                            id: `openai_${skillDir}`,
                            name: meta.name || skillDir,
                            description: meta.description || 'No description provided',
                            provider: 'openai',
                            category: cat.replace('.', ''),
                            path: path.relative(ROOT_DIR, fullPath),
                            metadata: meta
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error scanning OpenAI skills:', e);
        }
    }

    // 3. Scan External Skills
    if (fs.existsSync(EXTERNAL_SKILLS_ROOT)) {
        console.log(`Scanning External skills at ${EXTERNAL_SKILLS_ROOT}...`);
        try {
            const submodules = fs.readdirSync(EXTERNAL_SKILLS_ROOT);
            for (const submodule of submodules) {
                const submodulePath = path.join(EXTERNAL_SKILLS_ROOT, submodule);
                if (!fs.statSync(submodulePath).isDirectory()) continue;

                // Check for direct SKILL.md
                const rootSkill = path.join(submodulePath, 'SKILL.md');
                if (fs.existsSync(rootSkill)) {
                    const content = fs.readFileSync(rootSkill, 'utf-8');
                    const meta = parseFrontmatter(content);
                    registry.push({
                        id: `ext_${submodule}`,
                        name: meta.name || submodule,
                        description: meta.description || 'External Skill',
                        provider: 'community',
                        category: 'external',
                        path: path.relative(ROOT_DIR, submodulePath),
                        metadata: meta
                    });
                }

                // Check for nested 'skills' directory
                const nestedSkills = path.join(submodulePath, 'skills');
                if (fs.existsSync(nestedSkills) && fs.statSync(nestedSkills).isDirectory()) {
                    const nested = fs.readdirSync(nestedSkills);
                    for (const n of nested) {
                        const nPath = path.join(nestedSkills, n);
                        if (fs.statSync(nPath).isDirectory()) {
                            const nSkill = path.join(nPath, 'SKILL.md');
                            if (fs.existsSync(nSkill)) {
                                const content = fs.readFileSync(nSkill, 'utf-8');
                                const meta = parseFrontmatter(content);
                                registry.push({
                                    id: `ext_${submodule}_${n}`,
                                    name: meta.name || n,
                                    description: meta.description || 'External Nested Skill',
                                    provider: 'community',
                                    category: 'external',
                                    path: path.relative(ROOT_DIR, nPath),
                                    metadata: meta
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error scanning external skills:', e);
        }
    }

    // Ensure output directory exists
    const outDir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // Write Registry
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
    console.log(`Successfully indexed ${registry.length} skills to ${REGISTRY_PATH}`);
}

scanSkills().catch(console.error);
