import { describe, test, expect, mock } from 'vitest';
import { UnifiedMemorySystem } from '../src/memory/UnifiedMemorySystem.js';
import { MemorySubsystemAdapter, MemorySearchResult } from '../src/memory/UnifiedMemorySystem.js';

/**
 * Reason: this test validates internal primary-adapter switching behavior.
 * What: reads the private runtime field via reflection for assertion-only usage.
 * Why: avoids permissive casts while preserving current verification depth.
 */
function getPrimaryAdapterId(ums: UnifiedMemorySystem): string | undefined {
    const value = Reflect.get(ums as object, 'primaryAdapterId');
    return typeof value === 'string' ? value : undefined;
}

class MockAdapter implements MemorySubsystemAdapter {
    id: string;
    name: string;
    
    constructor(id: string) {
        this.id = id;
        this.name = `Mock ${id}`;
    }

    async init() {}
    isAvailable() { return true; }
    
    async store(entry: any) { return 'mock-id'; }
    async retrieve(id: string) { return null; }
    async delete(id: string) { return true; }
    
    async search(query: string): Promise<MemorySearchResult[]> {
        return [{
            entry: {
                id: `${this.id}-1`,
                content: `Result from ${this.id} for ${query}`,
                timestamp: Date.now(),
                tags: [this.id]
            },
            score: this.id === 'adapter1' ? 0.9 : 0.8,
            source: this.id
        }];
    }
}

describe('UnifiedMemorySystem', () => {
    test('registers adapters and sets primary', () => {
        const ums = new UnifiedMemorySystem();
        const a1 = new MockAdapter('a1');
        
        ums.registerAdapter(a1);
        expect(getPrimaryAdapterId(ums)).toBe('a1');
        
        const a2 = new MockAdapter('a2');
        ums.registerAdapter(a2, true);
        expect(getPrimaryAdapterId(ums)).toBe('a2');
    });

    test('scatter-gather search aggregates and sorts results', async () => {
        const ums = new UnifiedMemorySystem();
        ums.registerAdapter(new MockAdapter('adapter1')); // returns score 0.9
        ums.registerAdapter(new MockAdapter('adapter2')); // returns score 0.8

        const results = await ums.search('test');
        
        expect(results.length).toBe(2);
        expect(results[0].source).toBe('adapter1'); // Higher score first
        expect(results[1].source).toBe('adapter2');
    });

    test('store routes to primary adapter by default', async () => {
        const ums = new UnifiedMemorySystem();
        const a1 = new MockAdapter('a1');
        const spy = mock(() => Promise.resolve('id'));
        a1.store = spy;
        
        ums.registerAdapter(a1);
        await ums.store('content');
        
        expect(spy).toHaveBeenCalled();
    });
});
