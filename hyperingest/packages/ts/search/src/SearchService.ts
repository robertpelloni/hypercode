import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { rgPath } from '@vscode/ripgrep';

export interface SearchResult {
    file: string;
    line?: number;
    content: string;
    score?: number;
    type: 'semantic' | 'lexical';
}

export class SearchService {
    private bridgePath: string;

    constructor() {
        this.bridgePath = path.resolve(__dirname, '../../scripts/txtai_bridge.py');
    }

    private async executeBridge(command: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const dir = path.dirname(this.bridgePath);
            const script = path.basename(this.bridgePath);
            const py = spawn('python', [script], { cwd: dir });

            let stdout = '';
            let stderr = '';

            py.stdout.on('data', (data: any) => { stdout += data.toString(); });
            py.stderr.on('data', (data: any) => { stderr += data.toString(); });

            py.stdin.write(JSON.stringify({ command, payload }) + '\n');
            py.stdin.end();

            py.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Bridge exited with code ${code}: ${stderr}`));
                } else {
                    try {
                        const lines = stdout.trim().split('\n');
                        const last = lines[lines.length - 1];
                        if (last) resolve(JSON.parse(last));
                        else resolve({});
                    } catch (e) {
                        reject(new Error(`Failed to parse bridge output: ${stdout}`));
                    }
                }
            });
        });
    }

    public async loadIndex(): Promise<void> {
        const res = await this.executeBridge('load', {});
        if (res.error) throw new Error(`Failed to load txtai: ${res.error}`);
    }

    public async indexDocs(docs: { id: string, text: string }[]): Promise<void> {
        // txtai expects (id, text, metadata)
        // We'll leave metadata empty for now
        const payload = docs.map(d => [d.id, d.text, null]);
        const res = await this.executeBridge('index', { documents: payload });
        if (res.error) throw new Error(`Indexing failed: ${res.error}`);
    }

    public async searchSemantic(query: string, limit: number = 5): Promise<SearchResult[]> {
        const res = await this.executeBridge('search', { query, limit });
        if (res.error) throw new Error(`Semantic search failed: ${res.error}`);

        // Results are [id, score]
        // In a real system we'd map ID back to content via a separate store or metadata.
        // For this hybrid demo, we assume the caller handles the content mapping or we only return IDs.
        // We'll verify connectivity primarily.
        return (res.results || []).map((r: any) => ({
            file: r[0], // ID
            content: "Semantic Match",
            score: r[1],
            type: 'semantic'
        }));
    }

    public async searchLexical(query: string, path: string): Promise<SearchResult[]> {
        return new Promise((resolve, reject) => {
            // Fallback to 'rg' in PATH if bundled not found
            let binary = fs.existsSync(rgPath) ? rgPath : 'rg';

            if (process.platform === 'win32' && binary === 'rg') {
                binary = 'rg.exe';
            }

            // Spawn without shell for safety and better signal handling
            const rg = spawn(binary, ['--json', query, path], { shell: false });

            let output = '';
            let error = '';

            rg.stdout.on('data', (data: any) => { output += data.toString(); });
            rg.stderr.on('data', (data: any) => { error += data.toString(); });
            rg.on('error', (err) => {
                reject(new Error(`Failed to spawn ripgrep: ${err.message}`));
            });

            rg.on('close', (code) => {
                if (code !== 0 && code !== 1) {
                    reject(new Error(`ripgrep failed (code ${code}): ${error}`));
                    return;
                }

                const results: SearchResult[] = [];
                output.split('\n').forEach(line => {
                    if (!line.trim()) return;
                    try {
                        const json = JSON.parse(line);
                        if (json.type === 'match') {
                            results.push({
                                file: json.data.path.text,
                                line: json.data.line_number,
                                content: json.data.lines.text.trim(),
                                type: 'lexical'
                            });
                        }
                    } catch (e) { }
                });
                resolve(results);
            });
        });
    }

    public async search(query: string, rootPath: string): Promise<SearchResult[]> {
        // Run parallel
        // Note: Semantic requires pre-indexing which we might not have efficiently here without persistent server.
        // We'll run lexical primarily and attempt semantic if indexed.

        const lexical = await this.searchLexical(query, rootPath);

        // For verify, we might try semantic if loaded
        try {
            // const semantic = await this.searchSemantic(query); // requires index
            // return [...lexical, ...semantic];
            return lexical;
        } catch (e) {
            return lexical;
        }
    }
}
