
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const INBOX_PATH = path.join(process.cwd(), 'docs', 'INBOX_LINKS.md');
const REPORT_PATH = path.join(process.cwd(), 'docs', 'TRIAGE_REPORT.md');

interface LinkItem {
    line: number;
    url: string;
    checked: boolean;
    domain: string;
    section: string;
    context: string;
    alive?: boolean;
    title?: string;
    repoStats?: string;
}

async function checkUrl(url: string): Promise<{ alive: boolean, title?: string }> {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(id);

        let title = '';
        if (res.ok) {
            const text = await res.text();
            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) title = titleMatch[1].trim();
        }

        return { alive: res.ok, title };
    } catch (e) {
        return { alive: false };
    }
}

async function main() {
    console.log("📂 Reading INBOX_LINKS.md...");
    if (!fs.existsSync(INBOX_PATH)) {
        console.error("❌ File not found:", INBOX_PATH);
        return;
    }

    const content = fs.readFileSync(INBOX_PATH, 'utf-8');
    const lines = content.split('\n');

    const links: LinkItem[] = [];
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    let currentSection = "Uncategorized";

    lines.forEach((line, index) => {
        if (line.startsWith('#')) {
            currentSection = line.replace(/#+\s*/, '').trim();
        }

        const match = line.match(urlRegex);
        if (match) {
            let url = match[0];
            // cleanup markdown parens if any
            if (url.endsWith(')')) url = url.slice(0, -1);

            const checked = line.trim().startsWith('- [x]');

            // Extract extra context from the line (e.g. user comments)
            const context = line.replace(url, '').replace('- [ ]', '').replace('- [x]', '').trim();

            try {
                const domain = new URL(url).hostname;
                links.push({ line: index + 1, url, checked, domain, section: currentSection, context });
            } catch (e) { }
        }
    });

    console.log(`🔍 Found ${links.length} total links. Checking live status for unchecked items...`);
    const unchecked = links.filter(l => !l.checked);

    // Check availability in parallel batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < unchecked.length; i += BATCH_SIZE) {
        const batch = unchecked.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (l) => {
            process.stdout.write('.');
            const status = await checkUrl(l.url);
            l.alive = status.alive;
            l.title = status.title;
        }));
    }
    console.log("\n✅ Status checks complete.");

    // Generate Report
    let report = "# Inbox Triage Report\n\n";
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `| Total | Unchecked | Dead/Private |\n`;
    report += `|---|---|---|\n`;
    report += `| ${links.length} | ${unchecked.length} | ${unchecked.filter(l => l.alive === false).length} |\n\n`;

    report += "## Actionable Items (Unchecked & Alive)\n";

    // Group by Section
    const bySection: Record<string, LinkItem[]> = {};
    unchecked.filter(l => l.alive !== false).forEach(l => {
        if (!bySection[l.section]) bySection[l.section] = [];
        bySection[l.section].push(l);
    });

    for (const [section, items] of Object.entries(bySection)) {
        report += `### ${section}\n`;
        items.forEach(l => {
            const title = l.title ? `_(${l.title})_` : '';
            if (l.domain === 'github.com') {
                // Format as git submodule candidate
                const parts = l.url.split('github.com/')[1]?.split('/');
                if (parts && parts.length >= 2) {
                    report += `- [ ] **Submodule**: [${parts[0]}/${parts[1]}](${l.url}) ${title} ${l.context}\n`;
                } else {
                    report += `- [ ] [GitHub](${l.url}) ${title} ${l.context}\n`;
                }
            } else {
                report += `- [ ] [Web](${l.url}) ${title} ${l.context}\n`;
            }
        });
        report += '\n';
    }

    report += "## Dead or Inaccessible Links\n";
    unchecked.filter(l => l.alive === false).forEach(l => {
        report += `- [ ] ❌ ${l.url} (Failed to fetch)\n`;
    });

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`✅ Report saved to ${REPORT_PATH}`);
}

main().catch(console.error);
