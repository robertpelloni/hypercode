
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ARTIFACT_PATH = 'C:\\Users\\hyper\\.gemini\\antigravity\\brain\\4a44e509-add0-4197-bbf3-be92e25e94ba\\RESEARCH_LINKS.md';
const ROOT_DIR = process.cwd();
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

// Mapping logical sections to target directories
const SECTION_MAPPING = {
    'MCP Directories': 'mcp-directory/general',
    'Skills': 'skills',
    'Multi Agent Orchestration systems': 'mcp-directory/orchestration',
    'CLIs, Harnesses, Routers': 'mcp-directory/routers',
    'MCPs and Misc': 'mcp-directory/misc',
    'Code Indexing': 'mcp-directory/indexing',
    'Memory Systems': 'mcp-directory/memory',
    'Tool RAG / Dynamic Loading': 'mcp-directory/tool-rag',
    'RAG': 'mcp-directory/rag',
    'Database': 'mcp-directory/database',
    'Computer Use': 'mcp-directory/computer-use',
    'Code Sandboxing': 'mcp-directory/sandboxing',
    'Search': 'mcp-directory/search',
    'Routers / Providers': 'mcp-directory/providers',
    'Financial / Crypto / Trading': 'mcp-directory/financial',
    'Feature Requests / Dashboards': 'mcp-directory/dashboards'
};

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

function getRepoName(url) {
    try {
        // Sanitize URL first
        let cleanUrl = url;
        if (cleanUrl.includes('?')) cleanUrl = cleanUrl.split('?')[0];
        if (cleanUrl.includes('#')) cleanUrl = cleanUrl.split('#')[0];

        const parts = cleanUrl.split('/');
        return parts[parts.length - 1].replace('.git', '');
    } catch (e) {
        return null;
    }
}

function isGitHubUrl(url) {
    return url.includes('github.com');
}

async function ingest() {
    console.log(`Reading links from: ${ARTIFACT_PATH}`);

    if (!fs.existsSync(ARTIFACT_PATH)) {
        console.error("Artifact file not found!");
        process.exit(1);
    }

    const content = fs.readFileSync(ARTIFACT_PATH, 'utf-8');
    const lines = content.split('\n');

    let currentSection = null;
    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
            currentSection = trimmed.substring(2).trim();
            console.log(`\nProcessing Section: ${currentSection}`);
            continue;
        }

        if (!trimmed || !currentSection || !isGitHubUrl(trimmed)) {
            continue;
        }

        const targetSubDir = SECTION_MAPPING[currentSection];
        if (!targetSubDir) {
            console.warn(`No mapping for section: ${currentSection}, skipping.`);
            continue;
        }

        const targetDir = path.join(PACKAGES_DIR, targetSubDir);
        ensureDir(targetDir);

        const repoName = getRepoName(trimmed);
        if (!repoName) {
            console.warn(`Could not extract repo name from: ${trimmed}`);
            continue;
        }

        const finalPath = path.join(targetDir, repoName);
        const relativePath = path.relative(ROOT_DIR, finalPath).replace(/\\/g, '/');

        if (fs.existsSync(finalPath)) {
            console.log(`Skipping existing: ${relativePath}`);
            continue;
        }

        console.log(`Adding submodule: ${trimmed} -> ${relativePath}`);
        try {
            // Using git submodule add
            // Normalize URL
            let repoUrl = trimmed;
            if (repoUrl.includes('?')) repoUrl = repoUrl.split('?')[0];
            if (repoUrl.includes('/blob/')) repoUrl = repoUrl.split('/blob/')[0]; // Handle deep links to files by taking root
            if (repoUrl.includes('/tree/')) repoUrl = repoUrl.split('/tree/')[0]; // Handle deep links to trees

            execSync(`git submodule add --force "${repoUrl}" "${relativePath}"`, { stdio: 'inherit', cwd: ROOT_DIR });
            successCount++;
        } catch (e) {
            console.error(`Failed to add ${trimmed}: ${e.message}`);
            failCount++;
        }
    }

    console.log(`\nIngestion Complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

ingest();
