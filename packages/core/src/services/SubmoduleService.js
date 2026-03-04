"use strict";
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
exports.SubmoduleService = void 0;
var child_process_1 = require("child_process");
var util_1 = require("util");
var fs_1 = require("fs");
var path_1 = require("path");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
var SubmoduleService = /** @class */ (function () {
    function SubmoduleService(rootDir, mcpAggregator) {
        if (rootDir === void 0) { rootDir = process.cwd(); }
        this.rootDir = rootDir;
        this.mcpAggregator = mcpAggregator;
    }
    SubmoduleService.prototype.listSubmodules = function () {
        return __awaiter(this, void 0, void 0, function () {
            var statusOutput, configOutput, urlOutput, submodules, lines, _i, lines_1, line, match, indicator, commit, path_2, branch, status_1, url, fullPath, _a, caps, startCommand, isInstalled, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, execAsync('git submodule status', { cwd: this.rootDir })];
                    case 1:
                        statusOutput = (_b.sent()).stdout;
                        return [4 /*yield*/, execAsync('git config --file .gitmodules --get-regexp path', { cwd: this.rootDir })];
                    case 2:
                        configOutput = (_b.sent()).stdout;
                        return [4 /*yield*/, execAsync('git config --file .gitmodules --get-regexp url', { cwd: this.rootDir })];
                    case 3:
                        urlOutput = (_b.sent()).stdout;
                        submodules = [];
                        lines = statusOutput.trim().split('\n');
                        for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                            line = lines_1[_i];
                            if (!line.trim())
                                continue;
                            match = line.match(/^([ +-])([0-9a-f]+)\s+(.+?)(?:\s+\((.+)\))?$/);
                            if (match) {
                                indicator = match[1], commit = match[2], path_2 = match[3], branch = match[4];
                                status_1 = 'clean';
                                if (indicator === '+')
                                    status_1 = 'out-of-sync';
                                if (indicator === '-')
                                    status_1 = 'missing';
                                url = this.extractUrl(path_2, urlOutput);
                                fullPath = require('path').join(this.rootDir, path_2);
                                _a = this.detectCapabilities(path_2), caps = _a.caps, startCommand = _a.startCommand;
                                isInstalled = fs_1.default.existsSync(require('path').join(fullPath, 'node_modules')) || fs_1.default.existsSync(require('path').join(fullPath, '.venv'));
                                submodules.push({
                                    name: path_2.split('/').pop() || path_2,
                                    path: path_2,
                                    commit: commit,
                                    branch: branch || 'HEAD',
                                    status: status_1,
                                    url: url,
                                    capabilities: caps,
                                    isInstalled: isInstalled,
                                    startCommand: startCommand
                                });
                            }
                        }
                        return [2 /*return*/, submodules];
                    case 4:
                        error_1 = _b.sent();
                        console.error("Failed to list submodules:", error_1);
                        // If not a git repo or no submodules, return empty
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SubmoduleService.prototype.extractUrl = function (submodulePath, configOutput) {
        // configOutput lines look like: submodule.packages/foo.url https://...
        var lines = configOutput.split('\n');
        // This is a naive match, robust implementation would match the submodule section name
        for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
            var line = lines_2[_i];
            if (line.includes(submodulePath)) { // simplified
                var parts = line.split(' ');
                if (parts.length > 1)
                    return parts[1];
            }
        }
        return undefined;
    };
    SubmoduleService.prototype.updateAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, stdout, stderr, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, execAsync('git submodule update --init --recursive --remote', { cwd: this.rootDir })];
                    case 1:
                        _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                        return [2 /*return*/, { success: true, output: stdout + stderr }];
                    case 2:
                        error_2 = _b.sent();
                        return [2 /*return*/, { success: false, output: String(error_2) }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SubmoduleService.prototype.installDependencies = function (submodulePath) {
        return __awaiter(this, void 0, void 0, function () {
            var fullPath, _a, stdout, stderr, _b, stdout, stderr, error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        fullPath = path_1.default.join(this.rootDir, submodulePath);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, , 7]);
                        if (!fs_1.default.existsSync(path_1.default.join(fullPath, 'package.json'))) return [3 /*break*/, 3];
                        return [4 /*yield*/, execAsync('npm install', { cwd: fullPath })];
                    case 2:
                        _a = _c.sent(), stdout = _a.stdout, stderr = _a.stderr;
                        return [2 /*return*/, { success: true, output: stdout + stderr }];
                    case 3:
                        if (!fs_1.default.existsSync(path_1.default.join(fullPath, 'requirements.txt'))) return [3 /*break*/, 5];
                        return [4 /*yield*/, execAsync('pip install -r requirements.txt', { cwd: fullPath })];
                    case 4:
                        _b = _c.sent(), stdout = _b.stdout, stderr = _b.stderr;
                        return [2 /*return*/, { success: true, output: stdout + stderr }];
                    case 5: return [2 /*return*/, { success: false, output: "No known package manager found (package.json or requirements.txt)" }];
                    case 6:
                        error_3 = _c.sent();
                        return [2 /*return*/, { success: false, output: String(error_3) }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    SubmoduleService.prototype.buildSubmodule = function (submodulePath) {
        return __awaiter(this, void 0, void 0, function () {
            var fullPath, pkg, _a, stdout, stderr, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        fullPath = path_1.default.join(this.rootDir, submodulePath);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        if (!fs_1.default.existsSync(path_1.default.join(fullPath, 'package.json'))) return [3 /*break*/, 4];
                        pkg = JSON.parse(fs_1.default.readFileSync(path_1.default.join(fullPath, 'package.json'), 'utf-8'));
                        if (!(pkg.scripts && pkg.scripts.build)) return [3 /*break*/, 3];
                        return [4 /*yield*/, execAsync('npm run build', { cwd: fullPath })];
                    case 2:
                        _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                        return [2 /*return*/, { success: true, output: stdout + stderr }];
                    case 3: return [2 /*return*/, { success: true, output: "No build script found, assuming raw source is fine." }];
                    case 4: return [2 /*return*/, { success: false, output: "No package.json found." }];
                    case 5:
                        error_4 = _b.sent();
                        return [2 /*return*/, { success: false, output: String(error_4) }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SubmoduleService.prototype.enableSubmodule = function (submodulePath) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, stdout, stderr, error_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, execAsync("git submodule init ".concat(submodulePath), { cwd: this.rootDir })];
                    case 1:
                        _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                        return [2 /*return*/, { success: true, output: stdout + stderr }];
                    case 2:
                        error_5 = _b.sent();
                        return [2 /*return*/, { success: false, output: String(error_5) }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SubmoduleService.prototype.detectCapabilities = function (submodulePath) {
        var fullPath = path_1.default.join(this.rootDir, submodulePath);
        var caps = [];
        var startCommand;
        try {
            if (fs_1.default.existsSync(path_1.default.join(fullPath, 'package.json'))) {
                var pkg = JSON.parse(fs_1.default.readFileSync(path_1.default.join(fullPath, 'package.json'), 'utf-8'));
                // 1. Detect MCP
                if (pkg.keywords && pkg.keywords.includes('mcp-server')) {
                    caps.push('mcp-server');
                }
                if (pkg.dependencies && pkg.dependencies['@modelcontextprotocol/sdk']) {
                    caps.push('mcp-sdk');
                }
                // 2. Detect Start Command
                if (pkg.scripts && pkg.scripts.start) {
                    startCommand = 'npm start';
                }
                else if (pkg.bin) {
                    if (typeof pkg.bin === 'string') {
                        startCommand = "node ".concat(pkg.bin);
                    }
                    else if (typeof pkg.bin === 'object') {
                        var firstBin = Object.values(pkg.bin)[0];
                        if (firstBin)
                            startCommand = "node ".concat(firstBin);
                    }
                }
                else if (pkg.main) {
                    startCommand = "node ".concat(pkg.main);
                }
            }
            else if (fs_1.default.existsSync(path_1.default.join(fullPath, 'requirements.txt'))) {
                // Python detection
                caps.push('python');
                if (fs_1.default.existsSync(path_1.default.join(fullPath, 'main.py'))) {
                    startCommand = 'python main.py';
                }
                else if (fs_1.default.existsSync(path_1.default.join(fullPath, 'app.py'))) {
                    startCommand = 'python app.py';
                }
            }
        }
        catch (e) {
            // ignore
        }
        return { caps: caps, startCommand: startCommand };
    };
    return SubmoduleService;
}());
exports.SubmoduleService = SubmoduleService;
