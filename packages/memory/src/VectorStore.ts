import { connect } from '@lancedb/lancedb';
import { pipeline } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';

export class VectorStore {
    private dbPath: string;
    private db: any; // Type as any for now to avoid strict typing issues with lancedb
    private embedder: any;

    constructor(rootPath: string) {
        this.dbPath = path.join(rootPath, 'data', 'lancedb');
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }
    }

    async initialize() {
        console.log(`[VectorStore] Connecting to ${this.dbPath}...`);
        this.db = await connect(this.dbPath);

        console.log(`[VectorStore] Loading embedding model (Xenova/all-MiniLM-L6-v2)...`);
        // Use feature-extraction pipeline
        this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log(`[VectorStore] Ready.`);
    }

    async createEmbeddings(text: string): Promise<number[]> {
        if (!this.embedder) await this.initialize();
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    async addMemory(content: string, metadata: any) {
        if (!this.db) await this.initialize();

        const embedding = await this.createEmbeddings(content);
        const data = [{
            vector: embedding,
            text: content,
            ...metadata,
            timestamp: Date.now()
        }];

        let table;
        try {
            table = await this.db.openTable('memories');
            await table.add(data);
        } catch (e) {
            // Table doesn't exist, create it
            // Schema is inferred from data
            table = await this.db.createTable('memories', data);
        }
        return true;
    }

    async addDocuments(docs: any[]) {
        if (!this.db) await this.initialize();
        if (docs.length === 0) return;

        // Create embeddings for batch if not present
        const processed = await Promise.all(docs.map(async d => {
            if (d.vector) return d;
            const text = d.text || d.content;
            return {
                ...d,
                vector: await this.createEmbeddings(text),
                timestamp: Date.now()
            };
        }));

        let table;
        try {
            table = await this.db.openTable('memories');
            await table.add(processed);
        } catch (e) {
            table = await this.db.createTable('memories', processed);
        }
        return true;
    }

    async get(id: string) {
        if (!this.db) await this.initialize();
        try {
            const table = await this.db.openTable('memories');
            const results = await table.search(await this.createEmbeddings(''))
                .where(`id = '${id}'`)
                .limit(1)
                .toArray();
            return results.length > 0 ? results[0] : null;
        } catch (e) {
            return null;
        }
    }

    async delete(ids: string[]) {
        if (!this.db) await this.initialize();
        if (ids.length === 0) return;

        try {
            const table = await this.db.openTable('memories');
            const whereClause = ids.map(id => `id = '${id}'`).join(' OR ');
            await table.delete(whereClause);
        } catch (e) {
            console.error("VectorStore.delete failed:", e);
        }
    }

    async reset() {
        if (!this.db) await this.initialize();
        try {
            // Drop table
            await this.db.dropTable('memories');
        } catch (e) {
            // Ignore if doesn't exist
        }
    }

    async listDocuments(where?: string, limit: number = 100) {
        if (!this.db) await this.initialize();
        try {
            const table = await this.db.openTable('memories');
            // Hacky "find all" via empty vector search? No, LanceDB vector search is required.
            // Or use query() if supported?
            // Fallback: search with empty query embedding but high limit?
            // Actually, we can just use search() API with where clause.

            // NOTE: LanceDB usually requires a vector query for search, BUT we can iterate too.
            // Just use a dummy vector for standard listing sorted by... something?
            const dummyVec = await this.createEmbeddings('query');

            let queryBuilder = table.search(dummyVec).limit(limit);
            if (where) queryBuilder = queryBuilder.where(where);

            return await queryBuilder.toArray();
        } catch (e) {
            return [];
        }
    }

    async search(query: string, limit: number = 5, where?: string) {
        if (!this.db) await this.initialize();
        const queryVec = await this.createEmbeddings(query);

        const table = await this.db.openTable('memories');
        let queryBuilder = table.search(queryVec).limit(limit);

        if (where) {
            queryBuilder = queryBuilder.where(where);
        }

        return await queryBuilder.toArray();
    }
}
