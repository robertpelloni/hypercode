import fs from 'fs';
import path from 'path';

const NEW_VERSION = '0.99.1';
const CWD = process.cwd();

// Explicit targets to bypass infinite loop traversing node_modules or Windows junction points.
const textFiles = [
    'VERSION', 'VERSION.md', 'README.md', 'CHANGELOG.md', 'HANDOFF.md', 'docs/DEPLOY.md'
];

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
    'packages/core/src/bridge/bridge-manifest.test.ts',
    'package.json'
];

let pnpmWorkspaces = [];
for (const dir of ['apps', 'packages', '.']) {
    try {
        const fullDir = path.join(CWD, dir);
        if (dir !== '.') {
            const subs = fs.readdirSync(fullDir);
            for (const sub of subs) {
                if (fs.existsSync(path.join(fullDir, sub, 'package.json'))) {
                    pnpmWorkspaces.push(`${dir}/${sub}/package.json`);
                }
            }
        }
    } catch (e) {}
}

const customApps = ['hypercode-extension/package.json', 'hypercode-vscode-extension/package.json', 'maestro/package.json'];
const allTargets = [...textFiles, ...codeFiles, ...pnpmWorkspaces, ...customApps];

let updateLog = `# VERSION UNIFICATION REPORT (Target: ${NEW_VERSION})\n\n`;
let count = 0;

for (const f of allTargets) {
    try {
        const fullPath = path.join(CWD, f);
        if (!fs.existsSync(fullPath)) continue;
        
        let content = fs.readFileSync(fullPath, 'utf8');
        let initial = content;

        if (f.endsWith('package.json')) {
             content = content.replace(/"version"\s*:\s*"[^"]+"/g, `"version": "${NEW_VERSION}"`);
             content = content.replace(/"(@hypercode\/[^"]+)"\s*:\s*"0\.90\.\d+"/g, `"$1": "workspace:*"`);
        } else {
             content = content.replace(/0\.90\.\d+/g, NEW_VERSION);
             content = content.replace(/0\.10\.\d+/g, NEW_VERSION);
        }

        if (initial !== content) {
            fs.writeFileSync(fullPath, content);
            updateLog += `- \`${f}\`\n`;
            console.log("Updated: " + f);
            count++;
        }
    } catch(e) {
        console.error(`Error processing ${f}:`, e.message);
    }
}

updateLog += `\n**Total files strictly updated to boundary parameter [${NEW_VERSION}]:** ${count}\n`;
fs.writeFileSync(path.join(CWD, 'VERSION_AUDIT.md'), updateLog);
console.log(`Global Unification Complete. ${count} core dependency tracks updated. Created VERSION_AUDIT.md`);
