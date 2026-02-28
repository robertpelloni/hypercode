import { EventEmitter } from 'events';
import crypto from 'crypto';
import { Redis } from 'ioredis';

export enum SwarmMessageType {
    CAPABILITY_QUERY = 'CAPABILITY_QUERY',
    CAPABILITY_RESPONSE = 'CAPABILITY_RESPONSE',
    TASK_OFFER = 'TASK_OFFER',
    TASK_ACCEPT = 'TASK_ACCEPT',
    TASK_RESULT = 'TASK_RESULT',
    HEARTBEAT = 'HEARTBEAT'
}

export interface SwarmMessage {
    id: string;
    sender: string;
    target?: string;
    type: SwarmMessageType;
    payload: unknown;
    timestamp: number;
}

/**
 * MeshService
 * 
 * Provides a decentralized P2P event bus for agents to communicate across nodes.
 * In a real distributed system, this would be backed by Redis Pub/Sub, NATS, or WebRTC.
 * For Phase 77, it uses a global EventEmitter to simulate a mesh network within the same process,
 * laying the groundwork for true cross-process distribution.
 */

// A global singleton emitter to bridge multiple MeshService instances in the same Node process
const globalMeshBus = new EventEmitter();
globalMeshBus.setMaxListeners(100);

let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;
const REDIS_CHANNEL = 'borg:swarm:mesh';

// Initialize Redis if REDIS_URL is provided in the environment
if (process.env.REDIS_URL) {
    try {
        redisSubscriber = new Redis(process.env.REDIS_URL, { lazyConnect: true });
        redisPublisher = new Redis(process.env.REDIS_URL, { lazyConnect: true });

        Promise.all([redisSubscriber.connect(), redisPublisher.connect()]).then(() => {
            console.log('[MeshService] 🟢 Connected to Redis Mesh Bus');

            redisSubscriber!.subscribe(REDIS_CHANNEL, (err: any) => {
                if (err) console.error('[MeshService] 🔴 Redis Subscribe Error:', err);
            });

            // Listen for mesh messages from the wider distributed swarm
            redisSubscriber!.on('message', (channel: string, message: string) => {
                if (channel === REDIS_CHANNEL) {
                    try {
                        const parsed: SwarmMessage = JSON.parse(message);
                        // Forward the remote message to all local MeshService instances
                        globalMeshBus.emit('mesh_message_inbound', parsed);
                    } catch (e: any) {
                        console.error('[MeshService] Failed to parse Redis message', e);
                    }
                }
            });

            // Listen to messages emitted by local MeshService instances and blast them to the wider swarm
            globalMeshBus.on('mesh_message_outbound', (msg: SwarmMessage) => {
                redisPublisher!.publish(REDIS_CHANNEL, JSON.stringify(msg)).catch((e: any) => {
                    console.error('[MeshService] Failed to publish message to Redis', e);
                });
            });

        }).catch((err: any) => {
            console.error('[MeshService] 🟡 Redis connection failed, falling back to local-only Mesh.', err.message);
            setupLocalFallback();
        });
    } catch (e: any) {
        console.warn(`[MeshService] 🟡 Redis initialization error: ${e.message}`);
        setupLocalFallback();
    }
} else {
    // If no Redis URL is given, run entirely locally across the single Node process
    setupLocalFallback();
}

/**
 * Routes outbound emissions straight back into inbound listeners.
 * Emulates the mesh network internally if there is no Redis backend present.
 */
function setupLocalFallback() {
    globalMeshBus.on('mesh_message_outbound', (msg: SwarmMessage) => {
        globalMeshBus.emit('mesh_message_inbound', msg);
    });
}

export class MeshService extends EventEmitter {
    public readonly nodeId: string;
    private readonly knownNodes: Set<string> = new Set();
    private heartbeatInterval?: NodeJS.Timeout;

    constructor() {
        super();
        this.nodeId = crypto.randomUUID();

        // Listen to global inbound network traffic
        globalMeshBus.on('mesh_message_inbound', this.handleGlobalMessage.bind(this));

        this.startHeartbeat();
    }

    private startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.broadcast(SwarmMessageType.HEARTBEAT, { status: 'alive' });
        }, 15000);
    }

    private handleGlobalMessage(msg: SwarmMessage) {
        // Ignore our own broadcast messages
        if (msg.sender === this.nodeId) return;

        // Keep track of known peers
        this.knownNodes.add(msg.sender);

        // If it's a direct message tailored to us, or a broadcast (no target)
        if (!msg.target || msg.target === this.nodeId) {
            this.emit('message', msg);
        }
    }

    public broadcast(type: SwarmMessageType, payload: unknown) {
        const msg: SwarmMessage = {
            id: crypto.randomUUID(),
            sender: this.nodeId,
            type,
            payload,
            timestamp: Date.now()
        };
        globalMeshBus.emit('mesh_message_outbound', msg);
    }

    public sendDirect(targetNodeId: string, type: SwarmMessageType, payload: unknown) {
        const msg: SwarmMessage = {
            id: crypto.randomUUID(),
            sender: this.nodeId,
            target: targetNodeId,
            type,
            payload,
            timestamp: Date.now()
        };
        globalMeshBus.emit('mesh_message_outbound', msg);
    }

    public sendResponse(originalMsg: SwarmMessage, type: SwarmMessageType, payload: unknown) {
        // Respond directly to the sender of the original message
        const response: SwarmMessage = {
            id: originalMsg.id, // Preserve the ID so the receiver can match the response
            sender: this.nodeId,
            target: originalMsg.sender,
            type,
            payload,
            timestamp: Date.now()
        };
        globalMeshBus.emit('mesh_message_outbound', response);
    }

    public getPeers(): string[] {
        return Array.from(this.knownNodes);
    }

    public destroy() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        globalMeshBus.off('mesh_message_inbound', this.handleGlobalMessage.bind(this));
        this.removeAllListeners();
    }
}
