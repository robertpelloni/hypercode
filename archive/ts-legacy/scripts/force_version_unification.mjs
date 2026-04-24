import fs from 'fs';
import path from 'path';

// Universal script to find all package.json files and code/markdown files, rewriting version explicitly to 0.99.1
const NEW_VERSION = '0.99.1';
const BAD_VERSIONS = [/0\.90\.\d+/g, /0\.10\.\d+/g];
const CWD = process.cwd();

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git') && !dirFile.includes('dist') && !dirFile.includes('.next')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      filelist.push(dirFile);
    }
  });
  return filelist;
}

const allFiles = walkSync(CWD);
let updateLog = `# VERSION UNIFICATION REPORT (Target: ${NEW_VERSION})\n\n`;
let count = 0;

for (const f of allFiles) {
  if (f.endsWith('package.json') || f.endsWith('.md') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('VERSION')) {
    try {
      let content = fs.readFileSync(f, 'utf8');
      let initial = content;
      
      if (f.endsWith('package.json')) {
         // Target pure package.json logic via regex to catch all strings safely
         content = content.replace(/"version"\s*:\s*"[^"]+"/g, `"version": "${NEW_VERSION}"`);
         // Also fix deps to internal workspaces that might be hardcoded 
         content = content.replace(/"(@hypercode\/[^"]+)"\s*:\s*"[^"]+"/g, `"$1": "workspace:*"`);
      } else {
         for (const regex of BAD_VERSIONS) {
            content = content.replace(regex, NEW_VERSION);
         }
      }

      if (initial !== content) {
        fs.writeFileSync(f, content);
        updateLog += `- \`${f.replace(CWD, '')}\`\n`;
        console.log("Updated: " + f);
        count++;
      }
    } catch(e) {}
  }
}

updateLog += `\n**Total files updated:** ${count}\n`;
fs.writeFileSync(path.join(CWD, 'VERSION_AUDIT.md'), updateLog);
console.log(`Global Unification Complete. ${count} files updated. Created VERSION_AUDIT.md`);
