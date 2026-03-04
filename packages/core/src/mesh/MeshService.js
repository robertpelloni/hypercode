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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshService = exports.SwarmMessageType = void 0;
var events_1 = require("events");
var crypto_1 = require("crypto");
var ioredis_1 = require("ioredis");
var SwarmMessageType;
(function (SwarmMessageType) {
    SwarmMessageType["CAPABILITY_QUERY"] = "CAPABILITY_QUERY";
    SwarmMessageType["CAPABILITY_RESPONSE"] = "CAPABILITY_RESPONSE";
    SwarmMessageType["TASK_OFFER"] = "TASK_OFFER";
    SwarmMessageType["TASK_ACCEPT"] = "TASK_ACCEPT";
    SwarmMessageType["TASK_RESULT"] = "TASK_RESULT";
    SwarmMessageType["VERIFY_OFFER"] = "VERIFY_OFFER";
    SwarmMessageType["VERIFY_RESULT"] = "VERIFY_RESULT";
    SwarmMessageType["HEARTBEAT"] = "HEARTBEAT";
    SwarmMessageType["DIRECT_MESSAGE"] = "DIRECT_MESSAGE";
    SwarmMessageType["TASK_BID"] = "TASK_BID";
    SwarmMessageType["TASK_ASSIGN"] = "TASK_ASSIGN";
    SwarmMessageType["ARTIFACT_READ_REQUEST"] = "ARTIFACT_READ_REQUEST";
    SwarmMessageType["ARTIFACT_READ_RESPONSE"] = "ARTIFACT_READ_RESPONSE";
})(SwarmMessageType || (exports.SwarmMessageType = SwarmMessageType = {}));
/**
 * MeshService
 *
 * Provides a decentralized P2P event bus for agents to communicate across nodes.
 * In a real distributed system, this would be backed by Redis Pub/Sub, NATS, or WebRTC.
 * For Phase 77, it uses a global EventEmitter to simulate a mesh network within the same process,
 * laying the groundwork for true cross-process distribution.
 */
// A global singleton emitter to bridge multiple MeshService instances in the same Node process
var globalMeshBus = new events_1.EventEmitter();
globalMeshBus.setMaxListeners(100);
var redisSubscriber = null;
var redisPublisher = null;
var REDIS_CHANNEL = 'borg:swarm:mesh';
// Initialize Redis if REDIS_URL is provided in the environment
if (process.env.REDIS_URL) {
    try {
        redisSubscriber = new ioredis_1.Redis(process.env.REDIS_URL, { lazyConnect: true });
        redisPublisher = new ioredis_1.Redis(process.env.REDIS_URL, { lazyConnect: true });
        Promise.all([redisSubscriber.connect(), redisPublisher.connect()]).then(function () {
            console.log('[MeshService] 🟢 Connected to Redis Mesh Bus');
            redisSubscriber.subscribe(REDIS_CHANNEL, function (err) {
                if (err)
                    console.error('[MeshService] 🔴 Redis Subscribe Error:', err);
            });
            // Listen for mesh messages from the wider distributed swarm
            redisSubscriber.on('message', function (channel, message) {
                if (channel === REDIS_CHANNEL) {
                    try {
                        var parsed = JSON.parse(message);
                        // Forward the remote message to all local MeshService instances
                        globalMeshBus.emit('mesh_message_inbound', parsed);
                    }
                    catch (e) {
                        console.error('[MeshService] Failed to parse Redis message', e);
                    }
                }
            });
            // Listen to messages emitted by local MeshService instances and blast them to the wider swarm
            globalMeshBus.on('mesh_message_outbound', function (msg) {
                redisPublisher.publish(REDIS_CHANNEL, JSON.stringify(msg)).catch(function (e) {
                    console.error('[MeshService] Failed to publish message to Redis', e);
                });
            });
        }).catch(function (err) {
            console.error('[MeshService] 🟡 Redis connection failed, falling back to local-only Mesh.', err.message);
            setupLocalFallback();
        });
    }
    catch (e) {
        console.warn("[MeshService] \uD83D\uDFE1 Redis initialization error: ".concat(e.message));
        setupLocalFallback();
    }
}
else {
    // If no Redis URL is given, run entirely locally across the single Node process
    setupLocalFallback();
}
/**
 * Routes outbound emissions straight back into inbound listeners.
 * Emulates the mesh network internally if there is no Redis backend present.
 */
function setupLocalFallback() {
    globalMeshBus.on('mesh_message_outbound', function (msg) {
        globalMeshBus.emit('mesh_message_inbound', msg);
    });
}
// Forward all mesh traffic to the central EventBus for SSE Visualization
globalMeshBus.on('mesh_message_inbound', function (msg) {
    var _a;
    if ((_a = global.mcpServerInstance) === null || _a === void 0 ? void 0 : _a.eventBus) {
        global.mcpServerInstance.eventBus.emitEvent('mesh:traffic', 'MeshService', msg);
    }
});
var MeshService = /** @class */ (function (_super) {
    __extends(MeshService, _super);
    function MeshService() {
        var _this = _super.call(this) || this;
        _this.knownNodes = new Set();
        _this.nodeCapabilities = new Map();
        _this.nodeId = crypto_1.default.randomUUID();
        // Listen to global inbound network traffic
        globalMeshBus.on('mesh_message_inbound', _this.handleGlobalMessage.bind(_this));
        _this.startHeartbeat();
        return _this;
    }
    MeshService.prototype.startHeartbeat = function () {
        var _this = this;
        this.heartbeatInterval = setInterval(function () {
            // Include local capabilities in heartbeat (Phase 80)
            var localTools = _this.getLocalCapabilities();
            _this.broadcast(SwarmMessageType.HEARTBEAT, {
                status: 'alive',
                capabilities: localTools
            });
        }, 15000);
    };
    MeshService.prototype.getLocalCapabilities = function () {
        // Query the local MCPServer for registered tools if available
        if (global.mcpServerInstance) {
            // This is a simplified list of tool names
            // In a better implementation, we'd pull the full schema from the registry
            return ['fs', 'terminal', 'git', 'research', 'coder'];
        }
        return [];
    };
    MeshService.prototype.handleGlobalMessage = function (msg) {
        // Ignore our own broadcast messages
        if (msg.sender === this.nodeId)
            return;
        // Keep track of known peers
        this.knownNodes.add(msg.sender);
        // Update capabilities registry on heartbeat
        if (msg.type === SwarmMessageType.HEARTBEAT) {
            var payload = msg.payload;
            if (payload === null || payload === void 0 ? void 0 : payload.capabilities) {
                this.nodeCapabilities.set(msg.sender, payload.capabilities);
            }
        }
        // If it's a direct message tailored to us, or a broadcast (no target)
        if (!msg.target || msg.target === this.nodeId) {
            this.emit('message', msg);
        }
    };
    MeshService.prototype.broadcast = function (type, payload) {
        var msg = {
            id: crypto_1.default.randomUUID(),
            sender: this.nodeId,
            type: type,
            payload: payload,
            timestamp: Date.now()
        };
        globalMeshBus.emit('mesh_message_outbound', msg);
    };
    MeshService.prototype.sendDirect = function (targetNodeId, type, payload) {
        var msg = {
            id: crypto_1.default.randomUUID(),
            sender: this.nodeId,
            target: targetNodeId,
            type: type,
            payload: payload,
            timestamp: Date.now()
        };
        globalMeshBus.emit('mesh_message_outbound', msg);
    };
    MeshService.prototype.sendResponse = function (originalMsg, type, payload) {
        // Respond directly to the sender of the original message
        var response = {
            id: originalMsg.id, // Preserve the ID so the receiver can match the response
            sender: this.nodeId,
            target: originalMsg.sender,
            type: type,
            payload: payload,
            timestamp: Date.now()
        };
        globalMeshBus.emit('mesh_message_outbound', response);
    };
    MeshService.prototype.getPeers = function () {
        return Array.from(this.knownNodes);
    };
    /**
     * Returns a map of all known nodes and their advertised capabilities.
     * Phase 80: Dynamic capability discovery.
     */
    MeshService.prototype.getMeshCapabilities = function () {
        var result = {};
        this.nodeCapabilities.forEach(function (caps, id) {
            result[id] = caps;
        });
        // Also include our own
        result[this.nodeId] = this.getLocalCapabilities();
        return result;
    };
    MeshService.prototype.destroy = function () {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        globalMeshBus.off('mesh_message_inbound', this.handleGlobalMessage.bind(this));
        this.removeAllListeners();
    };
    return MeshService;
}(events_1.EventEmitter));
exports.MeshService = MeshService;
