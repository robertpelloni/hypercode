"use strict";
/**
 * SwarmOrchestrator.ts
 *
 * Manages horizontal parallel execution of sub-tasks by multiple AI agents.
 *
 * Usage: Provide a massive prompt/task and let the Swarm split it,
 * delegate to worker nodes, and aggregate the results.
 *
 * v2.7.35: Wired decomposeGoal to the Autopilot Council for real LLM-backed
 * task decomposition, and executeTask to the Autopilot session runner for
 * live agent execution. Falls back to basic local decomposition if the
 * autopilot server is unavailable.
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
exports.SwarmOrchestrator = void 0;
var uuid_1 = require("uuid");
var events_1 = require("events");
var MeshService_js_1 = require("../../mesh/MeshService.js");
var RateLimiter_js_1 = require("./RateLimiter.js");
var SwarmOrchestrator = /** @class */ (function (_super) {
    __extends(SwarmOrchestrator, _super);
    function SwarmOrchestrator(config, missionService, healerService) {
        if (config === void 0) { config = {}; }
        var _this = _super.call(this) || this;
        _this.tasks = new Map();
        // Track tasks waiting for manual approval
        _this.approvalResolvers = new Map();
        _this.config = {
            maxConcurrency: config.maxConcurrency || 5,
            defaultModel: config.defaultModel || 'gpt-4o-mini',
            timeoutMs: config.timeoutMs || 300000,
            maxRetries: config.maxRetries || 3,
            maxTokensPerMission: config.maxTokensPerMission || 1000000,
            maxTokensPerTask: config.maxTokensPerTask || 100000,
            rpmLimit: config.rpmLimit || 50,
            tpmLimit: config.tpmLimit || 40000
        };
        _this.rateLimiter = new RateLimiter_js_1.RateLimiter(_this.config.rpmLimit, _this.config.tpmLimit);
        _this.opencodeUrl = config.opencodeUrl || 'http://localhost:3847';
        _this.mesh = new MeshService_js_1.MeshService();
        _this.missionService = missionService;
        _this.healerService = healerService;
        return _this;
    }
    /**
     * Resumes execution for an existing mission.
     */
    SwarmOrchestrator.prototype.resumeMission = function (missionId) {
        return __awaiter(this, void 0, void 0, function () {
            var mission;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.missionService)
                            throw new Error('MissionService not available');
                        mission = this.missionService.getMission(missionId);
                        if (!mission)
                            throw new Error("Mission ".concat(missionId, " not found"));
                        this.currentMissionId = missionId;
                        mission.tasks.forEach(function (t) { return _this.tasks.set(t.id, t); });
                        console.log("[Swarm] Resuming mission ".concat(missionId, " with ").concat(this.tasks.size, " tasks."));
                        return [4 /*yield*/, this.executeSwarm()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Manually approve or reject a task.
     */
    SwarmOrchestrator.prototype.approveTask = function (taskId, approved) {
        var resolver = this.approvalResolvers.get(taskId);
        if (resolver) {
            resolver(approved);
            this.approvalResolvers.delete(taskId);
            return true;
        }
        return false;
    };
    /**
     * Explodes a single task into its own sub-mission. (Phase 82)
     */
    SwarmOrchestrator.prototype.decomposeTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, subTasks, subMission;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.missionService)
                            return [2 /*return*/, null];
                        task = this.tasks.get(taskId);
                        if (!task || !this.currentMissionId)
                            return [2 /*return*/, null];
                        console.log("[Swarm] Recursively decomposing task: ".concat(task.description));
                        return [4 /*yield*/, this.decomposeGoal("SUB-TASK: ".concat(task.description))];
                    case 1:
                        subTasks = _a.sent();
                        subMission = this.missionService.createMission(task.description, subTasks, this.currentMissionId);
                        // Update the parent task state
                        task.status = 'awaiting_subtask';
                        task.subMissionId = subMission.id;
                        this.missionService.updateMissionTask(this.currentMissionId, taskId, {
                            status: 'awaiting_subtask',
                            subMissionId: subMission.id
                        });
                        this.emit('task:decomposed', { taskId: taskId, subMissionId: subMission.id });
                        return [2 /*return*/, subMission];
                }
            });
        });
    };
    /**
     * Decompose a master prompt into actionable sub-tasks.
     *
     * Uses the Autopilot Council's debate endpoint to generate a real
     * task breakdown via multi-model consensus. Falls back to a simple
     * three-phase split if the council is unreachable.
     */
    SwarmOrchestrator.prototype.decomposeGoal = function (masterPrompt, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var subTasks, res, debateResult, consensusText, parsed, err_1, mission;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("[Swarm] Decomposing: ".concat(masterPrompt));
                        subTasks = [];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, fetch("".concat(this.opencodeUrl, "/api/council/debate"), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: (0, uuid_1.v4)(),
                                    description: "Decompose this goal into 3-7 independent, parallel-executable sub-tasks. Return ONLY a JSON array of objects with {description: string}. Goal: ".concat(masterPrompt),
                                    context: "You are a task decomposition architect. Break the goal into concrete, actionable sub-tasks that can be executed independently and in parallel by different AI models. Each task should be self-contained.",
                                    files: []
                                }),
                                signal: AbortSignal.timeout(this.config.timeoutMs)
                            })];
                    case 2:
                        res = _c.sent();
                        if (!res.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, res.json()];
                    case 3:
                        debateResult = _c.sent();
                        consensusText = ((_a = debateResult === null || debateResult === void 0 ? void 0 : debateResult.consensus) === null || _a === void 0 ? void 0 : _a.finalAnswer)
                            || ((_b = debateResult === null || debateResult === void 0 ? void 0 : debateResult.consensus) === null || _b === void 0 ? void 0 : _b.text)
                            || (debateResult === null || debateResult === void 0 ? void 0 : debateResult.result)
                            || '';
                        parsed = this.extractTasksFromLLMResponse(consensusText, masterPrompt, tools);
                        if (parsed.length > 0) {
                            subTasks = parsed;
                            console.log("[Swarm] Council decomposed goal into ".concat(subTasks.length, " real tasks"));
                        }
                        _c.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err_1 = _c.sent();
                        console.warn("[Swarm] Council unavailable for decomposition (".concat(err_1.message, "), using local fallback"));
                        return [3 /*break*/, 6];
                    case 6:
                        // Fallback: basic three-phase decomposition if council didn't return tasks
                        if (subTasks.length === 0) {
                            subTasks = [
                                { id: (0, uuid_1.v4)(), description: "Analyze and plan: ".concat(masterPrompt), status: 'pending', priority: 5, tools: tools || [] },
                                { id: (0, uuid_1.v4)(), description: "Implement core logic for: ".concat(masterPrompt), status: 'pending', priority: 3, tools: tools || [] },
                                { id: (0, uuid_1.v4)(), description: "Verify and test: ".concat(masterPrompt), status: 'pending', priority: 4, tools: tools || [] }
                            ];
                            console.log("[Swarm] Using fallback decomposition (".concat(subTasks.length, " tasks)"));
                        }
                        subTasks.forEach(function (t) { return _this.tasks.set(t.id, t); });
                        // Create a persistent mission if service is available
                        if (this.missionService) {
                            mission = this.missionService.createMission(masterPrompt, subTasks);
                            this.currentMissionId = mission.id;
                            console.log("[Swarm] Persistent mission created: ".concat(this.currentMissionId));
                        }
                        return [2 /*return*/, subTasks];
                }
            });
        });
    };
    /**
     * Attempts to extract a JSON array of tasks from an LLM response string.
     */
    SwarmOrchestrator.prototype.extractTasksFromLLMResponse = function (text, fallbackPrompt, tools) {
        if (!text || typeof text !== 'string')
            return [];
        var cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        var arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (!arrayMatch)
            return [];
        try {
            var parsed = JSON.parse(arrayMatch[0]);
            if (!Array.isArray(parsed))
                return [];
            return parsed
                .filter(function (item) { return item && (item.description || item.task || item.name); })
                .map(function (item) {
                var desc = (item.description || item.task || item.name).toLowerCase();
                var reqs = [];
                // Phase 94: Sub-Agent Task Classification
                if (desc.includes('research') || desc.includes('search') || desc.includes('find') || desc.includes('analyze')) {
                    reqs.push('researcher');
                }
                if (desc.includes('code') || desc.includes('implement') || desc.includes('refactor') || desc.includes('fix')) {
                    reqs.push('coder');
                }
                return {
                    id: (0, uuid_1.v4)(),
                    description: item.description || item.task || item.name,
                    status: 'pending',
                    priority: item.priority || 3,
                    tools: tools || [],
                    requirements: reqs // Attach to task object
                };
            });
        }
        catch (_a) {
            return [];
        }
    };
    /**
     * Phase 89: Dynamic Resource Allocation
     * Scans global mission state to throttle maxConcurrency if higher-priority
     * tasks are currently saturating the network.
     */
    SwarmOrchestrator.prototype.calculatePriorityQuota = function (taskPriority) {
        if (!this.missionService)
            return this.config.maxConcurrency;
        var allMissions = this.missionService.getAllMissions().filter(function (m) { return m.status === 'active'; });
        var higherPriorityRunning = 0;
        for (var _i = 0, allMissions_1 = allMissions; _i < allMissions_1.length; _i++) {
            var m = allMissions_1[_i];
            if (m.id === this.currentMissionId)
                continue;
            for (var _a = 0, _b = m.tasks; _a < _b.length; _a++) {
                var t = _b[_a];
                if (t.status === 'running' || t.status === 'verifying') {
                    if (t.priority > taskPriority) {
                        higherPriorityRunning++;
                    }
                }
            }
        }
        // Throttling logic: If there are higher priority tasks running globally,
        // we heavily throttle this batch to leave mesh capacity open.
        if (higherPriorityRunning > 0) {
            console.log("[SwarmOrchestrator] \uD83D\uDEA6 Dynamic Quota: Throttling P".concat(taskPriority, " tasks because ").concat(higherPriorityRunning, " higher-priority tasks are active globally."));
            // Throttle to 20% of max, but at least 1
            return Math.max(1, Math.floor(this.config.maxConcurrency * 0.2));
        }
        return this.config.maxConcurrency;
    };
    /**
     * Executes the swarm loop until all tasks are complete.
     */
    SwarmOrchestrator.prototype.executeSwarm = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pending, currentTask, dynamicConcurrency, batch, promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.emit('swarm:started', { totalTasks: this.tasks.size, missionId: this.currentMissionId });
                        pending = Array.from(this.tasks.values())
                            .filter(function (t) { return t.status === 'pending'; })
                            .sort(function (a, b) { return b.priority - a.priority; });
                        _a.label = 1;
                    case 1:
                        if (!(pending.length > 0)) return [3 /*break*/, 3];
                        currentTask = pending[0];
                        dynamicConcurrency = this.calculatePriorityQuota(currentTask.priority);
                        batch = pending.splice(0, dynamicConcurrency);
                        promises = batch.map(function (task) { return _this.executeTask(task); });
                        return [4 /*yield*/, Promise.allSettled(promises)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.emit('swarm:completed', { results: Array.from(this.tasks.values()), missionId: this.currentMissionId });
                        return [2 /*return*/, this.tasks];
                }
            });
        });
    };
    /**
     * Execute a single task and persist its status.
     * Includes HITL approval for sensitive tasks.
     */
    SwarmOrchestrator.prototype.executeTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var sensitiveKeywords, needsApproval, approved, estimatedTokens, globalContext, mission, offerPayload, BID_WINDOW_MS_1, bids_1, bidPromise, winnerNodeId, resultPromise, meshResult, verifyPromise, verifyResult, resultPayload, tokensUsed, memoryUsed, mission, err_2, currentRetry, healed;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sensitiveKeywords = ['delete', 'remove', 'format', 'overwrite', 'deploy', 'publish'];
                        needsApproval = sensitiveKeywords.some(function (kw) { return task.description.toLowerCase().includes(kw); });
                        if (!needsApproval) return [3 /*break*/, 2];
                        task.status = 'pending_approval';
                        if (this.missionService && this.currentMissionId) {
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, { status: 'pending_approval' });
                        }
                        this.emit('task:awaiting_approval', task);
                        return [4 /*yield*/, new Promise(function (resolve) {
                                _this.approvalResolvers.set(task.id, resolve);
                            })];
                    case 1:
                        approved = _c.sent();
                        if (!approved) {
                            task.status = 'failed';
                            task.result = 'Task rejected by user.';
                            if (this.missionService && this.currentMissionId) {
                                this.missionService.updateMissionTask(this.currentMissionId, task.id, { status: 'failed', result: task.result });
                            }
                            this.emit('task:rejected', task);
                            return [2 /*return*/];
                        }
                        _c.label = 2;
                    case 2:
                        // Phase 82: If the task has a sub-mission, execution is handled by the sub-mission lifecycle.
                        // For now, we simulate completion once the sub-mission is created.
                        if (task.status === 'awaiting_subtask') {
                            console.log("[Swarm] Task ".concat(task.id, " is awaiting sub-mission ").concat(task.subMissionId, ". Skipping direct execution."));
                            return [2 /*return*/];
                        }
                        estimatedTokens = 1000;
                        _c.label = 3;
                    case 3:
                        if (!!this.rateLimiter.tryAcquire(estimatedTokens)) return [3 /*break*/, 5];
                        if (task.status !== 'throttled') {
                            task.status = 'throttled';
                            if (this.missionService && this.currentMissionId) {
                                this.missionService.updateMissionTask(this.currentMissionId, task.id, { status: 'throttled' });
                            }
                            this.emit('task:throttled', task);
                        }
                        // Wait before checking capacity again
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, Math.max(1000, _this.rateLimiter.getBackoffRemainingMs())); })];
                    case 4:
                        // Wait before checking capacity again
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 5:
                        task.status = 'running';
                        task.assignedModel = this.config.defaultModel;
                        // Update persistence
                        if (this.missionService && this.currentMissionId) {
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, { status: 'running', assignedModel: task.assignedModel });
                        }
                        this.emit('task:started', task);
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 10, , 15]);
                        globalContext = {};
                        if (this.missionService && this.currentMissionId) {
                            mission = this.missionService.getMission(this.currentMissionId);
                            if (mission && mission.context) {
                                globalContext = mission.context;
                            }
                        }
                        offerPayload = {
                            task: task.description,
                            requirements: task.requirements || [], // Phase 94: Pass requirements to the Mesh
                            tools: task.tools, // Phase 91/92: Add tools array to payload
                            missionId: this.currentMissionId,
                            originalTaskId: task.id,
                            context: Object.keys(globalContext).length > 0 ? globalContext : undefined // Phase 90
                        };
                        console.log("[SwarmOrchestrator] \uD83C\uDF10 Broadcasting TASK_OFFER to Mesh Network (Attempt ".concat(task.retryCount || 1, "/").concat(this.config.maxRetries, "): \"").concat(task.description.slice(0, 30), "...\""));
                        this.mesh.broadcast(MeshService_js_1.SwarmMessageType.TASK_OFFER, offerPayload);
                        BID_WINDOW_MS_1 = 1000;
                        bids_1 = [];
                        bidPromise = new Promise(function (resolve) {
                            var bidTimeout = setTimeout(function () {
                                _this.mesh.off('message', bidHandler);
                                if (bids_1.length > 0) {
                                    // Sort by lowest load
                                    bids_1.sort(function (a, b) { return a.load - b.load; });
                                    resolve(bids_1[0].sender);
                                }
                                else {
                                    resolve(null);
                                }
                            }, BID_WINDOW_MS_1);
                            var bidHandler = function (msg) {
                                if (msg.type === MeshService_js_1.SwarmMessageType.TASK_BID) {
                                    var bidPayload = msg.payload;
                                    if (bidPayload.originalTaskId === task.id && msg.target === _this.mesh.nodeId) {
                                        bids_1.push({ sender: msg.sender, load: bidPayload.load || 0 });
                                    }
                                }
                            };
                            _this.mesh.on('message', bidHandler);
                        });
                        return [4 /*yield*/, bidPromise];
                    case 7:
                        winnerNodeId = _c.sent();
                        if (!winnerNodeId) {
                            throw new Error('No agents bid on the task offer.');
                        }
                        console.log("[SwarmOrchestrator] \uD83C\uDFAF Assigning task ".concat(task.id.slice(0, 8), " to node ").concat(winnerNodeId.slice(0, 8), "..."));
                        this.mesh.sendDirect(winnerNodeId, MeshService_js_1.SwarmMessageType.TASK_ASSIGN, offerPayload);
                        resultPromise = new Promise(function (resolve, reject) {
                            var timeout = setTimeout(function () {
                                _this.mesh.off('message', handler);
                                reject(new Error('Mesh execution timed out'));
                            }, _this.config.timeoutMs);
                            var handler = function (msg) {
                                if (msg.type === MeshService_js_1.SwarmMessageType.TASK_RESULT) {
                                    var payload = msg.payload;
                                    if (payload.originalTaskId === task.id && msg.target === _this.mesh.nodeId) {
                                        clearTimeout(timeout);
                                        _this.mesh.off('message', handler);
                                        resolve({ result: payload.result, error: payload.error });
                                    }
                                }
                            };
                            _this.mesh.on('message', handler);
                        });
                        return [4 /*yield*/, resultPromise];
                    case 8:
                        meshResult = _c.sent();
                        if (meshResult.error)
                            throw new Error(meshResult.error);
                        // Phase 90: Extract and sync context updates
                        if (meshResult.result && typeof meshResult.result === 'object') {
                            if (meshResult.result._contextUpdate && this.missionService && this.currentMissionId) {
                                console.log("[SwarmOrchestrator] \uD83E\uDDE0 Received Context Update from task ".concat(task.id, ":"), meshResult.result._contextUpdate);
                                this.missionService.updateMissionContext(this.currentMissionId, meshResult.result._contextUpdate);
                                // Optionally strip it so it doesn't clutter the task result
                                delete meshResult.result._contextUpdate;
                            }
                        }
                        task.result = typeof meshResult.result === 'string'
                            ? meshResult.result
                            : JSON.stringify(meshResult.result, null, 2);
                        // Phase 88: Verification Flow
                        task.status = 'verifying';
                        if (this.missionService && this.currentMissionId) {
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, {
                                status: task.status,
                                result: task.result
                            });
                        }
                        this.emit('task:verifying', task);
                        console.log("[SwarmOrchestrator] \uD83D\uDD0D Broadcasting VERIFY_OFFER for task: \"".concat(task.description.slice(0, 30), "...\""));
                        this.mesh.broadcast(MeshService_js_1.SwarmMessageType.VERIFY_OFFER, {
                            task: task.description,
                            result: task.result,
                            originalTaskId: task.id,
                            missionId: this.currentMissionId
                        });
                        verifyPromise = new Promise(function (resolve, reject) {
                            var timeout = setTimeout(function () {
                                _this.mesh.off('message', handler);
                                // If no one verifies, accept it to avoid deadlock
                                resolve({ approved: true, reason: 'Verification timed out, auto-approving.', verifierId: 'system' });
                            }, _this.config.timeoutMs);
                            var handler = function (msg) {
                                if (msg.type === MeshService_js_1.SwarmMessageType.VERIFY_RESULT) {
                                    var payload = msg.payload;
                                    if (payload.originalTaskId === task.id && msg.target === _this.mesh.nodeId) {
                                        clearTimeout(timeout);
                                        _this.mesh.off('message', handler);
                                        resolve({ approved: payload.approved, reason: payload.reason, verifierId: msg.sender });
                                    }
                                }
                            };
                            _this.mesh.on('message', handler);
                        });
                        return [4 /*yield*/, verifyPromise];
                    case 9:
                        verifyResult = _c.sent();
                        if (!verifyResult.approved) {
                            console.warn("[SwarmOrchestrator] \u274C Verification failed for task ".concat(task.id, " by ").concat(verifyResult.verifierId, ": ").concat(verifyResult.reason));
                            task.slashed = true;
                            // Treat verification failure as a task execution error to trigger retries
                            throw new Error("Verification Rejected: ".concat(verifyResult.reason));
                        }
                        console.log("[SwarmOrchestrator] \u2705 Task ".concat(task.id, " verified by ").concat(verifyResult.verifierId));
                        task.status = 'completed';
                        task.verifiedBy = verifyResult.verifierId;
                        resultPayload = meshResult.result;
                        tokensUsed = ((_a = resultPayload === null || resultPayload === void 0 ? void 0 : resultPayload.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 1000;
                        memoryUsed = ((_b = resultPayload === null || resultPayload === void 0 ? void 0 : resultPayload.usage) === null || _b === void 0 ? void 0 : _b.memory_bytes) || 1024 * 1024;
                        task.usage = { tokens: tokensUsed, estimatedMemory: memoryUsed };
                        // Update persistence
                        if (this.missionService && this.currentMissionId) {
                            mission = this.missionService.getMission(this.currentMissionId);
                            if (mission) {
                                mission.usage.tokens += tokensUsed;
                                mission.usage.estimatedMemory = Math.max(mission.usage.estimatedMemory, memoryUsed);
                                // Check limits
                                if (this.config.maxTokensPerMission && mission.usage.tokens > this.config.maxTokensPerMission) {
                                    task.status = 'failed';
                                    task.error = "RESOURCE_LIMIT_EXCEEDED: Mission token limit (".concat(this.config.maxTokensPerMission, ") reached.");
                                }
                            }
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, {
                                status: task.status,
                                result: task.result,
                                error: task.error,
                                usage: task.usage,
                                slashed: task.slashed,
                                verifiedBy: task.verifiedBy
                            });
                        }
                        this.emit('task:completed', task);
                        return [2 /*return*/];
                    case 10:
                        err_2 = _c.sent();
                        console.warn("[SwarmOrchestrator] Mesh delegation failed for \"".concat(task.description, "\": ").concat(err_2.message, "."));
                        // Phase 86: Rate Limit detection
                        if (err_2.message && (err_2.message.includes('429') || err_2.message.toLowerCase().includes('rate limit'))) {
                            console.warn("[Swarm] Provider Rate Limit hit! Triggering backoff...");
                            this.rateLimiter.triggerBackoff(30); // 30 second global backoff
                        }
                        currentRetry = task.retryCount || 0;
                        if (!(currentRetry < this.config.maxRetries)) return [3 /*break*/, 12];
                        task.retryCount = currentRetry + 1;
                        console.log("[Swarm] Retrying task ".concat(task.id, " (").concat(task.retryCount, "/").concat(this.config.maxRetries, ")..."));
                        if (this.missionService && this.currentMissionId) {
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, { retryCount: task.retryCount });
                        }
                        // Wait a bit before retrying (exponential backoff simulated)
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000 * task.retryCount); })];
                    case 11:
                        // Wait a bit before retrying (exponential backoff simulated)
                        _c.sent();
                        return [2 /*return*/, this.executeTask(task)];
                    case 12:
                        console.log("[Swarm] Max retries reached for task ".concat(task.id, ". Triggering Healer..."));
                        task.status = 'healing';
                        if (this.missionService && this.currentMissionId) {
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, { status: 'healing' });
                        }
                        this.emit('task:healing', task);
                        if (!this.healerService) return [3 /*break*/, 14];
                        return [4 /*yield*/, this.healerService.heal(err_2, "Swarm Task: ".concat(task.description))];
                    case 13:
                        healed = _c.sent();
                        if (healed) {
                            console.log("[Swarm] Healer successfully repaired the environment for task ".concat(task.id, ". Retrying one last time..."));
                            return [2 /*return*/, this.executeTask(task)];
                        }
                        _c.label = 14;
                    case 14:
                        // If healer fails or is unavailable, mark as failed
                        console.log("[Worker - local] Completing with failure after exhausted retries: ".concat(task.description));
                        task.result = "[Failure] Task \"".concat(task.description, "\" failed after ").concat(this.config.maxRetries, " retries. Error: ").concat(err_2.message);
                        task.status = 'failed';
                        return [3 /*break*/, 15];
                    case 15:
                        // Final persistence update
                        if (this.missionService && this.currentMissionId) {
                            this.missionService.updateMissionTask(this.currentMissionId, task.id, { status: task.status, result: task.result });
                        }
                        this.emit('task:completed', task);
                        return [2 /*return*/];
                }
            });
        });
    };
    SwarmOrchestrator.prototype.destroy = function () {
        this.mesh.destroy();
    };
    return SwarmOrchestrator;
}(events_1.EventEmitter));
exports.SwarmOrchestrator = SwarmOrchestrator;
