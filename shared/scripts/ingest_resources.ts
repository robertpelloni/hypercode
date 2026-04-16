
import fs from 'fs/promises';
import path from 'path';

interface ResourceCategory {
    name: string;
    urls: string[];
}

interface ResourceRegistry {
    lastUpdated: string;
    categories: ResourceCategory[];
}

async function main() {
    const rawPath = path.join(process.cwd(), 'knowledge', 'sources', 'raw_urls.txt');
    const outPath = path.join(process.cwd(), 'knowledge', 'resources.json');

    console.log(`Reading from ${rawPath}...`);
    try {
        const content = await fs.readFile(rawPath, 'utf-8');
        const lines = content.split('\n');

        const categories: ResourceCategory[] = [];
        let currentCategory: ResourceCategory | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('https://')) {
                if (currentCategory) {
                    currentCategory.urls.push(trimmed);
                } else {
                    // Orphaned URL, maybe default category
                    if (categories.length === 0 || categories[categories.length - 1].name !== 'Uncategorized') {
                        currentCategory = { name: 'Uncategorized', urls: [] };
                        categories.push(currentCategory);
                    }
                    currentCategory!.urls.push(trimmed);
                }
            } else {
                // Assume it's a category header
                currentCategory = { name: trimmed, urls: [] };
                categories.push(currentCategory);
            }
        }

        const registry: ResourceRegistry = {
            lastUpdated: new Date().toISOString(),
            categories
        };

        await fs.writeFile(outPath, JSON.stringify(registry, null, 2));
        console.log(`Successfully ingested ${categories.length} categories to ${outPath}`);
        categories.forEach(c => console.log(`- ${c.name}: ${c.urls.length} resources`));

    } catch (e) {
        console.error("Failed to ingest resources:", e);
    }
}

main();
