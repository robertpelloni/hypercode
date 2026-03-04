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
exports.MemoryManager = void 0;
var path_1 = require("path");
var promises_1 = require("fs/promises");
var fs_1 = require("fs");
var ContextPruner_js_1 = require("./ContextPruner.js");
var MemoryManager = /** @class */ (function () {
    function MemoryManager(workspaceRoot) {
        if (workspaceRoot === void 0) { workspaceRoot = process.cwd(); }
        this.provider = null;
        this.initialized = false;
        this.graph = null;
        this.dbPath = path_1.default.join(workspaceRoot, '.borg', 'db');
        this.registryPath = path_1.default.join(workspaceRoot, '.borg', 'memory', 'contexts.json');
        this.pruner = new ContextPruner_js_1.ContextPruner();
    }
    /**
     * Reason: Metadata across providers is loosely typed and may include non-string primitives.
     * What: Reads a metadata key and safely normalizes it to a lowercase string.
     * Why: Removes repeated ad-hoc casts while keeping symbol filtering behavior unchanged.
     */
    MemoryManager.prototype.getMetadataString = function (metadata, key) {
        var value = metadata === null || metadata === void 0 ? void 0 : metadata[key];
        return typeof value === 'string' ? value.toLowerCase() : '';
    };
    /**
     * Reason: `list` is an optional extension used by this adapter but not part of the base VectorProvider contract.
     * What: Runtime guard that narrows a provider to the extended list-capable variant.
     * Why: Allows optional capability checks without broad casts.
     */
    MemoryManager.prototype.hasList = function (provider) {
        var maybeList = Reflect.get(provider, 'list');
        return typeof maybeList === 'function';
    };
    MemoryManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, LanceDBStore, MemoryVectorStore, GraphMemory, store, useMemoryStore, provider;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.initialized)
                            return [2 /*return*/];
                        console.log("[MemoryManager] Initializing Vector Backend...");
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@borg/memory'); })];
                    case 1:
                        _a = _b.sent(), LanceDBStore = _a.LanceDBStore, MemoryVectorStore = _a.MemoryVectorStore, GraphMemory = _a.GraphMemory;
                        useMemoryStore = process.env.MEMORY_BACKEND === 'memory';
                        if (useMemoryStore) {
                            console.log("[MemoryManager] Using MemoryVectorStore fallback backend.");
                            store = new MemoryVectorStore();
                        }
                        else {
                            console.log("[MemoryManager] Using LanceDBStore backend.");
                            store = new LanceDBStore(this.dbPath);
                        }
                        this.graph = new GraphMemory();
                        return [4 /*yield*/, this.graph.initialize()];
                    case 2:
                        _b.sent();
                        provider = {
                            initialize: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, store.initialize()];
                            }); }); },
                            add: function (docs) { return __awaiter(_this, void 0, void 0, function () {
                                var _i, docs_1, d, metadata, pathValue;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _i = 0, docs_1 = docs;
                                            _b.label = 1;
                                        case 1:
                                            if (!(_i < docs_1.length)) return [3 /*break*/, 4];
                                            d = docs_1[_i];
                                            metadata = ((_a = d.metadata) !== null && _a !== void 0 ? _a : {});
                                            pathValue = typeof metadata.path === 'string' ? metadata.path : d.id;
                                            return [4 /*yield*/, store.addMemory(d.content, __assign(__assign({}, metadata), { id: d.id, path: pathValue }))];
                                        case 2:
                                            _b.sent();
                                            _b.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); },
                            search: function (query_1) {
                                var args_1 = [];
                                for (var _i = 1; _i < arguments.length; _i++) {
                                    args_1[_i - 1] = arguments[_i];
                                }
                                return __awaiter(_this, __spreadArray([query_1], args_1, true), void 0, function (query, limit) {
                                    var results;
                                    if (limit === void 0) { limit = 5; }
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, store.search(query, limit)];
                                            case 1:
                                                results = _a.sent();
                                                console.log("[MemoryManager] Raw Search Results:", JSON.stringify(results, null, 2));
                                                // LanceDB results: [{ vector, text, ...metadata, _distance }]
                                                return [2 /*return*/, results.map(function (r) {
                                                        var _a;
                                                        return ({
                                                            id: r.id || 'unknown',
                                                            content: (_a = r.text) !== null && _a !== void 0 ? _a : '',
                                                            metadata: __assign({ type: r.type, namespace: r.namespace }, r),
                                                            score: 1 - (r._distance || 0) // Convert distance to similarity
                                                        });
                                                    })];
                                        }
                                    });
                                });
                            },
                            get: function (id) { return __awaiter(_this, void 0, void 0, function () {
                                var doc;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, store.get(id)];
                                        case 1:
                                            doc = _a.sent();
                                            if (!doc)
                                                return [2 /*return*/, null];
                                            return [2 /*return*/, {
                                                    id: doc.id,
                                                    content: doc.content,
                                                    metadata: __assign(__assign({}, doc.metadata), { path: doc.path, hash: doc.hash }),
                                                    score: 1
                                                }];
                                    }
                                });
                            }); },
                            delete: function (ids) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, store.delete(ids)];
                            }); }); },
                            reset: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, store.reset()];
                            }); }); },
                            list: function (where, limit) { return __awaiter(_this, void 0, void 0, function () {
                                var docs;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, store.listDocuments(where, limit)];
                                        case 1:
                                            docs = _a.sent();
                                            return [2 /*return*/, docs.map(function (d) { return ({
                                                    id: d.id,
                                                    content: d.content,
                                                    metadata: __assign(__assign({}, d.metadata), { path: d.path, hash: d.hash })
                                                }); })];
                                    }
                                });
                            }); }
                        };
                        this.provider = provider;
                        if (!this.provider) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.provider.initialize()];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        this.initialized = true;
                        console.log("[MemoryManager] Ready.");
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.saveContext = function (content_1) {
        return __awaiter(this, arguments, void 0, function (content, metadata) {
            var docId, docs;
            if (metadata === void 0) { metadata = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            throw new Error("Provider failed to init");
                        docId = "ctx/".concat(Date.now(), "/").concat(Math.random().toString(36).substring(7));
                        return [4 /*yield*/, this.prepareContextDocuments(docId, content, metadata)];
                    case 3:
                        docs = _a.sent();
                        return [4 /*yield*/, this.provider.add(docs)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.addToRegistry({
                                id: docId,
                                title: metadata.title || 'Untitled',
                                source: metadata.source || 'unknown',
                                createdAt: Date.now(),
                                chunks: docs.length,
                                metadata: metadata
                            })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, docId];
                }
            });
        });
    };
    MemoryManager.prototype.search = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, limit) {
            if (limit === void 0) { limit = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, this.provider.search(query, limit)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemoryManager.prototype.searchSymbols = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, limit) {
            var candidates, symbols;
            var _this = this;
            if (limit === void 0) { limit = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.search(query, Math.max(limit * 3, limit))];
                    case 1:
                        candidates = _a.sent();
                        symbols = candidates.filter(function (r) {
                            var _a;
                            var metadata = ((_a = r.metadata) !== null && _a !== void 0 ? _a : {});
                            var type = _this.getMetadataString(metadata, 'type');
                            var hash = _this.getMetadataString(metadata, 'hash');
                            return type === 'symbol' || hash === 'symbol';
                        });
                        if (symbols.length > 0) {
                            return [2 /*return*/, symbols.slice(0, limit)];
                        }
                        return [2 /*return*/, candidates.slice(0, limit)];
                }
            });
        });
    };
    MemoryManager.prototype.prepareContextDocuments = function (baseId, content, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var pathHint, extension, looksCode, shouldSplit, CodeSplitter, chunks_1, e_1;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        pathHint = String((_c = (_b = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.path) !== null && _a !== void 0 ? _a : metadata === null || metadata === void 0 ? void 0 : metadata.source) !== null && _b !== void 0 ? _b : metadata === null || metadata === void 0 ? void 0 : metadata.title) !== null && _c !== void 0 ? _c : '');
                        extension = path_1.default.extname(pathHint) || '.md';
                        looksCode = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cs', '.cpp', '.c', '.h'].includes(extension);
                        shouldSplit = looksCode || content.length > 2000;
                        if (!shouldSplit) {
                            return [2 /*return*/, [{ id: baseId, content: content, metadata: metadata }]];
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@borg/memory'); })];
                    case 2:
                        CodeSplitter = (_d.sent()).CodeSplitter;
                        chunks_1 = CodeSplitter
                            .split(content, extension, 1000)
                            .map(function (chunk) { return chunk.trim(); })
                            .filter(function (chunk) { return chunk.length > 0; });
                        if (chunks_1.length <= 1) {
                            return [2 /*return*/, [{ id: baseId, content: content, metadata: metadata }]];
                        }
                        return [2 /*return*/, chunks_1.map(function (chunk, index) { return ({
                                id: "".concat(baseId, "#").concat(index + 1),
                                content: chunk,
                                metadata: __assign(__assign({}, metadata), { parentId: baseId, chunkIndex: index, totalChunks: chunks_1.length }),
                            }); })];
                    case 3:
                        e_1 = _d.sent();
                        console.warn('[MemoryManager] CodeSplitter unavailable, falling back to single document context save.', e_1);
                        return [2 /*return*/, [{ id: baseId, content: content, metadata: metadata }]];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.getAllSymbols = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            return [2 /*return*/, []];
                        if (!this.hasList(this.provider)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.provider.list("hash = 'symbol'", 5000)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        console.warn("[MemoryManager] Provider does not support list capability.");
                        return [2 /*return*/, []];
                }
            });
        });
    };
    /**
     * Index structured symbols (Classes, Functions) using AST parsing.
     */
    MemoryManager.prototype.indexSymbols = function (rootDir) {
        return __awaiter(this, void 0, void 0, function () {
            var Indexer, storageAdapter, indexer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            throw new Error("Provider failed to init");
                        console.log("[MemoryManager] Indexing symbols at ".concat(rootDir, "..."));
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@borg/memory'); })];
                    case 3:
                        Indexer = (_a.sent()).Indexer;
                        storageAdapter = {
                            initialize: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/];
                            }); }); },
                            addDocuments: function (docs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.provider.add(docs.map(function (doc) { return ({
                                                id: doc.id,
                                                content: doc.content,
                                                metadata: __assign({ path: doc.file_path, hash: doc.hash }, doc.metadata)
                                            }); }))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }
                        };
                        indexer = new Indexer(storageAdapter);
                        if (!indexer.indexSymbols) {
                            throw new Error("Indexer does not utilize indexSymbols (check build?)");
                        }
                        return [4 /*yield*/, indexer.indexSymbols(rootDir)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemoryManager.prototype.indexCodebase = function (rootDir) {
        return __awaiter(this, void 0, void 0, function () {
            var Indexer, storageAdapter, indexer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            throw new Error("Provider failed to init");
                        console.log("[MemoryManager] Indexing codebase at ".concat(rootDir, "..."));
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('@borg/memory'); })];
                    case 3:
                        Indexer = (_a.sent()).Indexer;
                        storageAdapter = {
                            initialize: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/];
                            }); }); },
                            addDocuments: function (docs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.provider.add(docs.map(function (doc) { return ({
                                                id: doc.id,
                                                content: doc.content,
                                                metadata: __assign({ path: doc.file_path, hash: doc.hash }, doc.metadata)
                                            }); }))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }
                        };
                        indexer = new Indexer(storageAdapter);
                        return [4 /*yield*/, indexer.indexDirectory(rootDir)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemoryManager.prototype.getContext = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider || !this.provider.get)
                            return [2 /*return*/, null];
                        return [4 /*yield*/, this.provider.get(id)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemoryManager.prototype.deleteContext = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.provider.delete([id])];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.removeFromRegistry(id)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.listContexts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!(0, fs_1.existsSync)(this.registryPath))
                            return [2 /*return*/, []];
                        return [4 /*yield*/, promises_1.default.readFile(this.registryPath, 'utf-8')];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, JSON.parse(data)];
                    case 2:
                        e_2 = _a.sent();
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.addToRegistry = function (entry) {
        return __awaiter(this, void 0, void 0, function () {
            var dir, current, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        dir = path_1.default.dirname(this.registryPath);
                        if (!!(0, fs_1.existsSync)(dir)) return [3 /*break*/, 2];
                        return [4 /*yield*/, promises_1.default.mkdir(dir, { recursive: true })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.listContexts()];
                    case 3:
                        current = _a.sent();
                        current.unshift(entry); // Newest first
                        return [4 /*yield*/, promises_1.default.writeFile(this.registryPath, JSON.stringify(current, null, 2))];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_3 = _a.sent();
                        console.error("Failed to update memory registry:", e_3);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.removeFromRegistry = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var current, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.listContexts()];
                    case 1:
                        current = _a.sent();
                        current = current.filter(function (c) {
                            if (!c || typeof c !== 'object') {
                                return true;
                            }
                            var candidateId = Reflect.get(c, 'id');
                            return candidateId !== id;
                        });
                        return [4 /*yield*/, promises_1.default.writeFile(this.registryPath, JSON.stringify(current, null, 2))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_4 = _a.sent();
                        console.error("Failed to update memory registry:", e_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.exportMemory = function (destPath) {
        return __awaiter(this, void 0, void 0, function () {
            var allDocs, dir;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider || !this.hasList(this.provider))
                            throw new Error("Export requires list capability from provider.");
                        console.log("[MemoryManager] Exporting full memory snapshot to ".concat(destPath, "..."));
                        return [4 /*yield*/, this.provider.list(undefined, 50000)];
                    case 3:
                        allDocs = _a.sent();
                        dir = path_1.default.dirname(destPath);
                        if (!!(0, fs_1.existsSync)(dir)) return [3 /*break*/, 5];
                        return [4 /*yield*/, promises_1.default.mkdir(dir, { recursive: true })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, promises_1.default.writeFile(destPath, JSON.stringify(allDocs, null, 2))];
                    case 6:
                        _a.sent();
                        console.log("[MemoryManager] Exported ".concat(allDocs.length, " vectors to ").concat(destPath));
                        return [2 /*return*/, allDocs.length];
                }
            });
        });
    };
    MemoryManager.prototype.importMemory = function (srcPath) {
        return __awaiter(this, void 0, void 0, function () {
            var data, docs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.provider)
                            throw new Error("Provider not initialized");
                        if (!(0, fs_1.existsSync)(srcPath)) {
                            console.warn("[MemoryManager] Import file not found: ".concat(srcPath));
                            return [2 /*return*/, 0];
                        }
                        console.log("[MemoryManager] Importing memory snapshot from ".concat(srcPath, "..."));
                        return [4 /*yield*/, promises_1.default.readFile(srcPath, 'utf-8')];
                    case 3:
                        data = _a.sent();
                        docs = JSON.parse(data);
                        if (!(Array.isArray(docs) && docs.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.provider.add(docs)];
                    case 4:
                        _a.sent();
                        console.log("[MemoryManager] Imported ".concat(docs.length, " vectors."));
                        return [2 /*return*/, docs.length];
                    case 5: return [2 /*return*/, 0];
                }
            });
        });
    };
    /**
     * Infinite Context V3: Prune a conversation history to fit within limits.
     */
    MemoryManager.prototype.pruneContext = function (messages, options) {
        if (options) {
            // Re-instantiate pruner if temporary options provided
            // Or just use a temporary instance
            var tempPruner = new ContextPruner_js_1.ContextPruner(options);
            return tempPruner.prune(messages);
        }
        return this.pruner.prune(messages);
    };
    /**
     * Calculate token usage for observability
     */
    MemoryManager.prototype.getContextSize = function (messages) {
        return this.pruner.estimateTokens(messages);
    };
    return MemoryManager;
}());
exports.MemoryManager = MemoryManager;
