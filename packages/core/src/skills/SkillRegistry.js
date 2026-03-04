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
exports.SkillRegistry = void 0;
var fast_glob_1 = require("fast-glob");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var gray_matter_1 = require("gray-matter");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * SkillRegistry
 *
 * Discovers, loads, and manages Borg's skill library.
 * Skills are portable runbooks (SKILL.md files with YAML frontmatter) that
 * agents can read and follow to perform specialized tasks.
 *
 * Discovery:
 * - Scans configured `searchPaths` directories for `SKILL.md` files
 * - Uses `fast-glob` with max depth 3 to find skill files
 * - Parses YAML frontmatter via `gray-matter` for metadata
 *
 * MCP Tool Exposure:
 * - `getSkillTools()` returns MCP-compatible tool definitions (list, read, create, update)
 * - `skillsRouter.ts` exposes skills via tRPC for the dashboard frontend
 *
 * Master Index:
 * - Optional `masterIndexPath` points to a JSONC file cataloging all available
 *   MCP servers, harnesses, and skills for the library UI.
 */
var SkillRegistry = /** @class */ (function () {
    function SkillRegistry(searchPaths) {
        /** In-memory cache of loaded skills, keyed by skill ID */
        this.skills = new Map();
        this.searchPaths = searchPaths;
    }
    SkillRegistry.prototype.setMasterIndexPath = function (indexPath) {
        this.masterIndexPath = indexPath;
    };
    SkillRegistry.prototype.getLibraryIndex = function () {
        return __awaiter(this, void 0, void 0, function () {
            var content, cleanJSON, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.masterIndexPath) {
                            return [2 /*return*/, { categories: { mcp_servers: [], universal_harness: [], skills: [] } }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, promises_1.default.readFile(this.masterIndexPath, 'utf-8')];
                    case 2:
                        content = _a.sent();
                        cleanJSON = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, function (m, g) { return g ? "" : m; });
                        return [2 /*return*/, JSON.parse(cleanJSON)];
                    case 3:
                        e_1 = _a.sent();
                        console.error("Error reading master index:", e_1);
                        return [2 /*return*/, { categories: { mcp_servers: [], universal_harness: [], skills: [] } }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SkillRegistry.prototype.hasSkill = function (id) {
        // Skill IDs in the map are usually the folders/names
        return this.skills.has(id);
    };
    SkillRegistry.prototype.getSkills = function () {
        return Array.from(this.skills.values());
    };
    SkillRegistry.prototype.loadSkills = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, loc, entries, _b, entries_1, file, e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.skills.clear();
                        _i = 0, _a = this.searchPaths;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        loc = _a[_i];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 8, , 9]);
                        return [4 /*yield*/, (0, fast_glob_1.default)(['**/SKILL.md', '**/skill.md'], {
                                cwd: loc,
                                absolute: true,
                                deep: 3 // Go deeper just in case
                            })];
                    case 3:
                        entries = _c.sent();
                        _b = 0, entries_1 = entries;
                        _c.label = 4;
                    case 4:
                        if (!(_b < entries_1.length)) return [3 /*break*/, 7];
                        file = entries_1[_b];
                        return [4 /*yield*/, this.parseSkill(file)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        _b++;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        e_2 = _c.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 1];
                    case 10:
                        console.log("Borg Core: Loaded ".concat(this.skills.size, " skills."));
                        return [2 /*return*/];
                }
            });
        });
    };
    SkillRegistry.prototype.parseSkill = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var raw, _a, data, content, id, skill, e_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, promises_1.default.readFile(filePath, 'utf-8')];
                    case 1:
                        raw = _b.sent();
                        _a = (0, gray_matter_1.default)(raw), data = _a.data, content = _a.content;
                        id = data.name || path_1.default.basename(path_1.default.dirname(filePath));
                        skill = {
                            id: id,
                            name: data.name || id,
                            description: data.description || "No description provided",
                            content: content,
                            path: filePath
                        };
                        this.skills.set(id, skill);
                        return [3 /*break*/, 3];
                    case 2:
                        e_3 = _b.sent();
                        console.error("Failed to parse skill at ".concat(filePath), e_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SkillRegistry.prototype.getSkillTools = function () {
        return [
            {
                name: "list_skills",
                description: "List all available skills (runbooks)",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "read_skill",
                description: "Read the content/instructions of a specific skill",
                inputSchema: {
                    type: "object",
                    properties: {
                        skillName: { type: "string" }
                    },
                    required: ["skillName"]
                }
            },
            {
                name: "create_skill",
                description: "Create a new skill (runbook)",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Unique ID (folder name)" },
                        name: { type: "string" },
                        description: { type: "string" }
                    },
                    required: ["id", "name", "description"]
                }
            },
            {
                name: "update_skill",
                description: "Update content of an existing skill",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        content: { type: "string" }
                    },
                    required: ["id", "content"]
                }
            }
        ];
    };
    SkillRegistry.prototype.listSkills = function () {
        return __awaiter(this, void 0, void 0, function () {
            var skillList;
            return __generator(this, function (_a) {
                skillList = Array.from(this.skills.values()).map(function (s) { return ({
                    name: s.name,
                    description: s.description
                }); });
                return [2 /*return*/, {
                        content: [{
                                type: "text",
                                text: JSON.stringify(skillList, null, 2)
                            }]
                    }];
            });
        });
    };
    SkillRegistry.prototype.readSkill = function (skillName) {
        return __awaiter(this, void 0, void 0, function () {
            var skill;
            return __generator(this, function (_a) {
                skill = this.skills.get(skillName);
                if (!skill) {
                    return [2 /*return*/, {
                            content: [{ type: "text", text: "Skill '".concat(skillName, "' not found.") }]
                        }];
                }
                return [2 /*return*/, {
                        content: [{
                                type: "text",
                                text: skill.content
                            }]
                    }];
            });
        });
    };
    SkillRegistry.prototype.createSkill = function (id, name, description) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDir, skillDir, skillFile, content, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        targetDir = this.searchPaths[0];
                        skillDir = path_1.default.join(targetDir, id);
                        skillFile = path_1.default.join(skillDir, 'SKILL.md');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, promises_1.default.mkdir(skillDir, { recursive: true })];
                    case 2:
                        _a.sent();
                        content = "---\nname: ".concat(name, "\ndescription: ").concat(description, "\n---\n\n# ").concat(name, "\n\n").concat(description, "\n\n## Instructions\n1. ...\n");
                        return [4 /*yield*/, promises_1.default.writeFile(skillFile, content, 'utf-8')];
                    case 3:
                        _a.sent();
                        // Reload to pick up new skill
                        return [4 /*yield*/, this.parseSkill(skillFile)];
                    case 4:
                        // Reload to pick up new skill
                        _a.sent();
                        return [2 /*return*/, {
                                content: [{ type: "text", text: "Created skill '".concat(name, "' at ").concat(skillFile) }]
                            }];
                    case 5:
                        e_4 = _a.sent();
                        return [2 /*return*/, { content: [{ type: "text", text: "Error creating skill: ".concat(getErrorMessage(e_4)) }] }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SkillRegistry.prototype.saveSkill = function (id, content) {
        return __awaiter(this, void 0, void 0, function () {
            var skill, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        skill = this.skills.get(id);
                        if (!skill) {
                            return [2 /*return*/, { content: [{ type: "text", text: "Skill '".concat(id, "' not found.") }] }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, promises_1.default.writeFile(skill.path, content, 'utf-8')];
                    case 2:
                        _a.sent();
                        // Update in-memory
                        skill.content = content;
                        // Re-parse to update frontmatter if changed
                        return [4 /*yield*/, this.parseSkill(skill.path)];
                    case 3:
                        // Re-parse to update frontmatter if changed
                        _a.sent();
                        return [2 /*return*/, { content: [{ type: "text", text: "Saved skill '".concat(id, "'.") }] }];
                    case 4:
                        e_5 = _a.sent();
                        return [2 /*return*/, { content: [{ type: "text", text: "Error saving skill: ".concat(getErrorMessage(e_5)) }] }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return SkillRegistry;
}());
exports.SkillRegistry = SkillRegistry;
