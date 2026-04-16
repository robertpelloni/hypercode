import fs from 'fs';

const srcPkg = JSON.parse(fs.readFileSync('c:/Users/hyper/workspace/hypercode/apps/maestro/package.json', 'utf8'));
const dstPkg = JSON.parse(fs.readFileSync('c:/Users/hyper/workspace/hypercode/apps/maestro-go/frontend/package.json', 'utf8'));

const excludeDeps = [
  'electron', 'electron-builder', 'vite-plugin-electron', 'electron-store', 
  'electron-updater', 'electron-devtools-installer', 'node-pty', 'better-sqlite3',
  '@sentry/electron', 'electron-playwright-helpers', 'electron-rebuild', '@electron/notarize'
];

if (!dstPkg.dependencies) dstPkg.dependencies = {};
if (!dstPkg.devDependencies) dstPkg.devDependencies = {};

for (const [k, v] of Object.entries(srcPkg.dependencies || {})) {
  if (!excludeDeps.includes(k)) dstPkg.dependencies[k] = v;
}
for (const [k, v] of Object.entries(srcPkg.devDependencies || {})) {
  if (!excludeDeps.includes(k)) dstPkg.devDependencies[k] = v;
}

fs.writeFileSync('c:/Users/hyper/workspace/hypercode/apps/maestro-go/frontend/package.json', JSON.stringify(dstPkg, null, 2));
console.log('Dependencies merged successfully.');
