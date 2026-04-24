import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionPath = path.join(__dirname, '../VERSION');
const versionMdPath = path.join(__dirname, '../VERSION.md');
const packageJsonPath = path.join(__dirname, '../package.json');
const cliPackageJsonPath = path.join(__dirname, '../apps/cli/package.json');
const sharedPackageJsonPath = path.join(__dirname, '../packages/shared/package.json');
const versionTsPath = path.join(__dirname, '../lib/version.ts');

const semverPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const normalizeVersionText = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();

const readTextAutoEncoding = (filePath) => {
  const buffer = fs.readFileSync(filePath);

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8');
  }

  return buffer.toString('utf8');
};

const readTrimmed = (filePath) => normalizeVersionText(readTextAutoEncoding(filePath));

const canonicalVersion = readTrimmed(versionPath);
const compatibilityVersion = readTrimmed(versionMdPath);
const packageVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
const cliPackageVersion = JSON.parse(fs.readFileSync(cliPackageJsonPath, 'utf8')).version;
const sharedPackageVersion = JSON.parse(fs.readFileSync(sharedPackageJsonPath, 'utf8')).version;
const versionTs = fs.readFileSync(versionTsPath, 'utf8');

const appVersionMatch = versionTs.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const appVersion = appVersionMatch?.[1];

const errors = [];

if (!semverPattern.test(canonicalVersion)) {
  errors.push(`VERSION is not a valid semantic version: "${canonicalVersion}"`);
}

if (compatibilityVersion !== canonicalVersion) {
  errors.push(`VERSION.md (${compatibilityVersion}) does not match VERSION (${canonicalVersion}).`);
}

if (packageVersion !== canonicalVersion) {
  errors.push(`package.json version (${packageVersion}) does not match VERSION (${canonicalVersion}).`);
}

if (cliPackageVersion !== canonicalVersion) {
  errors.push(`apps/cli/package.json version (${cliPackageVersion}) does not match VERSION (${canonicalVersion}).`);
}

if (sharedPackageVersion !== canonicalVersion) {
  errors.push(`packages/shared/package.json version (${sharedPackageVersion}) does not match VERSION (${canonicalVersion}).`);
}

if (!appVersion) {
  errors.push('Could not parse APP_VERSION from lib/version.ts');
} else if (appVersion !== canonicalVersion) {
  errors.push(`lib/version.ts APP_VERSION (${appVersion}) does not match VERSION (${canonicalVersion}).`);
}

if (errors.length > 0) {
  console.error('❌ Version synchronization check failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  console.error('\nRun "node scripts/update-version.js" after updating VERSION.');
  process.exit(1);
}

console.log(`✅ Version synchronization check passed (${canonicalVersion})`);
