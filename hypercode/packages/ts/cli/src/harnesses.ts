import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const CLI_HARNESSES = [
  'hypercode',
  'aider',
  'antigravity',
  'opencode',
  'claude',
  'codex',
  'gemini',
  'goose',
  'qwen',
  'superai-cli',
  'codebuff',
  'codemachine',
  'factory-droid',
  'cursor',
  'copilot',
  'custom',
] as const;

export type CliHarness = (typeof CLI_HARNESSES)[number];
export type HarnessMaturity = 'Stable' | 'Beta' | 'Experimental';
export type HarnessInventoryStatus = 'source-backed' | 'metadata-only' | 'operator-defined';

export interface CliHarnessDefinition {
  id: CliHarness;
  description: string;
  maturity: HarnessMaturity;
  primary?: boolean;
  submodulePath?: string;
  upstream?: string;
  runtime?: string;
  launchCommand?: string;
  capabilities?: string[];
  parityNotes?: string;
}

export interface ResolvedCliHarnessDefinition extends CliHarnessDefinition {
  toolCallCount?: number;
  toolCallNames?: string[];
  toolInventorySource?: string;
  toolInventoryStatus: HarnessInventoryStatus;
  integrationLevel: 'source-backed' | 'metadata-only' | 'operator-defined';
}

export interface CliHarnessParitySummary {
  totalHarnesses: number;
  sourceBackedHarnessCount: number;
  metadataOnlyHarnessCount: number;
  operatorDefinedHarnessCount: number;
  sourceBackedToolCount: number;
}

export const PRIMARY_CLI_HARNESS: CliHarness = 'hypercode';

const EXTERNAL_HARNESS_NOTE =
  'External harness; HyperCode currently tracks install/runtime metadata only, not a source-backed tool registry.';

export const CLI_HARNESS_DEFINITIONS: Record<CliHarness, CliHarnessDefinition> = {
  hypercode: {
    id: 'hypercode',
    description: 'HyperCode Go CLI harness',
    maturity: 'Experimental',
    primary: true,
    submodulePath: 'submodules/hyperharness',
    upstream: 'https://github.com/robertpelloni/hypercode',
    runtime: 'Go / Cobra / TUI',
    launchCommand: 'go run .',
    capabilities: ['repl', 'pipe', 'hypercode-adapter', 'tool-registry'],
    parityNotes: 'HyperCode can read HyperCode tool calls directly from the assimilated submodule source.',
  },
  aider: {
    id: 'aider',
    description: 'Aider harness',
    maturity: 'Beta',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  antigravity: {
    id: 'antigravity',
    description: 'Google Antigravity desktop harness',
    maturity: 'Experimental',
    runtime: 'Desktop IDE / command surface',
    upstream: 'https://antigravity.google/',
    parityNotes:
      'Docs-backed Antigravity editor surface; HyperCode does not yet have a source-backed shell contract or tool registry for parity-safe integration.',
  },
  opencode: {
    id: 'opencode',
    description: 'OpenCode harness',
    maturity: 'Beta',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  claude: {
    id: 'claude',
    description: 'Claude Code harness',
    maturity: 'Beta',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  codex: {
    id: 'codex',
    description: 'Codex CLI harness',
    maturity: 'Beta',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  gemini: {
    id: 'gemini',
    description: 'Gemini CLI harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  goose: {
    id: 'goose',
    description: 'Goose harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  qwen: {
    id: 'qwen',
    description: 'Qwen CLI harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  'superai-cli': {
    id: 'superai-cli',
    description: 'SuperAI CLI harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  codebuff: {
    id: 'codebuff',
    description: 'Codebuff harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  codemachine: {
    id: 'codemachine',
    description: 'Codemachine harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  'factory-droid': {
    id: 'factory-droid',
    description: 'Factory Droid harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  cursor: {
    id: 'cursor',
    description: 'Cursor shell harness',
    maturity: 'Experimental',
    runtime: 'Editor shell bridge',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  copilot: {
    id: 'copilot',
    description: 'GitHub Copilot CLI harness',
    maturity: 'Experimental',
    runtime: 'External CLI',
    parityNotes: EXTERNAL_HARNESS_NOTE,
  },
  custom: {
    id: 'custom',
    description: 'Operator-supplied custom harness',
    maturity: 'Experimental',
    runtime: 'Operator-defined',
    parityNotes: 'Operator-defined harness; tool calls are not enumerable unless the operator supplies a bridge contract.',
  },
};

export function formatCliHarnessList(): string {
  return CLI_HARNESSES.join(', ');
}

export function getCliHarnessDefinition(harness: string): CliHarnessDefinition | null {
  return Object.prototype.hasOwnProperty.call(CLI_HARNESS_DEFINITIONS, harness)
    ? CLI_HARNESS_DEFINITIONS[harness as CliHarness]
    : null;
}

export function resolveCliHarnessDefinition(harness: string, workspaceRoot = process.cwd()): ResolvedCliHarnessDefinition | null {
  const definition = getCliHarnessDefinition(harness);
  if (!definition) {
    return null;
  }

  const resolved: ResolvedCliHarnessDefinition = {
    ...definition,
    toolInventoryStatus: definition.id === 'custom' ? 'operator-defined' : 'metadata-only',
    integrationLevel: definition.id === 'custom' ? 'operator-defined' : 'metadata-only',
  };
  if (definition.id !== 'hypercode') {
    return resolved;
  }

  const toolInventory = readHypercodeToolInventory(workspaceRoot);
  if (!toolInventory) {
    return resolved;
  }

  resolved.toolCallNames = toolInventory.toolCallNames;
  resolved.toolCallCount = toolInventory.toolCallNames.length;
  resolved.toolInventorySource = toolInventory.toolInventorySource;
  resolved.toolInventoryStatus = 'source-backed';
  resolved.integrationLevel = 'source-backed';
  return resolved;
}

export function resolveCliHarnessDefinitions(workspaceRoot = process.cwd()): ResolvedCliHarnessDefinition[] {
  return CLI_HARNESSES.map((harness) => resolveCliHarnessDefinition(harness, workspaceRoot)).filter(
    (definition): definition is ResolvedCliHarnessDefinition => definition !== null,
  );
}

export function summarizeCliHarnessParity(workspaceRoot = process.cwd()): CliHarnessParitySummary {
  const definitions = resolveCliHarnessDefinitions(workspaceRoot);
  return definitions.reduce<CliHarnessParitySummary>((summary, definition) => {
    summary.totalHarnesses += 1;
    switch (definition.toolInventoryStatus) {
      case 'source-backed':
        summary.sourceBackedHarnessCount += 1;
        summary.sourceBackedToolCount += definition.toolCallCount ?? 0;
        break;
      case 'operator-defined':
        summary.operatorDefinedHarnessCount += 1;
        break;
      default:
        summary.metadataOnlyHarnessCount += 1;
        break;
    }
    return summary;
  }, {
    totalHarnesses: 0,
    sourceBackedHarnessCount: 0,
    metadataOnlyHarnessCount: 0,
    operatorDefinedHarnessCount: 0,
    sourceBackedToolCount: 0,
  });
}

export function formatCliHarnessHelpLines(workspaceRoot = process.cwd()): string {
  return CLI_HARNESSES.map((h) => {
    const def = resolveCliHarnessDefinition(h, workspaceRoot);
    if (!def) {
      throw new Error(`Unknown harness definition: ${h}`);
    }
    const suffix = def.primary ? ' [primary]' : '';
    const tools = def.toolCallCount ? `, ${def.toolCallCount} source-backed tools` : '';
    return `  ${h.padEnd(10)} ${def.description} (${def.maturity}${tools})${suffix}`;
  }).join('\n');
}

function readHypercodeToolInventory(workspaceRoot: string): { toolCallNames: string[]; toolInventorySource: string } | null {
  const toolsDir = path.join(workspaceRoot, 'submodules', 'hypercode', 'tools');
  if (!existsSync(toolsDir)) {
    return null;
  }

  const toolCallNames = new Set<string>();
  for (const entry of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.go')) {
      continue;
    }

    const filePath = path.join(toolsDir, entry.name);
    const content = readFileSync(filePath, 'utf8');
    const matches = content.matchAll(/Name:\s*"([^"]+)"/g);
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name) {
        toolCallNames.add(name);
      }
    }
  }

  return {
    toolCallNames: [...toolCallNames].sort((left, right) => left.localeCompare(right)),
    toolInventorySource: 'submodules/hyperharness/tools/*.go',
  };
}
