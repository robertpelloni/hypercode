import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const GITMODULES_FILE = path.join(ROOT_DIR, '.gitmodules');
const DOCS_SUBMODULES_DOC = path.join(ROOT_DIR, 'docs', 'SUBMODULES.md');

function parseGitmodules(content) {
    const entries = [];
    let current = null;

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line) {
            continue;
        }

        const sectionMatch = line.match(/^\[submodule "(.+)"\]$/);
        if (sectionMatch) {
            current = { key: sectionMatch[1], path: '', url: '' };
            entries.push(current);
            continue;
        }

        if (!current) {
            continue;
        }

        const [rawKey, ...rawValueParts] = line.split('=');
        if (!rawKey || rawValueParts.length === 0) {
            continue;
        }

        const key = rawKey.trim();
        const value = rawValueParts.join('=').trim();

        if (key === 'path') {
            current.path = value;
        } else if (key === 'url') {
            current.url = value;
        }
    }

    return entries.filter((entry) => entry.path && entry.url);
}

function parseExistingDescriptions(content) {
    const descriptions = new Map();
    let inTable = false;

    for (const line of content.split(/\r?\n/)) {
        if (line.startsWith('| Submodule |')) {
            inTable = true;
            continue;
        }

        if (!inTable || !line.startsWith('|')) {
            continue;
        }

        if (line.startsWith('| :---')) {
            continue;
        }

        const parts = line.split('|').map((part) => part.trim()).filter((part) => part !== '');
        if (parts.length < 4) {
            continue;
        }

        descriptions.set(parts[1], parts[3]);
    }

    return descriptions;
}

function runGit(command) {
    return execSync(command, {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

function getGitlinkSha(submodulePath) {
    try {
        const line = runGit(`git ls-files --stage -- "${submodulePath}"`);
        const parts = line.split(/\s+/);
        return parts.length >= 2 ? parts[1] : 'untracked';
    } catch {
        return 'untracked';
    }
}

function normalizePath(value) {
    return value.replace(/\\/g, '/').toLowerCase();
}

function getRepoRoot(absolutePath) {
    try {
        return execSync('git rev-parse --show-toplevel', {
            cwd: absolutePath,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
    } catch {
        return null;
    }
}

function getVersion(submodulePath, sha) {
    const absolutePath = path.join(ROOT_DIR, submodulePath);

    if (!fs.existsSync(absolutePath)) {
        return sha.slice(0, 12) || 'missing';
    }

    const repoRoot = getRepoRoot(absolutePath);
    if (!repoRoot || normalizePath(repoRoot) === normalizePath(ROOT_DIR)) {
        return sha.slice(0, 12) || 'unknown';
    }

    try {
        const described = execSync('git describe --tags --always', {
            cwd: absolutePath,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();

        return described || sha.slice(0, 12) || 'unknown';
    } catch {
        return sha.slice(0, 12) || 'unknown';
    }
}

function defaultDescriptionFor(submodulePath) {
    if (submodulePath === 'external/MetaMCP') {
        return 'MetaMCP bridge/reference used for Hypercode MCP compatibility work.';
    }

    if (submodulePath === 'packages/MCP-SuperAssistant') {
        return 'Browser-extension-related MCP companion package tracked inside the monorepo.';
    }

    if (submodulePath === 'packages/opencode-autopilot') {
        return 'Autopilot/session reference package tracked inside the monorepo.';
    }

    if (submodulePath === 'submodules/mcpproxy') {
        return 'Approved reference for lightweight MCP proxy and tool disclosure patterns.';
    }

    if (submodulePath === 'submodules/litellm') {
        return 'Approved reference for provider routing, fallback chains, quota, and gateway patterns.';
    }

    return 'Tracked submodule.';
}

function buildContent(entries) {
    const now = new Date().toISOString().slice(0, 10);
    const zones = [...new Set(entries.map((entry) => entry.path.split('/')[0]))].sort();

    let output = '# Submodule Inventory Snapshot\n\n';
    output += `_Generated from \`.gitmodules\` on ${now}._\n\n`;
    output += `This document lists the submodules that are currently registered in Hypercode's live submodule registry.\n\n`;
    output += `| Submodule | Path | Version | Description |\n`;
    output += `| :--- | :--- | :--- | :--- |\n`;

    for (const entry of entries) {
        const safeDescription = entry.description.replace(/\|/g, '\\|');
        output += `| **${entry.name}** | ${entry.path} | ${entry.version} | ${safeDescription} |\n`;
    }

    output += '\n## Inventory Notes\n\n';
    output += `- **Canonical live registry**: \`.gitmodules\`\n`;
    output += `- **Tracked submodule count**: ${entries.length}\n`;
    output += `- **Active top-level zones**: ${zones.map((zone) => `\`${zone}/\``).join(', ')}\n`;
    output += '- **Version source**: `git describe --tags --always` inside each checked-out submodule, with gitlink SHA fallback.\n';

    return output;
}

async function main() {
    if (!fs.existsSync(GITMODULES_FILE)) {
        throw new Error('.gitmodules not found');
    }

    const gitmodulesContent = fs.readFileSync(GITMODULES_FILE, 'utf-8');
    const existingDescriptions = fs.existsSync(DOCS_SUBMODULES_DOC)
        ? parseExistingDescriptions(fs.readFileSync(DOCS_SUBMODULES_DOC, 'utf-8'))
        : new Map();

    const entries = parseGitmodules(gitmodulesContent)
        .map((entry) => {
            const sha = getGitlinkSha(entry.path);
            const existingDescription = existingDescriptions.get(entry.path);
            const fallbackDescription = defaultDescriptionFor(entry.path);
            return {
                name: path.basename(entry.path),
                path: entry.path,
                url: entry.url,
                sha,
                version: getVersion(entry.path, sha),
                description:
                    existingDescription && existingDescription !== 'Integrated submodule.'
                        ? existingDescription
                        : fallbackDescription,
            };
        })
        .sort((left, right) => left.path.localeCompare(right.path));

    fs.writeFileSync(DOCS_SUBMODULES_DOC, buildContent(entries));
    console.log(`Updated ${DOCS_SUBMODULES_DOC} with ${entries.length} entries from .gitmodules.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
