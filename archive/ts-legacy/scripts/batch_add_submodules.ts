
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const REPORT_PATH = path.join(process.cwd(), 'docs', 'TRIAGE_REPORT.md');
const LOG_FILE = path.join(process.cwd(), 'SUBMODULE_ADDITION_LOG.txt');

// Map sections to target directories (similar to python script but TS)
const DIR_MAPPING: Record<string, string> = {
    "MCP & Agents": "external/mcp-agents",
    "Skills & Coding": "external/skills",
    "New & Interesting": "external/misc",
    "MCP Directories": "external/mcp-hubs",
    "CLIs": "external/cli-tools",
    "RAG": "external/rag",
    "Database": "external/database",
    "Search": "external/search",
    "Routers": "external/routers"
};

function getTargetDir(sectionHeader: string): string {
    for (const [key, val] of Object.entries(DIR_MAPPING)) {
        if (sectionHeader.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(sectionHeader.toLowerCase())) {
            return val;
        }
    }
    return "external/misc";
}

function main() {
    if (!fs.existsSync(REPORT_PATH)) {
        console.error("❌ Triage Report not found.");
        return;
    }

    const content = fs.readFileSync(REPORT_PATH, 'utf-8');
    const lines = content.split('\n');

    let currentSection = "Misc";
    let successCount = 0;

    // Regex to match our generated report lines:
    // - [ ] **Submodule**: [owner/repo](url)
    const subRegex = /- \[ \] \*\*Submodule\*\*: \[(.*?)\]\((.*?)\)/;

    for (const line of lines) {
        if (line.startsWith('### ')) {
            currentSection = line.replace('###', '').trim();
            continue;
        }

        const match = line.match(subRegex);
        if (match) {
            const repoName = match[1].replace('/', '-');
            const url = match[2];

            const targetDir = getTargetDir(currentSection);
            const targetPath = path.join(targetDir, repoName);

            // Create dir if needed
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            if (fs.existsSync(targetPath)) {
                console.log(`⚠️ Skipping ${repoName} (Exists)`);
                continue;
            }

            console.log(`📦 Adding ${repoName} to ${targetPath}...`);
            try {
                execSync(`git submodule add --force ${url} ${targetPath}`, { stdio: 'inherit' });
                fs.appendFileSync(LOG_FILE, `SUCCESS: ${url} -> ${targetPath}\n`);
                successCount++;
            } catch (e) {
                console.error(`❌ Failed to add ${repoName}`);
                fs.appendFileSync(LOG_FILE, `FAILED: ${url} -> ${e}\n`);
            }
        }
    }

    console.log(`\n🎉 Batch processing complete. Added ${successCount} submodules.`);
}

main();
