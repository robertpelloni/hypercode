
import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'SUBMODULE_ADDITION_LOG.txt');
const INBOX_PATH = path.join(process.cwd(), 'docs', 'INBOX_LINKS.md');

function main() {
    if (!fs.existsSync(LOG_PATH) || !fs.existsSync(INBOX_PATH)) {
        console.error("❌ Log or Inbox file not found.");
        return;
    }

    const logContent = fs.readFileSync(LOG_PATH, 'utf-8');
    const inboxContent = fs.readFileSync(INBOX_PATH, 'utf-8');

    // Extract Success URLs
    const successLines = logContent.split('\n').filter(l => l.startsWith('SUCCESS:'));
    const successUrls = new Set<string>();

    successLines.forEach(line => {
        // Format: "SUCCESS: https://github.com/foo/bar -> external/..."
        const match = line.match(/SUCCESS: (https?:\/\/\S+)/);
        if (match) {
            successUrls.add(match[1].trim());
        }
    });

    console.log(`Found ${successUrls.size} successful URLs to mark.`);

    let newInbox = inboxContent;
    let count = 0;

    successUrls.forEach(url => {
        // Escape for regex if needed, but simple string replace is safer if exact match
        // We look for "- [ ] ... (url)" or "- [ ] url"
        // But markdown links can vary.
        // Let's iterate lines and check for inclusion.
    });

    const lines = newInbox.split('\n');
    const newLines = lines.map(line => {
        const trimmed = line.trim();
        // Skip if not a bullet
        if (!trimmed.startsWith('- ')) return line;

        // Skip if already checked
        if (trimmed.startsWith('- [x]')) return line;

        for (const url of successUrls) {
            if (line.includes(url)) {
                count++;
                // If it has a checkbox, check it
                if (trimmed.startsWith('- [ ]')) return line.replace('- [ ]', '- [x]');
                // If it's a raw bullet, add checked box
                // Replace first occurrence of "- " with "- [x] "
                return line.replace('- ', '- [x] ');
            }
        }
        return line;
    });

    fs.writeFileSync(INBOX_PATH, newLines.join('\n'));
    console.log(`✅ Marked ${count} items as completed in INBOX_LINKS.md`);
}

main();
