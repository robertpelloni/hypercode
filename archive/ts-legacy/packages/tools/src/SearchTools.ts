
import { rgPath } from '@vscode/ripgrep';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

/**
 * Helper to extract path from various possible argument names (Parity logic)
 */
function getDirPath(args: any): string {
    return args.dir_path || args.path || process.cwd();
}

type SearchToolResponse = {
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
};

async function grepSearchHandler(args: any): Promise<SearchToolResponse> {
    try {
        const searchPath = getDirPath(args);
        const globArgs = args.include_pattern ? `-g "${args.include_pattern}"` : "";

        // 1:1 Parity with model expectations: --line-number --with-filename --no-heading
        const command = `"${rgPath}" --line-number --with-filename --no-heading ${globArgs} -- "${args.pattern}" "${searchPath}"`;

        const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
        return { content: [{ type: "text", text: stdout.trim() || "No matches found." }] };
    } catch (err: any) {
        if (err.code === 1) return { content: [{ type: "text", text: "No matches found." }] };
        return { content: [{ type: "text", text: `Search Error: ${err.message}` }], isError: true };
    }
}

async function searchCodebaseHandler(args: any): Promise<SearchToolResponse> {
    return grepSearchHandler({ pattern: args.query, dir_path: args.path });
}

export const SearchTools = [
    {
        name: "grep_search",
        description: "Search for a regular expression pattern within file contents. This tool is FAST and optimized, powered by ripgrep.",
        inputSchema: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "The pattern to search for (Rust-flavored regex)" },
                dir_path: { type: "string", description: "Directory to search (default: current working directory)" },
                include_pattern: { type: "string", description: "Glob pattern to filter files (e.g., '*.ts', 'src/**')" }
            },
            required: ["pattern"]
        },
        handler: grepSearchHandler
    },
    {
        name: "glob",
        description: "Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`).",
        inputSchema: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "The glob pattern to match against." },
                path: { type: "string", description: "Optional: Directory to search within (default: cwd)" }
            },
            required: ["pattern"]
        },
        handler: async (args: any) => {
            try {
                const searchPath = getDirPath(args);
                // Using ripgrep --files with glob filter for high performance
                const command = `"${rgPath}" --files -g "${args.pattern}" "${searchPath}"`;
                const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
                
                return { content: [{ type: "text", text: stdout.trim() || "No files matched." }] };
            } catch (err: any) {
                if (err.code === 1) return { content: [{ type: "text", text: "No files matched." }] };
                return { content: [{ type: "text", text: `Glob Error: ${err.message}` }], isError: true };
            }
        }
    },
    // Legacy Alias for backward compatibility
    {
        name: "search_codebase",
        description: "(Alias for grep_search) Search the codebase using fast text search.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string" },
                path: { type: "string" }
            },
            required: ["query"]
        },
        handler: searchCodebaseHandler
    }
];
