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
exports.AutoTestService = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var child_process_1 = require("child_process");
var RepoGraphService_js_1 = require("./RepoGraphService.js");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
var AutoTestService = /** @class */ (function () {
    function AutoTestService(rootDir) {
        this.watcher = null;
        this.processingParams = new Set();
        this.testResults = new Map();
        this.isRunning = false;
        this.rootDir = rootDir;
        this.repoGraph = new RepoGraphService_js_1.RepoGraphService(rootDir);
    }
    AutoTestService.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.watcher)
                            return [2 /*return*/];
                        console.log("[AutoTest] Building Dependency Graph...");
                        return [4 /*yield*/, this.repoGraph.buildGraph()];
                    case 1:
                        _a.sent();
                        console.log("[AutoTest] Watching ".concat(this.rootDir, " for changes..."));
                        try {
                            this.watcher = fs_1.default.watch(this.rootDir, { recursive: true }, function (eventType, filename) {
                                if (filename && !_this.isIgnored(filename)) {
                                    _this.handleFileChange(filename);
                                }
                            });
                            this.isRunning = true;
                        }
                        catch (e) {
                            console.error("[AutoTest] Watch failed: ".concat(getErrorMessage(e)));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    AutoTestService.prototype.stop = function () {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.isRunning = false;
    };
    AutoTestService.prototype.isIgnored = function (filename) {
        if (filename.includes('node_modules'))
            return true;
        if (filename.includes('.git'))
            return true;
        if (filename.includes('dist'))
            return true;
        if (filename.includes('.turbo'))
            return true;
        if (filename.endsWith('.log'))
            return true;
        return false;
    };
    AutoTestService.prototype.handleFileChange = function (filename) {
        var _this = this;
        if (this.processingParams.has(filename))
            return;
        this.processingParams.add(filename);
        setTimeout(function () { return _this.processingParams.delete(filename); }, 2000);
        console.log("[AutoTest] File changed: ".concat(filename));
        var testFile = this.findTestFile(filename);
        if (testFile) {
            console.log("[AutoTest] Found test file: ".concat(testFile, ". Running..."));
            this.runTest(testFile);
        }
        // Check consumers
        var consumers = this.repoGraph.getConsumers(filename);
        if (consumers.length > 0) {
            console.log("[AutoTest] Forward Dependencies: ".concat(consumers.join(', ')));
            for (var _i = 0, consumers_1 = consumers; _i < consumers_1.length; _i++) {
                var consumer = consumers_1[_i];
                var consumerTest = this.findTestFile(consumer);
                if (consumerTest && consumerTest !== testFile) {
                    console.log("[AutoTest] Triggering dependent test: ".concat(consumerTest));
                    this.runTest(consumerTest);
                }
            }
        }
    };
    AutoTestService.prototype.findTestFile = function (sourceFile) {
        // Normalize slashes
        var normalized = sourceFile.split(path_1.default.sep).join('/');
        // 1. Is it a test file?
        if (normalized.endsWith('.test.ts') || normalized.endsWith('.spec.ts')) {
            return path_1.default.join(this.rootDir, sourceFile);
        }
        // 2. Sibling test: foo.ts -> foo.test.ts
        var siblingTest = sourceFile.replace(/\.ts$/, '.test.ts');
        if (fs_1.default.existsSync(path_1.default.join(this.rootDir, siblingTest))) {
            return path_1.default.join(this.rootDir, siblingTest);
        }
        // 3. Central test dir heuristic
        // packages/pkg/src/foo.ts -> packages/pkg/test/foo.test.ts
        var parts = sourceFile.split(path_1.default.sep);
        // Find 'src' and backtrack to package root
        var srcIndex = parts.lastIndexOf('src');
        if (srcIndex > 0) { // e.g. packages/core/src/...
            var pkgRoot = parts.slice(0, srcIndex).join(path_1.default.sep); // packages/core
            var fileName = path_1.default.basename(sourceFile, '.ts');
            var testPath = path_1.default.join(this.rootDir, pkgRoot, 'test', "".concat(fileName, ".test.ts"));
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return null;
    };
    AutoTestService.prototype.runTest = function (testFilePath) {
        var _this = this;
        var _a, _b;
        console.log("[AutoTest] Spawning vitest for ".concat(testFilePath));
        this.testResults.set(testFilePath, { status: 'running', timestamp: Date.now() });
        var p = (0, child_process_1.spawn)('npx', ['vitest', 'run', testFilePath], {
            cwd: this.rootDir,
            shell: true,
            stdio: 'pipe' // Pipe to capture output
        });
        var output = '';
        (_a = p.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (d) { output += d.toString(); process.stdout.write(d); });
        (_b = p.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (d) { output += d.toString(); process.stderr.write(d); });
        p.on('close', function (code) {
            if (code === 0) {
                console.log("[AutoTest] \u2705 Passed: ".concat(testFilePath));
                _this.testResults.set(testFilePath, { status: 'pass', timestamp: Date.now(), output: output });
            }
            else {
                console.error("[AutoTest] \u274C Failed: ".concat(testFilePath));
                _this.testResults.set(testFilePath, { status: 'fail', timestamp: Date.now(), output: output });
            }
        });
    };
    return AutoTestService;
}());
exports.AutoTestService = AutoTestService;
