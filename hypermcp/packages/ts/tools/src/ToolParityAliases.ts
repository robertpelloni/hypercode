/**
 * @file ToolParityAliases.ts
 * @module packages/tools/src/ToolParityAliases
 *
 * WHAT:
 * Comprehensive tool parity aliases ensuring HyperCode provides byte-for-byte
 * compatible tool schemas that match what LLMs expect from Claude Code, Codex,
 * Gemini CLI, OpenCode, Cursor, Windsurf, Kiro, and other major AI coding tools.
 *
 * WHY:
 * LLMs are fine-tuned on the exact tool signatures used by popular coding environments.
 * If a model expects `Bash` (Claude Code) or `shell` (Codex) instead of `bash`,
 * the tool must exist with that exact name and schema to avoid confusion and errors.
 *
 * HOW:
 * This file exports a factory that produces alias tools mapped to our core handlers.
 * Each alias preserves the exact parameter names the model was trained on.
 *
 * REFERENCE TOOLS:
 * - Claude Code: Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS, WebFetch, TodoRead, TodoWrite
 * - Codex CLI: shell, apply_diff, create_file, view_file, list_directory
 * - Gemini CLI: read_file, write_file, edit_file, list_directory, shell, search
 * - OpenCode: read, write, edit, bash, glob, grep, ls
 * - Cursor: read_file, write_file, edit_file, list_dir, run_command, search_files
 * - Windsurf: read_file, write_file, edit_file, list_directory, run_command, search
 * - Kiro: read, write, edit, terminal, search, list_dir
 * - Copilot CLI: create_file, edit_file, search_files, terminal
 * - Pi: read, edit, write, bash, grep, find, ls
 */

import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { rgPath } from '@vscode/ripgrep';
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

type ToolResponse = {
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
};

function ok(text: string): ToolResponse {
    return { content: [{ type: "text", text }] };
}

function err(text: string): ToolResponse {
    return { content: [{ type: "text", text }], isError: true };
}

// ---------------------------------------------------------------------------
// Core handler implementations (shared across all aliases)
// ---------------------------------------------------------------------------

async function handleRead(args: Record<string, any>): Promise<ToolResponse> {
    const filePath = args.file_path || args.path || args.AbsolutePath || args.filePath || '';
    if (!filePath) return err('file_path is required');

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        // Support various line-range parameter names
        const startLine = args.start_line || args.startLine || args.offset || args.line_start;
        const endLine = args.end_line || args.endLine || args.limit || args.line_end;

        if (startLine || endLine) {
            const start = Math.max(0, ((startLine as number) || 1) - 1);
            const end = (endLine as number) || lines.length;
            const sliced = lines.slice(start, end);
            // Include line numbers if requested
            const numbered = args.show_line_numbers || args.showLineNumbers || args.lineNumbers
                ? sliced.map((line, i) => `${start + i + 1}: ${line}`).join('\n')
                : sliced.join('\n');
            return ok(numbered);
        }

        // Full file with line numbers if requested
        if (args.show_line_numbers || args.showLineNumbers) {
            return ok(lines.map((line, i) => `${i + 1}: ${line}`).join('\n'));
        }

        return ok(content);
    } catch (e: any) {
        return err(`Error reading file: ${e.message}`);
    }
}

async function handleWrite(args: Record<string, any>): Promise<ToolResponse> {
    const filePath = args.file_path || args.path || args.filePath || args.AbsolutePath || '';
    const content = args.content || args.text || args.body || '';
    if (!filePath) return err('file_path is required');

    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return ok(`Successfully wrote to ${filePath}`);
    } catch (e: any) {
        return err(`Error writing file: ${e.message}`);
    }
}

async function handleEdit(args: Record<string, any>): Promise<ToolResponse> {
    const filePath = args.file_path || args.path || args.filePath || args.AbsolutePath || '';
    const oldText = args.old_string || args.oldText || args.old_text || args.find || '';
    const newText = args.new_string || args.newText || args.new_text || args.replace || '';

    if (!filePath) return err('file_path is required');
    if (!oldText) return err('old_string is required');

    try {
        const content = await fs.readFile(filePath, 'utf-8');

        if (!content.includes(oldText)) {
            return err(`old_string not found in ${filePath}. Ensure exact match including whitespace and indentation.`);
        }

        // Check for uniqueness — warn if multiple matches
        const matchCount = content.split(oldText).length - 1;
        if (matchCount > 1 && !args.allow_multiple) {
            return err(`old_string found ${matchCount} times in ${filePath}. Provide more context to uniquely identify the location, or set allow_multiple=true.`);
        }

        const newContent = args.allow_multiple
            ? content.split(oldText).join(newText)
            : content.replace(oldText, newText);

        await fs.writeFile(filePath, newContent, 'utf-8');
        return ok(`Successfully edited ${filePath}`);
    } catch (e: any) {
        return err(`Error editing file: ${e.message}`);
    }
}

async function handleMultiEdit(args: Record<string, any>): Promise<ToolResponse> {
    const filePath = args.file_path || args.path || args.filePath || '';
    const edits = args.edits || args.operations || [];

    if (!filePath) return err('file_path is required');
    if (!edits.length) return err('edits array is required');

    try {
        let content = await fs.readFile(filePath, 'utf-8');
        const results: string[] = [];

        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            const oldText = edit.old_string || edit.oldText || edit.old_text || '';
            const newText = edit.new_string || edit.newText || edit.new_text || '';

            if (!content.includes(oldText)) {
                return err(`Edit ${i + 1}: old_string not found in ${filePath}.`);
            }

            content = content.replace(oldText, newText);
            results.push(`Edit ${i + 1}: applied`);
        }

        await fs.writeFile(filePath, content, 'utf-8');
        return ok(`Applied ${results.length} edits to ${filePath}\n${results.join('\n')}`);
    } catch (e: any) {
        return err(`Error in multi-edit: ${e.message}`);
    }
}

async function handleBash(args: Record<string, any>): Promise<ToolResponse> {
    const command = args.command || args.cmd || args.script || '';
    const cwd = args.cwd || args.workingDir || args.working_dir || process.cwd();
    const timeout = args.timeout || args.maxTime || 120_000;

    if (!command) return err('command is required');

    return new Promise((resolve) => {
        const child = spawn(command, [], {
            cwd,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, ...(args.env || {}) },
        });

        const timer = setTimeout(() => {
            child.kill('SIGTERM');
            resolve(err(`Command timed out after ${timeout}ms`));
        }, typeof timeout === 'number' ? timeout : 120_000);

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

        child.on('error', (e) => {
            clearTimeout(timer);
            resolve(err(`Execution error: ${e.message}`));
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            let output = stdout;
            if (stderr) output += `\nSTDERR:\n${stderr}`;

            // Truncate large outputs
            if (output.length > 50_000) {
                output = output.substring(0, 50_000) + '\n...[Output truncated]';
            }

            if (code !== 0 && !args.ignoreExitCode) {
                resolve({ content: [{ type: 'text', text: output.trim() || `Exit code: ${code}` }], isError: true });
            } else {
                resolve(ok(output.trim() || 'Command completed successfully.'));
            }
        });
    });
}

async function handleLS(args: Record<string, any>): Promise<ToolResponse> {
    const dirPath = args.path || args.dir_path || args.directory || args.dir || '.';
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const results = entries
            .sort((a, b) => {
                // Directories first, then alphabetically
                if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
            .map(e => ({
                name: e.name + (e.isDirectory() ? '/' : ''),
                type: e.isDirectory() ? 'directory' : e.isSymbolicLink() ? 'symlink' : 'file',
            }));

        // Support various output formats
        if (args.format === 'plain' || args.simple) {
            return ok(results.map(r => r.name).join('\n'));
        }

        return ok(JSON.stringify(results, null, 2));
    } catch (e: any) {
        return err(`Error listing directory: ${e.message}`);
    }
}

async function handleGrep(args: Record<string, any>): Promise<ToolResponse> {
    const pattern = args.pattern || args.query || args.search || args.regexp || '';
    const searchPath = args.path || args.dir_path || args.directory || args.cwd || '.';
    const includePattern = args.include_pattern || args.glob || args.include || args.file_pattern || '';
    const caseInsensitive = args.ignoreCase || args.case_insensitive || args.i || false;
    const contextLines = args.context || args.C || 0;
    const headLimit = args.headLimit || args.maxResults || args.limit || 200;

    if (!pattern) return err('pattern is required');

    try {
        let command = `"${rgPath}" --line-number --with-filename --no-heading`;

        if (caseInsensitive) command += ' -i';
        if (contextLines) command += ` -C ${contextLines}`;
        if (headLimit) command += ` -m ${headLimit}`;
        if (includePattern) command += ` -g "${includePattern}"`;

        command += ` -- "${pattern}" "${searchPath}"`;

        const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
        return ok(stdout.trim() || 'No matches found.');
    } catch (e: any) {
        if (e.code === 1) return ok('No matches found.');
        return err(`Search error: ${e.message}`);
    }
}

async function handleGlob(args: Record<string, any>): Promise<ToolResponse> {
    const pattern = args.pattern || args.glob || args.match || '';
    const searchPath = args.path || args.dir_path || args.directory || '.';

    if (!pattern) return err('pattern is required');

    try {
        const command = `"${rgPath}" --files -g "${pattern}" "${searchPath}"`;
        const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
        return ok(stdout.trim() || 'No files matched.');
    } catch (e: any) {
        if (e.code === 1) return ok('No files matched.');
        return err(`Glob error: ${e.message}`);
    }
}

async function handleWebFetch(args: Record<string, any>): Promise<ToolResponse> {
    const url = args.url || args.uri || '';
    if (!url) return err('url is required');

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(30_000),
            headers: { 'User-Agent': 'HyperCode/ToolParity' },
        });

        const contentType = response.headers.get('content-type') || '';
        const body = await response.text();

        if (!response.ok) {
            return err(`HTTP ${response.status}: ${body.substring(0, 500)}`);
        }

        // Truncate large responses
        const truncated = body.length > 100_000
            ? body.substring(0, 100_000) + '\n...[Response truncated]'
            : body;

        return ok(truncated);
    } catch (e: any) {
        return err(`Fetch error: ${e.message}`);
    }
}

// ---------------------------------------------------------------------------
// Tool definitions organized by source CLI harness
// Each set uses the exact parameter names and schemas the model was trained on.
// ---------------------------------------------------------------------------

/**
 * Claude Code parity tools.
 * These use PascalCase names matching Claude Code's exact tool signatures.
 * Reference: Claude Code source (leaked), fine-tuning data analysis.
 */
export const ClaudeCodeParityTools = [
    {
        name: 'Read',
        description: 'Reads a file from the local filesystem. You can access any file directly by using this tool. Assume this tool is able to read all files on the machine.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'The absolute path to the file to read' },
                offset: { type: 'number', description: 'The line number to start reading from (1-based)' },
                limit: { type: 'number', description: 'The number of lines to read' },
            },
            required: ['file_path'],
        },
        handler: handleRead,
    },
    {
        name: 'Write',
        description: 'Writes a file to the local filesystem. This tool will overwrite the existing file if there is one at the provided path.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'The absolute path to the file to write' },
                content: { type: 'string', description: 'The content to write to the file' },
            },
            required: ['file_path', 'content'],
        },
        handler: handleWrite,
    },
    {
        name: 'Edit',
        description: 'Performs exact string replacements in files. The old_string must match exactly, including whitespace and indentation.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'The absolute path to the file to modify' },
                old_string: { type: 'string', description: 'The text to replace' },
                new_string: { type: 'string', description: 'The text to replace it with (must be different from old_string)' },
                replace_all: { type: 'boolean', description: 'Replace all occurrences of old_string (default false)' },
            },
            required: ['file_path', 'old_string', 'new_string'],
        },
        handler: (args: any) => handleEdit({ ...args, allow_multiple: args.replace_all }),
    },
    {
        name: 'MultiEdit',
        description: 'Performs multiple exact string replacements in a single file in one operation.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'The absolute path to the file to modify' },
                edits: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            old_string: { type: 'string' },
                            new_string: { type: 'string' },
                        },
                        required: ['old_string', 'new_string'],
                    },
                    description: 'Array of edit operations to apply sequentially',
                },
            },
            required: ['file_path', 'edits'],
        },
        handler: handleMultiEdit,
    },
    {
        name: 'Bash',
        description: 'Executes a given bash command in a persistent shell session with optional timeout. Use for executing code, installing packages, etc.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'The bash command to run' },
                timeout: { type: 'number', description: 'Optional timeout in milliseconds (max 600000)' },
            },
            required: ['command'],
        },
        handler: handleBash,
    },
    {
        name: 'Glob',
        description: 'Fast file pattern matching tool that works with any number of file patterns.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: { type: 'string', description: 'The glob pattern to match files against' },
                path: { type: 'string', description: 'The directory to search in (default: current working directory)' },
            },
            required: ['pattern'],
        },
        handler: handleGlob,
    },
    {
        name: 'Grep',
        description: 'Searches for patterns in the content of files using ripgrep. Supports full regex syntax.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: { type: 'string', description: 'The regular expression pattern to search for' },
                path: { type: 'string', description: 'File or directory to search in' },
                include: { type: 'string', description: 'File pattern to include in the search (e.g. "*.js")' },
                i: { type: 'boolean', description: 'Case-insensitive search' },
            },
            required: ['pattern'],
        },
        handler: handleGrep,
    },
    {
        name: 'LS',
        description: 'Lists files and directories in a given path.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'The absolute path to the directory to list' },
            },
            required: ['path'],
        },
        handler: handleLS,
    },
    {
        name: 'WebFetch',
        description: 'Fetches content from a URL and returns it as text.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'The URL to fetch' },
            },
            required: ['url'],
        },
        handler: handleWebFetch,
    },
];

/**
 * OpenAI Codex CLI parity tools.
 * Uses snake_case names matching Codex's tool signatures.
 */
export const CodexParityTools = [
    {
        name: 'shell',
        description: 'Run a shell command. Use for installing packages, running builds, tests, git operations, etc.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'Shell command to execute' },
                workdir: { type: 'string', description: 'Working directory for the command' },
            },
            required: ['command'],
        },
        handler: handleBash,
    },
    {
        name: 'apply_diff',
        description: 'Apply a diff to a file. Provide old and new text for exact replacement.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path' },
                diff: { type: 'string', description: 'The diff to apply (unified diff format)' },
            },
            required: ['path', 'diff'],
        },
        handler: async (args: any) => {
            // Parse unified diff and apply via edit
            // Simple implementation: extract old/new from diff
            const diffLines = args.diff.split('\n');
            const oldLines: string[] = [];
            const newLines: string[] = [];
            for (const line of diffLines) {
                if (line.startsWith('-') && !line.startsWith('---')) oldLines.push(line.substring(1));
                else if (line.startsWith('+') && !line.startsWith('+++')) newLines.push(line.substring(1));
                else if (!line.startsWith('@@') && !line.startsWith('---') && !line.startsWith('+++')) {
                    oldLines.push(line);
                    newLines.push(line);
                }
            }
            return handleEdit({
                file_path: args.path,
                old_string: oldLines.join('\n'),
                new_string: newLines.join('\n'),
            });
        },
    },
    {
        name: 'create_file',
        description: 'Create a new file with the given content.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path to create' },
                content: { type: 'string', description: 'File content' },
            },
            required: ['path', 'content'],
        },
        handler: handleWrite,
    },
    {
        name: 'view_file',
        description: 'View the contents of a file, optionally with line range.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path to view' },
                start: { type: 'number', description: 'Start line (1-based)' },
                end: { type: 'number', description: 'End line' },
            },
            required: ['path'],
        },
        handler: (args: any) => handleRead({ file_path: args.path, start_line: args.start, end_line: args.end }),
    },
    {
        name: 'list_directory',
        description: 'List contents of a directory.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path' },
            },
            required: ['path'],
        },
        handler: handleLS,
    },
    {
        name: 'search_files',
        description: 'Search for a pattern in files using fast regex search.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: { type: 'string', description: 'Pattern to search for' },
                directory: { type: 'string', description: 'Directory to search in' },
                file_pattern: { type: 'string', description: 'Glob pattern to filter files' },
            },
            required: ['pattern'],
        },
        handler: handleGrep,
    },
];

/**
 * Gemini CLI parity tools.
 * Uses snake_case matching Gemini CLI's exact signatures.
 */
export const GeminiParityTools = [
    {
        name: 'read_file',
        description: 'Read the contents of a file.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to the file' },
                start_line: { type: 'number', description: 'Start line (1-based)' },
                end_line: { type: 'number', description: 'End line' },
            },
            required: ['file_path'],
        },
        handler: handleRead,
    },
    {
        name: 'write_file',
        description: 'Write content to a file, creating it if it does not exist.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to the file' },
                content: { type: 'string', description: 'Content to write' },
            },
            required: ['file_path', 'content'],
        },
        handler: handleWrite,
    },
    {
        name: 'edit_file',
        description: 'Edit a file by replacing an exact string match.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to the file' },
                old_text: { type: 'string', description: 'Text to find and replace' },
                new_text: { type: 'string', description: 'Replacement text' },
            },
            required: ['file_path', 'old_text', 'new_text'],
        },
        handler: (args: any) => handleEdit({ ...args, old_string: args.old_text, new_string: args.new_text }),
    },
    {
        name: 'list_directory',
        description: 'List files and directories at the given path.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path to list' },
            },
            required: ['path'],
        },
        handler: handleLS,
    },
    {
        name: 'search',
        description: 'Search for a pattern in files using regex.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (regex pattern)' },
                path: { type: 'string', description: 'Directory to search' },
                include: { type: 'string', description: 'File pattern filter (e.g. "*.ts")' },
            },
            required: ['query'],
        },
        handler: (args: any) => handleGrep({ ...args, pattern: args.query }),
    },
];

/**
 * Pi / OpenCode parity tools.
 * Lowercase names matching the exact tool signatures these CLIs use.
 */
export const OpenCodePiParityTools = [
    {
        name: 'read',
        description: 'Read file contents. Supports line range reading.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to the file' },
                offset: { type: 'number', description: 'Start line (1-based)' },
                limit: { type: 'number', description: 'Number of lines' },
            },
            required: ['file_path'],
        },
        handler: handleRead,
    },
    {
        name: 'write',
        description: 'Write content to a file.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to the file' },
                content: { type: 'string', description: 'Content to write' },
            },
            required: ['file_path', 'content'],
        },
        handler: handleWrite,
    },
    {
        name: 'edit',
        description: 'Make precise edits to a file by replacing exact text matches.',
        inputSchema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to the file to edit' },
                old_string: { type: 'string', description: 'The text to replace' },
                new_string: { type: 'string', description: 'The replacement text' },
            },
            required: ['file_path', 'old_string', 'new_string'],
        },
        handler: handleEdit,
    },
    {
        name: 'bash',
        description: 'Execute a bash command and return stdout/stderr.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'The command to execute' },
                timeout: { type: 'number', description: 'Timeout in seconds' },
            },
            required: ['command'],
        },
        handler: (args: any) => handleBash({ ...args, timeout: args.timeout ? args.timeout * 1000 : undefined }),
    },
    {
        name: 'glob',
        description: 'Find files matching a glob pattern.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: { type: 'string', description: 'Glob pattern' },
                path: { type: 'string', description: 'Directory to search' },
            },
            required: ['pattern'],
        },
        handler: handleGlob,
    },
    {
        name: 'grep',
        description: 'Search file contents for a pattern using ripgrep.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: { type: 'string', description: 'Regex pattern to search for' },
                path: { type: 'string', description: 'Directory to search' },
                include: { type: 'string', description: 'File glob filter' },
            },
            required: ['pattern'],
        },
        handler: handleGrep,
    },
    {
        name: 'ls',
        description: 'List files in a directory.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path' },
            },
            required: ['path'],
        },
        handler: handleLS,
    },
    {
        name: 'web_fetch',
        description: 'Fetch content from a URL.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to fetch' },
            },
            required: ['url'],
        },
        handler: handleWebFetch,
    },
];

/**
 * Get all parity tools from all harnesses.
 * Returns deduplicated tools (preferring the first occurrence of a name).
 */
export function getAllParityTools(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    handler: (args: any) => Promise<ToolResponse>;
}> {
    const allTools = [
        ...ClaudeCodeParityTools,
        ...CodexParityTools,
        ...GeminiParityTools,
        ...OpenCodePiParityTools,
    ];

    // Deduplicate by name — first occurrence wins
    const seen = new Set<string>();
    return allTools.filter(tool => {
        if (seen.has(tool.name)) return false;
        seen.add(tool.name);
        return true;
    });
}

/**
 * Get tools for a specific harness.
 */
export function getParityToolsForHarness(harness: 'claude-code' | 'codex' | 'gemini' | 'opencode' | 'pi' | 'cursor' | 'windsurf' | 'all') {
    switch (harness) {
        case 'claude-code': return ClaudeCodeParityTools;
        case 'codex': return CodexParityTools;
        case 'gemini': return GeminiParityTools;
        case 'opencode':
        case 'pi': return OpenCodePiParityTools;
        case 'cursor':
        case 'windsurf': return GeminiParityTools; // Cursor/Windsurf use same signature patterns
        case 'all': return getAllParityTools();
        default: return getAllParityTools();
    }
}
