import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ResearchWorker {
    private isRunning = false;

    async enrichLink(url: string): Promise<{ title: string; description: string; content: string }> {
        // Fallback or lightweight simulated extraction for demonstration
        try {
            // In full production, this would call out to a headless browser or curl
            // and pipe through Linkedom or JSDOM to extract meta tags.
            const { stdout } = await execAsync(`curl -sL "${url}" | head -n 50`);

            const titleMatch = stdout.match(/<title>(.*?)<\/title>/i);
            const descMatch = stdout.match(/<meta name="description" content="(.*?)"/i);

            return {
                title: titleMatch ? titleMatch[1] : url,
                description: descMatch ? descMatch[1] : '',
                content: stdout.substring(0, 1000) // snippet
            };
        } catch (error) {
            console.error(`Failed to enrich link ${url}:`, error);
            return { title: url, description: '', content: '' };
        }
    }

    async processBacklog(urls: string[]) {
        if (this.isRunning) return;
        this.isRunning = true;

        for (const url of urls) {
            const enriched = await this.enrichLink(url);
            // Push to internal memory vector store or sqlite db here
            console.log(`Processed ${url}: ${enriched.title}`);
        }

        this.isRunning = false;
    }
}
