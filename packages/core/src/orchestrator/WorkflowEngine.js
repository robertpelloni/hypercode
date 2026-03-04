"use strict";
/**
 * Workflow Engine - Graph-Based Multi-Agent Orchestration
 *
 * Implements graph-based workflow engine for multi-agent orchestration
 * with shared state, durable execution, and flexible control flow.
 *
 * Features:
 * - Graph definition (nodes + edges)
 * - Agent nodes with input/output
 * - Conditional edges (LLM-based routing)
 * - Shared centralized state
 * - Durable execution (resume from failure)
 * - Human-in-the-loop checkpoints
 *
 * Inspired by LangGraph architecture.
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = exports.GraphBuilder = exports.StateStore = void 0;
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var events_1 = require("events");
function getWorkflowGraphNodeType(requiresApproval) {
    return requiresApproval ? 'checkpoint' : 'default';
}
/**
 * State Store - Persistent state management with snapshots
 * Refactored to use individual files per execution for scalability.
 */
var StateStore = /** @class */ (function () {
    function StateStore(persistDir) {
        this.persistDir = persistDir;
        this.states = new Map();
        this.snapshots = new Map();
        this.maxLoadedEntries = 200;
        if (persistDir) {
            this.ensurePersistDir();
            // We don't load all states into memory at startup anymore to save RAM.
            // Entries are loaded on demand and bounded via LRU eviction.
        }
    }
    StateStore.prototype.markRecentlyUsed = function (executionId) {
        var state = this.states.get(executionId);
        if (!state) {
            return;
        }
        this.states.delete(executionId);
        this.states.set(executionId, state);
        var snapshots = this.snapshots.get(executionId);
        if (snapshots) {
            this.snapshots.delete(executionId);
            this.snapshots.set(executionId, snapshots);
        }
    };
    StateStore.prototype.enforceMemoryLimit = function () {
        while (this.states.size > this.maxLoadedEntries) {
            var oldestExecutionId = this.states.keys().next().value;
            if (!oldestExecutionId) {
                break;
            }
            this.states.delete(oldestExecutionId);
            this.snapshots.delete(oldestExecutionId);
        }
    };
    StateStore.prototype.ensurePersistDir = function () {
        if (this.persistDir && !fs.existsSync(this.persistDir)) {
            fs.mkdirSync(this.persistDir, { recursive: true });
        }
    };
    StateStore.prototype.getFilePath = function (id) {
        if (!this.persistDir)
            throw new Error("Persistence disabled");
        return path.join(this.persistDir, "".concat(id, ".json"));
    };
    StateStore.prototype.persistState = function (id) {
        if (!this.persistDir)
            return;
        try {
            var filePath = this.getFilePath(id);
            var data = {
                state: this.states.get(id),
                snapshots: this.snapshots.get(id)
            };
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        catch (e) {
            console.error("[StateStore] Failed to persist state ".concat(id, ":"), e);
        }
    };
    StateStore.prototype.loadState = function (id) {
        if (!this.persistDir)
            return;
        if (this.states.has(id)) {
            this.markRecentlyUsed(id);
            return;
        }
        var filePath = this.getFilePath(id);
        if (fs.existsSync(filePath)) {
            try {
                var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (data.state)
                    this.states.set(id, data.state);
                if (data.snapshots)
                    this.snapshots.set(id, data.snapshots);
                this.markRecentlyUsed(id);
                this.enforceMemoryLimit();
            }
            catch (e) {
                console.error("[StateStore] Failed to load state ".concat(id, ":"), e);
            }
        }
    };
    /**
     * Get state by execution ID
     */
    StateStore.prototype.get = function (executionId) {
        this.loadState(executionId);
        this.markRecentlyUsed(executionId);
        return this.states.get(executionId);
    };
    /**
     * Set state for an execution
     */
    StateStore.prototype.set = function (executionId, state) {
        this.states.set(executionId, __assign({}, state));
        this.markRecentlyUsed(executionId);
        this.enforceMemoryLimit();
        this.persistState(executionId);
    };
    /**
     * Update state (merge with existing)
     */
    StateStore.prototype.update = function (executionId, updates) {
        var current = this.get(executionId) || {};
        var updated = __assign(__assign({}, current), updates);
        this.set(executionId, updated);
        return updated;
    };
    /**
     * Create a snapshot of current state
     */
    StateStore.prototype.snapshot = function (executionId) {
        var state = this.get(executionId);
        if (!state)
            return;
        if (!this.snapshots.has(executionId)) {
            this.snapshots.set(executionId, []);
        }
        this.snapshots.get(executionId).push(__assign({}, state));
        this.markRecentlyUsed(executionId);
        this.persistState(executionId);
    };
    /**
     * Restore from a snapshot
     */
    StateStore.prototype.restore = function (executionId, snapshotIndex) {
        this.loadState(executionId);
        var history = this.snapshots.get(executionId);
        if (!history || history.length === 0)
            return undefined;
        var index = snapshotIndex !== null && snapshotIndex !== void 0 ? snapshotIndex : history.length - 1;
        var state = history[index];
        if (state) {
            this.set(executionId, state);
        }
        return state;
    };
    /**
     * Get snapshot history
     */
    StateStore.prototype.getSnapshots = function (executionId) {
        this.loadState(executionId);
        return this.snapshots.get(executionId) || [];
    };
    /**
     * Delete state
     */
    StateStore.prototype.delete = function (executionId) {
        this.states.delete(executionId);
        this.snapshots.delete(executionId);
        if (this.persistDir) {
            var filePath = this.getFilePath(executionId);
            if (fs.existsSync(filePath))
                fs.unlinkSync(filePath);
        }
    };
    return StateStore;
}());
exports.StateStore = StateStore;
/**
 * Graph Builder - Build workflow graphs fluently
 */
var GraphBuilder = /** @class */ (function () {
    function GraphBuilder() {
        this.nodes = new Map();
        this.edges = [];
        this.entryPoint = null;
    }
    /**
     * Add a node to the graph
     */
    GraphBuilder.prototype.addNode = function (id, fn, options) {
        if (options === void 0) { options = {}; }
        this.nodes.set(id, {
            id: id,
            name: options.name || id,
            description: options.description,
            fn: fn,
            requiresApproval: options.requiresApproval,
        });
        // First node becomes entry point by default
        if (!this.entryPoint) {
            this.entryPoint = id;
        }
        return this;
    };
    /**
     * Set the entry point node
     */
    GraphBuilder.prototype.setEntryPoint = function (nodeId) {
        if (!this.nodes.has(nodeId)) {
            throw new Error("Node ".concat(nodeId, " not found"));
        }
        this.entryPoint = nodeId;
        return this;
    };
    /**
     * Add a direct edge between nodes
     */
    GraphBuilder.prototype.addEdge = function (from, to) {
        this.edges.push({
            id: "edge-".concat(from, "-").concat(to),
            from: from,
            to: to,
        });
        return this;
    };
    /**
     * Add a conditional edge
     */
    GraphBuilder.prototype.addConditionalEdge = function (from, to, condition) {
        this.edges.push({
            id: "edge-".concat(from, "-").concat(to, "-conditional"),
            from: from,
            to: to,
            condition: condition,
        });
        return this;
    };
    /**
     * Add a routing edge (dynamic next node selection)
     */
    GraphBuilder.prototype.addRouterEdge = function (from, router) {
        this.edges.push({
            id: "edge-".concat(from, "-router"),
            from: from,
            to: router,
        });
        return this;
    };
    /**
     * Get the graph structure for UI visualization (React Flow compatible)
     */
    GraphBuilder.prototype.getGraph = function () {
        var nodes = Array.from(this.nodes.values()).map(function (n) { return ({
            id: n.id,
            label: n.name,
            data: { description: n.description },
            type: getWorkflowGraphNodeType(n.requiresApproval)
        }); });
        var edges = this.edges.map(function (e) { return ({
            id: e.id,
            source: e.from,
            target: typeof e.to === 'string' ? e.to : 'dynamic',
            animated: !!e.condition,
            label: e.condition ? 'Conditional' : undefined
        }); });
        return { nodes: nodes, edges: edges };
    };
    /**
     * Build the workflow definition
     */
    GraphBuilder.prototype.build = function (id, name, description) {
        if (!this.entryPoint) {
            throw new Error('Workflow must have an entry point');
        }
        if (this.nodes.size === 0) {
            throw new Error('Workflow must have at least one node');
        }
        return {
            id: id,
            name: name || id,
            description: description,
            entryPoint: this.entryPoint,
            nodes: new Map(this.nodes),
            edges: __spreadArray([], this.edges, true),
        };
    };
    return GraphBuilder;
}());
exports.GraphBuilder = GraphBuilder;
/**
 * Workflow Engine - Execute workflow graphs
 */
var WorkflowEngine = /** @class */ (function (_super) {
    __extends(WorkflowEngine, _super);
    function WorkflowEngine(options) {
        if (options === void 0) { options = {}; }
        var _a, _b;
        var _this = _super.call(this) || this;
        _this.workflows = new Map();
        _this.executions = new Map();
        _this.options = {
            persistDir: options.persistDir || '',
            maxHistory: (_a = options.maxHistory) !== null && _a !== void 0 ? _a : 100,
            timeoutMs: (_b = options.timeoutMs) !== null && _b !== void 0 ? _b : 300000, // 5 minutes default
        };
        _this.stateStore = new StateStore(_this.options.persistDir ? path.join(_this.options.persistDir, 'states') : undefined);
        return _this;
    }
    /**
     * Get graph definition for UI
     */
    WorkflowEngine.prototype.getGraph = function (workflowId) {
        var workflow = this.workflows.get(workflowId);
        if (!workflow)
            return undefined;
        var nodes = Array.from(workflow.nodes.values()).map(function (n) { return ({
            id: n.id,
            label: n.name,
            data: { description: n.description },
            type: getWorkflowGraphNodeType(n.requiresApproval)
        }); });
        var edges = workflow.edges.map(function (e) { return ({
            id: e.id,
            source: e.from,
            target: typeof e.to === 'string' ? e.to : 'dynamic',
            animated: !!e.condition,
            label: e.condition ? 'Conditional' : undefined
        }); });
        return { nodes: nodes, edges: edges };
    };
    /**
     * Register a workflow definition
     */
    WorkflowEngine.prototype.registerWorkflow = function (workflow) {
        this.workflows.set(workflow.id, workflow);
    };
    /**
     * Create a new graph builder
     */
    WorkflowEngine.createGraph = function () {
        return new GraphBuilder();
    };
    /**
     * Generate unique execution ID
     */
    WorkflowEngine.prototype.generateExecutionId = function () {
        return crypto.randomBytes(8).toString('hex');
    };
    /**
     * Start a new workflow execution
     */
    WorkflowEngine.prototype.start = function (workflowId_1) {
        return __awaiter(this, arguments, void 0, function (workflowId, initialState) {
            var workflow, executionId, execution;
            if (initialState === void 0) { initialState = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        workflow = this.workflows.get(workflowId);
                        if (!workflow) {
                            throw new Error("Workflow ".concat(workflowId, " not found"));
                        }
                        executionId = this.generateExecutionId();
                        execution = {
                            id: executionId,
                            workflowId: workflowId,
                            state: initialState,
                            currentNode: workflow.entryPoint,
                            history: [],
                            status: 'running',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                        this.executions.set(executionId, execution);
                        this.stateStore.set(executionId, initialState);
                        this.emit('execution:start', execution);
                        // Run the workflow
                        return [4 /*yield*/, this.run(executionId)];
                    case 1:
                        // Run the workflow
                        _a.sent();
                        return [2 /*return*/, this.executions.get(executionId)];
                }
            });
        });
    };
    /**
     * Run execution until completion or pause
     */
    WorkflowEngine.prototype.run = function (executionId) {
        return __awaiter(this, void 0, void 0, function () {
            var execution, workflow, node, step, nextNode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        execution = this.executions.get(executionId);
                        if (!execution || execution.status !== 'running')
                            return [2 /*return*/];
                        workflow = this.workflows.get(execution.workflowId);
                        if (!workflow)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        if (!(execution.status === 'running')) return [3 /*break*/, 4];
                        node = workflow.nodes.get(execution.currentNode);
                        if (!node) {
                            execution.status = 'failed';
                            execution.error = "Node ".concat(execution.currentNode, " not found");
                            return [3 /*break*/, 4];
                        }
                        // Check for HITL checkpoint
                        if (node.requiresApproval) {
                            execution.status = 'awaiting_approval';
                            execution.updatedAt = new Date();
                            this.stateStore.snapshot(executionId);
                            this.emit('execution:awaiting_approval', execution, node);
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.executeNode(executionId, node)];
                    case 2:
                        step = _a.sent();
                        execution.history.push(step);
                        // Trim history if needed
                        if (execution.history.length > this.options.maxHistory) {
                            execution.history = execution.history.slice(-this.options.maxHistory);
                        }
                        if (step.status === 'failed') {
                            execution.status = 'failed';
                            execution.error = step.error;
                            return [3 /*break*/, 4];
                        }
                        // Update state
                        execution.state = step.outputState;
                        this.stateStore.set(executionId, execution.state);
                        return [4 /*yield*/, this.getNextNode(workflow, execution.currentNode, execution.state)];
                    case 3:
                        nextNode = _a.sent();
                        if (!nextNode) {
                            // No next node means workflow is complete
                            execution.status = 'completed';
                            return [3 /*break*/, 4];
                        }
                        execution.currentNode = nextNode;
                        execution.updatedAt = new Date();
                        return [3 /*break*/, 1];
                    case 4:
                        this.emit('execution:end', execution);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute a single node
     */
    WorkflowEngine.prototype.executeNode = function (executionId, node) {
        return __awaiter(this, void 0, void 0, function () {
            var execution, inputState, startTime, result, outputState, error_1, errorMessage;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        execution = this.executions.get(executionId);
                        inputState = __assign({}, execution.state);
                        startTime = new Date();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.race([
                                node.fn(inputState),
                                new Promise(function (_, reject) {
                                    return setTimeout(function () { return reject(new Error('Node execution timeout')); }, _this.options.timeoutMs);
                                }),
                            ])];
                    case 2:
                        result = _a.sent();
                        outputState = result;
                        this.emit('node:complete', executionId, node, outputState);
                        return [2 /*return*/, {
                                nodeId: node.id,
                                nodeName: node.name,
                                inputState: inputState,
                                outputState: outputState,
                                startTime: startTime,
                                endTime: new Date(),
                                status: 'success',
                            }];
                    case 3:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        this.emit('node:error', executionId, node, errorMessage);
                        return [2 /*return*/, {
                                nodeId: node.id,
                                nodeName: node.name,
                                inputState: inputState,
                                outputState: inputState,
                                startTime: startTime,
                                endTime: new Date(),
                                status: 'failed',
                                error: errorMessage,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the next node based on edges
     */
    WorkflowEngine.prototype.getNextNode = function (workflow, currentNodeId, state) {
        return __awaiter(this, void 0, void 0, function () {
            var edges, _i, edges_1, edge, shouldFollow, nextId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        edges = workflow.edges.filter(function (e) { return e.from === currentNodeId; });
                        if (edges.length === 0) {
                            return [2 /*return*/, null]; // No outgoing edges
                        }
                        _i = 0, edges_1 = edges;
                        _a.label = 1;
                    case 1:
                        if (!(_i < edges_1.length)) return [3 /*break*/, 7];
                        edge = edges_1[_i];
                        if (!edge.condition) return [3 /*break*/, 3];
                        return [4 /*yield*/, edge.condition(state)];
                    case 2:
                        shouldFollow = _a.sent();
                        if (!shouldFollow)
                            return [3 /*break*/, 6];
                        _a.label = 3;
                    case 3:
                        if (!(typeof edge.to === 'function')) return [3 /*break*/, 5];
                        return [4 /*yield*/, edge.to(state)];
                    case 4:
                        nextId = _a.sent();
                        if (nextId && workflow.nodes.has(nextId)) {
                            return [2 /*return*/, nextId];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        if (workflow.nodes.has(edge.to)) {
                            return [2 /*return*/, edge.to];
                        }
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, null];
                }
            });
        });
    };
    /**
     * Approve a HITL checkpoint and continue execution
     */
    WorkflowEngine.prototype.approve = function (executionId) {
        return __awaiter(this, void 0, void 0, function () {
            var execution, workflow, node, step, nextNode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        execution = this.executions.get(executionId);
                        if (!execution || execution.status !== 'awaiting_approval') {
                            throw new Error('Execution not awaiting approval');
                        }
                        execution.status = 'running';
                        execution.updatedAt = new Date();
                        workflow = this.workflows.get(execution.workflowId);
                        node = workflow.nodes.get(execution.currentNode);
                        if (!node) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.executeNode(executionId, node)];
                    case 1:
                        step = _a.sent();
                        execution.history.push(step);
                        // Trim history
                        if (execution.history.length > this.options.maxHistory) {
                            execution.history = execution.history.slice(-this.options.maxHistory);
                        }
                        if (step.status === 'failed') {
                            execution.status = 'failed';
                            execution.error = step.error;
                            this.emit('execution:end', execution); // Notify failure
                            return [2 /*return*/];
                        }
                        // Update state
                        execution.state = step.outputState;
                        this.stateStore.set(executionId, execution.state);
                        return [4 /*yield*/, this.getNextNode(workflow, execution.currentNode, execution.state)];
                    case 2:
                        nextNode = _a.sent();
                        if (!nextNode) return [3 /*break*/, 4];
                        execution.currentNode = nextNode;
                        // Continue run loop
                        return [4 /*yield*/, this.run(executionId)];
                    case 3:
                        // Continue run loop
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        execution.status = 'completed';
                        this.emit('execution:end', execution);
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        // Should not happen if valid graph
                        execution.status = 'failed';
                        execution.error = "Node ".concat(execution.currentNode, " not found during approval");
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reject a HITL checkpoint and stop execution
     */
    WorkflowEngine.prototype.reject = function (executionId, reason) {
        var execution = this.executions.get(executionId);
        if (!execution || execution.status !== 'awaiting_approval') {
            throw new Error('Execution not awaiting approval');
        }
        execution.status = 'failed';
        execution.error = reason || 'Rejected at checkpoint';
        execution.updatedAt = new Date();
    };
    /**
     * Pause a running execution
     */
    WorkflowEngine.prototype.pause = function (executionId) {
        var execution = this.executions.get(executionId);
        if (!execution || execution.status !== 'running') {
            throw new Error('Execution not running');
        }
        execution.status = 'paused';
        execution.updatedAt = new Date();
        this.stateStore.snapshot(executionId);
    };
    /**
     * Resume a paused execution
     */
    WorkflowEngine.prototype.resume = function (executionId) {
        return __awaiter(this, void 0, void 0, function () {
            var execution;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        execution = this.executions.get(executionId);
                        if (!execution || execution.status !== 'paused') {
                            throw new Error('Execution not paused');
                        }
                        execution.status = 'running';
                        execution.updatedAt = new Date();
                        return [4 /*yield*/, this.run(executionId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Rollback to a previous state
     */
    WorkflowEngine.prototype.rollback = function (executionId, snapshotIndex) {
        var execution = this.executions.get(executionId);
        if (!execution) {
            throw new Error('Execution not found');
        }
        var state = this.stateStore.restore(executionId, snapshotIndex);
        if (state) {
            execution.state = state;
            execution.status = 'paused';
            execution.updatedAt = new Date();
        }
        return state;
    };
    /**
     * Get execution by ID
     */
    WorkflowEngine.prototype.getExecution = function (executionId) {
        return this.executions.get(executionId);
    };
    /**
     * Get state for an execution
     */
    WorkflowEngine.prototype.getState = function (executionId) {
        return this.stateStore.get(executionId);
    };
    /**
     * List all executions
     */
    WorkflowEngine.prototype.listExecutions = function () {
        return Array.from(this.executions.values());
    };
    /**
     * Get execution history
     */
    WorkflowEngine.prototype.getHistory = function (executionId) {
        var execution = this.executions.get(executionId);
        return (execution === null || execution === void 0 ? void 0 : execution.history) || [];
    };
    /**
     * Get state snapshots for an execution
     */
    WorkflowEngine.prototype.getSnapshots = function (executionId) {
        return this.stateStore.getSnapshots(executionId);
    };
    return WorkflowEngine;
}(events_1.EventEmitter));
exports.WorkflowEngine = WorkflowEngine;
exports.default = WorkflowEngine;
