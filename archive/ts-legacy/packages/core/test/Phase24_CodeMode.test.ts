import { describe, it, expect } from 'vitest';
import { CodeModeService, ToolDefinition } from '../src/services/CodeModeService.js';

describe('Phase 24: Code Mode V2 (Sandbox Integration)', () => {

    it('executes javascript code using SandboxService', async () => {
        const service = new CodeModeService({ allowAsync: true });
        service.enable();

        const code = `
            const a = 10;
            const b = 20;
            console.log("Adding numbers...");
            return a + b;
        `;

        const result = await service.executeCode(code);

        expect(result.success).toBe(true);
        expect(result.output).toContain('Adding numbers...');
        expect(result.result).toBe(30);
    });

    it('injects tools into execution context', async () => {
        const service = new CodeModeService();
        service.enable();

        let toolCalled = false;
        const testTool: ToolDefinition = {
            name: 'my_tool',
            description: 'Test tool',
            fn: (arg: string) => {
                toolCalled = true;
                return `Processed ${arg}`;
            }
        };

        service.registerTool(testTool);

        const code = `
            const output = my_tool("Input");
            console.log(output);
            return output;
        `;

        const result = await service.executeCode(code);

        expect(result.success).toBe(true);
        expect(toolCalled).toBe(true);
        expect(result.result).toBe('Processed Input');
    });

    it('handles async code and tool calls', async () => {
        const service = new CodeModeService();
        service.enable();

        const asyncTool: ToolDefinition = {
            name: 'wait_and_echo',
            description: 'Async tool',
            fn: async (msg: string) => {
                await new Promise(r => setTimeout(r, 100)); // Sleep 100ms
                return msg + "!";
            }
        };

        service.registerTool(asyncTool);

        const code = `
            const res = await wait_and_echo("Hello");
            return res;
        `;

        const result = await service.executeCode(code);

        expect(result.success).toBe(true);
        expect(result.result).toBe('Hello!');
    });

    it('prevents require by default', async () => {
        const service = new CodeModeService();
        service.enable();

        const code = `
            const fs = require('fs');
        `;

        const result = await service.executeCode(code);

        // CodeModeService captures error in result.error
        expect(result.success).toBe(false);
        expect(result.error).toContain('require');
    });
});
