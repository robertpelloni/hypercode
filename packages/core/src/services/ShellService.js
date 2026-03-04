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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellService = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var os_1 = require("os");
var ShellService = /** @class */ (function () {
    function ShellService() {
        this.historyCache = [];
        // Platform specific history file
        this.historyPath = process.platform === 'win32'
            ? path_1.default.join(os_1.default.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt')
            : path_1.default.join(os_1.default.homedir(), '.bash_history'); // Simple fallback
        this.enrichedHistoryPath = path_1.default.join(process.cwd(), '.borg', 'shell_history.json');
        this.loadEnrichedHistory();
    }
    ShellService.prototype.loadEnrichedHistory = function () {
        try {
            if (fs_1.default.existsSync(this.enrichedHistoryPath)) {
                var data = fs_1.default.readFileSync(this.enrichedHistoryPath, 'utf-8');
                this.historyCache = JSON.parse(data);
            }
        }
        catch (e) {
            console.error('[ShellService] Failed to load enriched history', e);
            this.historyCache = [];
        }
    };
    ShellService.prototype.saveEnrichedHistory = function () {
        try {
            var dir = path_1.default.dirname(this.enrichedHistoryPath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            // Limit cache size
            if (this.historyCache.length > 1000) {
                this.historyCache = this.historyCache.slice(-1000);
            }
            fs_1.default.writeFileSync(this.enrichedHistoryPath, JSON.stringify(this.historyCache, null, 2));
        }
        catch (e) {
            console.error('[ShellService] Failed to save history', e);
        }
    };
    /**
     * Log a command execution
     */
    ShellService.prototype.logCommand = function (entry) {
        return __awaiter(this, void 0, void 0, function () {
            var id, fullEntry;
            return __generator(this, function (_a) {
                id = Math.random().toString(36).substring(2, 11);
                fullEntry = __assign(__assign({}, entry), { id: id, timestamp: Date.now() });
                this.historyCache.push(fullEntry);
                this.saveEnrichedHistory();
                return [2 /*return*/, id];
            });
        });
    };
    /**
     * Search history with semantic-ish filter
     */
    ShellService.prototype.queryHistory = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, limit) {
            var lowerQuery;
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                lowerQuery = query.toLowerCase();
                return [2 /*return*/, this.historyCache
                        .filter(function (entry) {
                        var _a;
                        return entry.command.toLowerCase().includes(lowerQuery) ||
                            ((_a = entry.outputSnippet) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(lowerQuery));
                    })
                        .sort(function (a, b) { return b.timestamp - a.timestamp; }) // Newest first
                        .slice(0, limit)];
            });
        });
    };
    /**
     * Reads the last N lines from the system history file.
     * Efficiently reads from the end of the file.
     */
    ShellService.prototype.getSystemHistory = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var stats, fileSize, content_1, allLines_1, readSize, buffer, fd, content, allLines;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                if (!fs_1.default.existsSync(this.historyPath)) {
                    return [2 /*return*/, []];
                }
                try {
                    stats = fs_1.default.statSync(this.historyPath);
                    fileSize = stats.size;
                    if (fileSize === 0)
                        return [2 /*return*/, []];
                    // Simple read if small
                    if (fileSize < 1024 * 1024) { // 1MB
                        content_1 = fs_1.default.readFileSync(this.historyPath, 'utf-8');
                        allLines_1 = content_1.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
                        return [2 /*return*/, allLines_1.slice(-limit)];
                    }
                    readSize = Math.min(50 * 1024, fileSize);
                    buffer = Buffer.alloc(readSize);
                    fd = fs_1.default.openSync(this.historyPath, 'r');
                    fs_1.default.readSync(fd, buffer, 0, readSize, fileSize - readSize);
                    fs_1.default.closeSync(fd);
                    content = buffer.toString('utf-8');
                    allLines = content.split(/\r?\n/).slice(1).filter(function (line) { return line.trim() !== ''; });
                    return [2 /*return*/, allLines.slice(-limit)];
                }
                catch (error) {
                    console.error('[ShellService] Error reading history:', error);
                    return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Executes a command on the host shell.
     */
    ShellService.prototype.execute = function (command_1) {
        return __awaiter(this, arguments, void 0, function (command, cwd) {
            var exec;
            var _this = this;
            if (cwd === void 0) { cwd = process.cwd(); }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
                    case 1:
                        exec = (_a.sent()).exec;
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                exec(command, { cwd: cwd }, function (error, stdout, stderr) {
                                    var output = stdout || stderr || "";
                                    // Log the execution
                                    _this.logCommand({
                                        command: command,
                                        cwd: cwd,
                                        outputSnippet: output.substring(0, 200),
                                        session: 'api-call',
                                        exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
                                        duration: 0
                                    }).catch(function () { });
                                    if (error) {
                                        reject(error);
                                    }
                                    else {
                                        resolve(output);
                                    }
                                });
                            })];
                }
            });
        });
    };
    return ShellService;
}());
exports.ShellService = ShellService;
