
import fs from 'fs';
import path from 'path';
import { LLMService } from '../../ai/src/LLMService.js';
import { SkillRegistry } from '../src/skills/SkillRegistry.js';
import { ReaderTools } from '../../tools/src/ReaderTools.js';

// Configuration
const INBOX_PATH = path.resolve(process.cwd(), 'docs/INBOX_LINKS.md');
const LOGS_PATH = path.resolve(process.cwd(), 'docs/RESEARCH_LOGS.md');
const SKILLS_DIR = path.resolve(process.cwd(), 'packages/core/src/skills');

async function main() {
    console.log("🤖 Inbox Researcher Initiated...");

    // 1. Initialize Services
    const llm = new LLMService();
    // Verify tools are accessible (we will call handler directly)
    const readerTool = ReaderTools.find(t => t.name === 'read_page');
    if (!readerTool) throw new Error("Reader tool not found");

    // 2. Load Skill
    const registry = new SkillRegistry([SKILLS_DIR]);
    await registry.loadSkills();
    const skillName = 'Web Research'; // Assuming this matches the name in SKILL.md
    // We access the internal map directly for this script or use readSkill
    const skillRes = await registry.readSkill('Web Research');
    const skillPrompt = skillRes.content[0].text;

    if (skillPrompt.includes("not found")) {
        // Fallback just in case name mismatch
        console.error("Skill 'Web Research' not found via Registry. Proceeding with default prompt.");
    } else {
        console.log("✅ Loaded 'Web Research' Skill.");
    }

    // 3. Parse Inbox
    const inboxContent = fs.readFileSync(INBOX_PATH, 'utf-8');
    const lines = inboxContent.split('\n');
    const uncheckedLinkRegex = /^- \[ \] (https?:\/\/[^\s]+)(.*)$/;

    const tasks: { lineIndex: number, url: string, note: string }[] = [];

    lines.forEach((line, idx) => {
        const match = line.match(uncheckedLinkRegex);
        if (match) {
            tasks.push({
                lineIndex: idx,
                url: match[1],
                note: match[2]
            });
        }
    });

    console.log(`Found ${tasks.length} unchecked links to process.`);

    // 4. Process Loop
    for (const task of tasks) {
        console.log(`\n🔍 Processing: ${task.url}`);

        try {
            // A. Fetch Content
            console.log("   Fetching content...");
            const readResult = await readerTool.handler({ url: task.url });
            const content = readResult.content[0].text;

            if (content.startsWith("Error")) {
                console.warn(`   ⚠️ Failed to read ${task.url}: ${content}`);
                continue;
            }

            // B. Generate Summary (Agentic Simulation)
            console.log("   Analyzing with LLM...");
            const systemPrompt = `
${skillPrompt}

Task: Analyze the content provided below.
Output Format:
# [Title]
**URL**: [URL]
**Summary**: Detailed summary of what this tool/article is.
**Key Features**: Bullet list of features or insights.
**HyperCode Relevance**: How this might be useful for the HyperCode project (Coding, AI, Agents).
`;
            const userPrompt = `Content from ${task.url}:\n\n${content.substring(0, 50000)}`; // Token limit safety

            // Use a cheaper/faster model for batch processing if possible, or standard
            const response = await llm.generateText('anthropic', 'claude-3-5-sonnet-20241022', systemPrompt, userPrompt);

            // C. Log Findings
            const logEntry = `\n---\nDate: ${new Date().toISOString()}\n${response.content}\n`;
            fs.appendFileSync(LOGS_PATH, logEntry);
            console.log("   ✅ Logged findings.");

            // D. Update Inbox (Tick the box)
            // Re-read file to avoid race conditions (simple implementation)
            const currentInbox = fs.readFileSync(INBOX_PATH, 'utf-8').split('\n');
            currentInbox[task.lineIndex] = `- [x] ${task.url} ${task.note} (Auto-Researched)`;
            fs.writeFileSync(INBOX_PATH, currentInbox.join('\n'));
            console.log("   ✅ Marked as done.");

        } catch (e: any) {
            console.error(`   ❌ Error processing ${task.url}:`, e.message);
        }
    }

    console.log("\n✅ Batch Processing Complete.");
}

main().catch(console.error);
