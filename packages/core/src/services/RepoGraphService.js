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
exports.RepoGraphService = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var typescript_1 = require("typescript");
var RepoGraphService = /** @class */ (function () {
    function RepoGraphService(rootDir) {
        this.consumers = new Map();
        this.dependencies = new Map();
        this.isInitialized = false;
        this.packageMap = new Map(); // @borg/core -> packages/core
        this.rootDir = rootDir;
    }
    RepoGraphService.prototype.buildGraph = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, _i, files_1, file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.time('RepoGraphBuild');
                        return [4 /*yield*/, this.buildPackageMap()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.getAllFiles(this.rootDir)];
                    case 2:
                        files = _a.sent();
                        // Clear maps
                        this.consumers.clear();
                        this.dependencies.clear();
                        _i = 0, files_1 = files;
                        _a.label = 3;
                    case 3:
                        if (!(_i < files_1.length)) return [3 /*break*/, 6];
                        file = files_1[_i];
                        return [4 /*yield*/, this.analyzeFile(file)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        this.isInitialized = true;
                        console.timeEnd('RepoGraphBuild');
                        console.log("[RepoGraph] Built graph with ".concat(files.length, " files."));
                        return [2 /*return*/];
                }
            });
        });
    };
    RepoGraphService.prototype.getConsumers = function (filePath) {
        if (!this.isInitialized)
            return [];
        var normalized = this.normalize(filePath);
        var set = this.consumers.get(normalized);
        return set ? Array.from(set) : [];
    };
    RepoGraphService.prototype.getDependencies = function (filePath) {
        if (!this.isInitialized)
            return [];
        var normalized = this.normalize(filePath);
        var set = this.dependencies.get(normalized);
        return set ? Array.from(set) : [];
    };
    RepoGraphService.prototype.normalize = function (p) {
        return p.split(path_1.default.sep).join('/').replace(/^\.\//, '');
    };
    RepoGraphService.prototype.analyzeFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var content, sourceNormalized, sourceFile, imports_2, visit_1, _i, imports_1, imp, resolved, targetNormalized;
            return __generator(this, function (_a) {
                try {
                    content = fs_1.default.readFileSync(filePath, 'utf-8');
                    sourceNormalized = this.normalize(path_1.default.relative(this.rootDir, filePath));
                    sourceFile = typescript_1.default.createSourceFile(filePath, content, typescript_1.default.ScriptTarget.Latest, true // setParentNodes
                    );
                    imports_2 = [];
                    visit_1 = function (node) {
                        if (typescript_1.default.isImportDeclaration(node)) {
                            if (node.moduleSpecifier && typescript_1.default.isStringLiteral(node.moduleSpecifier)) {
                                imports_2.push(node.moduleSpecifier.text);
                            }
                        }
                        else if (typescript_1.default.isExportDeclaration(node)) {
                            if (node.moduleSpecifier && typescript_1.default.isStringLiteral(node.moduleSpecifier)) {
                                imports_2.push(node.moduleSpecifier.text);
                            }
                        }
                        typescript_1.default.forEachChild(node, visit_1);
                    };
                    visit_1(sourceFile);
                    for (_i = 0, imports_1 = imports_2; _i < imports_1.length; _i++) {
                        imp = imports_1[_i];
                        resolved = this.resolveModule(filePath, imp);
                        if (resolved) {
                            targetNormalized = this.normalize(path_1.default.relative(this.rootDir, resolved));
                            // Add Forward
                            if (!this.dependencies.has(sourceNormalized))
                                this.dependencies.set(sourceNormalized, new Set());
                            this.dependencies.get(sourceNormalized).add(targetNormalized);
                            // Add Reverse
                            if (!this.consumers.has(targetNormalized))
                                this.consumers.set(targetNormalized, new Set());
                            this.consumers.get(targetNormalized).add(sourceNormalized);
                        }
                    }
                }
                catch (e) {
                    // console.error(`Failed to analyze ${filePath}:`, e);
                    // Ignore for robust graph building
                }
                return [2 /*return*/];
            });
        });
    };
    RepoGraphService.prototype.resolveModule = function (importer, moduleSpecifier) {
        // 1. Monorepo Alias Resolution
        if (moduleSpecifier.startsWith('@borg/')) {
            var pkgPath = this.packageMap.get(moduleSpecifier);
            if (pkgPath) {
                // Try explicit entry points first when resolving internal packages
                var entryPoints = ['src/index.ts', 'index.ts', 'src/index.tsx'];
                for (var _i = 0, entryPoints_1 = entryPoints; _i < entryPoints_1.length; _i++) {
                    var entry = entryPoints_1[_i];
                    var p = path_1.default.join(this.rootDir, pkgPath, entry);
                    if (fs_1.default.existsSync(p))
                        return p;
                }
                // Try explicit entry points first when resolving internal packages
                // This is rare in our codebase (usually we import from index), but let's see.
            }
        }
        // 2. Relative Resolution
        if (moduleSpecifier.startsWith('.')) {
            var dir = path_1.default.dirname(importer);
            var target = path_1.default.join(dir, moduleSpecifier);
            // Try extensions
            var extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
            // Check exact file + extension
            for (var _a = 0, extensions_1 = extensions; _a < extensions_1.length; _a++) {
                var ext = extensions_1[_a];
                if (fs_1.default.existsSync(target + ext))
                    return target + ext;
            }
            // Check if directory index
            for (var _b = 0, extensions_2 = extensions; _b < extensions_2.length; _b++) {
                var ext = extensions_2[_b];
                if (fs_1.default.existsSync(path_1.default.join(target, 'index' + ext)))
                    return path_1.default.join(target, 'index' + ext);
            }
            // If explicit extension provided
            if (fs_1.default.existsSync(target))
                return target;
        }
        return null;
    };
    RepoGraphService.prototype.buildPackageMap = function () {
        return __awaiter(this, void 0, void 0, function () {
            var scan;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        scan = function (base) { return __awaiter(_this, void 0, void 0, function () {
                            var dir, entries, _i, entries_1, entry, pkgJsonPath, content, _a, _b, e_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        dir = path_1.default.join(this.rootDir, base);
                                        if (!fs_1.default.existsSync(dir))
                                            return [2 /*return*/];
                                        return [4 /*yield*/, fs_1.default.promises.readdir(dir, { withFileTypes: true })];
                                    case 1:
                                        entries = _c.sent();
                                        _i = 0, entries_1 = entries;
                                        _c.label = 2;
                                    case 2:
                                        if (!(_i < entries_1.length)) return [3 /*break*/, 7];
                                        entry = entries_1[_i];
                                        if (!entry.isDirectory()) return [3 /*break*/, 6];
                                        pkgJsonPath = path_1.default.join(dir, entry.name, 'package.json');
                                        if (!fs_1.default.existsSync(pkgJsonPath)) return [3 /*break*/, 6];
                                        _c.label = 3;
                                    case 3:
                                        _c.trys.push([3, 5, , 6]);
                                        _b = (_a = JSON).parse;
                                        return [4 /*yield*/, fs_1.default.promises.readFile(pkgJsonPath, 'utf-8')];
                                    case 4:
                                        content = _b.apply(_a, [_c.sent()]);
                                        if (content.name) {
                                            this.packageMap.set(content.name, path_1.default.join(base, entry.name));
                                        }
                                        return [3 /*break*/, 6];
                                    case 5:
                                        e_1 = _c.sent();
                                        return [3 /*break*/, 6];
                                    case 6:
                                        _i++;
                                        return [3 /*break*/, 2];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, scan('packages')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, scan('apps')];
                    case 2:
                        _a.sent();
                        console.log("[RepoGraph] Mapped ".concat(this.packageMap.size, " packages."));
                        return [2 /*return*/];
                }
            });
        });
    };
    RepoGraphService.prototype.getAllFiles = function (dir) {
        return __awaiter(this, void 0, void 0, function () {
            var results, entries, _i, entries_2, entry, p, _a, _b, e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        results = [];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 8, , 9]);
                        return [4 /*yield*/, fs_1.default.promises.readdir(dir, { withFileTypes: true })];
                    case 2:
                        entries = _c.sent();
                        _i = 0, entries_2 = entries;
                        _c.label = 3;
                    case 3:
                        if (!(_i < entries_2.length)) return [3 /*break*/, 7];
                        entry = entries_2[_i];
                        p = path_1.default.join(dir, entry.name);
                        if (!entry.isDirectory()) return [3 /*break*/, 5];
                        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.') || entry.name === 'coverage')
                            return [3 /*break*/, 6];
                        _b = (_a = results).concat;
                        return [4 /*yield*/, this.getAllFiles(p)];
                    case 4:
                        results = _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 6];
                    case 5:
                        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                            results.push(p);
                        }
                        _c.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 3];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        e_2 = _c.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, results];
                }
            });
        });
    };
    RepoGraphService.prototype.toJSON = function () {
        var nodes = new Set();
        var links = [];
        // Add all keys from dependencies to ensure disconnected nodes (that have deps) are present
        for (var _i = 0, _a = this.dependencies.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], source = _b[0], targets = _b[1];
            nodes.add(source);
            for (var _c = 0, targets_1 = targets; _c < targets_1.length; _c++) {
                var target = targets_1[_c];
                nodes.add(target);
                links.push({ source: source, target: target });
            }
        }
        // Also add files that are consumers but have no deps? (rare but possible)
        for (var _d = 0, _e = this.consumers.entries(); _d < _e.length; _d++) {
            var _f = _e[_d], target = _f[0], sources = _f[1];
            nodes.add(target);
            for (var _g = 0, sources_1 = sources; _g < sources_1.length; _g++) {
                var source = sources_1[_g];
                nodes.add(source);
                // Links already added via dependencies iteration usually, but let's be safe?
                // Actually dependencies map forward is the source of truth for links.
            }
        }
        var dependencies = {};
        for (var _h = 0, _j = this.dependencies.entries(); _h < _j.length; _h++) {
            var _k = _j[_h], k = _k[0], v = _k[1];
            dependencies[k] = Array.from(v);
        }
        return {
            nodes: Array.from(nodes).map(function (id) {
                var parts = id.split('/');
                return {
                    id: id,
                    name: path_1.default.basename(id),
                    group: parts[0] === 'packages' ? parts[1] : parts[0] // Better grouping
                };
            }),
            links: links.map(function (l) { return ({ source: l.source, target: l.target }); }),
            dependencies: dependencies // Add raw dependencies for UI consumers
        };
    };
    return RepoGraphService;
}());
exports.RepoGraphService = RepoGraphService;
