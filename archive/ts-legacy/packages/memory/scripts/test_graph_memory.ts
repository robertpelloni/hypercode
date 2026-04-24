import { GraphMemory } from '../src/GraphMemory';

async function main() {
    console.log("Testing GraphMemory with Cognee...");

    // Check if python bridge is set up (we assume it is)
    const graph = new GraphMemory();

    try {
<<<<<<< HEAD:archive/ts-legacy/packages/memory/scripts/test_graph_memory.ts
        console.log("Adding fact: 'HyperCode uses Cognee for memory.'");
        await graph.add("HyperCode uses Cognee for memory.", "test_dataset");
=======
        console.log("Adding fact: 'borg uses Cognee for memory.'");
        await graph.add("borg uses Cognee for memory.", "test_dataset");
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/memory/scripts/test_graph_memory.ts

        console.log("Adding fact: 'Cognee is a knowledge graph library.'");
        await graph.add("Cognee is a knowledge graph library.", "test_dataset");

        // Give it a moment (simulated async processing)

<<<<<<< HEAD:archive/ts-legacy/packages/memory/scripts/test_graph_memory.ts
        console.log("Searching for 'HyperCode'...");
        const results = await graph.search("HyperCode");
=======
        console.log("Searching for 'borg'...");
        const results = await graph.search("borg");
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/memory/scripts/test_graph_memory.ts
        console.log("Results:", results);

        if (results.length > 0) {
            console.log("SUCCESS: Graph memory returned results.");
        } else {
            console.log("WARNING: No results returned (Cognee might be mocking or empty).");
        }

    } catch (e) {
        console.error("FAILED:", e);
    }
}

main();
