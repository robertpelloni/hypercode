
import { SquadService } from '../src/orchestrator/SquadService.js';
import { MCPServer } from '../src/MCPServer.js';

// Mock dependencies
const mockServer = {
    executeTool: async (name: string, args: any) => {
        console.log(`[MockServer] Tool: ${name}`, args);
        if (name === 'git_worktree_add') return "Worktree added";
        if (name === 'git_worktree_remove') return "Worktree removed";
        return "success";
    },
    // Mock minimal internal structure for Director
    modelSelector: { selectModel: async () => ({ provider: 'mock', modelId: 'mock' }) },
    permissionManager: { getAutonomyLevel: () => 'high' },
    directorConfig: {},
    council: { runConsensusSession: async () => ({ approved: true, summary: "Mock Approval" }) },
    agentMemoryService: { search: async () => [] }
} as unknown as MCPServer;

async function main() {
    console.log("Verifying Squad Autonomy...");

    const squad = new SquadService(mockServer);

    try {
        // 1. Spawn
        await squad.spawnMember('test-features/autonomy', 'Test Deep Research Integration');

        // 2. List & Verify Structure
        const members = squad.listMembers();
        console.log("Members:", JSON.stringify(members, null, 2));

        if (members.length !== 1) throw new Error("Spawn failed");
        const m = members[0];

        // Verify Brain Exposure
        if (!m.brain) throw new Error("Brain status not exposed in listMembers()");
        if (m.brain.status !== 'DRIVING') throw new Error("Director not driving (mocked start should have set it)");

        console.log("✅ Brain Exposure Verified");

        // 3. Kill
        await squad.killMember('test-features/autonomy');
        console.log("✅ Kill Verified");

    } catch (e) {
        console.error("❌ Verification Failed:", e);
        process.exit(1);
    }
}

main().catch(console.error);
