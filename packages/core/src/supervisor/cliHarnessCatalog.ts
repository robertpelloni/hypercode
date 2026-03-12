export interface CliHarnessCatalogEntry {
    id: string;
    name: string;
    command: string;
    args: string[];
    homepage: string;
    docsUrl: string;
    installHint: string;
    category: 'cli' | 'cloud' | 'editor';
    sessionCapable: boolean;
    versionArgs: string[];
}

export const CLI_HARNESS_CATALOG: CliHarnessCatalogEntry[] = [
    {
        id: 'aider',
        name: 'Aider',
        command: 'aider',
        args: [],
        homepage: 'https://aider.chat/',
        docsUrl: 'https://aider.chat/docs/',
        installHint: 'pip install aider-chat',
        category: 'cli',
        sessionCapable: true,
        versionArgs: ['--version'],
    },
    {
        id: 'claude',
        name: 'Claude Code',
        command: 'claude',
        args: [],
        homepage: 'https://www.anthropic.com/claude-code',
        docsUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
        installHint: 'npm install -g @anthropic-ai/claude-code',
        category: 'cli',
        sessionCapable: true,
        versionArgs: ['--version'],
    },
    {
        id: 'codex',
        name: 'OpenAI Codex CLI',
        command: 'codex',
        args: [],
        homepage: 'https://platform.openai.com/docs/guides/codex',
        docsUrl: 'https://platform.openai.com/docs/guides/codex',
        installHint: 'Install the Codex CLI binary and make sure `codex` is on PATH.',
        category: 'cli',
        sessionCapable: true,
        versionArgs: ['--version'],
    },
    {
        id: 'gemini',
        name: 'Gemini CLI',
        command: 'gemini',
        args: [],
        homepage: 'https://ai.google.dev/gemini-api/docs/cli',
        docsUrl: 'https://ai.google.dev/gemini-api/docs',
        installHint: 'Install the Gemini CLI and ensure `gemini` is on PATH.',
        category: 'cli',
        sessionCapable: true,
        versionArgs: ['--version'],
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        command: 'opencode',
        args: [],
        homepage: 'https://opencode.ai/',
        docsUrl: 'https://opencode.ai/docs',
        installHint: 'Install OpenCode and ensure `opencode` is on PATH.',
        category: 'cli',
        sessionCapable: true,
        versionArgs: ['--version'],
    },
    {
        id: 'goose',
        name: 'Goose CLI',
        command: 'goose',
        args: [],
        homepage: 'https://block.github.io/goose/',
        docsUrl: 'https://block.github.io/goose/docs/',
        installHint: 'Install Goose and ensure `goose` is on PATH.',
        category: 'cli',
        sessionCapable: false,
        versionArgs: ['--version'],
    },
    {
        id: 'qwen',
        name: 'Qwen Code CLI',
        command: 'qwen',
        args: [],
        homepage: 'https://chat.qwen.ai/',
        docsUrl: 'https://qwen.readthedocs.io/',
        installHint: 'Install the Qwen CLI and ensure `qwen` is on PATH.',
        category: 'cli',
        sessionCapable: false,
        versionArgs: ['--version'],
    },
];

export const DEFAULT_SUPERVISED_COMMANDS = Object.fromEntries(
    CLI_HARNESS_CATALOG
        .filter((entry) => entry.sessionCapable)
        .map((entry) => [entry.id, { command: entry.command, args: [...entry.args] }]),
) as Record<string, { command: string; args: string[] }>;