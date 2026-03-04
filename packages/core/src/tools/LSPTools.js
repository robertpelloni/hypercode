"use strict";
/**
 * LSP Tools - MCP Tools for Language Server Protocol Operations
 *
 * Provides MCP tool definitions for LSP operations, enabling LLMs to:
 * - Find symbols by name
 * - Find references to symbols
 * - Go to definition
 * - Get all symbols in a file
 * - Rename symbols across the project
 */
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
exports.LSP_TOOL_DEFINITIONS = exports.LSPTools = exports.SearchSymbolsSchema = exports.RenameSymbolSchema = exports.GetSymbolsSchema = exports.GoToDefinitionSchema = exports.FindReferencesSchema = exports.FindSymbolSchema = void 0;
var zod_1 = require("zod");
var LSPService_js_1 = require("../services/LSPService.js");
// Schema definitions for tool inputs
exports.FindSymbolSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe('Relative path to the file'),
    symbol_name: zod_1.z.string().describe('Name of the symbol to find'),
});
exports.FindReferencesSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe('Relative path to the file'),
    line: zod_1.z.number().describe('Line number (0-indexed)'),
    character: zod_1.z.number().describe('Character position (0-indexed)'),
});
exports.GoToDefinitionSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe('Relative path to the file'),
    line: zod_1.z.number().describe('Line number (0-indexed)'),
    character: zod_1.z.number().describe('Character position (0-indexed)'),
});
exports.GetSymbolsSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe('Relative path to the file'),
});
exports.RenameSymbolSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe('Relative path to the file'),
    line: zod_1.z.number().describe('Line number (0-indexed)'),
    character: zod_1.z.number().describe('Character position (0-indexed)'),
    new_name: zod_1.z.string().describe('New name for the symbol'),
});
exports.SearchSymbolsSchema = zod_1.z.object({
    query: zod_1.z.string().describe('Search query for symbol names'),
});
// Helper to convert SymbolKind to string
var symbolKindToString = function (kind) {
    var _a;
    var kindMap = (_a = {},
        _a[LSPService_js_1.SymbolKind.File] = 'file',
        _a[LSPService_js_1.SymbolKind.Module] = 'module',
        _a[LSPService_js_1.SymbolKind.Namespace] = 'namespace',
        _a[LSPService_js_1.SymbolKind.Package] = 'package',
        _a[LSPService_js_1.SymbolKind.Class] = 'class',
        _a[LSPService_js_1.SymbolKind.Method] = 'method',
        _a[LSPService_js_1.SymbolKind.Property] = 'property',
        _a[LSPService_js_1.SymbolKind.Field] = 'field',
        _a[LSPService_js_1.SymbolKind.Constructor] = 'constructor',
        _a[LSPService_js_1.SymbolKind.Enum] = 'enum',
        _a[LSPService_js_1.SymbolKind.Interface] = 'interface',
        _a[LSPService_js_1.SymbolKind.Function] = 'function',
        _a[LSPService_js_1.SymbolKind.Variable] = 'variable',
        _a[LSPService_js_1.SymbolKind.Constant] = 'constant',
        _a[LSPService_js_1.SymbolKind.String] = 'string',
        _a[LSPService_js_1.SymbolKind.Number] = 'number',
        _a[LSPService_js_1.SymbolKind.Boolean] = 'boolean',
        _a[LSPService_js_1.SymbolKind.Array] = 'array',
        _a[LSPService_js_1.SymbolKind.Object] = 'object',
        _a[LSPService_js_1.SymbolKind.Key] = 'key',
        _a[LSPService_js_1.SymbolKind.Null] = 'null',
        _a[LSPService_js_1.SymbolKind.EnumMember] = 'enum_member',
        _a[LSPService_js_1.SymbolKind.Struct] = 'struct',
        _a[LSPService_js_1.SymbolKind.Event] = 'event',
        _a[LSPService_js_1.SymbolKind.Operator] = 'operator',
        _a[LSPService_js_1.SymbolKind.TypeParameter] = 'type_parameter',
        _a);
    return kindMap[kind] || 'unknown';
};
// Format symbol for output
var formatSymbol = function (symbol) {
    var loc = symbol.location;
    var range = loc.range;
    return "".concat(symbol.name, " (").concat(symbolKindToString(symbol.kind), ") at ").concat(loc.uri.replace('file://', ''), ":").concat(range.start.line + 1, ":").concat(range.start.character + 1);
};
// Format location for output
var formatLocation = function (loc) {
    var range = loc.range;
    return "".concat(loc.uri.replace('file://', ''), ":").concat(range.start.line + 1, ":").concat(range.start.character + 1);
};
/**
 * LSP Tools class - provides MCP tool implementations
 */
var LSPTools = /** @class */ (function () {
    function LSPTools(rootPath) {
        this.rootPath = rootPath;
        this.lspService = null;
    }
    LSPTools.prototype.getService = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.lspService) {
                    this.lspService = new LSPService_js_1.LSPService(this.rootPath);
                }
                return [2 /*return*/, this.lspService];
            });
        });
    };
    /**
     * Find a symbol by name in a file
     */
    LSPTools.prototype.findSymbol = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var service, symbol;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getService()];
                    case 1:
                        service = _a.sent();
                        return [4 /*yield*/, service.findSymbol(input.file_path, input.symbol_name)];
                    case 2:
                        symbol = _a.sent();
                        if (!symbol) {
                            return [2 /*return*/, "Symbol \"".concat(input.symbol_name, "\" not found in ").concat(input.file_path)];
                        }
                        return [2 /*return*/, formatSymbol(symbol)];
                }
            });
        });
    };
    /**
     * Find all references to a symbol at a position
     */
    LSPTools.prototype.findReferences = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var service, references, formatted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getService()];
                    case 1:
                        service = _a.sent();
                        return [4 /*yield*/, service.findReferences(input.file_path, input.line, input.character)];
                    case 2:
                        references = _a.sent();
                        if (references.length === 0) {
                            return [2 /*return*/, "No references found at ".concat(input.file_path, ":").concat(input.line + 1, ":").concat(input.character + 1)];
                        }
                        formatted = references.map(formatLocation);
                        return [2 /*return*/, "Found ".concat(references.length, " references:\n").concat(formatted.join('\n'))];
                }
            });
        });
    };
    /**
     * Go to the definition of a symbol at a position
     */
    LSPTools.prototype.goToDefinition = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var service, definition;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getService()];
                    case 1:
                        service = _a.sent();
                        return [4 /*yield*/, service.goToDefinition(input.file_path, input.line, input.character)];
                    case 2:
                        definition = _a.sent();
                        if (!definition) {
                            return [2 /*return*/, "No definition found at ".concat(input.file_path, ":").concat(input.line + 1, ":").concat(input.character + 1)];
                        }
                        return [2 /*return*/, "Definition: ".concat(formatLocation(definition))];
                }
            });
        });
    };
    /**
     * Get all symbols in a file
     */
    LSPTools.prototype.getSymbols = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var service, symbols, grouped, _i, symbols_1, symbol, kind, output, _a, grouped_1, _b, kind, items, _c, items_1, item, line;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.getService()];
                    case 1:
                        service = _d.sent();
                        return [4 /*yield*/, service.getSymbols(input.file_path)];
                    case 2:
                        symbols = _d.sent();
                        if (symbols.length === 0) {
                            return [2 /*return*/, "No symbols found in ".concat(input.file_path)];
                        }
                        grouped = new Map();
                        for (_i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
                            symbol = symbols_1[_i];
                            kind = symbolKindToString(symbol.kind);
                            if (!grouped.has(kind)) {
                                grouped.set(kind, []);
                            }
                            grouped.get(kind).push(symbol);
                        }
                        output = ["Symbols in ".concat(input.file_path, " (").concat(symbols.length, " total):")];
                        for (_a = 0, grouped_1 = grouped; _a < grouped_1.length; _a++) {
                            _b = grouped_1[_a], kind = _b[0], items = _b[1];
                            output.push("\n## ".concat(kind, "s (").concat(items.length, ")"));
                            for (_c = 0, items_1 = items; _c < items_1.length; _c++) {
                                item = items_1[_c];
                                line = item.location.range.start.line + 1;
                                output.push("  - ".concat(item.name, " (line ").concat(line, ")"));
                            }
                        }
                        return [2 /*return*/, output.join('\n')];
                }
            });
        });
    };
    /**
     * Rename a symbol across the project
     */
    LSPTools.prototype.renameSymbol = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var service, result, edit, fileCount, editCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getService()];
                    case 1:
                        service = _a.sent();
                        return [4 /*yield*/, service.renameSymbol(input.file_path, input.line, input.character, input.new_name)];
                    case 2:
                        result = _a.sent();
                        if (!result) {
                            return [2 /*return*/, "Failed to rename symbol at ".concat(input.file_path, ":").concat(input.line + 1, ":").concat(input.character + 1)];
                        }
                        edit = result;
                        if (edit.changes) {
                            fileCount = Object.keys(edit.changes).length;
                            editCount = Object.values(edit.changes).reduce(function (sum, edits) { return sum + edits.length; }, 0);
                            return [2 /*return*/, "Renamed to \"".concat(input.new_name, "\" with ").concat(editCount, " edit(s) across ").concat(fileCount, " file(s)")];
                        }
                        if (edit.documentChanges) {
                            return [2 /*return*/, "Renamed to \"".concat(input.new_name, "\" with ").concat(edit.documentChanges.length, " document change(s)")];
                        }
                        return [2 /*return*/, "Renamed to \"".concat(input.new_name, "\"")];
                }
            });
        });
    };
    /**
     * Search symbols by name across indexed files
     */
    LSPTools.prototype.searchSymbols = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var service, symbols, formatted, moreCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getService()];
                    case 1:
                        service = _a.sent();
                        // First, ensure project is indexed
                        return [4 /*yield*/, service.indexProject()];
                    case 2:
                        // First, ensure project is indexed
                        _a.sent();
                        symbols = service.searchSymbols(input.query);
                        if (symbols.length === 0) {
                            return [2 /*return*/, "No symbols found matching \"".concat(input.query, "\"")];
                        }
                        formatted = symbols.slice(0, 50).map(formatSymbol);
                        moreCount = symbols.length > 50 ? "\n... and ".concat(symbols.length - 50, " more") : '';
                        return [2 /*return*/, "Found ".concat(symbols.length, " symbols matching \"").concat(input.query, "\":\n").concat(formatted.join('\n')).concat(moreCount)];
                }
            });
        });
    };
    /**
     * Shutdown the LSP service
     */
    LSPTools.prototype.shutdown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.lspService) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.lspService.shutdown()];
                    case 1:
                        _a.sent();
                        this.lspService = null;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return LSPTools;
}());
exports.LSPTools = LSPTools;
// Tool definitions for MCP
exports.LSP_TOOL_DEFINITIONS = [
    {
        name: 'find_symbol',
        description: 'Find a symbol (function, class, variable, etc.) by name in a file. Returns the symbol location and type.',
        inputSchema: exports.FindSymbolSchema,
    },
    {
        name: 'find_references',
        description: 'Find all references to a symbol at a specific position. Use this to see everywhere a function, class, or variable is used.',
        inputSchema: exports.FindReferencesSchema,
    },
    {
        name: 'go_to_definition',
        description: 'Go to the definition of a symbol at a specific position. Use this to find where a function, class, or variable is defined.',
        inputSchema: exports.GoToDefinitionSchema,
    },
    {
        name: 'get_symbols',
        description: 'Get all symbols (functions, classes, variables, etc.) in a file. Returns a structured list grouped by symbol type.',
        inputSchema: exports.GetSymbolsSchema,
    },
    {
        name: 'rename_symbol',
        description: 'Rename a symbol across the entire project. This performs a semantic rename, updating all references.',
        inputSchema: exports.RenameSymbolSchema,
    },
    {
        name: 'search_symbols',
        description: 'Search for symbols by name across the entire project. First indexes the project, then searches for matching symbols.',
        inputSchema: exports.SearchSymbolsSchema,
    },
];
exports.default = LSPTools;
