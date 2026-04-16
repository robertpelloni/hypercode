import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';

const PATH_MAP = {
  'mcp-servers/': 'mcp-servers',
  'mcp-hubs/': 'mcp-hubs',
  'mcp-routers/': 'mcp-routers',
  'external/mcp-servers/': 'mcp-servers',
  'external/clis/': 'clis',
  'external/frameworks/': 'frameworks',
  'external/memory/': 'memory',
  'external/research/': 'research',
  'external/auth/': 'auth',
  'external/skills/': 'skills',
  'external/unsorted/': 'unsorted',
  'agents/': 'agents',
  'memory/': 'memory',
  'prompts/': 'prompts',
  'skills/': 'skills',
  'multi-agent/': 'orchestration',
  'cli-harnesses/': 'clis',
  'reference/': 'reference',
  'packages/': 'packages'
};

async function main() {
  const output = execSync('git submodule status', { encoding: 'utf-8' });
  const lines = output.split(/\r?\n/).filter(Boolean);
  
  // Get all submodule sections from .gitmodules
  const gitmodules = execSync('git config --file .gitmodules --get-regexp path', { encoding: 'utf-8' });
  const pathToName = new Map();
  gitmodules.split(/\r?\n/).filter(Boolean).forEach(line => {
    const [key, path] = line.split(/\s+/);
    const name = key.match(/^submodule\.(.+)\.path$/)[1];
    pathToName.set(path, name);
  });

  const categoryLinks = {};

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    // Index 1 is usually the path
    const submodulePath = parts[1];
    
    // Find name for this path
    const name = pathToName.get(submodulePath) || submodulePath;
    
    try {
      const urlOutput = execSync(`git config --file .gitmodules --get submodule."${name}".url`, { encoding: 'utf-8' }).trim();
      
      let category = 'uncategorized';
      for (const [pattern, cat] of Object.entries(PATH_MAP)) {
        if (submodulePath.startsWith(pattern)) {
          category = cat;
          break;
        }
      }
      
      if (!categoryLinks[category]) {
        categoryLinks[category] = {
          category,
          path: `external/${category}`, // Default path hint
          links: []
        };
      }
      
      if (!categoryLinks[category].links.includes(urlOutput)) {
        categoryLinks[category].links.push(urlOutput);
      }
    } catch (e) {
      // Ignore submodule without URL
    }
  }

  const result = Object.values(categoryLinks);
  await fs.writeFile('scripts/resources-list.json', JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Generated scripts/resources-list.json with ${lines.length} submodules across ${result.length} categories.`);
}

main().catch(console.error);
