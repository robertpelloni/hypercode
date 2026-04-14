import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Supervisor } from '../../agents/src/Supervisor';

// Mock dependencies
const mockGenerateText = vi.fn();
const mockSelectModel = vi.fn();

vi.mock('@hypercode/ai', () => ({
    LLMService: class {
        generateText = mockGenerateText;
    }
}));

const mockServer = {
    modelSelector: {
        selectModel: mockSelectModel
    }
};

describe('Phase 24: Supervisor Agent', () => {
    let supervisor: Supervisor;

    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-ignore
        supervisor = new Supervisor(mockServer);

        // Default mock responses
        mockSelectModel.mockResolvedValue({ provider: 'test', modelId: 'test-model' });
    });

    it('should decompose a goal into subtasks', async () => {
        const mockPlan = [
            { description: "Research libraries", assignedTo: "researcher" },
            { description: "Write implementation", assignedTo: "coder" }
        ];

        mockGenerateText.mockResolvedValueOnce({
            content: `\`\`\`json
            ${JSON.stringify(mockPlan)}
            \`\`\``
        });

        const subtasks = await supervisor.decompose("Build a feature");

        expect(subtasks).toHaveLength(2);
        expect(subtasks[0].description).toBe("Research libraries");
        expect(subtasks[0].assignedTo).toBe("researcher");
        expect(subtasks[0].status).toBe("pending");
        expect(subtasks[1].assignedTo).toBe("coder");
    });

    it('should handle malformed JSON gracefully', async () => {
        mockGenerateText.mockResolvedValueOnce({
            content: "I am a chatty model. Here is the JSON: [ { \"description\": \"Task 1\", \"assignedTo\": \"worker\" } ] "
        });

        const subtasks = await supervisor.decompose("Simple task");
        expect(subtasks).toHaveLength(1);
        expect(subtasks[0].description).toBe("Task 1");
    });

    it('should fall back to single task on failure', async () => {
        mockGenerateText.mockRejectedValueOnce(new Error("LLM Failed"));

        const subtasks = await supervisor.decompose("Hard task");
        expect(subtasks).toHaveLength(1);
        expect(subtasks[0].description).toBe("Hard task");
        expect(subtasks[0].status).toBe("pending");
    });

    it('should supervise execution of tasks', async () => {
        const mockPlan = [
            { description: "Step 1", assignedTo: "worker" },
            { description: "Step 2", assignedTo: "coder" }
        ];

        mockGenerateText.mockResolvedValue({
            content: JSON.stringify(mockPlan)
        });

        const result = await supervisor.supervise("Do it");

        expect(result).toContain("Supervisor Execution Complete");
        expect(result).toContain("Task [Step 1] Completed");
        expect(result).toContain("Task [Step 2] Completed");
    });
});
