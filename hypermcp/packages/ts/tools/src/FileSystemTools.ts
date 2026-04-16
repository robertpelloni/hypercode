
import fs from "fs/promises";
import path from "path";

/**
 * Helper to extract path from various possible argument names (Parity logic)
 */
function getPath(args: any): string {
    return args.file_path || args.path || args.AbsolutePath || '';
}

type FileToolResponse = {
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
};

async function strReplaceEditorHandler(args: any): Promise<FileToolResponse> {
    const filePath = getPath(args);
    const oldString = args.old_string || args.oldText;
    const newString = args.new_string || args.newText;

    try {
        const content = await fs.readFile(filePath, "utf-8");
        if (!content.includes(oldString)) {
            return {
                content: [{ type: "text", text: `Error: old_string not found in file. Ensure exact match including whitespace.` }],
                isError: true
            };
        }
        const newContent = content.replace(oldString, newString);
        await fs.writeFile(filePath, newContent, "utf-8");
        return { content: [{ type: "text", text: `Successfully replaced text in ${filePath}` }] };
    } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
}

async function replaceInFileHandler(args: any): Promise<FileToolResponse> {
    return strReplaceEditorHandler(args);
}

// Basic Filesystem Tools with 1:1 IDE Parity (Claude Code / Cursor)
export const FileSystemTools = [
    {
        name: "list_files",
        description: "List files in a directory",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to list" }
            },
            required: ["path"]
        },
        handler: async (args: any) => {
            const reqPath = getPath(args);
            try {
                const files = await fs.readdir(reqPath, { withFileTypes: true });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(files.map(f => ({
                            name: f.name,
                            isDirectory: f.isDirectory()
                        })), null, 2)
                    }]
                };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
            }
        }
    },
    {
        name: "read_file",
        description: "Read the content of a file. Supports line-range reading for large files.",
        inputSchema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Path to the file" },
                start_line: { type: "number", description: "Optional: 1-based start line" },
                end_line: { type: "number", description: "Optional: 1-based end line" }
            },
            required: ["file_path"]
        },
        handler: async (args: any) => {
            const filePath = getPath(args);
            try {
                const content = await fs.readFile(filePath, "utf-8");
                if (args.start_line || args.end_line) {
                    const lines = content.split('\n');
                    const start = (args.start_line || 1) - 1;
                    const end = args.end_line || lines.length;
                    return { content: [{ type: "text", text: lines.slice(start, end).join('\n') }] };
                }
                return { content: [{ type: "text", text: content }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
            }
        }
    },
    {
        name: "write_file",
        description: "Write or overwrite content to a file. Automatically creates directories.",
        inputSchema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Path to the file" },
                content: { type: "string", description: "Full content to write" }
            },
            required: ["file_path", "content"]
        },
        handler: async (args: any) => {
            const filePath = getPath(args);
            try {
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, args.content, "utf-8");
                return { content: [{ type: "text", text: `Successfully wrote to ${filePath}` }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
            }
        }
    },
    {
        name: "str_replace_editor",
        description: "Replace exact string matches within a file. Mimics the primary editing tool of high-tier coding agents.",
        inputSchema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Path to modify" },
                old_string: { type: "string", description: "Exact text to replace" },
                new_string: { type: "string", description: "New text to insert" }
            },
            required: ["file_path", "old_string", "new_string"]
        },
        handler: strReplaceEditorHandler
    },
    // Aliases for HyperCode-native compatibility
    {
        name: "replace_in_file",
        description: "(Alias for str_replace_editor) Replace a string in a file.",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string" },
                oldText: { type: "string" },
                newText: { type: "string" }
            },
            required: ["path", "oldText", "newText"]
        },
        handler: replaceInFileHandler
    }
];
