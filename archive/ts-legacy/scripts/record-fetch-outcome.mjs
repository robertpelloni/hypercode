import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_FILE = path.join(process.cwd(), 'scripts', 'ingestion-status.json');

async function main() {
    const args = process.argv.slice(2);
    let url = '';
    let status = '';
    let errorMsg = '';
    let source = 'record_fetch_outcome'; // default source

    // Parse args manually for zero dependencies
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--url') url = args[++i];
        else if (args[i] === '--status') status = args[++i];
        else if (args[i] === '--error') errorMsg = args[++i];
        else if (args[i] === '--source') source = args[++i];
    }

    if (!url || !['processed', 'pending', 'failed'].includes(status)) {
        console.error('Usage: node record-fetch-outcome.mjs --url <URL> --status <processed|pending|failed> [--error <msg>] [--source <source>]');
        process.exit(1);
    }

    try {
        const content = await fs.readFile(STATUS_FILE, 'utf-8');
        const data = JSON.parse(content);

        // Ensure structure exists
        if (!Array.isArray(data.processed)) data.processed = [];
        if (!Array.isArray(data.pending)) data.pending = [];
        if (!Array.isArray(data.failed)) data.failed = [];

        // Remove URL from all arrays to prevent duplicates
        data.processed = data.processed.filter(u => u !== url);
        data.pending = data.pending.filter(u => u !== url);

        // Failed is an array of objects
        let existingFailure = data.failed.find(f => f.url === url);
        data.failed = data.failed.filter(f => f.url !== url);

        // Add to specific target array
        if (status === 'processed') {
            data.processed.push(url);
        } else if (status === 'pending') {
            data.pending.push(url);
        } else if (status === 'failed') {
            data.failed.push({
                url,
                error: errorMsg || 'Unknown fetch failure',
                attempts: existingFailure ? (existingFailure.attempts || 0) + 1 : 1,
                last_attempt_at: new Date().toISOString(),
                source
            });
        }

        await fs.writeFile(STATUS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        console.log(`[record-fetch-outcome] Successfully recorded ${url} as ${status}`);

    } catch (err) {
        console.error(`[record-fetch-outcome] Fatal Error reading/writing ${STATUS_FILE}:`, err);
        process.exit(1);
    }
}

main();
