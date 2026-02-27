import { z } from 'zod';
import { t, publicProcedure, adminProcedure } from '../lib/trpc-core.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);

export const infrastructureRouter = t.router({
    /**
     * Get the current status of the mcpenetes daemon / binary
     */
    getMcpenetesStatus: publicProcedure.query(async () => {
        try {
            // Check if mcpenetes is installed or available in PATH or local bin
            const binPath = path.join(process.cwd(), '..', '..', 'submodules', 'mcpenetes', 'bin', 'mcpenetes');

            let isInstalled = false;
            try {
                await fs.access(binPath);
                isInstalled = true;
            } catch {
                try {
                    await execAsync('mcpenetes --version');
                    isInstalled = true;
                } catch {
                    isInstalled = false;
                }
            }

            // Check config files
            const configPath = path.join(os.homedir(), '.config', 'mcpetes', 'config.yaml');
            let hasConfig = false;
            try {
                await fs.access(configPath);
                hasConfig = true;
            } catch {
                hasConfig = false;
            }

            return {
                installed: isInstalled,
                hasConfig,
                daemonActive: false, // Would check port 3000/3010 if running UI
                version: isInstalled ? "latest" : null
            };
        } catch (error) {
            return {
                installed: false,
                hasConfig: false,
                daemonActive: false,
                version: null,
                error: (error as Error).message
            };
        }
    }),

    /**
     * Run a mcpenetes CLI command
     */
    runDoctor: adminProcedure.mutation(async () => {
        try {
            const { stdout, stderr } = await execAsync('mcpenetes doctor');
            return { success: true, output: stdout || stderr };
        } catch (error: any) {
            return { success: false, output: error.stdout || error.stderr || error.message };
        }
    }),

    /**
     * Apply configurations across all clients
     */
    applyConfigurations: adminProcedure.mutation(async () => {
        try {
            const { stdout, stderr } = await execAsync('mcpenetes apply');
            return { success: true, output: stdout || stderr };
        } catch (error: any) {
            return { success: false, output: error.stdout || error.stderr || error.message };
        }
    }),
});
