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
exports.McpmInstaller = void 0;
var McpmRegistry_js_1 = require("./McpmRegistry.js");
var mcp_registry_1 = require("@borg/mcp-registry");
var child_process_1 = require("child_process");
var path_1 = require("path");
var promises_1 = require("fs/promises");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
var McpmInstaller = /** @class */ (function () {
    function McpmInstaller(installDir) {
        this.legacyRegistry = new McpmRegistry_js_1.McpmRegistry();
        this.mcpRegistry = new mcp_registry_1.Registry();
        this.installDir = installDir;
    }
    McpmInstaller.prototype.install = function (skillName) {
        return __awaiter(this, void 0, void 0, function () {
            var mcpServer, e_1, results, match, targetPath, _a, e_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        mcpServer = this.mcpRegistry.list().find(function (s) { return s.package === skillName || s.name === skillName; });
                        if (!mcpServer) return [3 /*break*/, 4];
                        console.log("[McpmInstaller] Installing MCP Server: ".concat(mcpServer.package));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        // Execute the internal borg CLI command
                        return [4 /*yield*/, this.runCommand("npx borg mcp install ".concat(mcpServer.package))];
                    case 2:
                        // Execute the internal borg CLI command
                        _b.sent();
                        return [2 /*return*/, "Successfully installed MCP Server '".concat(mcpServer.name, "'")];
                    case 3:
                        e_1 = _b.sent();
                        throw new Error("Failed to install MCP server: ".concat(getErrorMessage(e_1)));
                    case 4: return [4 /*yield*/, this.legacyRegistry.search(skillName)];
                    case 5:
                        results = _b.sent();
                        match = results.find(function (r) { return r.name.toLowerCase() === skillName.toLowerCase(); }) || results[0];
                        if (!match) {
                            throw new Error("Skill or Server '".concat(skillName, "' not found in any registry."));
                        }
                        targetPath = path_1.default.join(this.installDir, match.name);
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, promises_1.default.access(targetPath)];
                    case 7:
                        _b.sent();
                        return [2 /*return*/, "Skill '".concat(match.name, "' is already installed at ").concat(targetPath, ". (Skipping download)")];
                    case 8:
                        _a = _b.sent();
                        return [3 /*break*/, 9];
                    case 9: // Proceeds if doesn't exist
                    return [4 /*yield*/, promises_1.default.mkdir(this.installDir, { recursive: true })];
                    case 10:
                        _b.sent();
                        console.log("[McpmInstaller] Cloning ".concat(match.url, " to ").concat(targetPath, "..."));
                        _b.label = 11;
                    case 11:
                        _b.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, this.runCommand("git clone ".concat(match.url, " \"").concat(targetPath, "\""))];
                    case 12:
                        _b.sent();
                        return [2 /*return*/, "Successfully installed '".concat(match.name, "' from ").concat(match.url)];
                    case 13:
                        e_2 = _b.sent();
                        throw new Error("Failed to clone skill: ".concat(getErrorMessage(e_2)));
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    McpmInstaller.prototype.search = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.legacyRegistry.search(query)];
            });
        });
    };
    McpmInstaller.prototype.runCommand = function (cmd) {
        return new Promise(function (resolve, reject) {
            var p = (0, child_process_1.spawn)(cmd, { shell: true, stdio: 'inherit' });
            p.on('close', function (code) { return code === 0 ? resolve() : reject(new Error("Command failed: ".concat(cmd))); });
            p.on('error', reject);
        });
    };
    return McpmInstaller;
}());
exports.McpmInstaller = McpmInstaller;
