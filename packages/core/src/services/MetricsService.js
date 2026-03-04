"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
var os_1 = require("os");
var MetricsService = /** @class */ (function () {
    function MetricsService() {
        this.events = [];
        this.MAX_EVENTS = 10000;
        this.monitorInterval = null;
    }
    MetricsService.prototype.startMonitoring = function (intervalMs) {
        var _this = this;
        if (intervalMs === void 0) { intervalMs = 5000; }
        if (this.monitorInterval)
            clearInterval(this.monitorInterval);
        console.log("[MetricsService] Starting system monitoring...");
        // const os = require('os'); // Replaced with import
        this.monitorInterval = setInterval(function () {
            var mem = process.memoryUsage();
            var totalMem = os_1.default.totalmem();
            var freeMem = os_1.default.freemem();
            _this.track('memory_heap', mem.heapUsed);
            _this.track('memory_rss', mem.rss);
            _this.track('system_load', os_1.default.loadavg()[0]); // 1 min load
            _this.track('system_free_mem', freeMem);
        }, intervalMs);
    };
    MetricsService.prototype.stopMonitoring = function () {
        if (this.monitorInterval)
            clearInterval(this.monitorInterval);
    };
    MetricsService.prototype.track = function (type, value, tags) {
        this.events.push({
            timestamp: Date.now(),
            type: type,
            value: value,
            tags: tags
        });
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS / 2); // Keep half
        }
    };
    MetricsService.prototype.trackDuration = function (name, ms, tags) {
        this.track('duration', ms, __assign({ name: name }, tags));
    };
    MetricsService.prototype.getStats = function (windowMs) {
        if (windowMs === void 0) { windowMs = 3600000; }
        var now = Date.now();
        var relevant = this.events.filter(function (e) { return e.timestamp > now - windowMs; });
        var counts = {};
        var sums = {};
        relevant.forEach(function (e) {
            var key = e.type;
            counts[key] = (counts[key] || 0) + 1;
            sums[key] = (sums[key] || 0) + e.value;
        });
        // Calculate averages
        var averages = {};
        Object.keys(sums).forEach(function (k) {
            averages[k] = sums[k] / counts[k];
        });
        return {
            windowMs: windowMs,
            totalEvents: relevant.length,
            counts: counts,
            averages: averages,
            // Return raw series for graphing (downsampled if needed)
            series: this.downsample(relevant, 60) // 60 data points
        };
    };
    MetricsService.prototype.downsample = function (events, buckets) {
        // Simple bucketing
        if (events.length === 0)
            return [];
        var start = events[0].timestamp;
        var end = Date.now();
        var interval = (end - start) / buckets;
        var res = [];
        var _loop_1 = function (i) {
            var bucketStart = start + (i * interval);
            var bucketEnd = bucketStart + interval;
            var inBucket = events.filter(function (e) { return e.timestamp >= bucketStart && e.timestamp < bucketEnd; });
            res.push({
                time: bucketStart,
                count: inBucket.length,
                value_avg: inBucket.reduce(function (acc, curr) { return acc + curr.value; }, 0) / (inBucket.length || 1)
            });
        };
        for (var i = 0; i < buckets; i++) {
            _loop_1(i);
        }
        return res;
    };
    return MetricsService;
}());
exports.MetricsService = MetricsService;
