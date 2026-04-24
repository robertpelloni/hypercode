/**
 * @file A2ABroker.ts
 * @module packages/core/src/services/A2ABroker
 *
 * WHAT: Central message broker for the Agent-to-Agent (A2A) protocol.
 * Manages agent registration and routes messages between them.
 *
 * WHY: Decouples agents from each other, allowing them to communicate via
 * IDs and roles without knowing implementation details.
 */
import { EventEmitter } from "events";
export class A2ABroker extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.history = [];
        this.MAX_HISTORY = 1000;
    }
    /**
     * Register an agent with the broker
     */
    registerAgent(id, client) {
        this.agents.set(id, client);
        console.log(`[A2A Broker] Registered agent: ${id}`);
        client.onMessage((msg) => this.routeMessage(msg));
        this.emit('agent_registered', { id });
    }
    /**
     * Unregister an agent
     */
    unregisterAgent(id) {
        this.agents.delete(id);
        console.log(`[A2A Broker] Unregistered agent: ${id}`);
        this.emit('agent_unregistered', { id });
    }
    /**
     * Routes a message to its intended recipient or broadcasts it
     */
    async routeMessage(message) {
        this.history.push(message);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
        this.emit('message_routed', message);
        if (message.recipient) {
            const agent = this.agents.get(message.recipient);
            if (agent) {
                await agent.sendMessage(message);
            }
            else {
                console.warn(`[A2A Broker] Recipient not found: ${message.recipient}`);
            }
        }
        else {
            // Broadcast to all agents except sender
            for (const [id, agent] of this.agents.entries()) {
                if (id !== message.sender) {
                    await agent.sendMessage(message);
                }
            }
        }
    }
    getHistory() {
        return [...this.history];
    }
    listAgents() {
        return Array.from(this.agents.keys());
    }
}
export const a2aBroker = new A2ABroker();
