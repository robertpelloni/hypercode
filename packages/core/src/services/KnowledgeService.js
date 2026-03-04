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
exports.KnowledgeService = void 0;
var KnowledgeService = /** @class */ (function () {
    function KnowledgeService(memory) {
        this.memory = memory;
    }
    /**
     * Reason: GraphMemory's public type does not currently guarantee `getSnapshot`, but some runtimes expose it.
     * What: Runtime guard that checks for snapshot capability without unsafe structural casts.
     * Why: Allows optional snapshot fast-path while preserving type safety and compatibility.
     */
    KnowledgeService.prototype.isSnapshotCapableGraph = function (graph) {
        if (!graph || typeof graph !== 'object') {
            return false;
        }
        var getSnapshot = Reflect.get(graph, 'getSnapshot');
        return typeof getSnapshot === 'function';
    };
    /**
     * Retrieves the Knowledge Graph (generic)
     */
    KnowledgeService.prototype.getGraph = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, depth) {
            var snapshot, context;
            if (depth === void 0) { depth = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // If no query, return full graph
                        if (!query && this.memory.graph && this.isSnapshotCapableGraph(this.memory.graph)) {
                            snapshot = this.memory.graph.getSnapshot();
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: JSON.stringify(snapshot, null, 2)
                                        }]
                                }];
                        }
                        if (!query) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getDeepContext(query, depth)];
                    case 1:
                        context = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: JSON.stringify(context, null, 2)
                                    }]
                            }];
                    case 2: return [2 /*return*/, { content: [{ type: "text", text: "Please provide a query to search the graph." }] }];
                }
            });
        });
    };
    /**
     * Recursive Context Retrieval
     */
    KnowledgeService.prototype.getDeepContext = function (rootId_1) {
        return __awaiter(this, arguments, void 0, function (rootId, maxDepth) {
            var visited, queue, resultNodes, resultEdges, current, neighbors, _i, neighbors_1, neighbor;
            if (maxDepth === void 0) { maxDepth = 2; }
            return __generator(this, function (_a) {
                if (!this.memory.graph) {
                    console.warn("[KnowledgeService] Graph memory not available.");
                    return [2 /*return*/, { root: { id: rootId, type: 'unknown' }, nodes: [], edges: [], depth: 0 }];
                }
                visited = new Set();
                queue = [{ id: rootId, depth: 0 }];
                resultNodes = [];
                resultEdges = [];
                while (queue.length > 0) {
                    current = queue.shift();
                    if (visited.has(current.id))
                        continue;
                    visited.add(current.id);
                    // Add current node to results? 
                    // We need to fetch it from graph if possible, or just stub it
                    // GraphMemory doesn't expose getNode(id) directly in the interface yet (only getNeighbors)
                    // But we can infer it or we might need to update GraphMemory to support `getNode(id)`.
                    // For now, let's just use neighbors to populate.
                    if (current.depth >= maxDepth)
                        continue;
                    neighbors = this.memory.graph.getNeighbors(current.id);
                    for (_i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
                        neighbor = neighbors_1[_i];
                        // Track Edge (We don't have edge metadata directly from getNeighbors in the simple API, 
                        // we might need to update GraphMemory again to return Edges, not just Nodes)
                        // Assuming simple relation standard connections.
                        resultEdges.push({
                            source: current.id,
                            target: neighbor.id,
                            relation: 'related' // Simplification
                        });
                        if (!visited.has(neighbor.id)) {
                            resultNodes.push(neighbor);
                            queue.push({ id: neighbor.id, depth: current.depth + 1 });
                        }
                    }
                }
                return [2 /*return*/, {
                        root: { id: rootId, type: 'inferred' },
                        nodes: resultNodes,
                        edges: resultEdges,
                        depth: maxDepth
                    }];
            });
        });
    };
    return KnowledgeService;
}());
exports.KnowledgeService = KnowledgeService;
