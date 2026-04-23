import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiscoveredAgent {
    name: string;
    executable: string;
    version: string;
    status: 'available' | 'missing';
}

export class AgentDiscovery {
    private knownAgents = [
        { name: 'Claude Code', exec: 'claude' },
        { name: 'Gemini CLI', exec: 'gemini' },
        { name: 'Codex', exec: 'codex' },
        { name: 'Cursor', exec: 'cursor' },
        { name: 'OpenCode', exec: 'opencode' },
    ];

    async scanLocalEnvironment(): Promise<DiscoveredAgent[]> {
        const results: DiscoveredAgent[] = [];

        for (const agent of this.knownAgents) {
            try {
                // Determine if executable is in PATH
                await execAsync(`which ${agent.exec}`);

                // Attempt to grab version if available
                let version = 'unknown';
                try {
                    const { stdout } = await execAsync(`${agent.exec} --version`);
                    version = stdout.trim();
                } catch {
                    // Ignore version fetch failure
                }

                results.push({
                    name: agent.name,
                    executable: agent.exec,
                    version,
                    status: 'available'
                });
            } catch (err) {
                results.push({
                    name: agent.name,
                    executable: agent.exec,
                    version: 'N/A',
                    status: 'missing'
                });
            }
        }

        return results;
    }
}
