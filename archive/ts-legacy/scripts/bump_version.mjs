import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const newVersion = '0.90.7';

// 1. Files containing raw version string or markdown
const textFiles = [
    'VERSION',
    'VERSION.md',
    'README.md',
    'CHANGELOG.md',
    'HANDOFF.md',
    'docs/DEPLOY.md'
];

// 2. TypeScript/TSX code files containing a hardcoded version literal
const codeFiles = [
    'apps/web/src/components/Navigation.tsx',
    'apps/web/src/components/mcp/nav-config.ts',
    'packages/cli/src/version.ts',
    'packages/core/src/Router.ts',
    'packages/core/src/MCPServer.ts',
    'packages/core/src/stdioLoader.ts',
    'packages/core/src/routers/openWebUIRouter.ts',
    'packages/core/src/services/AgentMemoryService.ts',
    'packages/core/src/services/mcp-client.service.ts',
    'packages/core/src/bridge/bridge-manifest.test.ts'
];

function replaceVersions(files, isCode) {
    for (const file of files) {
        try {
            const path = join(process.cwd(), file);
            let content = readFileSync(path, 'utf8');
            let updated = content;

            if (isCode) {
                // target things like: const VERSION = "0.90.0"; or v0.90.0
                updated = content.replace(/0\.90\.\d+/g, newVersion);
                // target 0.10.x versions sometimes mistakenly put
                updated = updated.replace(/0\.10\.\d+/g, newVersion);
            } else {
                updated = content.replace(/0\.90\.\d+/g, newVersion);
                updated = updated.replace(/0\.10\.\d+/g, newVersion);
            }

            if (content !== updated) {
                writeFileSync(path, updated, 'utf8');
                console.log(`Updated version strings in ${file}`);
            }
        } catch (e) {
            console.warn(`Could not update ${file}: ${e.message}`);
        }
    }
}

console.log(`Bumping text/code files to ${newVersion}...`);
replaceVersions(textFiles, false);
replaceVersions(codeFiles, true);
console.log('Done mapping text and code files!');
