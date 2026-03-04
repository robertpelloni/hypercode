"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSensor = void 0;
var chokidar_1 = require("chokidar");
var path_1 = require("path");
var FileSensor = /** @class */ (function () {
    function FileSensor(eventBus, rootDir, watchPaths) {
        this.watcher = null;
        this.watchPaths = [];
        this.eventBus = eventBus;
        this.rootDir = rootDir;
        if (watchPaths) {
            this.watchPaths = watchPaths.map(function (p) { return p.split(path_1.default.sep).join('/'); });
        }
        else {
            // Default: Watch src directories for code changes
            this.watchPaths = [
                path_1.default.join(this.rootDir, 'packages', '*', 'src', '**', '*.ts').split(path_1.default.sep).join('/'),
                path_1.default.join(this.rootDir, 'apps', '*', 'src', '**', '*.tsx').split(path_1.default.sep).join('/')
            ];
        }
    }
    FileSensor.prototype.start = function () {
        var _this = this;
        if (this.watcher)
            return;
        console.log("[FileSensor] Starting file system monitoring...");
        console.log("[FileSensor] Watching:", this.watchPaths);
        this.watcher = chokidar_1.default.watch(this.watchPaths, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true, // Don't emit for existing files
            usePolling: process.platform === 'win32', // Force polling on Windows for reliability
            awaitWriteFinish: {
                stabilityThreshold: 500, // Reduced for responsiveness
                pollInterval: 100
            }
        });
        this.watcher
            .on('add', function (path) { console.log('FileSensor: add', path); _this.emit('file:create', path); })
            .on('change', function (path) { console.log('FileSensor: change', path); _this.emit('file:change', path); })
            .on('unlink', function (path) { console.log('FileSensor: unlink', path); _this.emit('file:delete', path); })
            .on('error', function (error) { return console.error("[FileSensor] Watcher error: ".concat(error)); });
    };
    FileSensor.prototype.stop = function () {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    };
    FileSensor.prototype.emit = function (type, filePath) {
        // Compute relative path for cleaner logs
        var relativePath = path_1.default.relative(this.rootDir, filePath);
        this.eventBus.emitEvent(type, 'FileSensor', { path: relativePath, absolutePath: filePath });
    };
    return FileSensor;
}());
exports.FileSensor = FileSensor;
