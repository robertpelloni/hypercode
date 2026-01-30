import { VectorProvider, Document, SearchResult } from '../interfaces/VectorProvider.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export class MemoryManager {
    private provider: VectorProvider | null = null;
    private initialized: boolean = false;
    private dbPath: string;
    private registryPath: string;

    constructor(workspaceRoot: string = process.cwd()) {
        this.dbPath = path.join(workspaceRoot, '.borg', 'db');
        this.registryPath = path.join(workspaceRoot, '.borg', 'memory', 'contexts.json');
    }

    private async initialize() {
        if (this.initialized) return;

        console.log("[MemoryManager] Initializing Vector Backend...");

        // Lazy load the default LanceDB provider from @borg/memory
        // In the future, this could allow switching to Chroma/SQLite based on config
        const { VectorStore } = await import('@borg/memory');

        // Adapt existing VectorStore to VectorProvider interface
        // @ts-ignore - The types might not match perfectly yet, acting as an adapter
        const store = new VectorStore(this.dbPath);

        this.provider = {
            initialize: async () => store.initialize(),
            add: async (docs: Document[]) => {
                await store.addDocuments(docs.map(d => ({
                    id: d.id,
                    file_path: (d.metadata as any)?.file_path || d.id,
                    content: d.content,
                    hash: 'dynamic', // TODO: Calculate hash
                    vector: d.vector
                })));
            },
            search: async (query: string, limit: number = 5) => {
                const results = await store.search(query, limit);
                return results.map((r: any) => ({
                    id: r.id,
                    content: r.content,
                    metadata: { file_path: r.file_path, hash: r.hash },
                    score: 0 // LanceDB wrapper didn't return score in previous interface, need update if needed
                }));
            },
            get: async (id: string) => {
                const doc = await store.get(id);
                if (!doc) return null;
                return {
                    id: doc.id,
                    content: doc.content,
                    metadata: { file_path: doc.file_path, hash: doc.hash },
                    score: 1
                };
            },
            delete: async (ids: string[]) => store.delete(ids),
            reset: async () => store.reset()
        };

        if (this.provider) {
            await this.provider.initialize();
        }

        this.initialized = true;
        console.log("[MemoryManager] Ready.");
    }

    public async saveContext(content: string, metadata: any = {}) {
        if (!this.initialized) await this.initialize();
        if (!this.provider) throw new Error("Provider failed to init");

        const docId = `ctx/${Date.now()}/${Math.random().toString(36).substring(7)}`;

        // TODO: Integrate CodeSplitter here for better chunking

        await this.provider.add([{
            id: docId,
            content: content,
            metadata: metadata
        }]);

        await this.addToRegistry({
            id: docId,
            title: metadata.title || 'Untitled',
            source: metadata.source || 'unknown',
            createdAt: Date.now(),
            metadata
        });

        return docId;
    }

    public async search(query: string, limit: number = 5): Promise<SearchResult[]> {
        if (!this.initialized) await this.initialize();
        if (!this.provider) return [];

        return await this.provider.search(query, limit);
    }
    public async indexCodebase(rootDir: string): Promise<number> {
        if (!this.initialized) await this.initialize();
        if (!this.provider) throw new Error("Provider failed to init");

        console.log(`[MemoryManager] Indexing codebase at ${rootDir}...`);

        // Lazy load Indexer from @borg/memory
        // @ts-ignore
        const { Indexer, VectorStore } = await import('@borg/memory');

        // Re-instantiate internal VectorStore for Indexer (Indexer expects concrete VectorStore, not Provider)
        // TODO: Refactor Indexer to accept VectorProvider interface in future
        const store = new VectorStore(this.dbPath);
        const indexer = new Indexer(store);

        return await indexer.indexDirectory(rootDir);
    }
    public async getContext(id: string) {
        if (!this.initialized) await this.initialize();
        if (!this.provider || !this.provider.get) return null;
        return await this.provider.get(id);
    }

    public async deleteContext(id: string) {
        if (!this.initialized) await this.initialize();
        if (!this.provider) return;

        await this.provider.delete([id]);
        await this.removeFromRegistry(id);
    }

    public async listContexts() {
        try {
            if (!existsSync(this.registryPath)) return [];
            const data = await fs.readFile(this.registryPath, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    private async addToRegistry(entry: any) {
        try {
            const dir = path.dirname(this.registryPath);
            if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });

            let current = await this.listContexts();
            current.unshift(entry); // Newest first
            await fs.writeFile(this.registryPath, JSON.stringify(current, null, 2));
        } catch (e) {
            console.error("Failed to update memory registry:", e);
        }
    }

    private async removeFromRegistry(id: string) {
        try {
            let current = await this.listContexts();
            current = current.filter((c: any) => c.id !== id);
            await fs.writeFile(this.registryPath, JSON.stringify(current, null, 2));
        } catch (e) {
            console.error("Failed to update memory registry:", e);
        }
    }
}
