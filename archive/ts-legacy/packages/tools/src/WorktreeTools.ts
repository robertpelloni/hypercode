import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";

// Helper to run git commands
const runGit = (command: string, cwd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        exec(command, { cwd, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Git Error: ${error.message}\n${stderr}`));
                return;
            }
            resolve(stdout.trim());
        });
    });
};

export const WorktreeTools = [
    {
        name: "git_worktree_list",
        description: "List all active git worktrees",
        inputSchema: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Repository root (default: current directory)" }
            }
        },
        handler: async (args: { cwd?: string }) => {
            try {
                const cwd = args.cwd || process.cwd();
                const output = await runGit("git worktree list --porcelain", cwd);

                // Parse porcelain output
                // worktree /path/to/repo
                // HEAD <sha>
                // branch refs/heads/main

                const worktrees = [];
                let current: any = {};

                output.split('\n').forEach(line => {
                    const [key, ...parts] = line.split(' ');
                    const value = parts.join(' ');

                    if (key === 'worktree') {
                        if (current.path) worktrees.push(current);
                        current = { path: value };
                    } else if (key === 'HEAD') {
                        current.sha = value;
                    } else if (key === 'branch') {
                        current.branch = value.replace('refs/heads/', '');
                    }
                });
                if (current.path) worktrees.push(current);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(worktrees, null, 2)
                    }]
                };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}` }] };
            }
        }
    },
    {
        name: "git_worktree_add",
        description: "Create a new git worktree for a branch",
        inputSchema: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Repository root" },
                path: { type: "string", description: "Path for new worktree (relative or absolute)" },
                branch: { type: "string", description: "Branch name to checkout" },
                base: { type: "string", description: "Base branch to create from (default: main)" }
            },
            required: ["path", "branch"]
        },
        handler: async (args: { cwd?: string, path: string, branch: string, base?: string }) => {
            try {
                const cwd = args.cwd || process.cwd();
                const targetPath = path.resolve(cwd, args.path);
                const base = args.base || "main";

                // Ensure parent dir exists
                await fs.mkdir(path.dirname(targetPath), { recursive: true });

                // git worktree add -b <branch> <path> <base>
                await runGit(`git worktree add -b ${args.branch} "${targetPath}" ${base}`, cwd);

                return {
                    content: [{
                        type: "text",
                        text: `Successfully created worktree at ${targetPath} on branch ${args.branch}`
                    }]
                };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}` }] };
            }
        }
    },
    {
        name: "git_worktree_remove",
        description: "Remove a git worktree",
        inputSchema: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Repository root" },
                path: { type: "string", description: "Path to worktree to remove" },
                force: { type: "boolean", description: "Force removal" }
            },
            required: ["path"]
        },
        handler: async (args: { cwd?: string, path: string, force?: boolean }) => {
            try {
                const cwd = args.cwd || process.cwd();
                const targetPath = path.resolve(cwd, args.path);

                const cmd = args.force ? `git worktree remove --force "${targetPath}"` : `git worktree remove "${targetPath}"`;
                await runGit(cmd, cwd);

                return {
                    content: [{
                        type: "text",
                        text: `Successfully removed worktree at ${targetPath}`
                    }]
                };
            } catch (err: any) {
                return { content: [{ type: "text", text: `Error: ${err.message}` }] };
            }
        }
    }
];
