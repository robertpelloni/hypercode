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
import { A2AMessage, IA2AClient } from "@hypercode/adk";
import { EventEmitter } from "events";
export declare class A2ABroker extends EventEmitter {
    private agents;
    private history;
    private readonly MAX_HISTORY;
    constructor();
    /**
     * Register an agent with the broker
     */
    registerAgent(id: string, client: IA2AClient): void;
    /**
     * Unregister an agent
     */
    unregisterAgent(id: string): void;
    /**
     * Routes a message to its intended recipient or broadcasts it
     */
    routeMessage(message: A2AMessage): Promise<void>;
    getHistory(): A2AMessage[];
    listAgents(): string[];
}
export declare const a2aBroker: A2ABroker;
