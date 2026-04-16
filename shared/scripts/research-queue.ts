import fs from 'fs';
import path from 'path';
import { ResourceIndexService } from '../packages/core/src/services/ResourceIndexService';
import { ResourceIndexItem, normalizeResource } from '../packages/core/src/utils/resourceIndex';
import { AgentExecutor } from '../packages/core/src/agents/AgentExecutor';
import { McpProxyManager } from '../packages/core/src/managers/McpProxyManager';
import { McpManager } from '../packages/core/src/managers/McpManager';
import { SecretManager } from '../packages/core/src/managers/SecretManager';
import { SessionManager } from '../packages/core/src/managers/SessionManager';
import { SystemPromptManager } from '../packages/core/src/managers/SystemPromptManager';
import { LogManager } from '../packages/core/src/managers/LogManager';
import { WebSearchTool } from '../packages/core/src/tools/WebSearchTool';

const rootDir = process.cwd();
const coreSrcDir = path.join(rootDir, 'packages', 'core', 'src');
const service = new ResourceIndexService(coreSrcDir);

const getArgValue = (key: string, fallback: string) => {
  const index = process.argv.findIndex(arg => arg === key || arg.startsWith(`${key}=`));
  if (index === -1) return fallback;
  const arg = process.argv[index];
  if (arg.includes('=')) return arg.split('=')[1];
  return process.argv[index + 1] || fallback;
};

const limit = Number(getArgValue('--limit', '5'));

const loadResearcherAgent = () => {
  const agentPath = path.join(rootDir, 'agents', 'researcher.json');
  if (fs.existsSync(agentPath)) {
    const content = fs.readFileSync(agentPath, 'utf-8');
    return JSON.parse(content);
  }
  return {
    name: 'researcher',
    model: 'gpt-4o',
    description: 'Fallback research agent',
    instructions: 'Analyze the provided context and return structured JSON.'
  };
};

const readLocalDocs = (resource: ResourceIndexItem) => {
  if (!resource.path) return '';
  const repoPath = path.join(rootDir, resource.path);
  if (!fs.existsSync(repoPath)) return '';

  const candidates = ['README.md', 'readme.md', 'README.MD', 'README.txt'];
  for (const file of candidates) {
    const filePath = path.join(repoPath, file);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  }
  return '';
};

const parseJsonFromAnswer = (answer: string) => {
  const trimmed = answer.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  const jsonStr = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
};

async function main() {
  console.log("Starting Research Squad Queue Processor...");

  const resources = service.getResources();
  const pending = resources.filter(r => !r.researched);

  console.log(`Found ${pending.length} pending resources to research.`);

  if (pending.length === 0) {
    console.log("All resources researched! Exiting.");
    return;
  }

  process.env.MCP_DISABLE_METAMCP = 'true';

  const agent = loadResearcherAgent();
  const secretManager = new SecretManager(rootDir);
  const logManager = new LogManager(path.join(rootDir, 'logs'));
  const mcpManager = new McpManager(path.join(rootDir, 'mcp-servers'), path.join(rootDir, 'data'));
  const proxyManager = new McpProxyManager(mcpManager, logManager);
  proxyManager.registerInternalTool(WebSearchTool, WebSearchTool.handler);
  const sessionManager = new SessionManager(rootDir);
  const systemPromptManager = new SystemPromptManager(rootDir);
  const agentExecutor = new AgentExecutor(proxyManager, secretManager, sessionManager, systemPromptManager);

  for (const target of pending.slice(0, limit)) {
    console.log(`Researching: ${target.url}`);

    const localDocs = readLocalDocs(target);
    const docSnippet = localDocs ? localDocs.slice(0, 6000) : '';

    const task = `Analyze the tool at ${target.url}.
Category: ${target.category}
Known path: ${target.path || 'none'}

If local docs are provided below, use them. If not, use the web_search tool to gather context.

Return a JSON object with:
{
  "summary": string,
  "features": string[],
  "tags": string[],
  "kind": "repo" | "docs" | "discussion" | "dashboard" | "billing" | "search" | "tool" | "other",
  "homepage_url"?: string,
  "docs_url"?: string,
  "repo_url"?: string
}

LOCAL_DOCS:
${docSnippet || 'N/A'}`;

    const sessionId = `research-${target.id}-${Date.now()}`;
    let answer = '';

    try {
      answer = await agentExecutor.run(agent, task, {}, sessionId);
    } catch (error) {
      console.error(`Research failed for ${target.url}:`, error);
      continue;
    }

    const parsed = parseJsonFromAnswer(answer);
    const updates: Partial<ResourceIndexItem> = parsed
      ? {
          researched: true,
          summary: parsed.summary || '',
          features: parsed.features || [],
          tags: parsed.tags || [],
          kind: parsed.kind || target.kind,
          homepage_url: parsed.homepage_url || target.homepage_url,
          docs_url: parsed.docs_url || target.docs_url,
          repo_url: parsed.repo_url || target.repo_url
        }
      : {
          researched: true,
          summary: answer,
          features: target.features || [],
          tags: target.tags || []
        };

    const normalizedUpdate = normalizeResource({ ...target, ...updates });
    service.updateResource(target.url, normalizedUpdate);

    console.log(`Updated ${target.url}.`);
  }
}

main().catch(console.error);
