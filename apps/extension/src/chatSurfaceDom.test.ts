import { describe, expect, it } from 'vitest';
import { deriveChatSurfaceSourceId, inferChatSurfaceRole, inferChatSurfaceStreaming, type ChatSurfaceRoleSelectors } from './chatSurfaceDom';

class MockElement {
    parentElement: MockElement | null = null;
    children: MockElement[] = [];
    dataset: Record<string, string> = {};

    constructor(
        private readonly config: {
            selectors?: string[];
            attrs?: Record<string, string>;
            className?: string;
            dataset?: Record<string, string>;
        } = {},
    ) {
        this.dataset = config.dataset ?? {};
    }

    appendChild(child: MockElement): MockElement {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    getAttribute(name: string): string | null {
        if (name === 'class') {
            return this.className || null;
        }

        return this.config.attrs?.[name] ?? null;
    }

    get className(): string {
        return this.config.className ?? '';
    }

    matches(selector: string): boolean {
        return this.config.selectors?.includes(selector) ?? false;
    }

    closest(selector: string): MockElement | null {
        let current: MockElement | null = this;
        while (current) {
            if (current.matches(selector)) {
                return current;
            }
            current = current.parentElement;
        }

        return null;
    }

    querySelector(selector: string): MockElement | null {
        for (const child of this.children) {
            if (child.matches(selector)) {
                return child;
            }

            const nested = child.querySelector(selector);
            if (nested) {
                return nested;
            }
        }

        return null;
    }
}

describe('inferChatSurfaceRole', () => {
    it('detects ChatGPT assistant messages from ancestor role markers', () => {
        const roleSelectors: ChatSurfaceRoleSelectors = {
            user: ['[data-message-author-role="user"]'],
            assistant: ['[data-message-author-role="assistant"]'],
        };

        const wrapper = new MockElement({ selectors: ['[data-message-author-role="assistant"]'] });
        const body = wrapper.appendChild(new MockElement());
        const element = body.appendChild(new MockElement());

        expect(inferChatSurfaceRole(element as unknown as Element, { roleSelectors })).toBe('assistant');
    });

    it('detects Claude user messages from adapter-specific selectors', () => {
        const roleSelectors: ChatSurfaceRoleSelectors = {
            user: ['[data-testid*="user"]', '[class*="human"]'],
            assistant: ['[data-testid*="assistant"]', '[class*="model"]'],
        };

        const wrapper = new MockElement({ selectors: ['[data-testid*="user"]'] });
        const body = wrapper.appendChild(new MockElement());
        const element = body.appendChild(new MockElement());

        expect(inferChatSurfaceRole(element as unknown as Element, { roleSelectors })).toBe('user');
    });

    it('detects Gemini assistant messages from nested model-response nodes', () => {
        const roleSelectors: ChatSurfaceRoleSelectors = {
            user: ['[data-role="user"]', '[class*="user-query"]'],
            assistant: ['[data-role="model"]', 'model-response', '[class*="model-response"]'],
        };

        const wrapper = new MockElement();
        const modelResponse = wrapper.appendChild(new MockElement({ selectors: ['model-response'] }));
        const element = modelResponse.appendChild(new MockElement());

        expect(inferChatSurfaceRole(element as unknown as Element, { roleSelectors })).toBe('assistant');
    });

    it('falls back to generic role signals when no adapter selectors match', () => {
        const wrapper = new MockElement({ className: 'message assistant response' });
        const element = wrapper.appendChild(new MockElement());

        expect(inferChatSurfaceRole(element as unknown as Element)).toBe('assistant');
    });
});

describe('inferChatSurfaceStreaming', () => {
    it('detects ChatGPT streaming state from adapter-specific busy selectors', () => {
        const wrapper = new MockElement({ selectors: ['[data-testid*="conversation-turn"][aria-busy="true"]'] });
        const body = wrapper.appendChild(new MockElement());
        const element = body.appendChild(new MockElement());

        expect(inferChatSurfaceStreaming(element as unknown as Element, {
            streamingSelectors: ['[data-testid*="conversation-turn"][aria-busy="true"]'],
        })).toBe(true);
    });

    it('detects Claude streaming state from thinking-class selectors', () => {
        const wrapper = new MockElement({ selectors: ['[class*="thinking"]'] });
        const element = wrapper.appendChild(new MockElement());

        expect(inferChatSurfaceStreaming(element as unknown as Element, {
            streamingSelectors: ['[class*="thinking"]'],
        })).toBe(true);
    });

    it('detects Gemini streaming state from nested model-response busy markers', () => {
        const wrapper = new MockElement();
        const modelResponse = wrapper.appendChild(new MockElement({ selectors: ['model-response[aria-busy="true"]'] }));
        const element = modelResponse.appendChild(new MockElement());

        expect(inferChatSurfaceStreaming(element as unknown as Element, {
            streamingSelectors: ['model-response[aria-busy="true"]'],
        })).toBe(true);
    });

    it('falls back to generic streaming signals when adapter selectors do not match', () => {
        const wrapper = new MockElement({ attrs: { 'aria-busy': 'true' }, selectors: ['[aria-busy="true"]'] });
        const element = wrapper.appendChild(new MockElement());

        expect(inferChatSurfaceStreaming(element as unknown as Element)).toBe(true);
    });
});

describe('deriveChatSurfaceSourceId', () => {
    it('prefers explicit data-message-id attributes', () => {
        const wrapper = new MockElement({ attrs: { 'data-message-id': 'msg_123' } });
        const element = wrapper.appendChild(new MockElement());

        expect(deriveChatSurfaceSourceId(element as unknown as Element, { adapterId: 'chatgpt' })).toBe('dom:chatgpt:data-message-id:msg_123');
    });

    it('uses stable ancestor data-testid markers when they look unique', () => {
        const wrapper = new MockElement({ attrs: { 'data-testid': 'conversation-turn-42' } });
        const element = wrapper.appendChild(new MockElement());

        expect(deriveChatSurfaceSourceId(element as unknown as Element, { adapterId: 'claude' })).toBe('dom:claude:data-testid:conversation-turn-42');
    });

    it('ignores generic non-unique test ids', () => {
        const wrapper = new MockElement({ attrs: { 'data-testid': 'chat-message' } });
        const element = wrapper.appendChild(new MockElement());

        expect(deriveChatSurfaceSourceId(element as unknown as Element, { adapterId: 'gemini' })).toBeUndefined();
    });
});