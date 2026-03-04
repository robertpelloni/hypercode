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
exports.createCouncilTools = void 0;
var zod_1 = require("zod");
var createCouncilTools = function (councilService) { return [
    {
        name: "council_start_session",
        description: "Start a new debate session for The Council to discuss a complex topic.",
        inputSchema: zod_1.z.object({
            topic: zod_1.z.string().describe("The topic or question to be debated"),
        }),
        handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                session = councilService.startSession(args.topic);
                return [2 /*return*/, {
                        content: [{ type: "text", text: "Council Session started with ID: ".concat(session.id) }]
                    }];
            });
        }); }
    },
    {
        name: "council_list_sessions",
        description: "List active Council debate sessions.",
        inputSchema: zod_1.z.object({}),
        handler: function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessions;
            return __generator(this, function (_a) {
                sessions = councilService
                    .listSessions()
                    .filter(function (s) { return s.status === 'active'; });
                return [2 /*return*/, {
                        content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }]
                    }];
            });
        }); }
    },
    {
        name: "council_submit_opinion",
        description: "Submit an opinion or argument to an active Council session.",
        inputSchema: zod_1.z.object({
            sessionId: zod_1.z.string().describe("The ID of the council session"),
            agentId: zod_1.z.string().describe("The ID or Persona of the agent submitting the opinion"),
            content: zod_1.z.string().describe("The argument or opinion text")
        }),
        handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                councilService.submitOpinion(args.sessionId, args.agentId, args.content);
                return [2 /*return*/, {
                        content: [{ type: "text", text: "Opinion submitted to session ".concat(args.sessionId) }]
                    }];
            });
        }); }
    },
    {
        name: "council_read_session",
        description: "Read the full history of a Council session including opinions and votes.",
        inputSchema: zod_1.z.object({
            sessionId: zod_1.z.string().describe("The ID of the council session"),
        }),
        handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                session = councilService.getSession(args.sessionId);
                if (!session) {
                    return [2 /*return*/, { isError: true, content: [{ type: "text", text: "Session not found" }] }];
                }
                return [2 /*return*/, {
                        content: [{ type: "text", text: JSON.stringify(session, null, 2) }]
                    }];
            });
        }); }
    },
    {
        name: "council_advance_round",
        description: "Advance the debate to the next round.",
        inputSchema: zod_1.z.object({
            sessionId: zod_1.z.string(),
        }),
        handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                councilService.advanceRound(args.sessionId);
                return [2 /*return*/, {
                        content: [{ type: "text", text: "Session ".concat(args.sessionId, " advanced to next round") }]
                    }];
            });
        }); }
    },
    {
        name: "council_vote",
        description: "Cast a vote in the Council session.",
        inputSchema: zod_1.z.object({
            sessionId: zod_1.z.string(),
            agentId: zod_1.z.string(),
            choice: zod_1.z.string(),
            reason: zod_1.z.string()
        }),
        handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                councilService.castVote(args.sessionId, args.agentId, args.choice, args.reason);
                return [2 /*return*/, {
                        content: [{ type: "text", text: "Vote caused by ".concat(args.agentId) }]
                    }];
            });
        }); }
    },
    {
        name: "council_conclude",
        description: "End a council session.",
        inputSchema: zod_1.z.object({
            sessionId: zod_1.z.string(),
        }),
        handler: function (args) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                councilService.concludeSession(args.sessionId);
                return [2 /*return*/, {
                        content: [{ type: "text", text: "Session ".concat(args.sessionId, " concluded") }]
                    }];
            });
        }); }
    }
]; };
exports.createCouncilTools = createCouncilTools;
