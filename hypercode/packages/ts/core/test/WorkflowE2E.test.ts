import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkflowEngine } from '../src/orchestrator/WorkflowEngine.js';
import { registerSystemWorkflows, ToolRunner } from '../src/orchestrator/SystemWorkflows.js';
import path from 'path';
import fs from 'fs';

// Mock dependencies
vi.mock('../src/security/PolicyService.js', () => ({
    PolicyService: class {
        check() { return { allowed: true }; }
    }
}));

describe('Workflow E2E (System Workflows)', () => {
    let engine: WorkflowEngine;
    let runner: ToolRunner;

    beforeEach(() => {
        // Mock ToolRunner
        runner = {
            executeTool: vi.fn().mockImplementation(async (name, args) => {
                console.log(`[MockTool] ${name}`, args);
                if (name === 'run_command' && args.CommandLine.includes('git diff')) {
                    return 'file1.ts\nfile2.ts';
                }
                if (name === 'grep_search') {
                    return [];
                }
                if (name === 'run_command' && args.CommandLine.includes('npm run build')) {
                    return 'Build success';
                }
                return { content: [{ type: 'text', text: 'Mock Result' }] };
            })
        };

        const testDir = path.join(process.cwd(), '.hypercode', 'workflows_test_' + Date.now());
        engine = new WorkflowEngine({ persistDir: testDir });
        registerSystemWorkflows(engine, runner);
    });

    afterEach(() => {
        // Cleanup if needed, but unique dir handles it
    });

    it('should register system workflows', () => {
        expect(() => engine.getGraph('code_review')).not.toThrow();
        expect(() => engine.getGraph('deployment')).not.toThrow();
    });

    async function waitForStatus(id: string, status: string, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const exec = engine.getExecution(id);
            if (exec?.status === status) return exec;
            if (exec?.status === 'failed') throw new Error(`Workflow failed: ${exec.error}`);
            await new Promise(r => setTimeout(r, 100));
        }
        const final = engine.getExecution(id);
        console.log("Execution History:", JSON.stringify(final?.history, null, 2));
        throw new Error(`Timeout waiting for status '${status}'. Current: '${final?.status}', Node: '${final?.currentNode}'`);
    }

    it('should execute Code Review workflow', async () => {
        const execution = await engine.start('code_review', { targetBranch: 'main' });

        // Should run analyze_diff -> scan_security -> auto_critique -> human_review (checkpoint)
        const waiting = await waitForStatus(execution.id, 'awaiting_approval');

        expect(waiting.currentNode).toBe('human_review');
        expect(runner.executeTool).toHaveBeenCalledWith('run_command', expect.objectContaining({ CommandLine: expect.stringContaining('git diff') }));
        expect(runner.executeTool).toHaveBeenCalledWith('grep_search', expect.anything());

        // Approve
        await engine.approve(execution.id);

        // Should run merge_pr -> complete
        const final = await waitForStatus(execution.id, 'completed');
        expect(final.state.status).toBe('Merged');
    });

    it('should execute Deployment workflow', async () => {
        const execution = await engine.start('deployment', {});

        // build -> test -> deploy_staging -> verify_health -> deploy_prod (checkpoint)
        const waiting = await waitForStatus(execution.id, 'awaiting_approval');
        expect(waiting.currentNode).toBe('deploy_prod');

        expect(runner.executeTool).toHaveBeenCalledWith('run_command', expect.objectContaining({ CommandLine: expect.stringContaining('npm run build') }));

        await engine.approve(waiting.id);

        const final = await waitForStatus(execution.id, 'completed');
        expect(final.state.released).toBe(true);
    });
});
