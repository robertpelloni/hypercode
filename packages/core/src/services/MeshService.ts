
import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import { EventEmitter } from 'events';
import crypto from 'crypto';

import { SwarmMessage, SwarmMessageType } from '../mesh/SwarmProtocol.js';

interface PeerMessage extends SwarmMessage { }

export class MeshService extends EventEmitter {
    private swarm: any;
    private topic: Buffer;
    private peers: Map<string, any> = new Map();
    private pendingRequests: Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void, timeout: NodeJS.Timeout }> = new Map();
    public nodeId: string;

    constructor() {
        super();
        this.swarm = new Hyperswarm();
        // Use Public Key as Node ID for consistent addressing
        this.nodeId = b4a.toString(this.swarm.keyPair.publicKey, 'hex');

        // Topic: "borg-swarm-v1" hashed
        const topicStr = 'borg-swarm-v1';
        this.topic = b4a.from(crypto.createHash('sha256').update(topicStr).digest());

        this.initialize();
    }

    private initialize() {
        this.swarm.on('connection', (socket: any, info: any) => {
            const peerId = b4a.toString(info.publicKey, 'hex');
            console.log(`[MeshService] 🔗 New connection from peer: ${peerId.slice(0, 8)}...`);

            this.peers.set(peerId, socket);
            this.emit('peer:connect', peerId);

            socket.on('data', (data: Buffer) => {
                try {
                    const msg: PeerMessage = JSON.parse(data.toString());

                    // Handle RPC Responses
                    if (this.pendingRequests.has(msg.id)) {
                        const req = this.pendingRequests.get(msg.id);
                        if (req) {
                            clearTimeout(req.timeout);
                            this.pendingRequests.delete(msg.id);
                            req.resolve(msg);
                            return; // Don't emit generic message event for RPC responses
                        }
                    }

                    this.emit('message', msg);
                } catch (e) {
                    console.error("[MeshService] Failed to parse message:", e);
                }
            });

            socket.on('close', () => {
                console.log(`[MeshService] 🔌 Peer disconnected: ${peerId.slice(0, 8)}...`);
                this.peers.delete(peerId);
                this.emit('peer:disconnect', peerId);
            });

            socket.on('error', (err: any) => {
                console.error(`[MeshService] Socket error with ${peerId.slice(0, 8)}:`, err.message);
            });
        });

        // Join the swarm
        this.swarm.join(this.topic);
        console.log(`[MeshService] 🕸️ Joined swarm topic: borg-swarm-v1 (Node ID: ${this.nodeId})`);
    }

    public broadcast(type: SwarmMessageType, payload: any) {
        const msg: PeerMessage = {
            id: crypto.randomUUID(),
            type,
            payload,
            sender: this.nodeId,
            timestamp: Date.now()
        };
        const data = JSON.stringify(msg);

        let sentCount = 0;
        for (const socket of this.peers.values()) {
            socket.write(data);
            sentCount++;
        }
        console.log(`[MeshService] 📡 Broadcasted '${type}' to ${sentCount} peers.`);
    }

    public sendDirect(peerId: string, type: SwarmMessageType, payload: any) {
        const socket = this.peers.get(peerId);
        if (!socket) {
            console.warn(`[MeshService] ⚠️ Cannot send to ${peerId} (Not connected)`);
            return false;
        }

        const msg: PeerMessage = {
            id: crypto.randomUUID(),
            type,
            payload,
            sender: this.nodeId,
            target: peerId,
            timestamp: Date.now()
        };
        socket.write(JSON.stringify(msg));
        return true;
    }

    public request(peerId: string, type: SwarmMessageType, payload: any, timeoutMs: number = 10000): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.peers.has(peerId)) {
                return reject(new Error(`Peer ${peerId} not connected`));
            }

            const id = crypto.randomUUID();
            const msg: PeerMessage = {
                id,
                type,
                payload,
                sender: this.nodeId,
                target: peerId,
                timestamp: Date.now()
            };

            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request ${id} timed out`));
                }
            }, timeoutMs);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            const socket = this.peers.get(peerId);
            socket.write(JSON.stringify(msg));
        });
    }



    public sendResponse(originalMsg: PeerMessage, type: SwarmMessageType, payload: any) {
        const socket = this.peers.get(originalMsg.sender);
        if (!socket) {
            console.warn(`[MeshService] ⚠️ Cannot reply to ${originalMsg.sender} (Not connected)`);
            return false;
        }

        const msg: PeerMessage = {
            id: originalMsg.id,
            type,
            payload,
            sender: this.nodeId,
            target: originalMsg.sender,
            timestamp: Date.now()
        };
        socket.write(JSON.stringify(msg));
        return true;
    }
    public async destroy() {
        console.log(`[MeshService] 🛑 Destroying node ${this.nodeId.slice(0, 8)}...`);
        // destroy swarm
        await this.swarm.destroy();
        this.peers.clear();
        this.emit('close');
    }
}
