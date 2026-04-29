#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..', '..');  // scripts/ → web/ → apps/ → borg/
const webDir = resolve(__dirname, '..');                      // scripts/ → web/
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? args[portIdx + 1] : '3000';

const nextBin = resolve(
    workspaceRoot,
    'node_modules/.pnpm/next@16.1.7_@babel+core@7.2_1282a12bd07be361d8910af11a5013c9/node_modules/next/dist/bin/next'
);

execFileSync(process.execPath, [nextBin, 'dev', '--port', port], {
    stdio: 'inherit',
    cwd: webDir,
});
