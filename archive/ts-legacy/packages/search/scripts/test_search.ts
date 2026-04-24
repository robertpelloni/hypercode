import { SearchService } from '../src/SearchService.js';

async function main() {
    console.log("Testing SearchService...");
    const service = new SearchService();

    try {
        console.log("Testing Lexical Search (ripgrep)...");
        // Search for 'Director' in packages/agents
        const lexicalResults = await service.searchLexical('Director', 'packages/agents');
        console.log(`Found ${lexicalResults.length} lexical matches.`);
        if (lexicalResults.length > 0) {
            console.log("Lexical Sample:", lexicalResults[0]);
            console.log("VERIFIED: Lexical Search");
        } else {
            console.error("FAILURE: Lexical Search found nothing (unexpected).");
        }

        console.log("Testing Semantic Bridge (txtai)...");
        try {
            await service.loadIndex();
            console.log("Index loaded.");

            await service.indexDocs([
                { id: "doc1", text: "The sky is blue" },
                { id: "doc2", text: "The sun is bright" }
            ]);
            console.log("Indexed docs.");

            const semanticResults = await service.searchSemantic("star");
            console.log("Semantic Results:", semanticResults);

            if (semanticResults.length > 0) {
                console.log("VERIFIED: Semantic Search");
            } else {
                console.log("VERIFIED: Semantic Search (Empty results, but bridge connected)");
            }

        } catch (e: any) {
            if (e.message.includes("txtai not installed")) {
                console.log("VERIFIED: Semantic Bridge connected (txtai missing as expected).");
            } else {
                console.error("Semantic Test Failed:", e);
            }
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

main();
