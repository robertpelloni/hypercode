
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

interface GraphNode {
    id: string; // File path (relative to root)
    name: string; // Basename
    type: 'file' | 'directory';
}

interface GraphLink {
    source: string;
    target: string;
    kind: 'import' | 'export';
}

export class RepoGraphService {
    private rootDir: string;
    private consumers: Map<string, Set<string>> = new Map();
    private dependencies: Map<string, Set<string>> = new Map();
    private isInitialized: boolean = false;
    private fileCache: Map<string, number> = new Map(); // mtime cache

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    async buildGraph() {
        console.time('RepoGraphBuild');
        const files = await this.getAllFiles(this.rootDir);

        // Clear maps
        this.consumers.clear();
        this.dependencies.clear();

        for (const file of files) {
            await this.analyzeFile(file);
        }

        this.isInitialized = true;
        console.timeEnd('RepoGraphBuild');
        console.log(`[RepoGraph] Built graph with ${files.length} files.`);
    }

    getConsumers(filePath: string): string[] {
        if (!this.isInitialized) return [];
        const normalized = this.normalize(filePath);
        const set = this.consumers.get(normalized);
        return set ? Array.from(set) : [];
    }

    getDependencies(filePath: string): string[] {
        if (!this.isInitialized) return [];
        const normalized = this.normalize(filePath);
        const set = this.dependencies.get(normalized);
        return set ? Array.from(set) : [];
    }

    private normalize(p: string): string {
        return p.split(path.sep).join('/').replace(/^\.\//, '');
    }

    private async analyzeFile(filePath: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const sourceNormalized = this.normalize(path.relative(this.rootDir, filePath));

            // Create AST
            const sourceFile = ts.createSourceFile(
                filePath,
                content,
                ts.ScriptTarget.Latest,
                true // setParentNodes
            );

            const imports: string[] = [];

            // Walk AST for imports
            const visit = (node: ts.Node) => {
                if (ts.isImportDeclaration(node)) {
                    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                        imports.push(node.moduleSpecifier.text);
                    }
                } else if (ts.isExportDeclaration(node)) {
                    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                        imports.push(node.moduleSpecifier.text);
                    }
                }
                ts.forEachChild(node, visit);
            };

            visit(sourceFile);

            for (const imp of imports) {
                const resolved = this.resolveModule(filePath, imp);
                if (resolved) {
                    const targetNormalized = this.normalize(path.relative(this.rootDir, resolved));

                    // Add Forward
                    if (!this.dependencies.has(sourceNormalized)) this.dependencies.set(sourceNormalized, new Set());
                    this.dependencies.get(sourceNormalized)!.add(targetNormalized);

                    // Add Reverse
                    if (!this.consumers.has(targetNormalized)) this.consumers.set(targetNormalized, new Set());
                    this.consumers.get(targetNormalized)!.add(sourceNormalized);
                }
            }
        } catch (e) {
            // console.error(`Failed to analyze ${filePath}:`, e);
            // Ignore for robust graph building
        }
    }

    private resolveModule(importer: string, moduleSpecifier: string): string | null {
        // Simple Node-style resolution for now (relative)
        if (moduleSpecifier.startsWith('.')) {
            const dir = path.dirname(importer);
            let target = path.join(dir, moduleSpecifier);

            // Try extensions
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];

            // Check exact file + extension
            for (const ext of extensions) {
                if (fs.existsSync(target + ext)) return target + ext;
            }

            // Check if directory index
            for (const ext of extensions) {
                if (fs.existsSync(path.join(target, 'index' + ext))) return path.join(target, 'index' + ext);
            }

            // If explicit extension provided
            if (fs.existsSync(target)) return target;
        }

        // TODO: Handle workspace packages aliases (e.g. @borg/core)
        // This requires reading tsconfig.json paths or package.json workspaces

        return null;
    }

    private async getAllFiles(dir: string): Promise<string[]> {
        let results: string[] = [];
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const p = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.') || entry.name === 'coverage') continue;
                    results = results.concat(await this.getAllFiles(p));
                } else {
                    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                        results.push(p);
                    }
                }
            }
        } catch (e) {
            // Ignore access errors
        }
        return results;
    }

    toJSON() {
        const nodes = new Set<string>();
        const links: { source: string; target: string }[] = [];

        // Add all keys from dependencies to ensure disconnected nodes (that have deps) are present
        for (const [source, targets] of this.dependencies.entries()) {
            nodes.add(source);
            for (const target of targets) {
                nodes.add(target);
                links.push({ source, target });
            }
        }

        // Also add files that are consumers but have no deps? (rare but possible)
        for (const [target, sources] of this.consumers.entries()) {
            nodes.add(target);
            for (const source of sources) {
                nodes.add(source);
                // Links already added via dependencies iteration usually, but let's be safe?
                // Actually dependencies map forward is the source of truth for links.
            }
        }

        return {
            nodes: Array.from(nodes).map(id => ({
                id,
                name: path.basename(id),
                group: id.split('/')[0] // simplistic grouping by top-level folder
            })),
            links
        };
    }
}
