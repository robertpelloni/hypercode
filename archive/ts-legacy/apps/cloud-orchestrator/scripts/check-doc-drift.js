import fs from 'fs';
import path from 'path';

console.log('--- Documentation Drift Check ---');

const TODO_PATH = path.join(process.cwd(), 'TODO.md');
const ROADMAP_PATH = path.join(process.cwd(), 'ROADMAP.md');
const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

// 1. Verify files exist
if (!fs.existsSync(TODO_PATH)) throw new Error('TODO.md missing');
if (!fs.existsSync(ROADMAP_PATH)) throw new Error('ROADMAP.md missing');
if (!fs.existsSync(CHANGELOG_PATH)) throw new Error('CHANGELOG.md missing');

// 2. Load package Version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
const currentVersion = packageJson.version;
console.log(`Current version mapped: v${currentVersion}`);

// 3. Verify Changelog has an entry for the version (Basic check to ensure developers don't bump without docs)
const changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
const versionRegex = new RegExp(`## \\[?${currentVersion}\\]?`, 'i');
if (!versionRegex.test(changelogContent)) {
    console.error(`❌ DRIFT DETECTED: CHANGELOG.md does not contain an explicit entry for the current package.json version v${currentVersion}`);
    // Temporarily logging as warning instead of strict exit(1) to unblock ongoing PRs before enforcement
    console.warn('Please update CHANGELOG.md with the release notes before merging.');
    process.exitCode = 1;
}

// 4. Validate TODO.md structural integrity (Enforce Phase X heading presence)
const todoContent = fs.readFileSync(TODO_PATH, 'utf-8');
if (!todoContent.includes('Acceptance criteria:')) {
    console.error(`❌ DRIFT DETECTED: TODO.md missing 'Acceptance criteria' standard formatting.`);
    process.exitCode = 1;
}

// 5. Cross-Check Roadmap
const roadmapContent = fs.readFileSync(ROADMAP_PATH, 'utf-8');
if (!roadmapContent.includes('## Core Philosophy')) {
    console.error(`❌ DRIFT DETECTED: ROADMAP.md structural integrity validation failed.`);
    process.exitCode = 1;
}

if (process.exitCode === 1) {
    console.error('--- ❌ Doc Drift Gates Failed ---');
    process.exit(1);
} else {
    console.log('--- ✅ All Doc Drift Gates Passed ---');
}
