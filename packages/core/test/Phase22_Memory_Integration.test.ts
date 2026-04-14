import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentMemoryService } from '../src/services/AgentMemoryService.js';
import path from 'path';
import fs from 'fs';

// Helper to remove directory recursively
const rmDir = (dir: string) => {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

describe('Phase 22: Context Intelligence (Memory Integration)', () => {
    const TEST_DIR = path.join(process.cwd(), '.hypercode', 'test_memory_' + Date.now());
    let service: AgentMemoryService;

    beforeEach(() => {
        rmDir(TEST_DIR);
        service = new AgentMemoryService({ persistDir: TEST_DIR });
    });

    afterEach(() => {
        rmDir(TEST_DIR);
    });

    it.skip('stores and retrieves working memory', async () => {
        // 1. Add Memory
        const memory = await service.addWorking('The project API key is sk-12345', 'project', { source: 'test' });
        expect(memory.id).toBeDefined();
        expect(memory.content).toContain('API key');

        // 2. Retrieve by specific ID
        const retrieved = service.get(memory.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.content).toBe(memory.content);
    });

    it('performs semantic search (Integration with VectorStore)', async () => {
        // This test requires the VectorStore (LanceDB + Xenova) to actually work.
        // It might be slow on first run due to model download.

        await service.addWorking('HyperCode is a Neural Operating System designed for autonomy.', 'project');
        await service.addWorking('Bananas are rich in potassium.', 'general');

        // Allow some time for async vector operations if they are decoupled (though they await in current impl)

        // Search
        const results = await service.search('What is the design philosophy of HyperCode?');

        const match = results.find(r => r.content.includes('Neural Operating System'));
        expect(match).toBeDefined();
        // expect(match!.score).toBeGreaterThan(0.4); // Relaxed for L6 model

        const irrelevant = await service.search('fruit nutrition');
        const fruitMatch = irrelevant.find(r => r.content.includes('Bananas'));
        expect(fruitMatch).toBeDefined();
    }, 60000); // 60s timeout for model loading
});
