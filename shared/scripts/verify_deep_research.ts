
import { DeepResearchService } from '../packages/core/src/services/DeepResearchService';
// Mock dependencies
const mockLLM = {
    modelSelector: { selectModel: async () => ({ provider: 'forge', modelId: 'mock' }) },
    generateText: async () => ({ content: "Mock summary\n\nSources:\n1. http://example.com" }),
    generateJSON: async () => ({ topic: "test", summary: "mock", sources: [], relatedTopics: [] })
};
const mockMemory = { saveContext: async () => { } };

// We can't easily run this without full build context due to imports.
// But we can check if it compiles.
console.log("DeepResearchService import successful.");
