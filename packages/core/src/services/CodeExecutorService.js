import { spawn } from 'child_process';

export class CodeExecutorService {
    async executeCode(code, _toolCallHandler) {
        return await new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', ['-c', code]);

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python execution failed with code ${code}:\n${stderr}`));
                } else {
                    resolve(stdout);
                }
            });

            pythonProcess.on('error', (err) => {
                reject(new Error(`Failed to start Python process: ${err.message}`));
            });
        });
    }
}

export const codeExecutorService = new CodeExecutorService();
