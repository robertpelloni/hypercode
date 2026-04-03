
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const SUBMODULES_DOC = path.join(ROOT_DIR, 'docs', 'SUBMODULES.md');
const TEMP_SUBMODULES = path.join(ROOT_DIR, 'temp_submodules.txt');

// Helper to clean path
const cleanPath = (p) => p.replace(/^external\//, '').replace(/^submodules\//, '').replace(/^references\//, '');

async function main() {
    if (!fs.existsSync(TEMP_SUBMODULES)) {
        console.error("temp_submodules.txt not found");
        process.exit(1);
    }

    const rawSubmodules = fs.readFileSync(TEMP_SUBMODULES, 'utf-8').split('\n').filter(Boolean);
    const submoduleMap = new Map();

    // Parse existing MD to preserve descriptions
    if (fs.existsSync(SUBMODULES_DOC)) {
        const content = fs.readFileSync(SUBMODULES_DOC, 'utf-8');
        const lines = content.split('\n');
        let inTable = false;

        for (const line of lines) {
            if (line.startsWith('| Submodule |')) { // Header
                inTable = true;
                continue;
            }
            if (line.startsWith('| :---')) continue;

            if (inTable && line.startsWith('|')) {
                const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
                if (parts.length >= 2) {
                    const pathVal = parts[1].replace(/`/g, '');
                    const desc = parts[2] || '';
                    submoduleMap.set(pathVal, desc);
                }
            }
        }
    }

    // Build new list
    const newEntries = [];

    for (const line of rawSubmodules) {
        // Line format:  commit_hash path (version_tag)
        // e.g.  f4c52ad0... agents/refs/pydantic-ai (v0.0.6a4...)
        const match = line.match(/^\s*([a-f0-9]+)\s+(.+?)\s+(\((.+?)\))?$/);
        if (match) {
            const commit = match[1];
            const subPath = match[2];
            const version = match[4] || 'HEAD';

            const name = path.basename(subPath);
            const desc = submoduleMap.get(subPath) || 'Integrated submodule.';

            newEntries.push({ name, path: subPath, desc, version });
        }
    }

    // Sort by path
    newEntries.sort((a, b) => a.path.localeCompare(b.path));

    // Generate MD
    let newContent = `# Submodule Dashboard\n\n`;
    newContent += `This document tracks the status, location, and purpose of all submodules in the hypercode ecosystem.\n\n`;
    newContent += `| Submodule | Path | Version | Description |\n`;
    newContent += `| :--- | :--- | :--- | :--- |\n`;

    for (const entry of newEntries) {
        // Escape pipes in description just in case
        const safeDesc = entry.desc.replace(/\|/g, '\\|');
        newContent += `| **${entry.name}** | \`${entry.path}\` | \`${entry.version}\` | ${safeDesc} |\n`;
    }

    newContent += `\n## Directory Structure\n\n`;
    newContent += `\`\`\`\n`;
    newContent += `hypercode/\n`;
    newContent += `├── packages/           # Monorepo packages\n`;
    newContent += `│   ├── core/           # The "Hub" (Node.js backend)\n`;
    newContent += `│   ├── ui/             # The Dashboard (Next.js frontend)\n`;
    newContent += `│   ├── cli/            # CLI wrapper\n`;
    newContent += `│   └── types/          # Shared TypeScript types\n`;
    newContent += `├── submodules/         # Core integrated submodules (Active)\n`;
    newContent += `├── references/         # Reference implementations (Passive)\n`;
    newContent += `├── docs/               # Documentation\n`;
    newContent += `├── agents/             # Agent definitions\n`;
    newContent += `├── hooks/              # System hooks\n`;
    newContent += `├── mcp-servers/        # Local MCP servers\n`;
    newContent += `└── skills/             # Universal skills\n`;
    newContent += `\`\`\`\n`;

    fs.writeFileSync(SUBMODULES_DOC, newContent);
    console.log(`Updated ${SUBMODULES_DOC} with ${newEntries.length} entries.`);
}

main().catch(console.error);
