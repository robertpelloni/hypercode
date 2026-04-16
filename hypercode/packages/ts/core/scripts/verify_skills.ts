
import { SkillRegistry } from '../src/skills/SkillRegistry.js';
import path from 'path';

async function main() {
    const skillsDir = path.resolve(process.cwd(), 'packages/core/src/skills');
    console.log(`Searching for skills in: ${skillsDir}`);

    const registry = new SkillRegistry([skillsDir]);
    await registry.loadSkills();

    const result = await registry.listSkills();
    console.log("Found Skills:", result.content[0].text);
}

main().catch(console.error);
