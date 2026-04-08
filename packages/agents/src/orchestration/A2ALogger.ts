/**
 * @file A2ALogger.ts
 * @module packages/agents/src/orchestration/A2ALogger
 *
 * WHAT: Traffic logging and auditing for Agent-to-Agent (A2A) communication.
 * Captures all signals for session history and observability.
 *
 * WHY: Multi-agent coordination can be opaque. Persistent logging ensures 
 * that agent decisions, task handoffs, and consensus votes are diagnosable.
 */

import { A2AMessage, A2AMessageType } from "@hypercode/adk";
import { a2aBroker } from "./A2ABroker.js";
import fs from 'fs/promises';
import path from 'path';

export class A2ALogger {
    private logPath: string;
    private buffer: A2AMessage[] = [];
    private readonly FLUSH_INTERVAL = 5000; // 5 seconds

    constructor(workspaceRoot: string) {
        this.logPath = path.join(workspaceRoot, '.hypercode', 'logs', 'a2a_traffic.jsonl');
        this.initialize();
    }

    private async initialize() {
        const dir = path.dirname(this.logPath);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }

        // Listen for all messages on the broker
        a2aBroker.on('message_routed', (msg: A2AMessage) => {
            this.buffer.push(msg);
        });

        // Periodic flush to disk
        setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    }

    private async flush() {
        if (this.buffer.length === 0) return;

        const data = this.buffer.map(msg => JSON.stringify(msg)).join('\n') + '\n';
        this.buffer = [];

        try {
            await fs.appendFile(this.logPath, data, 'utf-8');
        } catch (e) {
            console.error(`[A2ALogger] Failed to flush logs: ${e}`);
        }
    }

    public async getRecentLogs(limit: number = 100): Promise<A2AMessage[]> {
        try {
            const content = await fs.readFile(this.logPath, 'utf-8');
            const lines = content.trim().split('\n');
            return lines.slice(-limit).map(l => JSON.parse(l));
        } catch {
            return [];
        }
    }
}
