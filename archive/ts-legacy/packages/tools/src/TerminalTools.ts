
import { spawn } from "child_process";
import { ProcessRegistry } from "./os/ProcessRegistry.js";

type TerminalToolResponse = {
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
};

export class TerminalService {
    constructor(private registry: ProcessRegistry) { }

    getTools() {
        const bashHandler = async (args: { command: string, cwd?: string }): Promise<TerminalToolResponse> => {
            return new Promise((resolve) => {
                const command = args.command;
                const cwd = args.cwd || process.cwd();

                console.log(`[Terminal] Executing bash: ${command} (in ${cwd})`);

                const child = spawn(command, {
                    cwd,
                    shell: true,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                this.registry.register(child, command);

                let stdoutData = "";
                let stderrData = "";

                if (child.stdout) {
                    child.stdout.on('data', (d) => { stdoutData += d.toString(); });
                }
                if (child.stderr) {
                    child.stderr.on('data', (d) => { stderrData += d.toString(); });
                }

                child.on('error', (err) => {
                    resolve({
                        content: [{ type: "text", text: `Execution Error: ${err.message}` }],
                        isError: true
                    });
                });

                child.on('close', (code) => {
                    const output = stdoutData + (stderrData ? `\nSTDERR:\n${stderrData}` : "");
                    const trimmedOutput = output.length > 50000 ? output.substring(0, 50000) + "\n...[Output Truncated]" : output;

                    resolve({
                        content: [{ type: "text", text: trimmedOutput.trim() || (code === 0 ? "Command completed successfully (no output)." : `Command exited with code ${code}`) }],
                        isError: code !== 0
                    });
                });
            });
        };

        return [
            {
                name: "bash",
                description: "Execute a bash/shell command and return the standard output and standard error.",
                inputSchema: {
                    type: "object",
                    properties: {
                        command: { type: "string", description: "The command to execute in the shell." },
                        cwd: { type: "string", description: "Optional: Working directory for the command." }
                    },
                    required: ["command"]
                },
                handler: bashHandler
            },
            // Legacy Alias
            {
                name: "execute_command",
                description: "(Alias for bash) Execute a shell command.",
                inputSchema: {
                    type: "object",
                    properties: {
                        command: { type: "string" },
                        cwd: { type: "string" }
                    },
                    required: ["command"]
                },
                handler: async (args: { command: string, cwd?: string }): Promise<TerminalToolResponse> => bashHandler(args)
            }
        ];
    }
}
