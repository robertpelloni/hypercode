import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const canonicalVersionPath = path.join(__dirname, '../VERSION');
const compatibilityVersionPath = path.join(__dirname, '../VERSION.md');
const packageJsonPath = path.join(__dirname, '../package.json');
const cliPackageJsonPath = path.join(__dirname, '../apps/cli/package.json');
const sharedPackageJsonPath = path.join(__dirname, '../packages/shared/package.json');
const versionTsPath = path.join(__dirname, '../lib/version.ts');

const version = fs.readFileSync(canonicalVersionPath, 'utf8').trim();

console.log(`Updating version to ${version} from VERSION...`);

const updatePackageVersion = (filePath) => {
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
};

updatePackageVersion(packageJsonPath);
updatePackageVersion(cliPackageJsonPath);
updatePackageVersion(sharedPackageJsonPath);

const versionTs = `export const APP_VERSION = '${version}';\n`;
fs.writeFileSync(versionTsPath, versionTs);
fs.writeFileSync(compatibilityVersionPath, `${version}\n`);

console.log('Version updated successfully across VERSION.md, package manifests, and lib/version.ts!');
