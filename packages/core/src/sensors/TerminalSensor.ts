
import { EventBus } from '../services/EventBus.js';

function shouldIgnoreInternalDiagnostic(message: string): boolean {
    const trimmed = message.trim();

    if (!trimmed) {
        return true;
    }

    const internalPrefixes = [
        '[HealerReactor]',
        '[TerminalSensor]',
        '[FileSensor]',
        '[EventBus]',
        '[Borg Core] Unhandled promise rejection:',
        '[Borg Core] Uncaught exception:',
    ];

    return internalPrefixes.some((prefix) => trimmed.startsWith(prefix));
}

export class TerminalSensor {
    private eventBus: EventBus;
    private originalStderrWrite: typeof process.stderr.write | null = null;
    private isInterceptingStderr = false;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public start() {
        console.log("[TerminalSensor] Hooking stderr...");

        // Hook stderr to capture errors
        this.originalStderrWrite = process.stderr.write.bind(process.stderr);

        /**
         * Reason: we need to observe terminal error output in real-time for event emission.
         * What: wraps stderr writes, emits `terminal:error` on heuristic matches, then forwards bytes unchanged.
         * Why: preserves normal stderr behavior while enabling lightweight telemetry without unsafe casts.
         */
        const patchedWrite: typeof process.stderr.write = (chunk, encoding?, callback?) => {
            if (this.isInterceptingStderr) {
                if (!this.originalStderrWrite) {
                    return false;
                }

                return this.originalStderrWrite(chunk, encoding as never, callback as never);
            }

            const str = chunk.toString();
            this.isInterceptingStderr = true;

            try {
                // Heuristic to detect ACTUAL errors vs warnings
                if (!shouldIgnoreInternalDiagnostic(str) && (str.toLowerCase().includes('error') || str.toLowerCase().includes('exception') || str.includes('❌'))) {
                    this.eventBus.emitEvent('terminal:error', 'TerminalSensor', { message: str });
                }

                // Pass through to original stderr
                if (!this.originalStderrWrite) {
                    return false;
                }

                return this.originalStderrWrite(chunk, encoding as never, callback as never);
            } finally {
                this.isInterceptingStderr = false;
            }
        };

        process.stderr.write = patchedWrite;
    }

    public stop() {
        if (this.originalStderrWrite) {
            process.stderr.write = this.originalStderrWrite;
            this.originalStderrWrite = null;
        }
    }
}
