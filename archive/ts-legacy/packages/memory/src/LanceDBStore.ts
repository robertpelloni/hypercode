import { connect } from '@lancedb/lancedb';
import { pipeline } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';
import { IVectorStore } from './IVectorStore.js';

/**
 * LanceDB uses Apache Arrow for schema inference. Arrow cannot infer the element type
 * of an empty array (`[]`) or deeply-nested objects, causing runtime errors like:
 *   "Failed to infer data type for field structuredObservation.filesRead at row 0."
 * This helper serializes any array or object values to JSON strings so that every
 * top-level field in the row has a scalar type Arrow can handle, eliminating the error.
 * The serialized strings remain searchable as text and are preserved for later parsing.
 */
function sanitizeMetadataForArrow(metadata: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (value === null || value === undefined) {
            result[key] = null;
        } else if (Array.isArray(value) || (typeof value === 'object')) {
            // Serialize arrays and objects to JSON strings to avoid Arrow inference failures
            result[key] = JSON.stringify(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

function isMissingTableError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    const normalized = text.toLowerCase();
    return normalized.includes('not found')
        || normalized.includes('does not exist')
        || normalized.includes('no such table');
}

function isTableAlreadyExistsError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    const normalized = text.toLowerCase();
    return normalized.includes('already exists');
}

function isFieldNotInSchemaError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return text.toLowerCase().includes('found field not in schema');
}

export class LanceDBStore implements IVectorStore {
    private dbPath: string;
    private db: any; // Type as any for now to avoid strict typing issues with lancedb
    private embedder: any;
    private initializePromise: Promise<void> | null = null;

    constructor(rootPath: string) {
        this.dbPath = path.join(rootPath, 'data', 'lancedb');
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }
    }

    async initialize() {
        if (this.db && this.embedder) {
            return;
        }

        if (!this.initializePromise) {
            this.initializePromise = (async () => {
                console.log(`[VectorStore] Connecting to ${this.dbPath}...`);
                this.db = await connect(this.dbPath);

                console.log(`[VectorStore] Loading embedding model (Xenova/all-MiniLM-L6-v2)...`);
                // Use feature-extraction pipeline
                this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                console.log(`[VectorStore] Ready.`);
            })().finally(() => {
                this.initializePromise = null;
            });
        }

        await this.initializePromise;
    }

    async createEmbeddings(text: string): Promise<number[]> {
        if (!this.embedder) await this.initialize();
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    private async constrainRowsToExistingSchema(table: { schema: () => Promise<{ fields?: Array<{ name?: string }> }> }, rows: Array<Record<string, unknown>>) {
        const schema = await table.schema();
        const schemaFields = Array.isArray(schema?.fields) ? schema.fields : [];
        const allowedColumns = schemaFields
            .map((field) => typeof field?.name === 'string' ? field.name : null)
            .filter((name): name is string => Boolean(name));

        if (allowedColumns.length === 0) {
            return rows;
        }

        return rows.map((row) => {
            const constrained: Record<string, unknown> = {};
            for (const column of allowedColumns) {
                constrained[column] = column in row ? row[column] : null;
            }
            return constrained;
        });
    }

    private async addRows(rows: Array<Record<string, unknown>>) {
        if (!this.db) await this.initialize();

        try {
            const table = await this.db.openTable('memories');
            try {
                await table.add(rows);
            } catch (addError) {
                if (!isFieldNotInSchemaError(addError)) {
                    throw addError;
                }

                const constrainedRows = await this.constrainRowsToExistingSchema(table, rows);
                await table.add(constrainedRows);
            }
            return;
        } catch (openError) {
            if (!isMissingTableError(openError)) {
                throw openError;
            }
        }

        try {
            await this.db.createTable('memories', rows);
            return;
        } catch (createError) {
            if (!isTableAlreadyExistsError(createError)) {
                throw createError;
            }
        }

        const table = await this.db.openTable('memories');
        await table.add(rows);
    }

    async addMemory(content: string, metadata: any) {
        if (!this.db) await this.initialize();

        const embedding = await this.createEmbeddings(content);
        // LanceDB uses Apache Arrow for schema inference, which cannot infer the type of empty
        // arrays or nested objects. Sanitize metadata by serializing any non-scalar values
        // (arrays, objects) to JSON strings so Arrow only sees primitives at the top level.
        const sanitizedMeta = sanitizeMetadataForArrow(metadata);
        const data = [{
            vector: embedding,
            text: content,
            ...sanitizedMeta,
            timestamp: Date.now()
        }];
        await this.addRows(data);
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
        await this.addRows(processed);
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
