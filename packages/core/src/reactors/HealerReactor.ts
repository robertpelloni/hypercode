
import { EventBus, SystemEvent } from '../services/EventBus.js';
import { HealerService } from '../services/HealerService.js';

function shouldIgnoreExpectedStartupError(errorLog: string): boolean {
    const normalized = errorLog.toLowerCase();

    const ignoredFragments = [
        'openai api key not configured',
        'bad control character in string literal in json',
        'failed to load mcp.jsonc',
        'error fetching saved scripts',
        'error fetching mcp servers from config',
        'sqliteerror: no such table: config',
    ];

    return ignoredFragments.some((fragment) => normalized.includes(fragment));
}

function getErrorLog(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    const record = payload as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : '';
    const error = typeof record.error === 'string' ? record.error : '';
    return message || error;
}

export class HealerReactor {
    private eventBus: EventBus;
    private healerService: HealerService;
    private isHealing: boolean = false;
    private lastErrorTime: number = 0;
    private readonly COOLDOWN_MS = 10000; // 10s cooldown to prevent loops

    constructor(eventBus: EventBus, healerService: HealerService) {
        this.eventBus = eventBus;
        this.healerService = healerService;
    }

    public start() {
        console.log("[HealerReactor] 🛡️ Immune System Active. Listening for pathogens...");
        this.eventBus.subscribe('terminal:error', this.handleError.bind(this));
    }

    private async handleError(event: SystemEvent) {
        const errorLog = getErrorLog(event.payload);

        if (shouldIgnoreExpectedStartupError(errorLog)) {
            console.log('[HealerReactor] ℹ️ Ignoring expected startup/configuration error.');
            return;
        }

        // Prevent reaction loops (e.g., if the healer itself causes an error)
        const now = Date.now();
        if (this.isHealing || (now - this.lastErrorTime < this.COOLDOWN_MS)) {
            console.log("[HealerReactor] ⏳ Healing in progress or cooldown. Skipping error.");
            return;
        }

        console.log(`[HealerReactor] 🩺 Detected Pathogen! Initiating immune response...`);
        this.isHealing = true;
        this.lastErrorTime = now;

        try {
            this.eventBus.emitEvent('task:update', 'HealerReactor', { message: 'Diagnosing error...' });

            // Trigger the Healer Service
            const report = await this.healerService.autoHeal(errorLog);

            if (report.success) {
                console.log(`[HealerReactor] ✅ Pathogen neutralized. Fix applied to ${report.file}`);
                this.eventBus.emitEvent('system:healed', 'HealerReactor', { file: report.file, fix: report.fix });
            } else {
                console.log(`[HealerReactor] ⚠️ Integration failed. Could not auto-heal.`);
            }

        } catch (error) {
            console.error("[HealerReactor] ❌ Immune System Failure:", error);
        } finally {
            this.isHealing = false;
        }
    }
}
