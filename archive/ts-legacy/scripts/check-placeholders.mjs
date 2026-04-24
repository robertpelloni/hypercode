#!/usr/bin/env node

/**
 * check-placeholders.mjs
 *
 * CI-oriented scanner that detects known placeholder, stub, and no-op patterns
 * across the Hypercode codebase. Designed to prevent silent regression when
 * placeholder code re-enters production during rapid stabilization cycles.
 *
 * Usage:
 *   node scripts/check-placeholders.mjs [--strict]
 *
 * --strict: Exit with code 1 if any CRITICAL markers are found (for CI gating).
 *
 * Scans: apps/web/src, packages/core/src
 * Patterns: TODO, FIXME, HACK, PLACEHOLDER, STUB, NO-OP, @ts-ignore, @ts-expect-error,
 *           as unknown as, console.warn('not implemented')
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// Directories to scan
const SCAN_DIRS = [
    join(ROOT, 'apps', 'web', 'src'),
    join(ROOT, 'packages', 'core', 'src'),
];

// File extensions to include
const INCLUDE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Pattern definitions with severity levels
const PATTERNS = [
    // Critical — should block release
    { regex: /\bPLACEHOLDER\b/gi, label: 'PLACEHOLDER', severity: 'CRITICAL' },
    { regex: /\bSTUB\b/gi, label: 'STUB', severity: 'CRITICAL' },
    { regex: /@ts-ignore/g, label: '@ts-ignore', severity: 'CRITICAL' },
    { regex: /as unknown as/g, label: 'as unknown as (unsafe cast)', severity: 'CRITICAL' },

    // Warning — should be reviewed
    { regex: /\bTODO\b/gi, label: 'TODO', severity: 'WARNING' },
    { regex: /\bFIXME\b/gi, label: 'FIXME', severity: 'WARNING' },
    { regex: /\bHACK\b/gi, label: 'HACK', severity: 'WARNING' },
    { regex: /\bno-op\b/gi, label: 'no-op', severity: 'WARNING' },

    // Info — worth tracking but not blocking
    { regex: /@ts-expect-error/g, label: '@ts-expect-error', severity: 'INFO' },
    { regex: /console\.(warn|log)\s*\(\s*['"`]not implemented/gi, label: 'not implemented log', severity: 'WARNING' },
    { regex: /throw new Error\s*\(\s*['"`]Not implemented/gi, label: 'Not implemented throw', severity: 'WARNING' },
];

/**
 * Recursively collect all files under a directory matching our extension filter.
 */
async function collectFiles(dir) {
    const entries = [];
    try {
        const items = await readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = join(dir, item.name);
            if (item.isDirectory()) {
                // Skip node_modules, .next, dist, build output
                if (['node_modules', '.next', 'dist', 'build', '.git'].includes(item.name)) continue;
                entries.push(...await collectFiles(fullPath));
            } else if (item.isFile() && INCLUDE_EXTS.has(extname(item.name))) {
                entries.push(fullPath);
            }
        }
    } catch {
        // Directory may not exist in all environments
    }
    return entries;
}

/**
 * Scan a single file for placeholder patterns.
 */
async function scanFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const hits = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of PATTERNS) {
            // Reset regex state for global patterns
            pattern.regex.lastIndex = 0;
            if (pattern.regex.test(line)) {
                hits.push({
                    file: relative(ROOT, filePath),
                    line: i + 1,
                    severity: pattern.severity,
                    label: pattern.label,
                    content: line.trim().substring(0, 120),
                });
            }
        }
    }

    return hits;
}

async function main() {
    const strict = process.argv.includes('--strict');
    console.log('🔍 Hypercode Placeholder Regression Scanner');
    console.log(`   Mode: ${strict ? 'STRICT (CI gate)' : 'REPORT'}`);
    console.log(`   Scanning: ${SCAN_DIRS.map(d => relative(ROOT, d)).join(', ')}\n`);

    // Collect all files
    const allFiles = [];
    for (const dir of SCAN_DIRS) {
        allFiles.push(...await collectFiles(dir));
    }
    console.log(`   Files scanned: ${allFiles.length}\n`);

    // Scan each file
    const allHits = [];
    for (const file of allFiles) {
        const hits = await scanFile(file);
        allHits.push(...hits);
    }

    // Group and display results
    const criticalHits = allHits.filter(h => h.severity === 'CRITICAL');
    const warningHits = allHits.filter(h => h.severity === 'WARNING');
    const infoHits = allHits.filter(h => h.severity === 'INFO');

    if (criticalHits.length > 0) {
        console.log(`🔴 CRITICAL (${criticalHits.length}):`);
        for (const h of criticalHits) {
            console.log(`   ${h.file}:${h.line}  [${h.label}]  ${h.content}`);
        }
        console.log();
    }

    if (warningHits.length > 0) {
        console.log(`🟡 WARNING (${warningHits.length}):`);
        for (const h of warningHits) {
            console.log(`   ${h.file}:${h.line}  [${h.label}]  ${h.content}`);
        }
        console.log();
    }

    if (infoHits.length > 0) {
        console.log(`🔵 INFO (${infoHits.length}):`);
        for (const h of infoHits) {
            console.log(`   ${h.file}:${h.line}  [${h.label}]  ${h.content}`);
        }
        console.log();
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total: ${allHits.length} markers (${criticalHits.length} critical, ${warningHits.length} warning, ${infoHits.length} info)`);

    if (strict && criticalHits.length > 0) {
        console.log(`\n❌ STRICT MODE: ${criticalHits.length} critical markers found. Failing CI gate.`);
        process.exit(1);
    } else if (allHits.length === 0) {
        console.log('\n✅ No placeholder markers detected. Clean!');
    } else {
        console.log('\n✅ No critical blockers. Review warnings at your discretion.');
    }
}

main().catch(err => {
    console.error('Scanner error:', err);
    process.exit(2);
});
