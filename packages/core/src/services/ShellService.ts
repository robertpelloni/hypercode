
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ShellCommandEntry {
    id: string;
    command: string;
    cwd: string;
    timestamp: number;
    exitCode?: number;
    duration?: number;
    outputSnippet?: string;
    session: string;
}

export class ShellService {
    private historyPath: string;
    private enrichedHistoryPath: string;
    private historyCache: ShellCommandEntry[] = [];

    constructor() {
        // Platform specific history file
        this.historyPath = process.platform === 'win32'
            ? path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt')
            : path.join(os.homedir(), '.bash_history'); // Simple fallback

        this.enrichedHistoryPath = path.join(process.cwd(), '.borg', 'shell_history.json');
        this.loadEnrichedHistory();
    }

    private loadEnrichedHistory() {
        try {
            if (fs.existsSync(this.enrichedHistoryPath)) {
                const data = fs.readFileSync(this.enrichedHistoryPath, 'utf-8');
                this.historyCache = JSON.parse(data);
            }
        } catch (e) {
            console.error('[ShellService] Failed to load enriched history', e);
            this.historyCache = [];
        }
    }

    private saveEnrichedHistory() {
        try {
            const dir = path.dirname(this.enrichedHistoryPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // Limit cache size
            if (this.historyCache.length > 1000) {
                this.historyCache = this.historyCache.slice(-1000);
            }

            fs.writeFileSync(this.enrichedHistoryPath, JSON.stringify(this.historyCache, null, 2));
        } catch (e) {
            console.error('[ShellService] Failed to save history', e);
        }
    }

    /**
     * Log a command execution
     */
    async logCommand(entry: Omit<ShellCommandEntry, 'id' | 'timestamp'>): Promise<string> {
        const id = Math.random().toString(36).substring(2, 11);
        const fullEntry: ShellCommandEntry = {
            ...entry,
            id,
            timestamp: Date.now()
        };

        this.historyCache.push(fullEntry);
        this.saveEnrichedHistory();
        return id;
    }

    /**
     * Search history with semantic-ish filter
     */
    async queryHistory(query: string, limit: number = 20): Promise<ShellCommandEntry[]> {
        const lowerQuery = query.toLowerCase();
        return this.historyCache
            .filter(entry =>
                entry.command.toLowerCase().includes(lowerQuery) ||
                entry.outputSnippet?.toLowerCase().includes(lowerQuery)
            )
            .sort((a, b) => b.timestamp - a.timestamp) // Newest first
            .slice(0, limit);
    }

    /**
     * Reads the last N lines from the system history file.
     * Efficiently reads from the end of the file.
     */
    async getSystemHistory(limit: number = 50): Promise<string[]> {
        if (!fs.existsSync(this.historyPath)) {
            return [];
        }

        try {
            const stats = fs.statSync(this.historyPath);
            const fileSize = stats.size;
            if (fileSize === 0) return [];

            // Simple read if small
            if (fileSize < 1024 * 1024) { // 1MB
                const content = fs.readFileSync(this.historyPath, 'utf-8');
                const allLines = content.split(/\r?\n/).filter(line => line.trim() !== '');
                return allLines.slice(-limit);
            }

            // Fallback for large files
            const readSize = Math.min(50 * 1024, fileSize);
            const buffer = Buffer.alloc(readSize);
            const fd = fs.openSync(this.historyPath, 'r');
            fs.readSync(fd, buffer, 0, readSize, fileSize - readSize);
            fs.closeSync(fd);

            const content = buffer.toString('utf-8');
            const allLines = content.split(/\r?\n/).slice(1).filter(line => line.trim() !== '');
            return allLines.slice(-limit);

        } catch (error) {
            console.error('[ShellService] Error reading history:', error);
            return [];
        }
    }
}
