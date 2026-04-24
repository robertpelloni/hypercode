import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { linksBacklogRepository, type UpsertLinkBacklogInput } from '../../db/repositories/links-backlog.repo.js';
import { formatOptionalSqliteFailure, isSqliteUnavailableError } from '../../db/sqliteAvailability.js';
import { normalizeBookmarkUrl } from '../../services/bobby-bookmarks-adapter.js';

export class BobbyBookmarksSyncWorker {
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;
    private readonly dbPath: string;
    private readonly txtPath: string;
    private sqliteUnavailableLogged = false;

    constructor(workspaceRoot: string = process.cwd()) {
        this.dbPath = path.join(workspaceRoot, 'data', 'bobbybookmarks', 'resources.db');
        this.txtPath = path.join(workspaceRoot, 'data', 'bobbybookmarks', 'bookmarks.txt');
    }

    public start(intervalMs: number = 60 * 60 * 1000): void {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[HyperIngest] Starting BobbyBookmarks local DB and TXT sync worker...');
        
        // Run immediately
        void this.sync();

        this.interval = setInterval(() => {
            void this.sync();
        }, intervalMs);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('[HyperIngest] Stopped BobbyBookmarks local DB and TXT sync worker.');
    }

    private async sync(): Promise<void> {
        await this.syncFromDb();
        await this.syncFromTxt();
    }

    private async syncFromDb(): Promise<void> {
        try {
            const db = new Database(this.dbPath, { readonly: true });
            
            // We just need the basic details from the local DB
            const rows = db.prepare(`SELECT * FROM bookmarks`).all() as any[];
            db.close();

            console.log(`[HyperIngest] Found ${rows.length} raw URLs in local BobbyBookmarks DB. Syncing to HyperCode...`);

            let synced = 0;
            let errors = 0;
            for (const row of rows) {
                try {
                    const normalizedUrl = normalizeBookmarkUrl(row.url);
                    if (!normalizedUrl) continue;

                    const payload: UpsertLinkBacklogInput = {
                        url: row.url,
                        normalized_url: normalizedUrl,
                        title: row.short_description || row.url,
                        description: row.long_description,
                        tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
                        source: 'bobbybookmarks',
                        is_duplicate: false,
                        research_status: row.research_level === 'done' ? 'done' : 'pending',
                        bobbybookmarks_bookmark_id: row.id,
                        raw_payload: row as Record<string, unknown>,
                    };

                    await linksBacklogRepository.upsertLink(payload);
                    synced++;
                } catch (error) {
                    if (isSqliteUnavailableError(error)) {
                        if (!this.sqliteUnavailableLogged) {
                            console.warn(formatOptionalSqliteFailure(
                                '[HyperIngest] Links backlog sync is unavailable',
                                error,
                            ));
                            this.sqliteUnavailableLogged = true;
                        }
                        break;
                    }
                    errors++;
                }
            }

            console.log(`[HyperIngest] Successfully synced ${synced} bookmarks from DB to the Links Backlog (${errors} errors).`);
        } catch (error: any) {
            if (error.code === 'SQLITE_CANTOPEN') {
                console.warn(`[HyperIngest] BobbyBookmarks DB not found at ${this.dbPath}. Skipping DB sync.`);
            } else if (isSqliteUnavailableError(error)) {
                if (!this.sqliteUnavailableLogged) {
                    console.warn(formatOptionalSqliteFailure(
                        '[HyperIngest] BobbyBookmarks sync is unavailable',
                        error,
                    ));
                    this.sqliteUnavailableLogged = true;
                }
            } else {
                console.error('[HyperIngest] Error during DB sync:', error);
            }
        }
    }

    private async syncFromTxt(): Promise<void> {
        try {
            const content = await fs.readFile(this.txtPath, 'utf-8');
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));

            console.log(`[HyperIngest] Found ${lines.length} URLs in ${this.txtPath}. Syncing to HyperCode...`);

            let synced = 0;
            let errors = 0;
            for (const line of lines) {
                try {
                    // Extract URL (handle lines like "Title: http://...")
                    const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                    const url = urlMatch ? urlMatch[1] : line;

                    const normalizedUrl = normalizeBookmarkUrl(url);
                    if (!normalizedUrl) continue;

                    const payload: UpsertLinkBacklogInput = {
                        url: url,
                        normalized_url: normalizedUrl,
                        title: url,
                        source: 'bobbybookmarks_txt',
                        is_duplicate: false,
                        research_status: 'pending',
                        raw_payload: { raw_line: line },
                    };

                    await linksBacklogRepository.upsertLink(payload);
                    synced++;
                } catch (error) {
                    if (isSqliteUnavailableError(error)) break;
                    errors++;
                }
            }

            console.log(`[HyperIngest] Successfully synced ${synced} bookmarks from TXT to the Links Backlog (${errors} errors).`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // Ignore missing file
            } else {
                console.error('[HyperIngest] Error during TXT sync:', error);
            }
        }
    }
}

