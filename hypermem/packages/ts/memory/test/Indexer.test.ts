import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LanceDBStore } from '../src/LanceDBStore.js';
import { Indexer } from '../src/Indexer.js';
import path from 'path';
import fs from 'fs';

const rmDir = (dir: string) => {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

describe('Phase 23: Deep Data Search (Indexer)', () => {
    const TEST_DIR = path.join(process.cwd(), '.hypercode', 'test_indexer_' + Date.now());
    const DATA_DIR = path.join(TEST_DIR, 'mock_codebase');
    let store: LanceDBStore;
    let indexer: Indexer;

    beforeEach(async () => {
        rmDir(TEST_DIR);
        fs.mkdirSync(DATA_DIR, { recursive: true });

        // Create mock files
        fs.writeFileSync(path.join(DATA_DIR, 'hello.ts'), `
            export function hello() {
                console.log("Hello World");
                return true;
            }
        `);

        fs.writeFileSync(path.join(DATA_DIR, 'readme.md'), '# Documentation\nThis is a test readme.');

        store = new LanceDBStore(TEST_DIR);
        indexer = new Indexer(store);
    });

    afterEach(() => {
        rmDir(TEST_DIR);
    });

    it('indexes a directory of files', async () => {
        const count = await indexer.indexDirectory(DATA_DIR);
        expect(count).toBeGreaterThan(0);

        // Verify search
        const results = await store.search('Hello World');
        const match = results.find((r: any) => (r.content || r.text).includes('Hello World'));
        expect(match).toBeDefined();
        expect(match.file_path).toContain('hello.ts');
    }, 60000);

    it('indexes symbols from typescript files', async () => {
        // This relies on typescript compiler API being available
        const count = await indexer.indexSymbols(DATA_DIR);
        // We expect at least the 'hello' function to be found
        expect(count).toBeGreaterThan(0);

        const results = await store.search('function hello');
        // Depending on embedding model, searching for 'function hello' should return the symbol doc
        // Symbol doc format: "function hello\n..."
        const match = results.find((r: any) => (r.content || r.text).includes('function hello') && r.metadata?.type === 'symbol');
        expect(match).toBeDefined();
    }, 60000);
});
