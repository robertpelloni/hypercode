"use strict";
/**
 * LSP Service - Language Server Protocol Integration for Borg
 *
 * Provides semantic code understanding via Language Server Protocol integration.
 * Inspired by Serena's architecture but implemented in TypeScript.
 *
 * Features:
 * - Multi-language LSP server management
 * - Symbol index with cross-references
 * - Find symbol, find references, go to definition
 * - Symbol-based code editing
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.LSPService = exports.LanguageServer = exports.SymbolKind = void 0;
var child_process_1 = require("child_process");
var path = require("path");
var fs = require("fs");
var events_1 = require("events");
var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 1] = "File";
    SymbolKind[SymbolKind["Module"] = 2] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 3] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 4] = "Package";
    SymbolKind[SymbolKind["Class"] = 5] = "Class";
    SymbolKind[SymbolKind["Method"] = 6] = "Method";
    SymbolKind[SymbolKind["Property"] = 7] = "Property";
    SymbolKind[SymbolKind["Field"] = 8] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 9] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 10] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 11] = "Interface";
    SymbolKind[SymbolKind["Function"] = 12] = "Function";
    SymbolKind[SymbolKind["Variable"] = 13] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 14] = "Constant";
    SymbolKind[SymbolKind["String"] = 15] = "String";
    SymbolKind[SymbolKind["Number"] = 16] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 17] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 18] = "Array";
    SymbolKind[SymbolKind["Object"] = 19] = "Object";
    SymbolKind[SymbolKind["Key"] = 20] = "Key";
    SymbolKind[SymbolKind["Null"] = 21] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 22] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 23] = "Struct";
    SymbolKind[SymbolKind["Event"] = 24] = "Event";
    SymbolKind[SymbolKind["Operator"] = 25] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 26] = "TypeParameter";
})(SymbolKind || (exports.SymbolKind = SymbolKind = {}));
/**
 * Manages a single Language Server process
 */
var LanguageServer = /** @class */ (function (_super) {
    __extends(LanguageServer, _super);
    function LanguageServer(config) {
        var _this = _super.call(this) || this;
        _this.config = config;
        _this.process = null;
        _this.messageId = 0;
        _this.pendingRequests = new Map();
        _this.buffer = '';
        _this.initialized = false;
        _this.capabilities = {};
        return _this;
    }
    LanguageServer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var _a, _b;
                        try {
                            _this.process = (0, child_process_1.spawn)(_this.config.command, _this.config.args, {
                                cwd: _this.config.rootPath,
                                stdio: ['pipe', 'pipe', 'pipe'],
                            });
                            (_a = _this.process.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) { return _this.handleData(data); });
                            (_b = _this.process.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                                console.error("[LSP ".concat(_this.config.language, "] ").concat(data.toString()));
                            });
                            _this.process.on('error', function (err) {
                                _this.emit('error', err);
                                reject(err);
                            });
                            _this.process.on('exit', function (code) {
                                _this.emit('exit', code);
                            });
                            // Send initialize request
                            _this.initialize()
                                .then(function () {
                                _this.initialized = true;
                                resolve();
                            })
                                .catch(reject);
                        }
                        catch (error) {
                            reject(error);
                        }
                    })];
            });
        });
    };
    LanguageServer.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.process && this.initialized)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.request('shutdown', {})];
                    case 1:
                        _a.sent();
                        this.notify('exit', {});
                        this.process.kill();
                        this.process = null;
                        this.initialized = false;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    LanguageServer.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request('initialize', {
                            processId: process.pid,
                            rootPath: this.config.rootPath,
                            rootUri: "file://".concat(this.config.rootPath),
                            capabilities: {
                                textDocument: {
                                    synchronization: { dynamicRegistration: false },
                                    completion: { dynamicRegistration: false },
                                    hover: { dynamicRegistration: false },
                                    definition: { dynamicRegistration: false },
                                    references: { dynamicRegistration: false },
                                    documentSymbol: { dynamicRegistration: false },
                                },
                                workspace: {
                                    workspaceFolders: true,
                                    symbol: { dynamicRegistration: false },
                                },
                            },
                            initializationOptions: this.config.initializationOptions,
                        })];
                    case 1:
                        result = _a.sent();
                        this.capabilities = (result === null || result === void 0 ? void 0 : result.capabilities) || {};
                        this.notify('initialized', {});
                        return [2 /*return*/];
                }
            });
        });
    };
    LanguageServer.prototype.handleData = function (data) {
        this.buffer += data.toString();
        while (true) {
            var headerEnd = this.buffer.indexOf('\r\n\r\n');
            if (headerEnd === -1)
                break;
            var header = this.buffer.slice(0, headerEnd);
            var contentLengthMatch = header.match(/Content-Length: (\d+)/);
            if (!contentLengthMatch)
                break;
            var contentLength = parseInt(contentLengthMatch[1], 10);
            var messageStart = headerEnd + 4;
            var messageEnd = messageStart + contentLength;
            if (this.buffer.length < messageEnd)
                break;
            var messageStr = this.buffer.slice(messageStart, messageEnd);
            this.buffer = this.buffer.slice(messageEnd);
            try {
                var message = JSON.parse(messageStr);
                this.handleMessage(message);
            }
            catch (error) {
                console.error("[LSP ".concat(this.config.language, "] Failed to parse message:"), error);
            }
        }
    };
    LanguageServer.prototype.handleMessage = function (message) {
        if (message.id !== undefined && !message.method) {
            // Response to a request
            var pending_1 = this.pendingRequests.get(message.id);
            if (pending_1) {
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending_1.reject(new Error(message.error.message));
                }
                else {
                    pending_1.resolve(message.result);
                }
            }
        }
        else if (message.method) {
            // Notification or request from server
            this.emit('notification', message.method, message.params);
        }
    };
    LanguageServer.prototype.sendMessage = function (message) {
        var _a;
        if (!((_a = this.process) === null || _a === void 0 ? void 0 : _a.stdin)) {
            throw new Error('Language server not started');
        }
        var content = JSON.stringify(message);
        var header = "Content-Length: ".concat(Buffer.byteLength(content), "\r\n\r\n");
        this.process.stdin.write(header + content);
    };
    LanguageServer.prototype.request = function (method, params) {
        return __awaiter(this, void 0, void 0, function () {
            var id, message;
            var _this = this;
            return __generator(this, function (_a) {
                id = ++this.messageId;
                message = {
                    jsonrpc: '2.0',
                    id: id,
                    method: method,
                    params: params,
                };
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.pendingRequests.set(id, {
                            resolve: resolve,
                            reject: reject,
                        });
                        _this.sendMessage(message);
                        // Timeout after 30 seconds
                        setTimeout(function () {
                            if (_this.pendingRequests.has(id)) {
                                _this.pendingRequests.delete(id);
                                reject(new Error("Request ".concat(method, " timed out")));
                            }
                        }, 30000);
                    })];
            });
        });
    };
    LanguageServer.prototype.notify = function (method, params) {
        var message = {
            jsonrpc: '2.0',
            method: method,
            params: params,
        };
        this.sendMessage(message);
    };
    // Document management
    LanguageServer.prototype.openDocument = function (uri, languageId, text) {
        this.notify('textDocument/didOpen', {
            textDocument: { uri: uri, languageId: languageId, version: 1, text: text },
        });
    };
    LanguageServer.prototype.closeDocument = function (uri) {
        this.notify('textDocument/didClose', {
            textDocument: { uri: uri },
        });
    };
    // LSP Operations
    LanguageServer.prototype.getDocumentSymbols = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request('textDocument/documentSymbol', {
                        textDocument: { uri: uri },
                    })];
            });
        });
    };
    LanguageServer.prototype.findDefinition = function (uri, position) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request('textDocument/definition', {
                        textDocument: { uri: uri },
                        position: position,
                    })];
            });
        });
    };
    LanguageServer.prototype.findReferences = function (uri_1, position_1) {
        return __awaiter(this, arguments, void 0, function (uri, position, includeDeclaration) {
            if (includeDeclaration === void 0) { includeDeclaration = true; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request('textDocument/references', {
                        textDocument: { uri: uri },
                        position: position,
                        context: { includeDeclaration: includeDeclaration },
                    })];
            });
        });
    };
    LanguageServer.prototype.getHover = function (uri, position) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request('textDocument/hover', {
                        textDocument: { uri: uri },
                        position: position,
                    })];
            });
        });
    };
    LanguageServer.prototype.rename = function (uri, position, newName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.request('textDocument/rename', {
                        textDocument: { uri: uri },
                        position: position,
                        newName: newName,
                    })];
            });
        });
    };
    return LanguageServer;
}(events_1.EventEmitter));
exports.LanguageServer = LanguageServer;
/**
 * LSP Service - Manages multiple language servers
 */
var LSPService = /** @class */ (function () {
    function LSPService(rootPath) {
        this.rootPath = rootPath;
        this.servers = new Map();
        this.symbolIndex = new Map();
    }
    LSPService.prototype.getStatus = function () {
        return {
            status: this.symbolIndex.size > 0 ? 'indexed' : 'idle',
            filesIndexed: this.symbolIndex.size,
            activeServers: Array.from(this.servers.keys())
        };
    };
    /**
     * Get or create a language server for the given language
     */
    LSPService.prototype.getServer = function (language) {
        return __awaiter(this, void 0, void 0, function () {
            var config, server;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.servers.has(language)) {
                            return [2 /*return*/, this.servers.get(language)];
                        }
                        config = this.getLanguageConfig(language);
                        if (!config) {
                            throw new Error("No configuration available for language: ".concat(language));
                        }
                        server = new LanguageServer(config);
                        return [4 /*yield*/, server.start()];
                    case 1:
                        _a.sent();
                        this.servers.set(language, server);
                        return [2 /*return*/, server];
                }
            });
        });
    };
    /**
     * Get language server configuration for a language
     */
    LSPService.prototype.getLanguageConfig = function (language) {
        var configs = {
            typescript: {
                language: 'typescript',
                command: 'typescript-language-server',
                args: ['--stdio'],
            },
            javascript: {
                language: 'javascript',
                command: 'typescript-language-server',
                args: ['--stdio'],
            },
            python: {
                language: 'python',
                command: 'pyright-langserver',
                args: ['--stdio'],
            },
            rust: {
                language: 'rust',
                command: 'rust-analyzer',
                args: [],
            },
            go: {
                language: 'go',
                command: 'gopls',
                args: [],
            },
        };
        var config = configs[language];
        if (!config)
            return null;
        return __assign(__assign({}, config), { rootPath: this.rootPath });
    };
    /**
     * Detect language from file extension
     */
    LSPService.prototype.detectLanguage = function (filePath) {
        var ext = path.extname(filePath).toLowerCase();
        var languageMap = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.rs': 'rust',
            '.go': 'go',
        };
        return languageMap[ext] || null;
    };
    /**
     * Find symbol by name in a file
     */
    LSPService.prototype.findSymbol = function (filePath, symbolName) {
        return __awaiter(this, void 0, void 0, function () {
            var language, server, uri, content, symbols, findInSymbols, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        language = this.detectLanguage(filePath);
                        if (!language)
                            return [2 /*return*/, null];
                        return [4 /*yield*/, this.getServer(language)];
                    case 1:
                        server = _a.sent();
                        uri = "file://".concat(path.resolve(this.rootPath, filePath));
                        content = fs.readFileSync(filePath, 'utf-8');
                        server.openDocument(uri, language, content);
                        return [4 /*yield*/, server.getDocumentSymbols(uri)];
                    case 2:
                        symbols = _a.sent();
                        findInSymbols = function (items) {
                            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                                var item = items_1[_i];
                                if (item.name === symbolName) {
                                    // Convert DocumentSymbol to SymbolInformation if needed
                                    if ('range' in item && !('location' in item)) {
                                        return {
                                            name: item.name,
                                            kind: item.kind,
                                            location: { uri: uri, range: item.range },
                                        };
                                    }
                                    return item;
                                }
                                // Check children for DocumentSymbol
                                if ('children' in item && item.children) {
                                    var found = findInSymbols(item.children);
                                    if (found)
                                        return found;
                                }
                            }
                            return null;
                        };
                        result = findInSymbols(symbols);
                        server.closeDocument(uri);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Find all references to a symbol
     */
    LSPService.prototype.findReferences = function (filePath, line, character) {
        return __awaiter(this, void 0, void 0, function () {
            var language, server, uri, content, references;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        language = this.detectLanguage(filePath);
                        if (!language)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, this.getServer(language)];
                    case 1:
                        server = _a.sent();
                        uri = "file://".concat(path.resolve(this.rootPath, filePath));
                        content = fs.readFileSync(filePath, 'utf-8');
                        server.openDocument(uri, language, content);
                        return [4 /*yield*/, server.findReferences(uri, { line: line, character: character })];
                    case 2:
                        references = _a.sent();
                        server.closeDocument(uri);
                        return [2 /*return*/, references || []];
                }
            });
        });
    };
    /**
     * Go to definition
     */
    LSPService.prototype.goToDefinition = function (filePath, line, character) {
        return __awaiter(this, void 0, void 0, function () {
            var language, server, uri, content, definition;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        language = this.detectLanguage(filePath);
                        if (!language)
                            return [2 /*return*/, null];
                        return [4 /*yield*/, this.getServer(language)];
                    case 1:
                        server = _a.sent();
                        uri = "file://".concat(path.resolve(this.rootPath, filePath));
                        content = fs.readFileSync(filePath, 'utf-8');
                        server.openDocument(uri, language, content);
                        return [4 /*yield*/, server.findDefinition(uri, { line: line, character: character })];
                    case 2:
                        definition = _a.sent();
                        server.closeDocument(uri);
                        if (Array.isArray(definition)) {
                            return [2 /*return*/, definition[0] || null];
                        }
                        return [2 /*return*/, definition];
                }
            });
        });
    };
    /**
     * Get all symbols in a file
     */
    LSPService.prototype.getSymbols = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var language, server, uri, content, symbols, flatten, flattened;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        language = this.detectLanguage(filePath);
                        if (!language)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, this.getServer(language)];
                    case 1:
                        server = _a.sent();
                        uri = "file://".concat(path.resolve(this.rootPath, filePath));
                        content = fs.readFileSync(filePath, 'utf-8');
                        server.openDocument(uri, language, content);
                        return [4 /*yield*/, server.getDocumentSymbols(uri)];
                    case 2:
                        symbols = _a.sent();
                        flatten = function (items, result) {
                            if (result === void 0) { result = []; }
                            for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
                                var item = items_2[_i];
                                if ('range' in item && !('location' in item)) {
                                    result.push({
                                        name: item.name,
                                        kind: item.kind,
                                        location: { uri: uri, range: item.range },
                                    });
                                    if (item.children) {
                                        flatten(item.children, result);
                                    }
                                }
                                else {
                                    result.push(item);
                                }
                            }
                            return result;
                        };
                        flattened = flatten(symbols);
                        server.closeDocument(uri);
                        return [2 /*return*/, flattened];
                }
            });
        });
    };
    /**
     * Rename a symbol across the project
     */
    LSPService.prototype.renameSymbol = function (filePath, line, character, newName) {
        return __awaiter(this, void 0, void 0, function () {
            var language, server, uri, content, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        language = this.detectLanguage(filePath);
                        if (!language)
                            return [2 /*return*/, null];
                        return [4 /*yield*/, this.getServer(language)];
                    case 1:
                        server = _a.sent();
                        uri = "file://".concat(path.resolve(this.rootPath, filePath));
                        content = fs.readFileSync(filePath, 'utf-8');
                        server.openDocument(uri, language, content);
                        return [4 /*yield*/, server.rename(uri, { line: line, character: character }, newName)];
                    case 2:
                        result = _a.sent();
                        server.closeDocument(uri);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Index all symbols in the project
     */
    LSPService.prototype.indexProject = function () {
        return __awaiter(this, arguments, void 0, function (extensions) {
            var files, _i, files_1, file, symbols, error_1;
            if (extensions === void 0) { extensions = ['.ts', '.js', '.py']; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        files = this.findFiles(this.rootPath, extensions);
                        _i = 0, files_1 = files;
                        _a.label = 1;
                    case 1:
                        if (!(_i < files_1.length)) return [3 /*break*/, 6];
                        file = files_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.getSymbols(file)];
                    case 3:
                        symbols = _a.sent();
                        this.symbolIndex.set(file, symbols);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.warn("Failed to index ".concat(file, ":"), error_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find files with given extensions
     */
    LSPService.prototype.findFiles = function (dir, extensions, files) {
        if (files === void 0) { files = []; }
        var entries = fs.readdirSync(dir, { withFileTypes: true });
        var _loop_1 = function (entry) {
            var fullPath = path.join(dir, entry.name);
            // Skip common ignored directories
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') ||
                    entry.name === 'node_modules' ||
                    entry.name === 'dist' ||
                    entry.name === '__pycache__') {
                    return "continue";
                }
                this_1.findFiles(fullPath, extensions, files);
            }
            else if (extensions.some(function (ext) { return entry.name.endsWith(ext); })) {
                files.push(fullPath);
            }
        };
        var this_1 = this;
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            _loop_1(entry);
        }
        return files;
    };
    /**
     * Search symbols by name across indexed files
     */
    LSPService.prototype.searchSymbols = function (query) {
        var results = [];
        var lowerQuery = query.toLowerCase();
        for (var _i = 0, _a = this.symbolIndex; _i < _a.length; _i++) {
            var _b = _a[_i], symbols = _b[1];
            for (var _c = 0, symbols_1 = symbols; _c < symbols_1.length; _c++) {
                var symbol = symbols_1[_c];
                if (symbol.name.toLowerCase().includes(lowerQuery)) {
                    results.push(symbol);
                }
            }
        }
        return results;
    };
    /**
     * Stop all language servers
     */
    LSPService.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stopPromises, _i, _a, server;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        stopPromises = [];
                        for (_i = 0, _a = this.servers.values(); _i < _a.length; _i++) {
                            server = _a[_i];
                            stopPromises.push(server.stop());
                        }
                        return [4 /*yield*/, Promise.all(stopPromises)];
                    case 1:
                        _b.sent();
                        this.servers.clear();
                        return [2 /*return*/];
                }
            });
        });
    };
    return LSPService;
}());
exports.LSPService = LSPService;
exports.default = LSPService;
