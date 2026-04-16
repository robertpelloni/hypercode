import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BrowserResult {
    result?: string;
    status: string;
    error?: string;
}

export class BrowserTool {
    private scriptPath: string;

    constructor() {
        this.scriptPath = path.resolve(__dirname, '../../scripts/browser_bridge.py');
    }

    public async executeTask(task: string, headless: boolean = true): Promise<BrowserResult> {
        return new Promise((resolve, reject) => {
            const dir = path.dirname(this.scriptPath);
            const script = path.basename(this.scriptPath);

            const py = spawn('python', [script], { cwd: dir });

            let stdout = '';
            let stderr = '';

            py.stdout.on('data', (data: any) => {
                stdout += data.toString();
            });

            py.stderr.on('data', (data: any) => {
                stderr += data.toString();
            });

            try {
                py.stdin.write(JSON.stringify({ task, headless }) + '\n');
                py.stdin.end(); // One-shot for now to avoid complexity
            } catch (e) {
                reject(new Error(`Failed to write to python process: ${e}`));
                return;
            }

            py.on('close', (code) => {
                if (code !== 0) {
                    // Check if stdout has JSON error
                    try {
                        const lines = stdout.trim().split('\n');
                        const last = lines[lines.length - 1];
                        if (last) {
                            const res = JSON.parse(last);
                            resolve(res as BrowserResult);
                            return;
                        }
                    } catch (e) { }

                    reject(new Error(`Browser process exited with code ${code}. Stderr: ${stderr}`));
                } else {
                    try {
                        const lines = stdout.trim().split('\n');
                        let result = null;
                        for (let i = lines.length - 1; i >= 0; i--) {
                            try {
                                const line = lines[i].trim();
                                if (line) {
                                    result = JSON.parse(line);
                                    break;
                                }
                            } catch (e) { }
                        }

                        if (result) {
                            resolve(result as BrowserResult);
                        } else {
                            reject(new Error(`No valid JSON output. Stdout: ${stdout} | Stderr: ${stderr}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse output: ${e}`));
                    }
                }
            });

            py.on('error', (err) => {
                reject(err);
            });
        });
    }
}
