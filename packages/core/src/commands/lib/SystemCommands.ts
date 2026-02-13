import { ICommand, CommandResult, CommandRegistry } from "../CommandRegistry.js";
import { Director } from "@borg/agents";

export class HelpCommand implements ICommand {
    name = "help";
    description = "List available slash commands.";

    constructor(private registry: CommandRegistry) { }

    async execute(args: string[]): Promise<CommandResult> {
        const commands = this.registry.getCommands();
        let output = "🛠️ **Available Commands**\n\n";
        for (const cmd of commands) {
            output += `- **/${cmd.name}**: ${cmd.description}\n`;
        }
        return { handled: true, output };
    }
}

export class VersionCommand implements ICommand {
    name = "version";
    description = "Show system version.";

    async execute(args: string[]): Promise<CommandResult> {
        // Read VERSION file or package.json
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const version = await fs.readFile(path.join(process.cwd(), 'VERSION'), 'utf-8');
            return { handled: true, output: `v${version.trim()}` };
        } catch (e) {
            return { handled: true, output: "Unknown Version" };
        }
    }
}

export class DirectorCommand implements ICommand {
    name = "director";
    description = "Control the autonomous director. Usage: /director <start|stop|status>";

    constructor(private directorGetter: () => Director | undefined) { }

    async execute(args: string[]): Promise<CommandResult> {
        const director = this.directorGetter();
        if (!director) return { handled: true, output: "❌ Director instance not found." };

        const subcommand = args[0];
        if (subcommand === 'start') {
            await director.startAutoDrive();
            return { handled: true, output: "✅ Director Auto-Drive Started." };
        } else if (subcommand === 'stop') {
            director.stopAutoDrive();
            return { handled: true, output: "🛑 Director Auto-Drive Stopped." };
        } else if (subcommand === 'status') {
            const status = (director as any).getStatus();
            return { handled: true, output: `📊 **Director Status**\nActive: ${status.active}\nState: ${status.status}\nGoal: ${status.goal || 'None'}\nApprove Mode: ${status.config.acceptDetectionMode}` };
        }

        return { handled: true, output: "Usage: /director <start|stop|status>" };
    }
}
