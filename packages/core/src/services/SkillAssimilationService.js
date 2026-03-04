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
exports.SkillAssimilationService = void 0;
var promises_1 = require("fs/promises");
var path_1 = require("path");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
var SkillAssimilationService = /** @class */ (function () {
    function SkillAssimilationService(skillRegistry, llm, deepResearch) {
        this.skillRegistry = skillRegistry;
        this.llm = llm;
        this.deepResearch = deepResearch;
        this.skillsDir = path_1.default.join(process.cwd(), 'packages', 'core', 'src', 'skills');
    }
    /**
     * Learn a new skill from documentation or prompt
     */
    SkillAssimilationService.prototype.assimilate = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var logs, log, researchContext, result, systemPrompt, codeResponse, code, safeName, fileName, filePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logs = [];
                        log = function (msg) { console.log("[Assimilation] ".concat(msg)); logs.push(msg); };
                        log("Starting assimilation for: ".concat(request.topic));
                        // 1. Research phase
                        log("Phase 1: Researching documentation...");
                        researchContext = "";
                        if (!request.docsUrl) return [3 /*break*/, 1];
                        // Direct URL research
                        researchContext = "Documentation from ".concat(request.docsUrl);
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.deepResearch.researchTopic(request.topic, 2)];
                    case 2:
                        result = _a.sent();
                        // Format findings based on research result structure
                        researchContext = "SUMMARY:\n".concat(result.summary, "\n\nSOURCES:\n").concat(result.sources ? result.sources.map(function (s) { return "- ".concat(s.title, ": ").concat(s.url); }).join('\n') : 'No sources');
                        _a.label = 3;
                    case 3:
                        log("Phase 2: Generating MCP Tool Code...");
                        systemPrompt = "You are a Senior TypeScript Engineer.\nYour goal is to write a robust Model Context Protocol (MCP) Tool in TypeScript.\nThe tool must be a standalone file that exports a tool definition.\n\nInput Context:\n".concat(researchContext, "\n\nConstraints:\n- Use 'zod' for input schema.\n- Export a const named 'toolDefinition' matching { name, description, schema, execute }.\n- Or simpler: Export a class implementing 'Tool' interface if that's the project style.\n- IMPORTANT: Check existing 'packages/core/src/skills' pattern.\n- NO placeholders. Real implementation using 'child_process' or 'fetch'.\n");
                        return [4 /*yield*/, this.llm.generateText("openai", "gpt-4o", systemPrompt, "Write an MCP tool for: ".concat(request.topic))];
                    case 4:
                        codeResponse = _a.sent();
                        code = codeResponse.content.replace(/```typescript/g, '').replace(/```/g, '').trim();
                        // Basic validation/cleanup of code
                        if (!code.includes("export")) {
                            log("Error: Generated code has no exports.");
                            return [2 /*return*/, { success: false, logs: logs }];
                        }
                        safeName = request.topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        fileName = "".concat(safeName, ".ts");
                        filePath = path_1.default.join(this.skillsDir, fileName);
                        log("Phase 3: Writing to ".concat(fileName, "..."));
                        return [4 /*yield*/, promises_1.default.mkdir(this.skillsDir, { recursive: true })];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, promises_1.default.writeFile(filePath, code)];
                    case 6:
                        _a.sent();
                        // 4. Hot Reload (Register)
                        log("Phase 4: Hot Reloading...");
                        try {
                            // In a real scenario, we might need to compile via 'tsc' or 'swc' first if not using ts-node/tsx runner
                            // For now, we assume the server can load TS or we just validate it.
                            // To properly load, we might need to tell SkillRegistry to scan.
                            // this.server.skillRegistry.scan();
                            log("Tool saved. Restart might be required unless Hot Reload is fully enabled.");
                        }
                        catch (e) {
                            log("Hot reload failed: ".concat(getErrorMessage(e)));
                        }
                        return [2 /*return*/, { success: true, toolName: safeName, logs: logs }];
                }
            });
        });
    };
    return SkillAssimilationService;
}());
exports.SkillAssimilationService = SkillAssimilationService;
