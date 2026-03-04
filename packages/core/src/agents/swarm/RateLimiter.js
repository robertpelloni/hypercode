"use strict";
/**
 * RateLimiter.ts
 *
 * A token bucket rate limiter to prevent the swarm from flooding AI providers
 * and triggering HTTP 429 (Too Many Requests) errors.
 * Tracks both Requests Per Minute (RPM) and Tokens Per Minute (TPM).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
var RateLimiter = /** @class */ (function () {
    function RateLimiter(rpmLimit, tpmLimit) {
        if (rpmLimit === void 0) { rpmLimit = 50; }
        if (tpmLimit === void 0) { tpmLimit = 40000; }
        this.isBackingOff = false;
        this.backoffUntil = 0;
        this.rpmLimit = rpmLimit;
        this.tpmLimit = tpmLimit;
        this.requestsAvailable = rpmLimit;
        this.tokensAvailable = tpmLimit;
        this.lastRefill = Date.now();
    }
    RateLimiter.prototype.refill = function () {
        var now = Date.now();
        var elapsedMinutes = (now - this.lastRefill) / 60000;
        if (elapsedMinutes > 0) {
            this.requestsAvailable = Math.min(this.rpmLimit, this.requestsAvailable + (this.rpmLimit * elapsedMinutes));
            this.tokensAvailable = Math.min(this.tpmLimit, this.tokensAvailable + (this.tpmLimit * elapsedMinutes));
            this.lastRefill = now;
        }
    };
    /**
     * Attempts to consume capacity. Returns true if successful, false if throttled.
     */
    RateLimiter.prototype.tryAcquire = function (estimatedTokens) {
        if (estimatedTokens === void 0) { estimatedTokens = 1000; }
        if (this.isBackingOff && Date.now() < this.backoffUntil) {
            return false;
        }
        else if (this.isBackingOff) {
            this.isBackingOff = false; // Backoff period ended
        }
        this.refill();
        if (this.requestsAvailable >= 1 && this.tokensAvailable >= estimatedTokens) {
            this.requestsAvailable -= 1;
            this.tokensAvailable -= estimatedTokens;
            return true;
        }
        return false;
    };
    /**
     * Called when a 429 error is detected. Triggers an exponential/fixed backoff.
     */
    RateLimiter.prototype.triggerBackoff = function (seconds) {
        if (seconds === void 0) { seconds = 30; }
        this.isBackingOff = true;
        this.backoffUntil = Date.now() + (seconds * 1000);
        // Severely drain current buckets to prevent immediate burst after backoff
        this.requestsAvailable = Math.max(0, this.requestsAvailable / 2);
        this.tokensAvailable = Math.max(0, this.tokensAvailable / 2);
    };
    RateLimiter.prototype.isThrottled = function () {
        this.refill();
        if (this.isBackingOff && Date.now() < this.backoffUntil)
            return true;
        return this.requestsAvailable < 1 || this.tokensAvailable < 100; // Arbitrary low threshold
    };
    RateLimiter.prototype.getBackoffRemainingMs = function () {
        if (!this.isBackingOff)
            return 0;
        return Math.max(0, this.backoffUntil - Date.now());
    };
    return RateLimiter;
}());
exports.RateLimiter = RateLimiter;
