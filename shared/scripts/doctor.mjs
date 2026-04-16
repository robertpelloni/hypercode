#!/usr/bin/env node

/**
 * hypercode doctor — Health check and diagnostic tool
 * 
 * Runs a series of checks to diagnose common HyperCode issues:
 * 1. Node.js version compatibility
 * 2. Go toolchain availability
 * 3. better-sqlite3 native bindings
 * 4. Port availability (4000, 3000, 3001)
 * 5. Environment variables (API keys)
 * 6. Config file validity
 * 7. pnpm installation
 * 
 * Usage: node scripts/doctor.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

/** @type {Array<{name: string, status: string, message: string, fix?: string}>} */
const results = [];

/**
 * @param {string} name
 * @param {() => {status: string, message: string, fix?: string}} fn
 */
function check(name, fn) {
    try {
        const result = fn();
        results.push({ name, ...result });
    } catch (err) {
        results.push({ name, status: 'fail', message: err.message });
    }
}

// ── Node.js version ──
check('Node.js version', () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    if (major >= 22) {
        return { status: 'pass', message: `Node.js ${version} (compatible)` };
    }
    return { status: 'fail', message: `Node.js ${version} (need v22+)`, fix: 'Install Node.js 22+ from nodejs.org' };
});

// ── better-sqlite3 bindings ──
check('better-sqlite3 native bindings', () => {
    try {
        // Use child process since ESM can't require() CJS native modules directly
        execSync(
            `node -e "const db=require('better-sqlite3')(':memory:');db.exec('CREATE TABLE t(i)');db.exec('INSERT INTO t VALUES(1)');const r=db.prepare('SELECT * FROM t').get();db.close();process.exit(r&&r.i===1?0:1)"`,
            { encoding: 'utf8', stdio: 'pipe' }
        );
        return { status: 'pass', message: 'Native bindings functional' };
    } catch (err) {
        return {
            status: 'fail',
            message: `Bindings broken: ${String(err.stderr || err.message).slice(0, 80)}`,
            fix: 'Run: pnpm rebuild better-sqlite3',
        };
    }
});

// ── Go toolchain ──
check('Go toolchain', () => {
    try {
        const version = execSync('go version', { encoding: 'utf8' }).trim();
        if (version.includes('go1.2')) {
            return { status: 'pass', message: version };
        }
        return { status: 'warn', message: `${version} (may need Go 1.23+)` };
    } catch {
        return { status: 'warn', message: 'Go not found', fix: 'Install Go 1.23+ from golang.org' };
    }
});

// ── pnpm ──
check('pnpm', () => {
    try {
        const version = execSync('pnpm --version', { encoding: 'utf8' }).trim();
        if (version.startsWith('10')) {
            return { status: 'pass', message: `pnpm v${version}` };
        }
        return { status: 'warn', message: `pnpm v${version} (expected v10)`, fix: 'Run: npm install -g pnpm@10' };
    } catch {
        return { status: 'fail', message: 'pnpm not found', fix: 'Run: npm install -g pnpm@10' };
    }
});

// ── Environment variables ──
check('Environment: API keys', () => {
    const keys = [
        ['GOOGLE_API_KEY / GEMINI_API_KEY', process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY],
        ['OPENAI_API_KEY', process.env.OPENAI_API_KEY],
        ['ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY],
        ['DEEPSEEK_API_KEY', process.env.DEEPSEEK_API_KEY],
    ];
    const found = keys.filter(([, v]) => v).map(([name]) => name);
    const missing = keys.filter(([, v]) => !v).map(([name]) => name);
    
    if (found.length > 0) {
        return {
            status: found.length >= 2 ? 'pass' : 'warn',
            message: `Found: ${found.join(', ')}${missing.length ? ` | Missing: ${missing.join(', ')}` : ''}`,
            fix: missing.length ? `Add to .env: ${missing.join(', ')}` : undefined,
        };
    }
    return {
        status: 'fail',
        message: 'No API keys configured',
        fix: 'Copy .env.example to .env and add your API keys',
    };
});

// ── VERSION file ──
check('VERSION file', () => {
    const versionPath = path.join(root, 'VERSION');
    if (!fs.existsSync(versionPath)) {
        return { status: 'fail', message: 'VERSION file missing', fix: 'Create VERSION file with version string' };
    }
    const version = fs.readFileSync(versionPath, 'utf8').trim();
    return { status: 'pass', message: `v${version}` };
});

// ── mcp.jsonc ──
check('MCP configuration', () => {
    const mcpPath = path.join(root, 'mcp.jsonc');
    if (!fs.existsSync(mcpPath)) {
        return { status: 'warn', message: 'mcp.jsonc not found in project root' };
    }
    const stat = fs.statSync(mcpPath);
    const sizeKB = Math.round(stat.size / 1024);
    return { status: 'pass', message: `mcp.jsonc exists (${sizeKB}KB)` };
});

// ── Build artifacts ──
check('Build artifacts', () => {
    const cliDist = path.join(root, 'packages', 'cli', 'dist');
    const coreDist = path.join(root, 'packages', 'core', 'dist');
    const cliOk = fs.existsSync(cliDist);
    const coreOk = fs.existsSync(coreDist);
    if (cliOk && coreOk) {
        return { status: 'pass', message: 'CLI and core build artifacts present' };
    }
    const missing = [];
    if (!cliOk) missing.push('packages/cli/dist');
    if (!coreOk) missing.push('packages/core/dist');
    return {
        status: 'warn',
        message: `Missing: ${missing.join(', ')}`,
        fix: 'Run: pnpm run build:startup-go',
    };
});

// ── Port check helper ──
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => { server.close(); resolve(false); });
        server.listen(port);
    });
}

// ── Print results ──
async function printResults() {
    const ports = [4000, 3000, 3001];
    const portResults = await Promise.all(ports.map(async (port) => {
        const inUse = await isPortInUse(port);
        return { port, inUse };
    }));
    
    const services = { 4000: 'API/tRPC', 3000: 'Dashboard', 3001: 'MCP WebSocket' };
    for (const { port, inUse } of portResults) {
        results.push({
            name: `Port ${port} (${services[port]})`,
            status: inUse ? 'warn' : 'pass',
            message: inUse ? 'In use (server may be running)' : 'Available',
        });
    }

    console.log('\n  ⬡ HyperCode Doctor — Diagnostic Report\n');
    console.log('  ─────────────────────────────────────────────\n');

    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    for (const r of results) {
        const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
        console.log(`  ${icon} ${r.name}`);
        console.log(`     ${r.message}`);
        if (r.fix) {
            console.log(`     Fix: ${r.fix}`);
        }
        console.log();
        if (r.status === 'pass') passCount++;
        else if (r.status === 'warn') warnCount++;
        else failCount++;
    }

    console.log('  ─────────────────────────────────────────────');
    console.log(`  Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failures\n`);

    if (failCount > 0) {
        console.log('  ❌ Some critical checks failed. Fix these before starting the server.\n');
        process.exit(1);
    } else if (warnCount > 0) {
        console.log('  ⚠️  Some warnings detected. The server should still work.\n');
    } else {
        console.log('  ✅ All checks passed! Ready to start: .\\start.bat\n');
    }
}

printResults().catch(console.error);
