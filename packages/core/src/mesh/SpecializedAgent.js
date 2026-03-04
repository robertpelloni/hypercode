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
exports.SpecializedAgent = void 0;
var MeshService_js_1 = require("./MeshService.js");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function parseTaskOffer(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    var record = payload;
    if (typeof record.task !== 'string') {
        return null;
    }
    if (record.requirements !== undefined &&
        (!Array.isArray(record.requirements) || !record.requirements.every(function (req) { return typeof req === 'string'; }))) {
        return null;
    }
    return record;
}
var SpecializedAgent = /** @class */ (function () {
    function SpecializedAgent(role, capabilities) {
        if (capabilities === void 0) { capabilities = []; }
        this.capabilities = [];
        this.mesh = new MeshService_js_1.MeshService();
        this.nodeId = this.mesh.nodeId;
        this.role = role;
        this.capabilities = capabilities;
        this.initialize();
    }
    SpecializedAgent.prototype.initialize = function () {
        var _this = this;
        console.log("[".concat(this.role, "] \uD83E\uDD16 Initializing Specialized Agent (Node: ").concat(this.nodeId.slice(0, 8), "...)"));
        this.mesh.on('message', function (msg) { return __awaiter(_this, void 0, void 0, function () {
            var offer, offer, result, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 1. Handle Capability Queries
                        if (msg.type === MeshService_js_1.SwarmMessageType.CAPABILITY_QUERY) {
                            console.log("[".concat(this.role, "] \u2753 Received Capability Query from ").concat(msg.sender.slice(0, 8), "..."));
                            // Use sendResponse for RPC
                            this.mesh.sendResponse(msg, MeshService_js_1.SwarmMessageType.CAPABILITY_RESPONSE, {
                                role: this.role,
                                capabilities: this.capabilities,
                                load: 0
                            });
                            return [2 /*return*/];
                        }
                        // 2. Handle Task Offers (Bidding Phase)
                        if (msg.type === MeshService_js_1.SwarmMessageType.TASK_OFFER) {
                            offer = parseTaskOffer(msg.payload);
                            if (!offer) {
                                console.warn("[".concat(this.role, "] \u26A0\uFE0F Ignoring malformed task offer from ").concat(msg.sender.slice(0, 8), "..."));
                                return [2 /*return*/];
                            }
                            if (this.canHandle(offer)) {
                                console.log("[".concat(this.role, "] \u270B Bidding for Task Offer: ").concat(offer.task.slice(0, 30), "..."));
                                this.mesh.sendResponse(msg, MeshService_js_1.SwarmMessageType.TASK_BID, {
                                    task: offer.task,
                                    originalTaskId: msg.id,
                                    load: 0 // In the future, report actual CPU/Token load here 
                                });
                            }
                            return [2 /*return*/];
                        }
                        if (!(msg.type === MeshService_js_1.SwarmMessageType.TASK_ASSIGN)) return [3 /*break*/, 4];
                        if (msg.target !== this.nodeId)
                            return [2 /*return*/]; // Ignore if assigned to someone else
                        offer = parseTaskOffer(msg.payload);
                        if (!offer)
                            return [2 /*return*/];
                        console.log("[".concat(this.role, "] \uD83E\uDD1D Accepted Task Assignment: ").concat(offer.task.slice(0, 30), "..."));
                        this.mesh.sendResponse(msg, MeshService_js_1.SwarmMessageType.TASK_ACCEPT, { task: offer.task });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.handleTask(offer)];
                    case 2:
                        result = _a.sent();
                        // Send Result as a Direct Message
                        this.mesh.sendDirect(msg.sender, MeshService_js_1.SwarmMessageType.TASK_RESULT, {
                            originalTaskId: offer.originalTaskId || msg.id, // Support the original ID being passed down
                            result: result
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        this.mesh.sendDirect(msg.sender, MeshService_js_1.SwarmMessageType.TASK_RESULT, {
                            originalTaskId: offer.originalTaskId || msg.id,
                            error: getErrorMessage(e_1)
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    };
    SpecializedAgent.prototype.canHandle = function (offer) {
        var _this = this;
        if (offer.requirements) {
            return offer.requirements.every(function (req) { return _this.capabilities.includes(req) || _this.role === req; });
        }
        return true;
    };
    SpecializedAgent.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.mesh.destroy();
                return [2 /*return*/];
            });
        });
    };
    return SpecializedAgent;
}());
exports.SpecializedAgent = SpecializedAgent;
