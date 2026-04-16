import fs from 'fs/promises';
import path from 'path';
import { AgentDefinition } from '../packages/core/src/types';

const EXTERNAL_AGENTS_ROOT = path.join(process.cwd(), 'external', 'agents_repos', 'open-agents');
const OPENCODE_TOOLS_AGENTS_ROOT = path.join(process.cwd(), 'external', 'tools', 'opencode_tools', 'agent');
const CORE_AGENTS_DIR = path.join(process.cwd(), 'packages', 'core', 'agents');
const AGENTS_SUBDIR = ['.opencode/agent/core', '.opencode/agent/development', '.opencode/agent/meta', '.opencode/agent/content', '.opencode/agent/data'];

async function integrateAgents() {
  console.log('Integrating agents from external repos...');
  
  try {
    await fs.mkdir(CORE_AGENTS_DIR, { recursive: true });
  } catch (e) {}

  // Process open-agents
  for (const subdir of AGENTS_SUBDIR) {
    const fullPath = path.join(EXTERNAL_AGENTS_ROOT, subdir);
    try {
      const files = await fs.readdir(fullPath);
      for (const file of files) {
        if (file.endsWith('.md')) {
          await processAgentFile(path.join(fullPath, file));
        }
      }
    } catch (e) {
      console.warn(`Skipping missing directory: ${fullPath}`);
    }
  }

  // Process opencode_tools agents
  try {
    const files = await fs.readdir(OPENCODE_TOOLS_AGENTS_ROOT);
    for (const file of files) {
      if (file.endsWith('.md')) {
        await processAgentFile(path.join(OPENCODE_TOOLS_AGENTS_ROOT, file));
      }
    }
  } catch (e) {
    console.warn(`Skipping opencode_tools directory: ${OPENCODE_TOOLS_AGENTS_ROOT}`);
  }
}

async function processAgentFile(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');
  content = content.replace(/\r\n/g, '\n'); // Normalize line endings
  
  // Basic frontmatter parsing - loose regex to handle potential whitespace or comments before
  const frontmatterRegex = /---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    console.warn(`Skipping ${filePath}: Invalid format`);
    return;
  }

  const frontmatterRaw = match[1];
  const markdownBody = match[2];

  const agentDef: Partial<AgentDefinition> = {
    instructions: markdownBody.trim()
  };

  const lines = frontmatterRaw.split('\n');
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (!key || !valueParts.length) continue;
    
    const value = valueParts.join(':').trim();
    const cleanValue = value.replace(/^['"](.*)['"]$/, '$1'); // remove quotes

    if (key.trim() === 'name') agentDef.name = cleanValue;
    if (key.trim() === 'description') agentDef.description = cleanValue;
    if (key.trim() === 'model_family') agentDef.model = cleanValue; // Mapping to core type
  }

  if (!agentDef.name) {
    // Fallback to filename if name is missing
    const filename = path.basename(filePath, '.md');
    agentDef.name = filename.charAt(0).toUpperCase() + filename.slice(1);
  }

  if (agentDef.name) {
    const destPath = path.join(CORE_AGENTS_DIR, `${agentDef.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    await fs.writeFile(destPath, JSON.stringify(agentDef, null, 2));
    console.log(`Integrated agent: ${agentDef.name} -> ${destPath}`);
  }
}

integrateAgents().catch(console.error);
