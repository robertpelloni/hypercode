export type ToolCallParameter = {
    name: string;
    value: string;
};

export type ToolCallCandidate = {
    name: string;
    source: 'xml' | 'json' | 'markdown' | 'text';
    preview: string;
    parameters: ToolCallParameter[];
};

export type FunctionResultCandidate = {
    name: string;
    source: 'xml' | 'json' | 'markdown' | 'text';
    preview: string;
    status?: string;
    summary?: string;
    fields: ToolCallParameter[];
};

export type ChatSurfaceExecution = {
    id: string;
    name: string;
    state: 'completed' | 'pending' | 'result-only';
    isStreaming?: boolean;
    callSource?: ToolCallCandidate['source'];
    resultSource?: FunctionResultCandidate['source'];
    callPreview?: string;
    resultPreview?: string;
    parameters: ToolCallParameter[];
    status?: string;
    summary?: string;
    fields: ToolCallParameter[];
};

export type ChatSurfaceMessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

export type ChatSurfaceSourceMessage = {
    text: string;
    sourceId?: string;
    role?: ChatSurfaceMessageRole;
    isStreaming?: boolean;
};

export type ChatSurfaceMessage = {
    id: string;
    text: string;
    sourceId?: string;
    role?: ChatSurfaceMessageRole;
    isStreaming?: boolean;
};

export type ChatSurfaceSnapshot = {
    adapterId: string;
    adapterName: string;
    url: string;
    title: string;
    messageCount: number;
    toolCallCount: number;
    toolCalls: ToolCallCandidate[];
    functionResultCount: number;
    functionResults: FunctionResultCandidate[];
    executions: ChatSurfaceExecution[];
    latestMessages: ChatSurfaceMessage[];
};

const MAX_TOOL_CALLS = 6;
const MAX_FUNCTION_RESULTS = 6;
const MAX_LATEST_MESSAGES = 6;
const MAX_RESULT_FIELDS = 6;
const MAX_EXECUTIONS = 6;

type LocatedToolCallCandidate = ToolCallCandidate & {
    messageIndex: number;
    order: number;
    isStreaming: boolean;
};

type LocatedFunctionResultCandidate = FunctionResultCandidate & {
    messageIndex: number;
    order: number;
    isStreaming: boolean;
};

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function createMessageId(text: string, index: number): string {
    let hash = 2166136261;
    for (let cursor = 0; cursor < text.length; cursor += 1) {
        hash ^= text.charCodeAt(cursor);
        hash = Math.imul(hash, 16777619);
    }

    return `msg-${index}-${(hash >>> 0).toString(16)}`;
}

function createExecutionId(name: string, index: number): string {
    return createMessageId(`execution:${name}`, index);
}

function createPreview(text: string, limit = 140): string {
    const normalized = normalizeWhitespace(text);
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit - 1)}…`;
}

function stringifyValue(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return String(value);
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function createValuePreview(value: unknown, limit = 120): string {
    return createPreview(stringifyValue(value), limit);
}

function extractJsonObjectSnippets(text: string, maxLength = 1200): string[] {
    const snippets: string[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaping = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (escaping) {
            escaping = false;
            continue;
        }

        if (char === '\\') {
            escaping = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{') {
            if (depth === 0) {
                start = index;
            }
            depth += 1;
            continue;
        }

        if (char === '}') {
            if (depth === 0) {
                continue;
            }

            depth -= 1;
            if (depth === 0 && start >= 0) {
                const snippet = text.slice(start, index + 1);
                if (snippet.length <= maxLength) {
                    snippets.push(snippet);
                }
                start = -1;
            }
        }
    }

    return snippets;
}

function safeParseJson<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function dedupeParameters(parameters: ToolCallParameter[]): ToolCallParameter[] {
    const deduped = new Map<string, ToolCallParameter>();
    for (const parameter of parameters) {
        const key = `${parameter.name}:${parameter.value}`;
        if (!deduped.has(key)) {
            deduped.set(key, parameter);
        }
    }

    return Array.from(deduped.values());
}

function parseXmlParameters(body: string): ToolCallParameter[] {
    const parameters: ToolCallParameter[] = [];
    const parameterPattern = /<parameter(?:\s+name=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/parameter>/gi;

    for (const match of body.matchAll(parameterPattern)) {
        const name = normalizeWhitespace(match[1] || 'value');
        const value = createPreview(match[2] || '', 120);
        parameters.push({ name, value });
    }

    return dedupeParameters(parameters);
}

function parseJsonParameters(text: string): ToolCallParameter[] {
    const objectMatch = text.match(/"(?:arguments|params|parameters)"\s*:\s*\{([\s\S]{0,400}?)\}/i);
    if (!objectMatch) {
        return [];
    }

    const parameters: ToolCallParameter[] = [];
    const pairPattern = /"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|\d+|true|false|null|\{[^}]*\}|\[[^\]]*\])/g;

    for (const match of objectMatch[1].matchAll(pairPattern)) {
        const rawValue = match[2] || '';
        const normalizedValue = rawValue.startsWith('"')
            ? rawValue.slice(1, -1)
            : rawValue;

        parameters.push({
            name: normalizeWhitespace(match[1] || 'value'),
            value: createPreview(normalizedValue, 120),
        });
    }

    return dedupeParameters(parameters);
}

function parseMarkdownParameters(block: string): ToolCallParameter[] {
    const parameters: ToolCallParameter[] = [];
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || /^(tool|tool_name|name)\s*[:=]/i.test(trimmed)) {
            continue;
        }

        const match = trimmed.match(/^([a-zA-Z0-9_.:-]+)\s*[:=]\s*(.+)$/);
        if (!match) continue;

        parameters.push({
            name: normalizeWhitespace(match[1]),
            value: createPreview(match[2], 120),
        });
    }

    return dedupeParameters(parameters);
}

function extractMarkdownFenceBlocks(text: string, maxLength: number, fenceLabels: string[]): string[] {
    const blocks: string[] = [];
    const escapedLabels = fenceLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const labelPattern = escapedLabels.length > 0 ? `(?:${escapedLabels.join('|')})?` : '';
    const effectiveStartPattern = new RegExp('```' + labelPattern + '\\n', 'g');
    const startMatches = [...text.matchAll(effectiveStartPattern)];

    for (let index = 0; index < startMatches.length; index += 1) {
        const match = startMatches[index];
        const startIndex = (match.index ?? 0) + match[0].length;
        const nextStartIndex = startMatches[index + 1]?.index ?? text.length;
        const closingFenceIndex = text.indexOf('\n```', startIndex);
        const endIndex = closingFenceIndex >= 0 && closingFenceIndex < nextStartIndex
            ? closingFenceIndex
            : nextStartIndex;
        const block = text.slice(startIndex, endIndex).trim();

        if (block && block.length <= maxLength) {
            blocks.push(block);
        }
    }

    return blocks;
}

function extractPlainTextBlocks(text: string, maxLength = 900): string[] {
    const trimmed = text.trim();
    if (!trimmed) {
        return [];
    }

    const rawBlocks = trimmed.split(/\n\s*\n+/);
    const candidates = rawBlocks.length > 1 ? rawBlocks : [trimmed];

    return candidates
        .map((block) => block.trim())
        .filter((block) => {
            if (!block || block.length > maxLength) {
                return false;
            }

            if (block.includes('```')) {
                return false;
            }

            if (/<(?:invoke|function_call|tool_call|function_result|tool_result)\b/i.test(block)) {
                return false;
            }

            if (/^\s*\{[\s\S]*\}\s*$/m.test(block)) {
                return false;
            }

            return /^(?:tool(?:_name)?|name)\s*[:=]/im.test(block);
        })
        .slice(0, MAX_TOOL_CALLS + MAX_FUNCTION_RESULTS);
}

function filterCallParameters(parameters: ToolCallParameter[]): ToolCallParameter[] {
    const resultKeys = new Set(['status', 'summary', 'message', 'detail', 'error', 'result', 'output', 'response', 'success']);
    return parameters.filter((parameter) => !resultKeys.has(parameter.name.toLowerCase()));
}

function summarizeResultRecord(
    record: Record<string, unknown>,
    preferredRecord?: Record<string, unknown>,
): { status?: string; summary?: string; fields: ToolCallParameter[] } {
    const fields: ToolCallParameter[] = [];
    const summarySource = preferredRecord ?? record;
    const statusSource = preferredRecord ?? record;

    let status: string | undefined;
    if (typeof statusSource.status === 'string') {
        status = normalizeWhitespace(statusSource.status);
    } else if (typeof statusSource.success === 'boolean') {
        status = statusSource.success ? 'success' : 'error';
    } else if (statusSource.error !== undefined && statusSource.error !== null) {
        status = 'error';
    }

    let summary: string | undefined;
    for (const key of ['summary', 'message', 'detail', 'text', 'error']) {
        const value = summarySource[key];
        if (value !== undefined && value !== null) {
            summary = createValuePreview(value, 160);
            break;
        }
    }

    const ignoredKeys = new Set(['tool', 'tool_name', 'name', 'arguments', 'params', 'parameters']);
    for (const [key, value] of Object.entries(record)) {
        if (ignoredKeys.has(key)) {
            continue;
        }

        if (value === undefined) {
            continue;
        }

        fields.push({
            name: normalizeWhitespace(key),
            value: createValuePreview(value, 120),
        });
    }

    return {
        status,
        summary,
        fields: dedupeParameters(fields).slice(0, MAX_RESULT_FIELDS),
    };
}

function summarizeJsonResult(text: string): { status?: string; summary?: string; fields: ToolCallParameter[] } {
    const parsed = safeParseJson<Record<string, unknown>>(text.trim());
    if (!parsed || typeof parsed !== 'object') {
        return { fields: [] };
    }

    const nestedResult = (() => {
        for (const key of ['result', 'output', 'response', 'data']) {
            const value = parsed[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value as Record<string, unknown>;
            }
        }
        return null;
    })();

    return summarizeResultRecord(nestedResult ?? parsed, parsed);
}

function summarizeXmlResult(attrs: string, body: string): { status?: string; summary?: string; fields: ToolCallParameter[] } {
    const parsedJson = summarizeJsonResult(body);
    if (parsedJson.fields.length > 0 || parsedJson.status || parsedJson.summary) {
        const attrStatusMatch = attrs.match(/\sstatus=["']([^"']+)["']/i);
        return {
            ...parsedJson,
            status: normalizeWhitespace(attrStatusMatch?.[1] || parsedJson.status || '' ) || parsedJson.status,
        };
    }

    const fields: ToolCallParameter[] = [];
    let status = (() => {
        const attrStatusMatch = attrs.match(/\sstatus=["']([^"']+)["']/i);
        return attrStatusMatch ? normalizeWhitespace(attrStatusMatch[1]) : undefined;
    })();
    let summary: string | undefined;

    const tagPattern = /<([a-zA-Z0-9_.:-]+)[^>]*>([^<]{1,200})<\/\1>/g;
    for (const match of body.matchAll(tagPattern)) {
        const name = normalizeWhitespace(match[1] || 'value');
        const value = createPreview(match[2] || '', 120);

        if (!status && name.toLowerCase() === 'status') {
            status = value;
        }

        if (!summary && ['summary', 'message', 'detail', 'error', 'text'].includes(name.toLowerCase())) {
            summary = value;
        }

        if (name.toLowerCase() !== 'name') {
            fields.push({ name, value });
        }
    }

    return {
        status,
        summary,
        fields: dedupeParameters(fields).slice(0, MAX_RESULT_FIELDS),
    };
}

function summarizeMarkdownResult(block: string): { status?: string; summary?: string; fields: ToolCallParameter[] } {
    const fields = parseMarkdownParameters(block).slice(0, MAX_RESULT_FIELDS);
    let status: string | undefined;
    let summary: string | undefined;

    for (const field of fields) {
        const loweredName = field.name.toLowerCase();
        const loweredValue = field.value.toLowerCase();

        if (!status && loweredName === 'status') {
            status = field.value;
        }

        if (!status && loweredName === 'success') {
            status = loweredValue === 'true' ? 'success' : 'error';
        }

        if (!status && loweredName === 'error') {
            status = 'error';
        }

        if (!summary && ['summary', 'message', 'detail', 'error', 'result', 'output', 'response'].includes(loweredName)) {
            summary = field.value;
        }
    }

    return { status, summary, fields };
}

function extractXmlToolCalls(text: string): ToolCallCandidate[] {
    const candidates: ToolCallCandidate[] = [];
    const invokePattern = /<(?:invoke|function_call|tool_call)(?:\s+name=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/(?:invoke|function_call|tool_call)>/gi;

    for (const match of text.matchAll(invokePattern)) {
        const explicitName = normalizeWhitespace(match[1] || '');
        const body = normalizeWhitespace(match[2] || '');
        const fallbackNameMatch = body.match(/\bname\s*[:=]\s*["']?([a-zA-Z0-9_.:-]+)/i);
        const name = explicitName || normalizeWhitespace(fallbackNameMatch?.[1] || 'unknown-tool');

        candidates.push({
            name,
            source: 'xml',
            preview: createPreview(match[0]),
            parameters: parseXmlParameters(match[2] || ''),
        });
    }

    return candidates;
}

function extractJsonToolCalls(text: string): ToolCallCandidate[] {
    const candidates: ToolCallCandidate[] = [];
    for (const snippet of extractJsonObjectSnippets(text, 800)) {
        const nameMatch = snippet.match(/"(?:tool|tool_name|name)"\s*:\s*"([^"]+)"/i);
        if (!nameMatch) continue;

        candidates.push({
            name: normalizeWhitespace(nameMatch[1] || 'unknown-tool'),
            source: 'json',
            preview: createPreview(snippet),
            parameters: parseJsonParameters(snippet),
        });
    }

    return candidates;
}

function extractMarkdownToolCalls(text: string): ToolCallCandidate[] {
    const candidates: ToolCallCandidate[] = [];
    for (const block of extractMarkdownFenceBlocks(text, 800, ['xml', 'json', 'tool_call', 'tool-use'])) {
        const toolNameMatch = block.match(/(?:tool|tool_name|name)\s*[:=]\s*["']?([a-zA-Z0-9_.:-]+)/i);
        if (!toolNameMatch) continue;

        candidates.push({
            name: normalizeWhitespace(toolNameMatch[1] || 'unknown-tool'),
            source: 'markdown',
            preview: createPreview(block),
            parameters: parseMarkdownParameters(block),
        });
    }

    return candidates;
}

function extractPlainTextToolCalls(text: string): ToolCallCandidate[] {
    const candidates: ToolCallCandidate[] = [];

    for (const block of extractPlainTextBlocks(text, 600)) {
        if (/(?:status|summary|message|detail|error|result|output|response|success)\s*[:=]/i.test(block)) {
            continue;
        }

        const toolNameMatch = block.match(/(?:tool(?:_name)?|name)\s*[:=]\s*["']?([a-zA-Z0-9_.:-]+)/i);
        if (!toolNameMatch) continue;

        const parameters = filterCallParameters(parseMarkdownParameters(block));
        if (parameters.length === 0) {
            continue;
        }

        candidates.push({
            name: normalizeWhitespace(toolNameMatch[1] || 'unknown-tool'),
            source: 'text',
            preview: createPreview(block),
            parameters,
        });
    }

    return candidates;
}

export function extractToolCallCandidates(text: string): ToolCallCandidate[] {
    const merged = [
        ...extractXmlToolCalls(text),
        ...extractJsonToolCalls(text),
        ...extractMarkdownToolCalls(text),
        ...extractPlainTextToolCalls(text),
    ];

    const deduped = new Map<string, ToolCallCandidate>();
    for (const candidate of merged) {
        const key = `${candidate.source}:${candidate.name}:${candidate.preview}`;
        if (!deduped.has(key)) {
            deduped.set(key, candidate);
        }
    }

    return Array.from(deduped.values()).slice(0, MAX_TOOL_CALLS);
}

function extractXmlFunctionResults(text: string): FunctionResultCandidate[] {
    const candidates: FunctionResultCandidate[] = [];
    const pattern = /<(?:function_result|tool_result)([^>]*)>([\s\S]*?)<\/(?:function_result|tool_result)>/gi;

    for (const match of text.matchAll(pattern)) {
        const attrs = match[1] || '';
        const nameMatch = attrs.match(/\sname=["']([^"']+)["']/i);
        const parsed = summarizeXmlResult(attrs, match[2] || '');
        candidates.push({
            name: normalizeWhitespace(nameMatch?.[1] || 'unknown-tool'),
            source: 'xml',
            preview: createPreview(match[0]),
            status: parsed.status,
            summary: parsed.summary,
            fields: parsed.fields,
        });
    }

    return candidates;
}

function extractJsonFunctionResults(text: string): FunctionResultCandidate[] {
    const candidates: FunctionResultCandidate[] = [];
    for (const snippet of extractJsonObjectSnippets(text, 1000)) {
        const nameMatch = snippet.match(/"(?:tool|tool_name|name)"\s*:\s*"([^"]+)"/i);
        const resultMatch = snippet.match(/"(?:result|output|response)"\s*:/i);
        if (!nameMatch || !resultMatch) continue;

        const parsed = summarizeJsonResult(snippet);
        candidates.push({
            name: normalizeWhitespace(nameMatch[1] || 'unknown-tool'),
            source: 'json',
            preview: createPreview(snippet),
            status: parsed.status,
            summary: parsed.summary,
            fields: parsed.fields,
        });
    }

    return candidates;
}

function extractMarkdownFunctionResults(text: string): FunctionResultCandidate[] {
    const candidates: FunctionResultCandidate[] = [];
    for (const block of extractMarkdownFenceBlocks(text, 900, ['json', 'xml', 'tool_result', 'result'])) {
        const resultHint = /(?:result|output|response|status|message|summary|error)\s*[:=]/i.test(block);
        const nameMatch = block.match(/(?:tool|tool_name|name)\s*[:=]\s*["']?([a-zA-Z0-9_.:-]+)/i);
        if (!resultHint || !nameMatch) continue;

        const parsed = summarizeMarkdownResult(block);

        candidates.push({
            name: normalizeWhitespace(nameMatch[1] || 'unknown-tool'),
            source: 'markdown',
            preview: createPreview(block),
            status: parsed.status,
            summary: parsed.summary,
            fields: parsed.fields,
        });
    }

    return candidates;
}

function extractPlainTextFunctionResults(text: string): FunctionResultCandidate[] {
    const candidates: FunctionResultCandidate[] = [];

    for (const block of extractPlainTextBlocks(text, 700)) {
        const resultHint = /(?:result|output|response|status|message|summary|error|success)\s*[:=]/i.test(block);
        const nameMatch = block.match(/(?:tool(?:_name)?|name)\s*[:=]\s*["']?([a-zA-Z0-9_.:-]+)/i);
        if (!resultHint || !nameMatch) continue;

        const parsed = summarizeMarkdownResult(block);
        candidates.push({
            name: normalizeWhitespace(nameMatch[1] || 'unknown-tool'),
            source: 'text',
            preview: createPreview(block),
            status: parsed.status,
            summary: parsed.summary,
            fields: parsed.fields,
        });
    }

    return candidates;
}

export function extractFunctionResultCandidates(text: string): FunctionResultCandidate[] {
    const merged = [
        ...extractXmlFunctionResults(text),
        ...extractJsonFunctionResults(text),
        ...extractMarkdownFunctionResults(text),
        ...extractPlainTextFunctionResults(text),
    ];

    const deduped = new Map<string, FunctionResultCandidate>();
    for (const candidate of merged) {
        const key = `${candidate.source}:${candidate.name}:${candidate.preview}`;
        if (!deduped.has(key)) {
            deduped.set(key, candidate);
        }
    }

    return Array.from(deduped.values()).slice(0, MAX_FUNCTION_RESULTS);
}

function locateToolCallCandidates(text: string, messageIndex: number, isStreaming = false): LocatedToolCallCandidate[] {
    return extractToolCallCandidates(text).map((candidate, order) => ({
        ...candidate,
        messageIndex,
        order,
        isStreaming,
    }));
}

function locateFunctionResultCandidates(text: string, messageIndex: number, isStreaming = false): LocatedFunctionResultCandidate[] {
    return extractFunctionResultCandidates(text).map((candidate, order) => ({
        ...candidate,
        messageIndex,
        order,
        isStreaming,
    }));
}

function buildExecutionTimeline(params: {
    toolCalls: LocatedToolCallCandidate[];
    functionResults: LocatedFunctionResultCandidate[];
}): ChatSurfaceExecution[] {
    const unmatchedCalls = params.toolCalls.map((call, index) => ({
        ...call,
        internalIndex: index,
    }));
    const executions: Array<ChatSurfaceExecution & { sortIndex: number }> = [];

    for (let resultIndex = 0; resultIndex < params.functionResults.length; resultIndex += 1) {
        const result = params.functionResults[resultIndex];
        const matchedCallIndex = unmatchedCalls.findLastIndex((call) => {
            if (call.name !== result.name) {
                return false;
            }

            if (call.messageIndex > result.messageIndex) {
                return false;
            }

            if (call.messageIndex === result.messageIndex && call.order > result.order) {
                return false;
            }

            return true;
        });

        const matchedCall = matchedCallIndex >= 0 ? unmatchedCalls.splice(matchedCallIndex, 1)[0] : null;
        const executionIndex = executions.length;

        if (matchedCall) {
            executions.push({
                id: createExecutionId(result.name, executionIndex),
                name: result.name,
                state: 'completed',
                isStreaming: result.isStreaming || matchedCall.isStreaming,
                callSource: matchedCall.source,
                resultSource: result.source,
                callPreview: matchedCall.preview,
                resultPreview: result.preview,
                parameters: matchedCall.parameters,
                status: result.status,
                summary: result.summary,
                fields: result.fields,
                sortIndex: Math.max(matchedCall.messageIndex, result.messageIndex) * 100 + result.order,
            });
            continue;
        }

        executions.push({
            id: createExecutionId(result.name, executionIndex),
            name: result.name,
            state: 'result-only',
            isStreaming: result.isStreaming,
            resultSource: result.source,
            resultPreview: result.preview,
            parameters: [],
            status: result.status,
            summary: result.summary,
            fields: result.fields,
            sortIndex: result.messageIndex * 100 + result.order,
        });
    }

    for (const call of unmatchedCalls) {
        executions.push({
            id: createExecutionId(call.name, executions.length),
            name: call.name,
            state: 'pending',
            isStreaming: call.isStreaming,
            callSource: call.source,
            callPreview: call.preview,
            parameters: call.parameters,
            fields: [],
            sortIndex: call.messageIndex * 100 + call.order,
        });
    }

    return executions
        .sort((left, right) => left.sortIndex - right.sortIndex)
        .slice(-MAX_EXECUTIONS)
        .map(({ sortIndex: _sortIndex, ...execution }) => execution);
}

export function buildChatSurfaceSnapshot(params: {
    adapterId: string;
    adapterName: string;
    url: string;
    title: string;
    messages?: ChatSurfaceSourceMessage[];
    messageTexts: string[];
}): ChatSurfaceSnapshot {
    const inputMessages: ChatSurfaceSourceMessage[] = params.messages?.length
        ? params.messages
        : params.messageTexts.map((message) => ({ text: message }));

    const sourceMessages = inputMessages
        .map((message) => ({
            text: message.text.trim(),
            sourceId: message.sourceId,
            role: message.role ?? 'unknown',
            isStreaming: Boolean(message.isStreaming),
        }))
        .filter((message) => message.text.length > 0);

    const rawMessages = sourceMessages.map((message) => message.text);

    const normalizedMessages = rawMessages
        .map((message) => normalizeWhitespace(message))
        .filter((message) => message.length > 0);

    const latestMessages = sourceMessages
        .slice(-MAX_LATEST_MESSAGES)
        .map((message, index) => {
            const normalizedText = normalizeWhitespace(message.text);
            return {
                id: message.sourceId || createMessageId(`${message.role}:${normalizedText}`, index),
                text: createPreview(normalizedText, 220),
                sourceId: message.sourceId,
                role: message.role,
                isStreaming: message.isStreaming,
            };
        });

    const locatedToolCalls = sourceMessages.flatMap((message, index) => locateToolCallCandidates(message.text, index, message.isStreaming));
    const locatedFunctionResults = sourceMessages.flatMap((message, index) => locateFunctionResultCandidates(message.text, index, message.isStreaming));

    const fullText = rawMessages.join('\n\n');
    const toolCalls = extractToolCallCandidates(fullText);
    const functionResults = extractFunctionResultCandidates(fullText);
    const executions = buildExecutionTimeline({
        toolCalls: locatedToolCalls,
        functionResults: locatedFunctionResults,
    });

    return {
        adapterId: params.adapterId,
        adapterName: params.adapterName,
        url: params.url,
        title: params.title,
        messageCount: sourceMessages.length,
        toolCallCount: toolCalls.length,
        toolCalls,
        functionResultCount: functionResults.length,
        functionResults,
        executions,
        latestMessages,
    };
}

export function snapshotsEqual(a: ChatSurfaceSnapshot | null, b: ChatSurfaceSnapshot | null): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
