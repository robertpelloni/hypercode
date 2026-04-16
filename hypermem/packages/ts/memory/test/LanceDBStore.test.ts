import { describe, expect, it, vi } from 'vitest';

import { LanceDBStore } from '../src/LanceDBStore.js';

describe('LanceDBStore', () => {
    it('retries openTable after a concurrent memories table creation wins the race', async () => {
        const store = new LanceDBStore('C:\\temp\\hypercode-memory-test');
        const addedRows: Array<Record<string, unknown>>[] = [];

        const existingTable = {
            add: vi.fn(async (rows: Array<Record<string, unknown>>) => {
                addedRows.push(rows);
            }),
        };

        let openAttempts = 0;
        (store as any).db = {
            openTable: vi.fn(async () => {
                openAttempts += 1;
                if (openAttempts === 1) {
                    throw new Error("Table 'memories' was not found");
                }
                return existingTable;
            }),
            createTable: vi.fn(async () => {
                throw new Error("Table 'memories' already exists");
            }),
        };

        (store as any).embedder = vi.fn(async () => ({
            data: new Float32Array([0.25, 0.75]),
        }));

        await store.addMemory('Remember this fix.', { id: 'memory-1', source: 'test' });

        expect((store as any).db.createTable).toHaveBeenCalledTimes(1);
        expect((store as any).db.openTable).toHaveBeenCalledTimes(2);
        expect(existingTable.add).toHaveBeenCalledTimes(1);
        expect(addedRows[0]?.[0]).toMatchObject({
            id: 'memory-1',
            text: 'Remember this fix.',
            source: 'test',
        });
    });

    it('drops unknown metadata fields when appending to an older memories schema', async () => {
        const store = new LanceDBStore('C:\\temp\\hypercode-memory-test');
        const addCalls: Array<Array<Record<string, unknown>>> = [];

        const existingTable = {
            add: vi.fn(async (rows: Array<Record<string, unknown>>) => {
                addCalls.push(rows);
                if (addCalls.length === 1) {
                    throw new Error('Found field not in schema: sourceTool at row 0');
                }
            }),
            schema: vi.fn(async () => ({
                fields: [
                    { name: 'vector' },
                    { name: 'text' },
                    { name: 'id' },
                    { name: 'source' },
                    { name: 'timestamp' },
                ],
            })),
        };

        (store as any).db = {
            openTable: vi.fn(async () => existingTable),
        };

        (store as any).embedder = vi.fn(async () => ({
            data: new Float32Array([0.5, 0.5]),
        }));

        await store.addMemory('Imported session memory.', {
            id: 'memory-2',
            source: 'session_import',
            sourceTool: 'copilot-chat',
        });

        expect(existingTable.add).toHaveBeenCalledTimes(2);
        expect(addCalls[1]?.[0]).toMatchObject({
            id: 'memory-2',
            text: 'Imported session memory.',
            source: 'session_import',
        });
        expect(addCalls[1]?.[0]).not.toHaveProperty('sourceTool');
    });
});
