"use strict";
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
exports.CodeAgent = exports.ResearchAgent = void 0;
var BaseAgent_js_1 = require("./BaseAgent.js");
var ResearchAgent = /** @class */ (function (_super) {
    __extends(ResearchAgent, _super);
    function ResearchAgent(task, server) {
        var _this = _super.call(this, 'research', task) || this;
        _this.server = server;
        return _this;
    }
    ResearchAgent.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var agentResult, _a, output, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.status = BaseAgent_js_1.AgentStatus.RUNNING;
                        this.log('Starting research task...');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        this.log('Dispatching to researcher agent...');
                        if (!this.server.researcherAgent) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.server.researcherAgent.handleTask({ task: this.task, options: { depth: 2, breadth: 3 } })];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.server.deepResearchService.recursiveResearch(this.task, 2, 3)];
                    case 4:
                        _a = _b.sent();
                        _b.label = 5;
                    case 5:
                        agentResult = _a;
                        output = typeof agentResult === 'string'
                            ? agentResult
                            : JSON.stringify(agentResult, null, 2);
                        this.complete("Research complete for: ".concat(this.task, "\n\n").concat(output));
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _b.sent();
                        this.fail(e_1.message);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return ResearchAgent;
}(BaseAgent_js_1.BaseAgent));
exports.ResearchAgent = ResearchAgent;
var CodeAgent = /** @class */ (function (_super) {
    __extends(CodeAgent, _super);
    function CodeAgent(task, server) {
        var _this = _super.call(this, 'code', task) || this;
        _this.server = server;
        return _this;
    }
    CodeAgent.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, changed, reasoning, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.status = BaseAgent_js_1.AgentStatus.RUNNING;
                        this.log('Starting coding task...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        this.log('Dispatching to coder agent...');
                        if (!this.server.coderAgent) {
                            throw new Error('Coder agent is not initialized');
                        }
                        return [4 /*yield*/, this.server.coderAgent.handleTask({ task: this.task })];
                    case 2:
                        result = _a.sent();
                        changed = Array.isArray(result === null || result === void 0 ? void 0 : result.filesChanged) ? result.filesChanged.join(', ') : 'none';
                        reasoning = (result === null || result === void 0 ? void 0 : result.reasoning) ? "\nReasoning: ".concat(result.reasoning) : '';
                        this.complete("Coding task complete for: ".concat(this.task, "\n\nFiles changed: ").concat(changed).concat(reasoning));
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        this.fail(e_2.message);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return CodeAgent;
}(BaseAgent_js_1.BaseAgent));
exports.CodeAgent = CodeAgent;
