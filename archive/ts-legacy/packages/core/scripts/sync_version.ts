import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../../..');
const versionFile = path.join(rootDir, 'VERSION');

if (!fs.existsSync(versionFile)) {
    console.error('VERSION file not found!');
    process.exit(1);
}

const version = fs.readFileSync(versionFile, 'utf-8').trim();
console.log(`Syncing version: ${version}`);

const packages = [
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'packages/core/package.json'),
    path.join(rootDir, 'packages/ui/package.json'),
    path.join(rootDir, 'packages/types/package.json'),
];

packages.forEach(pkgPath => {
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        pkg.version = version;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Updated ${pkgPath}`);
    }
});
