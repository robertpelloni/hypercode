
import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'packages', 'core', 'data', 'raw_skills');
const DOCS_DIR = path.join(process.cwd(), 'docs', 'skills');

if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

function scanDir(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(scanDir(fullPath));
        } else if (file.endsWith('.json')) {
            results.push(fullPath);
        }
    }
    return results;
}

function generateMarkdown(skillPath: string) {
    try {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const skill = JSON.parse(content);

        const safeName = path.basename(skillPath, '.json');
        const mdPath = path.join(DOCS_DIR, `${safeName}.md`);

        let md = `# ${skill.name}\n\n`;
        md += `**Category**: ${skill.category || 'Uncategorized'}\n`;
        md += `**Source**: ${skill._source || 'Unknown'}\n`;
        md += `**Researched At**: ${skill._researchedAt || new Date().toISOString()}\n\n`;

        md += `## Description\n${skill.description}\n\n`;

        md += `## Tools\n`;
        if (skill.tools && Array.isArray(skill.tools)) {
            for (const tool of skill.tools) {
                md += `### \`${tool.name}\`\n`;
                md += `${tool.description}\n\n`;
                if (tool.inputSchema) {
                    md += `**Input Schema**:\n\`\`\`json\n${JSON.stringify(tool.inputSchema, null, 2)}\n\`\`\`\n\n`;
                }
            }
        }

        fs.writeFileSync(mdPath, md);
        console.log(`Generated docs/skills/${safeName}.md`);

    } catch (e) {
        console.error(`Failed to generate docs for ${skillPath}:`, e);
    }
}

console.log(`Scanning ${SKILLS_DIR}...`);
const files = scanDir(SKILLS_DIR);
console.log(`Found ${files.length} skill definitions.`);

for (const file of files) {
    generateMarkdown(file);
}
console.log("Documentation generation complete.");
