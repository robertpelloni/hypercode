"use strict";
/**
 * Agent Memory Service - Tiered Memory System for Persistent Agent Context
 *
 * Implements multi-tier memory architecture inspired by Mem0 and Letta:
 * - Session Memory: Ephemeral context within a conversation
 * - Working Memory: Task-relevant facts extracted during execution
 * - Long-term Memory: Persistent learnings across sessions
 *
 * Features:
 * - Automatic memory extraction from conversations
 * - Relevance-based retrieval with temporal decay
 * - User/Agent/Project namespaces
 * - Memory consolidation (working -> long-term)
 */
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMemoryService = void 0;
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var MemoryManager_js_1 = require("./MemoryManager.js");
/**
 * Reason: Vector search metadata is flexible and can include unknown values.
 * What: Narrows metadata into safe, optional `type`/`namespace` values for memory reconstruction.
 * Why: Preserves behavior while removing broad untyped casts during search-result hydration.
 */
function parseMemoryMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return { normalized: {} };
    }
    var normalized = metadata;
    var typeValue = normalized.type;
    var namespaceValue = normalized.namespace;
    var createdAtValue = normalized.createdAt;
    var type = typeValue === 'session' || typeValue === 'working' || typeValue === 'long_term'
        ? typeValue
        : undefined;
    var namespace = namespaceValue === 'user' || namespaceValue === 'agent' || namespaceValue === 'project'
        ? namespaceValue
        : undefined;
    var createdAt = typeof createdAtValue === 'number' ? createdAtValue : undefined;
    return { normalized: normalized, type: type, namespace: namespace, createdAt: createdAt };
}
/**
 * Simple in-memory vector similarity using TF-IDF-like approach
 * Production would use proper embeddings
 */
// SimpleVectorSearch replaced by MemoryManager
/**
 * Agent Memory Service - Main service class
 */
var AgentMemoryService = /** @class */ (function () {
    function AgentMemoryService(options, memoryManager) {
        var _a, _b, _c, _d;
        this.memories = new Map();
        this.dirty = false;
        /**
         * Schedule auto-save
         */
        this.saveTimeout = null;
        this.options = {
            persistDir: options.persistDir,
            sessionTTL: (_a = options.sessionTTL) !== null && _a !== void 0 ? _a : 30 * 60 * 1000, // 30 minutes
            consolidationThreshold: (_b = options.consolidationThreshold) !== null && _b !== void 0 ? _b : 5,
            maxSessionMemories: (_c = options.maxSessionMemories) !== null && _c !== void 0 ? _c : 100,
            maxWorkingMemories: (_d = options.maxWorkingMemories) !== null && _d !== void 0 ? _d : 500,
        };
        if (memoryManager) {
            this.memoryManager = memoryManager;
        }
        else {
            // Initialize MemoryManager (parent of persistDir is workspaceRoot)
            var workspaceRoot = path.dirname(this.options.persistDir);
            this.memoryManager = new MemoryManager_js_1.MemoryManager(workspaceRoot);
        }
        this.loadFromDisk();
    }
    /**
     * Generate unique memory ID
     */
    AgentMemoryService.prototype.generateId = function () {
        return crypto.randomBytes(8).toString('hex');
    };
    /**
     * Load memories from disk
     */
    AgentMemoryService.prototype.loadFromDisk = function () {
        var filePath = path.join(this.options.persistDir, 'memories.json');
        if (!fs.existsSync(this.options.persistDir)) {
            fs.mkdirSync(this.options.persistDir, { recursive: true });
        }
        if (fs.existsSync(filePath)) {
            try {
                var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                for (var _i = 0, _a = data.memories || []; _i < _a.length; _i++) {
                    var mem = _a[_i];
                    mem.createdAt = new Date(mem.createdAt);
                    mem.accessedAt = new Date(mem.accessedAt);
                    if (mem.type === 'session' && mem.ttl) {
                        var age = Date.now() - mem.createdAt.getTime();
                        if (age > mem.ttl)
                            continue;
                    }
                    this.memories.set(mem.id, mem);
                    // No need to manually add to vectorIndex here, 
                    // MemoryManager handles persistence of long-term/working.
                }
                console.log("[AgentMemoryService] Loaded ".concat(this.memories.size, " session memories"));
            }
            catch (e) {
                console.error('[AgentMemoryService] Failed to load memories:', e);
            }
        }
    };
    /**
     * Save memories to disk
     */
    AgentMemoryService.prototype.saveToDisk = function () {
        if (!this.dirty)
            return;
        var filePath = path.join(this.options.persistDir, 'memories.json');
        var data = {
            version: 1,
            savedAt: new Date().toISOString(),
            memories: Array.from(this.memories.values()),
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        this.dirty = false;
    };
    /**
     * Add a memory
     */
    AgentMemoryService.prototype.add = function (content_1, type_1, namespace_1) {
        return __awaiter(this, arguments, void 0, function (content, type, namespace, metadata) {
            var memory;
            if (metadata === void 0) { metadata = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        memory = {
                            id: this.generateId(),
                            type: type,
                            namespace: namespace,
                            content: content,
                            metadata: metadata,
                            createdAt: new Date(),
                            accessedAt: new Date(),
                            accessCount: 0,
                            ttl: type === 'session' ? this.options.sessionTTL : undefined,
                        };
                        this.memories.set(memory.id, memory);
                        this.dirty = true;
                        if (!(type !== 'session')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.memoryManager.saveContext(content, __assign(__assign({}, metadata), { id: memory.id, type: type, namespace: namespace, createdAt: memory.createdAt.getTime() }))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.enforceMemoryLimits();
                        this.scheduleSave();
                        return [2 /*return*/, memory];
                }
            });
        });
    };
    /**
     * Get a memory by ID
     */
    AgentMemoryService.prototype.get = function (id) {
        var memory = this.memories.get(id);
        if (!memory)
            return null;
        // Check expiration
        if (memory.type === 'session' && memory.ttl) {
            var age = Date.now() - memory.createdAt.getTime();
            if (age > memory.ttl) {
                this.delete(id);
                return null;
            }
        }
        // Update access metadata
        memory.accessedAt = new Date();
        memory.accessCount++;
        this.dirty = true;
        // Check for consolidation
        this.checkConsolidation(memory);
        return memory;
    };
    /**
     * Delete a memory
     */
    AgentMemoryService.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var existed, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existed = this.memories.delete(id);
                        if (existed) {
                            this.dirty = true;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.memoryManager.deleteContext(id)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, existed];
                }
            });
        });
    };
    /**
     * Search memories using hybrid strategy (Local sessions + Vector DB)
     */
    AgentMemoryService.prototype.search = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, options) {
            var limit, vectorResults, mappedResults, sessionMemories, results, queryTerms, _i, results_1, res, sessionScore, _a, queryTerms_1, term, now, _b, results_2, memory, ageHours, decayFactor;
            var _c, _d, _e;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        limit = (_c = options.limit) !== null && _c !== void 0 ? _c : 10;
                        return [4 /*yield*/, this.memoryManager.search(query, limit * 2)];
                    case 1:
                        vectorResults = _f.sent();
                        mappedResults = vectorResults.map(function (r) {
                            var _a, _b, _c;
                            var parsed = parseMemoryMetadata(r.metadata);
                            return {
                                id: r.id,
                                content: r.content,
                                type: (_a = parsed.type) !== null && _a !== void 0 ? _a : 'long_term',
                                namespace: (_b = parsed.namespace) !== null && _b !== void 0 ? _b : 'project',
                                metadata: parsed.normalized,
                                createdAt: new Date((_c = parsed.createdAt) !== null && _c !== void 0 ? _c : Date.now()),
                                accessedAt: new Date(),
                                accessCount: 0, // We could track this in metadata if needed
                                score: r.score
                            };
                        });
                        sessionMemories = Array.from(this.memories.values())
                            .filter(function (m) { return m.type === 'session'; });
                        results = __spreadArray(__spreadArray([], mappedResults, true), sessionMemories, true);
                        // Filter by type/namespace
                        if (options.type) {
                            results = results.filter(function (m) { return m.type === options.type; });
                        }
                        if (options.namespace) {
                            results = results.filter(function (m) { return m.namespace === options.namespace; });
                        }
                        if ((_d = options.tags) === null || _d === void 0 ? void 0 : _d.length) {
                            results = results.filter(function (m) {
                                return options.tags.some(function (tag) { var _a; return (_a = m.metadata.tags) === null || _a === void 0 ? void 0 : _a.includes(tag); });
                            });
                        }
                        queryTerms = query.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 2; });
                        for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                            res = results_1[_i];
                            if (res.type === 'session' && !res.score) {
                                sessionScore = 0;
                                for (_a = 0, queryTerms_1 = queryTerms; _a < queryTerms_1.length; _a++) {
                                    term = queryTerms_1[_a];
                                    if (res.content.toLowerCase().includes(term))
                                        sessionScore += 1;
                                }
                                res.score = sessionScore;
                            }
                        }
                        now = Date.now();
                        for (_b = 0, results_2 = results; _b < results_2.length; _b++) {
                            memory = results_2[_b];
                            ageHours = (now - memory.accessedAt.getTime()) / (1000 * 60 * 60);
                            decayFactor = Math.exp(-ageHours / 24);
                            memory.score = ((_e = memory.score) !== null && _e !== void 0 ? _e : 0) * (0.5 + 0.5 * decayFactor);
                        }
                        return [2 /*return*/, results
                                .sort(function (a, b) { var _a, _b; return ((_a = b.score) !== null && _a !== void 0 ? _a : 0) - ((_b = a.score) !== null && _b !== void 0 ? _b : 0); })
                                .slice(0, limit)];
                }
            });
        });
    };
    /**
     * Get recent memories
     */
    AgentMemoryService.prototype.getRecent = function (limit, options) {
        if (limit === void 0) { limit = 10; }
        if (options === void 0) { options = {}; }
        var memories = Array.from(this.memories.values());
        if (options.type) {
            memories = memories.filter(function (m) { return m.type === options.type; });
        }
        if (options.namespace) {
            memories = memories.filter(function (m) { return m.namespace === options.namespace; });
        }
        return memories
            .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })
            .slice(0, limit);
    };
    /**
     * Add session memory (ephemeral)
     */
    AgentMemoryService.prototype.addSession = function (content_1) {
        return __awaiter(this, arguments, void 0, function (content, metadata) {
            if (metadata === void 0) { metadata = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.add(content, 'session', 'agent', metadata)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Add working memory (task-relevant)
     */
    AgentMemoryService.prototype.addWorking = function (content_1) {
        return __awaiter(this, arguments, void 0, function (content, namespace, metadata) {
            if (namespace === void 0) { namespace = 'project'; }
            if (metadata === void 0) { metadata = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.add(content, 'working', namespace, metadata)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Add long-term memory (persistent)
     */
    AgentMemoryService.prototype.addLongTerm = function (content_1) {
        return __awaiter(this, arguments, void 0, function (content, namespace, metadata) {
            if (namespace === void 0) { namespace = 'project'; }
            if (metadata === void 0) { metadata = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.add(content, 'long_term', namespace, metadata)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Check if memory should be consolidated to long-term
     */
    AgentMemoryService.prototype.checkConsolidation = function (memory) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(memory.type === 'working' &&
                            memory.accessCount >= this.options.consolidationThreshold)) return [3 /*break*/, 2];
                        // Promote to long-term memory
                        memory.type = 'long_term';
                        memory.ttl = undefined;
                        this.dirty = true;
                        // Sync update to vector DB
                        return [4 /*yield*/, this.memoryManager.saveContext(memory.content, __assign(__assign({}, memory.metadata), { id: memory.id, type: 'long_term', consolidatedAt: Date.now() }))];
                    case 1:
                        // Sync update to vector DB
                        _a.sent();
                        console.log("[AgentMemoryService] Consolidated memory ".concat(memory.id, " to long-term"));
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Enforce memory limits by removing old memories
     */
    AgentMemoryService.prototype.enforceMemoryLimits = function () {
        var session = this.getByType('session');
        var working = this.getByType('working');
        // Remove excess session memories (oldest first)
        if (session.length > this.options.maxSessionMemories) {
            var toRemove = session
                .sort(function (a, b) { return a.createdAt.getTime() - b.createdAt.getTime(); })
                .slice(0, session.length - this.options.maxSessionMemories);
            for (var _i = 0, toRemove_1 = toRemove; _i < toRemove_1.length; _i++) {
                var m = toRemove_1[_i];
                this.delete(m.id);
            }
        }
        // Remove excess working memories (least accessed first)
        if (working.length > this.options.maxWorkingMemories) {
            var toRemove = working
                .sort(function (a, b) { return a.accessCount - b.accessCount; })
                .slice(0, working.length - this.options.maxWorkingMemories);
            for (var _a = 0, toRemove_2 = toRemove; _a < toRemove_2.length; _a++) {
                var m = toRemove_2[_a];
                this.delete(m.id);
            }
        }
    };
    /**
     * Get memories by type
     */
    AgentMemoryService.prototype.getByType = function (type) {
        return Array.from(this.memories.values()).filter(function (m) { return m.type === type; });
    };
    /**
     * Get memories by namespace
     */
    AgentMemoryService.prototype.getByNamespace = function (namespace) {
        return Array.from(this.memories.values()).filter(function (m) { return m.namespace === namespace; });
    };
    /**
     * Clear all session memories
     */
    AgentMemoryService.prototype.clearSession = function () {
        for (var _i = 0, _a = this.memories; _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], memory = _b[1];
            if (memory.type === 'session') {
                this.memories.delete(id);
            }
        }
        this.dirty = true;
    };
    /**
     * Get memory statistics
     */
    AgentMemoryService.prototype.getStats = function () {
        var byType = { session: 0, working: 0, long_term: 0 };
        var byNamespace = { user: 0, agent: 0, project: 0 };
        for (var _i = 0, _a = this.memories.values(); _i < _a.length; _i++) {
            var memory = _a[_i];
            byType[memory.type]++;
            byNamespace[memory.namespace]++;
        }
        // We could also mix in stats from memoryManager if needed
        return __assign(__assign({ sessionCount: this.memories.size }, byType), byNamespace);
    };
    /**
     * Export memories to JSON
     */
    AgentMemoryService.prototype.export = function () {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            memories: Array.from(this.memories.values()),
        }, null, 2);
    };
    /**
     * Import memories from JSON
     */
    AgentMemoryService.prototype.import = function (jsonData) {
        return __awaiter(this, void 0, void 0, function () {
            var data, count, _i, _a, mem;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = JSON.parse(jsonData);
                        count = 0;
                        _i = 0, _a = data.memories || [];
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        mem = _a[_i];
                        mem.createdAt = new Date(mem.createdAt);
                        mem.accessedAt = new Date(mem.accessedAt);
                        mem.id = this.generateId(); // Assign new ID
                        this.memories.set(mem.id, mem);
                        if (!(mem.type !== 'session')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.memoryManager.saveContext(mem.content, __assign(__assign({}, mem.metadata), { id: mem.id, type: mem.type }))];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        count++;
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5:
                        this.dirty = true;
                        return [2 /*return*/, count];
                }
            });
        });
    };
    AgentMemoryService.prototype.scheduleSave = function () {
        var _this = this;
        if (this.saveTimeout)
            return;
        this.saveTimeout = setTimeout(function () {
            _this.saveToDisk();
            _this.saveTimeout = null;
        }, 5000); // Batch saves every 5 seconds
    };
    /**
     * Force save to disk
     */
    AgentMemoryService.prototype.flush = function () {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.saveToDisk();
    };
    /**
     * Shutdown and save
     */
    AgentMemoryService.prototype.shutdown = function () {
        this.flush();
    };
    return AgentMemoryService;
}());
exports.AgentMemoryService = AgentMemoryService;
exports.default = AgentMemoryService;
