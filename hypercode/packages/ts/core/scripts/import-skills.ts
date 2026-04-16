
import { SkillImporter } from '../src/skills/adapters/SkillImporter';
import fs from 'fs/promises';
import path from 'path';

async function main() {
    console.log("Starting Skill Import...");
    const importer = new SkillImporter();
    const skills = await importer.scanAndImport();

    console.log(`Found ${skills.length} skills.`);

    const registryPath = path.join(process.cwd(), 'packages/core/src/data/mcp_registry.json');
    let registry: any = {};

    try {
        const content = await fs.readFile(registryPath, 'utf-8');
        registry = JSON.parse(content);
    } catch {
        console.log("Creating new registry.");
    }

    registry.skills = skills;

    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    console.log("Registry updated:", registryPath);
}

main().catch(console.error);
