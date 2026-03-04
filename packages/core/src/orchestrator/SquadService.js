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
exports.SquadService = void 0;
var path_1 = require("path");
var agents_1 = require("@borg/agents");
/**
 * Proxy that intercepts tool calls and injects CWD/Path context
 * to strictly bind an Agent to a Git Worktree.
 */
var WorktreeServerProxy = /** @class */ (function () {
    function WorktreeServerProxy(server, worktreeRoot) {
        this.server = server;
        this.worktreeRoot = worktreeRoot;
    }
    /**
     * Reason: IMCPServer does not guarantee a `council` property, but some runtime servers expose it.
     * What: Reflection-safe accessor that returns council when available.
     * Why: Preserves compatibility with richer server runtimes without broad casts.
     */
    WorktreeServerProxy.prototype.getCouncilRuntime = function () {
        if (!this.server || typeof this.server !== 'object') {
            return undefined;
        }
        return Reflect.get(this.server, 'council');
    };
    Object.defineProperty(WorktreeServerProxy.prototype, "modelSelector", {
        // Passthrough properties
        get: function () { return this.server.modelSelector; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WorktreeServerProxy.prototype, "permissionManager", {
        get: function () { return this.server.permissionManager; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WorktreeServerProxy.prototype, "directorConfig", {
        get: function () { return this.server.directorConfig; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WorktreeServerProxy.prototype, "council", {
        get: function () { return this.getCouncilRuntime(); },
        enumerable: false,
        configurable: true
    });
    WorktreeServerProxy.prototype.executeTool = function (name, args) {
        return __awaiter(this, void 0, void 0, function () {
            var pathTools, newArgs, cwdTools;
            return __generator(this, function (_a) {
                pathTools = ['read_file', 'write_file', 'list_files', 'delete_file', 'replace_in_file', 'create_directory', 'move_file', 'copy_file', 'git_worktree_add', 'git_worktree_remove'];
                newArgs = __assign({}, args);
                // 1. Resolve 'path' argument against worktreeRoot
                if (args && args.path && typeof args.path === 'string') {
                    // If relative, resolve. If absolute, ensure it starts with worktreeRoot (Security?)
                    // For now, assume cooperative agent (relative paths preferred)
                    if (!path_1.default.isAbsolute(args.path)) {
                        newArgs.path = path_1.default.join(this.worktreeRoot, args.path);
                        console.log("[WorktreeProxy] Resolved path: ".concat(args.path, " -> ").concat(newArgs.path));
                    }
                }
                cwdTools = ['execute_command', 'git_worktree_list', 'git_worktree_add', 'git_worktree_remove', 'start_autotest', 'list_files'];
                if (cwdTools.includes(name)) {
                    newArgs.cwd = this.worktreeRoot;
                    console.log("[WorktreeProxy] Injected CWD: ".concat(newArgs.cwd));
                }
                return [2 /*return*/, this.server.executeTool(name, newArgs)];
            });
        });
    };
    return WorktreeServerProxy;
}());
var SquadService = /** @class */ (function () {
    function SquadService(server) {
        this.server = server;
        this.members = new Map();
        // --- Job Management (Indexer, etc) ---
        this.indexerJob = null;
        this.worktreesDir = path_1.default.join(process.cwd(), '.borg', 'worktrees');
    }
    /**
     * Spawn a new Agent Squad Member in an isolated Git Worktree
     */
    SquadService.prototype.spawnMember = function (branchName, goal) {
        return __awaiter(this, void 0, void 0, function () {
            var worktreePath, e_1, proxy, director, member;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[SquadService] Spawning member for branch '".concat(branchName, "'..."));
                        worktreePath = path_1.default.join(this.worktreesDir, branchName);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.server.executeTool('git_worktree_add', {
                                path: worktreePath,
                                branch: branchName,
                                cwd: process.cwd() // Run from Main Repo Root
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.error("[SquadService] Worktree creation failed (might exist): ".concat(e_1.message));
                        return [3 /*break*/, 4];
                    case 4:
                        proxy = new WorktreeServerProxy(this.server, worktreePath);
                        director = new agents_1.Director(proxy);
                        member = {
                            id: "squad-".concat(branchName),
                            branch: branchName,
                            worktreePath: worktreePath,
                            director: director,
                            status: 'busy'
                        };
                        this.members.set(member.id, member);
                        // 5. Start Task (Async / Fire & Forget)
                        console.log("[SquadService] \uD83D\uDE80 Starting Director in ".concat(worktreePath));
                        // We don't await the whole task, we just kick it off
                        // But Director.executeTask is async.
                        // We'll wrap it to track status
                        director.executeTask(goal, 20).then(function (result) {
                            console.log("[SquadService] Member ".concat(member.id, " finished: ").concat(result));
                            member.status = 'finished';
                        }).catch(function (err) {
                            console.error("[SquadService] Member ".concat(member.id, " crashed: ").concat(err.message));
                            member.status = 'idle'; // Or error state
                        });
                        return [2 /*return*/, "Spawned Squad Member ".concat(member.id, " in ").concat(worktreePath)];
                }
            });
        });
    };
    SquadService.prototype.listMembers = function () {
        return Array.from(this.members.values()).map(function (m) { return ({
            id: m.id,
            branch: m.branch,
            status: m.status,
            active: m.director.getIsActive(),
            brain: m.director.getStatus() // Expose full brain state (Goal, Step, History)
        }); });
    };
    SquadService.prototype.killMember = function (branchName) {
        return __awaiter(this, void 0, void 0, function () {
            var id, member;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = "squad-".concat(branchName);
                        member = this.members.get(id);
                        if (!member) return [3 /*break*/, 2];
                        // Stop Director? Director doesn't have an abort controller yet for executeTask loop.
                        // But we can stop auto drive.
                        member.director.stopAutoDrive();
                        // Cleanup Worktree
                        return [4 /*yield*/, this.server.executeTool('git_worktree_remove', {
                                path: member.worktreePath,
                                force: true,
                                cwd: process.cwd()
                            })];
                    case 1:
                        // Cleanup Worktree
                        _a.sent();
                        this.members.delete(id);
                        return [2 /*return*/, "Killed member ".concat(id, " and removed worktree.")];
                    case 2: return [2 /*return*/, "Member ".concat(id, " not found.")];
                }
            });
        });
    };
    SquadService.prototype.messageMember = function (branchName, message) {
        return __awaiter(this, void 0, void 0, function () {
            var id, member;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = "squad-".concat(branchName);
                        member = this.members.get(id);
                        if (!member) return [3 /*break*/, 2];
                        return [4 /*yield*/, member.director.handleUserMessage(message)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [2 /*return*/, "Member ".concat(id, " not found.")];
                }
            });
        });
    };
    /**
     * Reason: indexer wiring depends on optional runtime server capabilities not present in the base interface.
     * What: Narrow server to memory-manager capable runtime via property existence check.
     * Why: Avoids broad casts while keeping lazy indexer boot behavior unchanged.
     */
    SquadService.prototype.getMemoryManagerRuntime = function () {
        if (!this.server || typeof this.server !== 'object') {
            return undefined;
        }
        if (!Reflect.has(this.server, 'memoryManager')) {
            return undefined;
        }
        return Reflect.get(this.server, 'memoryManager');
    };
    SquadService.prototype.toggleIndexer = function (enabled) {
        return __awaiter(this, void 0, void 0, function () {
            var IndexerJob, memoryManager;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!enabled) return [3 /*break*/, 3];
                        if (!!this.indexerJob) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../jobs/IndexerJob.js'); })];
                    case 1:
                        IndexerJob = (_a.sent()).IndexerJob;
                        memoryManager = this.getMemoryManagerRuntime();
                        if (memoryManager) {
                            this.indexerJob = new IndexerJob(memoryManager, process.cwd());
                        }
                        _a.label = 2;
                    case 2:
                        if (this.indexerJob) {
                            this.indexerJob.start();
                            return [2 /*return*/, true];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        if (this.indexerJob) {
                            this.indexerJob.stop();
                            return [2 /*return*/, false];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/, false];
                }
            });
        });
    };
    SquadService.prototype.getIndexerStatus = function () {
        if (!this.indexerJob)
            return { running: false, indexing: false };
        return this.indexerJob.getStatus();
    };
    return SquadService;
}());
exports.SquadService = SquadService;
