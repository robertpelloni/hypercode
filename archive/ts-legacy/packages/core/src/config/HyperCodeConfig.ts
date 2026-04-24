import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export const MCPServerConfigSchema = z.object({
    command: z.string(),
    args: z.array(z.string()).optional().default([]),
    env: z.record(z.string()).optional().default({}),
    enabled: z.boolean().optional().default(true)
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/config/HyperCodeConfig.ts
export const HyperCodeConfigSchema = z.object({
    mcpServers: z.record(MCPServerConfigSchema).default({})
});

export type HyperCodeConfig = z.infer<typeof HyperCodeConfigSchema>;

export class HyperCodeConfigLoader {
    private static getConfigPath(): string {
        // Look in current working directory (project root)
        return path.join(process.cwd(), 'hypercode.config.json');
    }

    public static loadConfig(): HyperCodeConfig {
        const configPath = this.getConfigPath();
        if (!fs.existsSync(configPath)) {
            console.warn(`[HyperCodeConfig] No config found at ${configPath}. Using defaults.`);
========
export const BorgConfigSchema = z.object({
    mcpServers: z.record(MCPServerConfigSchema).default({})
});

export type BorgConfig = z.infer<typeof BorgConfigSchema>;

export class BorgConfigLoader {
    private static getConfigPath(): string {
        // Look in current working directory (project root)
        return path.join(process.cwd(), 'borg.config.json');
    }

    public static loadConfig(): BorgConfig {
        const configPath = this.getConfigPath();
        if (!fs.existsSync(configPath)) {
            console.warn(`[BorgConfig] No config found at ${configPath}. Using defaults.`);
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/config/BorgConfig.ts
            return { mcpServers: {} };
        }

        try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const json = JSON.parse(raw);
<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/config/HyperCodeConfig.ts
            return HyperCodeConfigSchema.parse(json);
        } catch (error) {
            console.error(`[HyperCodeConfig] Failed to load config:`, error);
========
            return BorgConfigSchema.parse(json);
        } catch (error) {
            console.error(`[BorgConfig] Failed to load config:`, error);
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/config/BorgConfig.ts
            return { mcpServers: {} };
        }
    }
}
