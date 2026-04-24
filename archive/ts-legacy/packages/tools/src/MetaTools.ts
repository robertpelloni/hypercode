import fs from "fs/promises";
import path from "path";

export const MetaTools = [
    {
        name: "create_tool_scaffold",
        description: "Generate a new MCP Tool file skeleton in packages/tools/src/",
        inputSchema: {
            type: "object",
            properties: {
                fileName: { type: "string", description: "Name of the file (e.g., MyNewTools.ts)" },
                toolName: { type: "string", description: "Name of the tool export (e.g., MyNewTools)" },
                functionName: { type: "string", description: "Name of the first tool function (e.g., my_new_tool)" },
                description: { type: "string", description: "Description of the tool" }
            },
            required: ["fileName", "toolName", "functionName", "description"]
        },
        handler: async (args: { fileName: string, toolName: string, functionName: string, description: string }) => {
            try {
                const toolsDir = path.join(process.cwd(), "packages/tools/src");
                // Ensure we are in the right root or construct absolute path
                // Assuming process.cwd() is project root. If not, this might fail. 
                // Better to rely on relative path from this file? 
                // But this file will be compiled to dist/MetaTools.js.
                // Let's assume absolute path args or standard location.

                // Let's try to detect if we are in expected environment
                const targetPath = path.join(toolsDir, args.fileName);

                // Check if file exists
                try {
                    await fs.access(targetPath);
                    return { content: [{ type: "text", text: `Error: File ${args.fileName} already exists.` }] };
                } catch (e) {
                    // File doesn't exist, proceed
                }

                const template = `import { z } from "zod";

export const ${args.toolName} = [
    {
        name: "${args.functionName}",
        description: "${args.description}",
        inputSchema: {
            type: "object",
            properties: {
                // TODO: Define arguments
                arg1: { type: "string", description: "Argument description" }
            },
            required: ["arg1"]
        },
        handler: async (args: { arg1: string }) => {
            try {
                // TODO: Implement logic
                return {
                    content: [{
                        type: "text",
                        text: \`Executed ${args.functionName} with \${args.arg1}\`
                    }]
                };
            } catch (err: any) {
                return { content: [{ type: "text", text: \`Error: \${err.message}\` }] };
            }
        }
    }
];
`;
                await fs.writeFile(targetPath, template, "utf-8");
                return {
                    content: [{
                        type: "text",
                        text: `Successfully created tool scaffold at ${targetPath}. \n\nIMPORTANT: You must now manually export this tool in 'packages/tools/src/index.ts' to make it available.`
                    }]
                };

            } catch (err: any) {
                return { content: [{ type: "text", text: `Error generating tool: ${err.message}` }] };
            }
        }
    },
    {
        name: "read_tool_source",
        description: "Read the source code of an existing tool in packages/tools/src/",
        inputSchema: {
            type: "object",
            properties: {
                fileName: { type: "string", description: "Name of the file (e.g., FileSystemTools.ts)" }
            },
            required: ["fileName"]
        },
        handler: async (args: { fileName: string }) => {
            try {
                const toolsDir = path.join(process.cwd(), "packages/tools/src");
                const targetPath = path.join(toolsDir, args.fileName);
                const content = await fs.readFile(targetPath, "utf-8");
                return { content: [{ type: "text", text: content }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error reading tool: ${err.message}` }] };
            }
        }
    },
    {
        name: "update_tool_source",
        description: "Update the source code of an existing tool in packages/tools/src/",
        inputSchema: {
            type: "object",
            properties: {
                fileName: { type: "string", description: "Name of the file (e.g., FileSystemTools.ts)" },
                content: { type: "string", description: "New content for the file" }
            },
            required: ["fileName", "content"]
        },
        handler: async (args: { fileName: string, content: string }) => {
            try {
                const toolsDir = path.join(process.cwd(), "packages/tools/src");
                const targetPath = path.join(toolsDir, args.fileName);

                // Security check: Ensure we are only editing files in tools dir
                if (!targetPath.startsWith(toolsDir)) {
                    return { content: [{ type: "text", text: `Error: Access denied. Can only edit files in packages/tools/src.` }] };
                }

                await fs.writeFile(targetPath, args.content, "utf-8");
                return { content: [{ type: "text", text: `Successfully updated ${args.fileName}.` }] };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error updating tool: ${err.message}` }] };
            }
        }
    }
];
