import { describe, expect, it } from 'vitest';
import { buildChatSurfaceSnapshot, extractFunctionResultCandidates, extractToolCallCandidates, snapshotsEqual } from './chatObserver';

describe('extractToolCallCandidates', () => {
    it('detects xml-style tool calls', () => {
        const text = `
<function_calls>
  <invoke name="browser.search">
    <parameter name="query">borg</parameter>
  </invoke>
</function_calls>`;

        expect(extractToolCallCandidates(text)).toEqual([
            expect.objectContaining({ name: 'browser.search', source: 'xml' }),
        ]);
    });

    it('detects json and markdown tool call hints', () => {
        const text = [
            '{"tool":"memory.search","arguments":{"query":"fallback chain"}}',
            '',
            '```tool_call',
            'tool_name: shell.exec',
            'command: pnpm test',
            '```',
        ].join('\n');

        const calls = extractToolCallCandidates(text);
        expect(calls).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'memory.search',
                source: 'json',
                parameters: [expect.objectContaining({ name: 'query', value: 'fallback chain' })],
            }),
            expect.objectContaining({
                name: 'shell.exec',
                source: 'markdown',
                parameters: [expect.objectContaining({ name: 'command', value: 'pnpm test' })],
            }),
        ]));
    });

    it('detects function result payloads', () => {
        const text = [
            '<function_result name="browser.search">{"status":"ok"}</function_result>',
            '',
            '{"tool":"memory.search","result":{"hits":2},"success":true,"message":"2 hits returned"}',
        ].join('\n');

        const results = extractFunctionResultCandidates(text);
        expect(results).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'browser.search',
                source: 'xml',
                status: 'ok',
                fields: expect.arrayContaining([expect.objectContaining({ name: 'status', value: 'ok' })]),
            }),
            expect.objectContaining({
                name: 'memory.search',
                source: 'json',
                status: 'success',
                summary: '2 hits returned',
                fields: expect.arrayContaining([expect.objectContaining({ name: 'hits', value: '2' })]),
            }),
        ]));
    });

    it('extracts markdown function-result status and summary fields', () => {
        const text = [
            '```result',
            'tool_name: shell.exec',
            'status: error',
            'message: command failed',
            'exit_code: 1',
            '```',
        ].join('\n');

        const results = extractFunctionResultCandidates(text);
        expect(results).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'shell.exec',
                source: 'markdown',
                status: 'error',
                summary: 'command failed',
                fields: expect.arrayContaining([
                    expect.objectContaining({ name: 'status', value: 'error' }),
                    expect.objectContaining({ name: 'exit_code', value: '1' }),
                ]),
            }),
        ]));
    });

    it('detects unfinished streaming markdown tool/result blocks', () => {
        const text = [
            'Assistant stream:',
            '```tool_call',
            'tool_name: browser.search',
            'query: borg streaming',
            '',
            'Still streaming...',
            '```result',
            'tool_name: browser.search',
            'status: success',
            'message: partial block parsed',
            'count: 1',
        ].join('\n');

        expect(extractToolCallCandidates(text)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'browser.search',
                source: 'markdown',
                parameters: [expect.objectContaining({ name: 'query', value: 'borg streaming' })],
            }),
        ]));

        expect(extractFunctionResultCandidates(text)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'browser.search',
                source: 'markdown',
                status: 'success',
                summary: 'partial block parsed',
            }),
        ]));
    });

    it('detects unfenced plain-text tool calls and results', () => {
        const text = [
            'tool_name: browser.search',
            'query: borg bridge',
            '',
            'tool_name: browser.search',
            'status: success',
            'message: 4 matches',
            'count: 4',
        ].join('\n');

        expect(extractToolCallCandidates(text)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'browser.search',
                source: 'text',
                parameters: [expect.objectContaining({ name: 'query', value: 'borg bridge' })],
            }),
        ]));

        expect(extractFunctionResultCandidates(text)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'browser.search',
                source: 'text',
                status: 'success',
                summary: '4 matches',
                fields: expect.arrayContaining([expect.objectContaining({ name: 'count', value: '4' })]),
            }),
        ]));
    });
});

describe('buildChatSurfaceSnapshot', () => {
    it('builds a compact snapshot with latest messages and tool call summary', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'chatgpt',
            adapterName: 'ChatGPT',
            url: 'https://chatgpt.com',
            title: 'ChatGPT',
            messages: [
                { text: 'User: please search for borg status', role: 'user' },
                { text: '<invoke name="browser.search"><parameter name="query">borg</parameter></invoke>', role: 'assistant', isStreaming: true },
                { text: 'Assistant: here are the results', role: 'assistant' },
            ],
            messageTexts: [
                'User: please search for borg status',
                '<invoke name="browser.search"><parameter name="query">borg</parameter></invoke>',
                'Assistant: here are the results',
            ],
        });

        expect(snapshot.adapterId).toBe('chatgpt');
        expect(snapshot.messageCount).toBe(3);
        expect(snapshot.toolCallCount).toBe(1);
        expect(snapshot.functionResultCount).toBe(0);
        expect(snapshot.latestMessages).toHaveLength(3);
        expect(snapshot.latestMessages[0]).toEqual(expect.objectContaining({ role: 'user', isStreaming: false }));
        expect(snapshot.latestMessages[1]).toEqual(expect.objectContaining({ role: 'assistant', isStreaming: true }));
        expect(snapshot.toolCalls[0]).toEqual(expect.objectContaining({ name: 'browser.search' }));
        expect(snapshot.executions).toEqual([
            expect.objectContaining({
                name: 'browser.search',
                state: 'pending',
                isStreaming: true,
            }),
        ]);
    });

    it('preserves role and streaming metadata in latest messages', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'claude',
            adapterName: 'Claude',
            url: 'https://claude.ai',
            title: 'Claude',
            messages: [
                { text: 'How does fallback work?', sourceId: 'dom:claude:data-testid:message-1', role: 'user' },
                { text: 'Thinking through quota exhaustion...', sourceId: 'dom:claude:data-testid:message-2', role: 'assistant', isStreaming: true },
                { text: 'Search memory for prior fallback incidents', role: 'tool' },
            ],
            messageTexts: [],
        });

        expect(snapshot.messageCount).toBe(3);
        expect(snapshot.latestMessages).toEqual([
            expect.objectContaining({ id: 'dom:claude:data-testid:message-1', sourceId: 'dom:claude:data-testid:message-1', text: 'How does fallback work?', role: 'user', isStreaming: false }),
            expect.objectContaining({ id: 'dom:claude:data-testid:message-2', sourceId: 'dom:claude:data-testid:message-2', text: 'Thinking through quota exhaustion...', role: 'assistant', isStreaming: true }),
            expect.objectContaining({ text: 'Search memory for prior fallback incidents', role: 'tool', isStreaming: false }),
        ]);
    });

    it('prefers supplied source ids for stable latest message identities', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'chatgpt',
            adapterName: 'ChatGPT',
            url: 'https://chatgpt.com',
            title: 'ChatGPT',
            messages: [
                { text: 'Streaming answer chunk', sourceId: 'dom:chatgpt:data-testid:conversation-turn-9', role: 'assistant', isStreaming: true },
            ],
            messageTexts: [],
        });

        expect(snapshot.latestMessages).toEqual([
            expect.objectContaining({
                id: 'dom:chatgpt:data-testid:conversation-turn-9',
                sourceId: 'dom:chatgpt:data-testid:conversation-turn-9',
                role: 'assistant',
                isStreaming: true,
            }),
        ]);
    });

    it('includes function-result summaries in the snapshot', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'chatgpt',
            adapterName: 'ChatGPT',
            url: 'https://chatgpt.com',
            title: 'ChatGPT',
            messageTexts: [
                '<function_result name="browser.search">{"status":"ok","count":3}</function_result>',
            ],
        });

        expect(snapshot.functionResultCount).toBe(1);
        expect(snapshot.functionResults[0]).toEqual(expect.objectContaining({
            name: 'browser.search',
            source: 'xml',
            status: 'ok',
            fields: expect.arrayContaining([expect.objectContaining({ name: 'status', value: 'ok' })]),
        }));
    });

    it('correlates tool calls and results into executions', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'chatgpt',
            adapterName: 'ChatGPT',
            url: 'https://chatgpt.com',
            title: 'ChatGPT',
            messageTexts: [
                'Assistant: ```tool_call\ntool_name: browser.search\nquery: borg router\n```',
                'Assistant: ```result\ntool_name: browser.search\nstatus: success\nmessage: 3 matching docs\ncount: 3\n```',
            ],
        });

        expect(snapshot.executions).toEqual([
            expect.objectContaining({
                name: 'browser.search',
                state: 'completed',
                isStreaming: false,
                callSource: 'markdown',
                resultSource: 'markdown',
                status: 'success',
                summary: '3 matching docs',
                parameters: [expect.objectContaining({ name: 'query', value: 'borg router' })],
                fields: expect.arrayContaining([expect.objectContaining({ name: 'count', value: '3' })]),
            }),
        ]);
    });

    it('keeps unmatched calls and results visible in the execution timeline', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'claude',
            adapterName: 'Claude',
            url: 'https://claude.ai',
            title: 'Claude',
            messageTexts: [
                '<invoke name="memory.search"><parameter name="query">fallback</parameter></invoke>',
                '```result\ntool_name: browser.search\nstatus: error\nerror: unavailable\n```',
            ],
        });

        expect(snapshot.executions).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'memory.search',
                state: 'pending',
                isStreaming: false,
                callSource: 'xml',
                parameters: [expect.objectContaining({ name: 'query', value: 'fallback' })],
            }),
            expect.objectContaining({
                name: 'browser.search',
                state: 'result-only',
                isStreaming: false,
                resultSource: 'markdown',
                status: 'error',
                summary: 'unavailable',
            }),
        ]));
    });

    it('correlates unfenced plain-text calls and results into executions', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'gemini',
            adapterName: 'Gemini',
            url: 'https://gemini.google.com',
            title: 'Gemini',
            messageTexts: [
                'tool_name: browser.search\nquery: borg dashboard',
                'tool_name: browser.search\nstatus: success\nmessage: 2 relevant routes\ncount: 2',
            ],
        });

        expect(snapshot.executions).toEqual([
            expect.objectContaining({
                name: 'browser.search',
                state: 'completed',
                isStreaming: false,
                callSource: 'text',
                resultSource: 'text',
                status: 'success',
                summary: '2 relevant routes',
                parameters: [expect.objectContaining({ name: 'query', value: 'borg dashboard' })],
                fields: expect.arrayContaining([expect.objectContaining({ name: 'count', value: '2' })]),
            }),
        ]);
    });

    it('correlates unfinished streaming markdown fences into executions', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'chatgpt',
            adapterName: 'ChatGPT',
            url: 'https://chatgpt.com',
            title: 'ChatGPT',
            messageTexts: [
                '```tool_call\ntool_name: browser.search\nquery: borg observer',
                '```result\ntool_name: browser.search\nstatus: success\nmessage: stream chunk visible\ncount: 1',
            ],
        });

        expect(snapshot.executions).toEqual([
            expect.objectContaining({
                name: 'browser.search',
                state: 'completed',
                isStreaming: false,
                callSource: 'markdown',
                resultSource: 'markdown',
                status: 'success',
                summary: 'stream chunk visible',
                parameters: [expect.objectContaining({ name: 'query', value: 'borg observer' })],
            }),
        ]);
    });

    it('preserves execution streaming state from streaming call and result messages', () => {
        const snapshot = buildChatSurfaceSnapshot({
            adapterId: 'chatgpt',
            adapterName: 'ChatGPT',
            url: 'https://chatgpt.com',
            title: 'ChatGPT',
            messages: [
                { text: '```tool_call\ntool_name: browser.search\nquery: borg live stream\n```', role: 'assistant', isStreaming: true },
                { text: '```result\ntool_name: browser.search\nstatus: success\nmessage: still rendering\ncount: 1', role: 'assistant', isStreaming: true },
            ],
            messageTexts: [],
        });

        expect(snapshot.executions).toEqual([
            expect.objectContaining({
                name: 'browser.search',
                state: 'completed',
                isStreaming: true,
                status: 'success',
                summary: 'still rendering',
            }),
        ]);
    });

    it('compares snapshots structurally for dedupe checks', () => {
        const a = buildChatSurfaceSnapshot({
            adapterId: 'claude',
            adapterName: 'Claude',
            url: 'https://claude.ai',
            title: 'Claude',
            messageTexts: ['hello'],
        });
        const b = buildChatSurfaceSnapshot({
            adapterId: 'claude',
            adapterName: 'Claude',
            url: 'https://claude.ai',
            title: 'Claude',
            messageTexts: ['hello'],
        });
        const c = buildChatSurfaceSnapshot({
            adapterId: 'claude',
            adapterName: 'Claude',
            url: 'https://claude.ai',
            title: 'Claude',
            messageTexts: ['hello', 'world'],
        });

        expect(snapshotsEqual(a, b)).toBe(true);
        expect(snapshotsEqual(a, c)).toBe(false);
    });
});
