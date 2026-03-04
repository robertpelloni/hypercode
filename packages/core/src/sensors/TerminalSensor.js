"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalSensor = void 0;
var TerminalSensor = /** @class */ (function () {
    function TerminalSensor(eventBus) {
        this.originalStderrWrite = null;
        this.eventBus = eventBus;
    }
    TerminalSensor.prototype.start = function () {
        var _this = this;
        console.log("[TerminalSensor] Hooking stderr...");
        // Hook stderr to capture errors
        this.originalStderrWrite = process.stderr.write.bind(process.stderr);
        /**
         * Reason: we need to observe terminal error output in real-time for event emission.
         * What: wraps stderr writes, emits `terminal:error` on heuristic matches, then forwards bytes unchanged.
         * Why: preserves normal stderr behavior while enabling lightweight telemetry without unsafe casts.
         */
        var patchedWrite = function (chunk, encoding, callback) {
            var str = chunk.toString();
            // Heuristic to detect ACTUAL errors vs warnings
            if (str.toLowerCase().includes('error') || str.toLowerCase().includes('exception') || str.includes('❌')) {
                _this.eventBus.emitEvent('terminal:error', 'TerminalSensor', { message: str });
            }
            // Pass through to original stderr
            if (!_this.originalStderrWrite) {
                return false;
            }
            return _this.originalStderrWrite(chunk, encoding, callback);
        };
        process.stderr.write = patchedWrite;
    };
    TerminalSensor.prototype.stop = function () {
        if (this.originalStderrWrite) {
            process.stderr.write = this.originalStderrWrite;
            this.originalStderrWrite = null;
        }
    };
    return TerminalSensor;
}());
exports.TerminalSensor = TerminalSensor;
