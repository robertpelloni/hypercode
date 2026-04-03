// Content Script
// Injects the Hypercode bridge into supported web AI chat surfaces and mounts a
// Hypercode-native sidebar scaffold inspired by MCP-SuperAssistant's in-page model.
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { buildChatSurfaceSnapshot, snapshotsEqual, type ChatSurfaceMessageRole, type ChatSurfaceSnapshot, type ChatSurfaceSourceMessage } from './chatObserver';
import { deriveChatSurfaceSourceId, inferChatSurfaceRole, inferChatSurfaceStreaming, type ChatSurfaceRoleSelectors, type ChatSurfaceStreamingSelectors } from './chatSurfaceDom';

type AdapterSupportLevel = 'generic-bridge' | 'adapter-scaffold-live';

type EditableElement = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

type SurfaceAdapter = {
    id: string;
    name: string;
    hosts: string[];
    supportLevel: AdapterSupportLevel;
    inputSelectors: string[];
    submitSelectors: string[];
    messageSelectors: string[];
    roleSelectors?: ChatSurfaceRoleSelectors;
    streamingSelectors?: ChatSurfaceStreamingSelectors;
    capabilityHints: string[];
};

type ReadablePage = {
    content: string;
    title: string;
};

const SURFACE_ADAPTERS: SurfaceAdapter[] = [
    {
        id: 'chatgpt',
        name: 'ChatGPT',
        hosts: ['chatgpt.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['#prompt-textarea', 'textarea[data-testid="prompt-textarea"]', 'textarea'],
        submitSelectors: ['button[data-testid="send-button"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[data-message-author-role]', '[data-testid^="conversation-turn"]'],
        roleSelectors: {
            user: ['[data-message-author-role="user"]', '[data-testid*="user"]'],
            assistant: ['[data-message-author-role="assistant"]', '[data-testid*="assistant"]', '[data-testid*="conversation-turn"]'],
        },
        streamingSelectors: ['[data-testid*="conversation-turn"][aria-busy="true"]', '[data-message-author-role="assistant"][aria-busy="true"]', '[class*="result-streaming"]', '[class*="cursor"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'claude',
        name: 'Claude',
        hosts: ['claude.ai'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['div[contenteditable="true"][data-is-chat-input="true"]', 'div[contenteditable="true"]', 'textarea'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[aria-label*="send"]', 'button[type="submit"]'],
        messageSelectors: ['[data-testid="chat-message"]', '[class*="message"]'],
        roleSelectors: {
            user: ['[data-role="user"]', '[data-testid*="user"]', '[class*="human"]', '[class*="user"]'],
            assistant: ['[data-role="assistant"]', '[data-testid*="assistant"]', '[class*="assistant"]', '[class*="model"]'],
        },
        streamingSelectors: ['[data-role="assistant"][aria-busy="true"]', '[class*="assistant"][aria-busy="true"]', '[class*="thinking"]', '[class*="generating"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'gemini',
        name: 'Gemini',
        hosts: ['gemini.google.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['div[contenteditable="true"]', 'textarea'],
        submitSelectors: ['button[aria-label*="Send message"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['message-content', '[class*="conversation"]'],
        roleSelectors: {
            user: ['[data-role="user"]', '[class*="user-query"]', '[class*="query-content"]'],
            assistant: ['[data-role="model"]', '[data-role="assistant"]', 'model-response', '[class*="model-response"]', '[class*="response-container"]'],
        },
        streamingSelectors: ['model-response[aria-busy="true"]', '[data-role="model"][aria-busy="true"]', '[class*="response-loading"]', '[class*="generating"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'aistudio',
        name: 'Google AI Studio',
        hosts: ['aistudio.google.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['ms-prompt-input textarea', 'textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Run"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="prompt-response"]', '[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        hosts: ['perplexity.ai', 'www.perplexity.ai'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Submit"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[data-testid="copilot-answer"]', '[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'grok',
        name: 'Grok',
        hosts: ['grok.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Grok something"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['article', '[data-testid="tweetText"]', '[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        hosts: ['chat.deepseek.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]', '[data-message-id]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        hosts: ['openrouter.ai'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 't3chat',
        name: 'T3 Chat',
        hosts: ['t3.chat'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        hosts: ['github.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[data-testid="copilot-chat-message"]', '[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'mistral',
        name: 'Mistral',
        hosts: ['chat.mistral.ai'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'kimi',
        name: 'Kimi',
        hosts: ['kimi.com'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'qwen',
        name: 'Qwen Chat',
        hosts: ['chat.qwen.ai'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
    {
        id: 'zai',
        name: 'Z.ai',
        hosts: ['chat.z.ai'],
        supportLevel: 'adapter-scaffold-live',
        inputSelectors: ['textarea', 'div[contenteditable="true"]'],
        submitSelectors: ['button[aria-label*="Send"]', 'button[type="submit"]'],
        messageSelectors: ['[class*="message"]'],
        capabilityHints: ['input-detect', 'submit-detect', 'sidebar-shell'],
    },
];

const LIVE_BRIDGE_FEATURES = [
    'Adapter registry',
    'Sidebar shell',
    'Input detection',
    'Submit detection',
    'Chat paste',
    'Page absorb',
    'RAG ingest',
    'Console bridge',
    'User activity',
];

const SIDEBAR_HOST_ID = 'hypercode-extension-sidebar-host';
const SIDEBAR_TOGGLE_ID = 'hypercode-extension-sidebar-toggle';
const DASHBOARD_URL = 'http://localhost:3001/dashboard/super-assistant';

function injectScript(filePath: string) {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', filePath);
    (document.head || document.documentElement).appendChild(script);
}

function postBridgeResponse(id: string, result: unknown) {
    window.postMessage({
        type: 'HYPERCODE_RESPONSE',
        id,
        result,
    }, '*');
}

function isElementVisible(element: Element | null): element is HTMLElement {
    if (!(element instanceof HTMLElement)) return false;

    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);

    return rect.width > 0
        && rect.height > 0
        && styles.visibility !== 'hidden'
        && styles.display !== 'none';
}

function findFirstVisible(selectors: string[]): HTMLElement | null {
    for (const selector of selectors) {
        const matches = Array.from(document.querySelectorAll(selector));
        const visible = matches.find((element) => isElementVisible(element));
        if (visible instanceof HTMLElement) {
            return visible;
        }
    }

    return null;
}

function getActiveAdapter(url = window.location.href): SurfaceAdapter | null {
    try {
        const hostname = new URL(url).hostname;
        return SURFACE_ADAPTERS.find((adapter) =>
            adapter.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
        ) ?? null;
    } catch {
        return null;
    }
}

function getChatInputElement(adapter: SurfaceAdapter | null): EditableElement | null {
    if (!adapter) return null;

    const element = findFirstVisible(adapter.inputSelectors);
    if (!element) return null;

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        return element;
    }

    if (element.isContentEditable) {
        return element;
    }

    return null;
}

function getSubmitButton(adapter: SurfaceAdapter | null): HTMLElement | null {
    if (!adapter) return null;
    return findFirstVisible(adapter.submitSelectors);
}

function setNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, text: string) {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
    descriptor?.set?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setContentEditableValue(target: HTMLElement, text: string) {
    target.focus();
    target.textContent = text;
    target.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
}

function insertTextWithAdapter(text: string, submit = false): { success: boolean; reason?: string } {
    const adapter = getActiveAdapter();
    if (!adapter) {
        return { success: false, reason: 'No adapter matches the current site.' };
    }

    const input = getChatInputElement(adapter);
    if (!input) {
        return { success: false, reason: `${adapter.name} input area was not detected.` };
    }

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
        setNativeInputValue(input, text);
    } else {
        setContentEditableValue(input, text);
    }

    input.focus();

    if (submit) {
        const submitButton = getSubmitButton(adapter);
        if (submitButton) {
            submitButton.click();
        } else {
            input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
        }
    }

    return { success: true };
}

function extractReadablePage(): ReadablePage {
    const clone = document.cloneNode(true) as Document;
    const reader = new Readability(clone);
    const article = reader.parse();

    if (!article) {
        throw new Error('Readability failed to parse page.');
    }

    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
    });

    const markdown = turndownService.turndown(article.content);
    const title = article.title || document.title;
    const finalContent = `# ${title}\n\n> URL: ${window.location.href}\n> Excerpt: ${article.excerpt || 'None'}\n\n${markdown}`;

    return {
        content: finalContent,
        title,
    };
}

function scrapeChatHistory() {
    return scrapeChatMessages().map((message) => message.text);
}

function inferMessageRole(element: Element, adapter: SurfaceAdapter | null): ChatSurfaceMessageRole {
    return inferChatSurfaceRole(element, {
        roleSelectors: adapter?.roleSelectors,
    });
}

function inferStreamingState(element: Element): boolean {
    const adapter = getActiveAdapter();
    return inferChatSurfaceStreaming(element, {
        streamingSelectors: adapter?.streamingSelectors,
    });
}

function scrapeChatMessages(): ChatSurfaceSourceMessage[] {
    const adapter = getActiveAdapter();
    const selectors = adapter?.messageSelectors.length ? adapter.messageSelectors : ['.chat-message', '.message-content', '[data-message-id]'];
    const seen = new Set<string>();

    return selectors
        .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .map((element) => {
            const text = element.textContent?.trim() ?? '';
            return {
                text,
                sourceId: deriveChatSurfaceSourceId(element, { adapterId: adapter?.id }),
                role: inferMessageRole(element, adapter),
                isStreaming: inferStreamingState(element),
            } satisfies ChatSurfaceSourceMessage;
        })
        .filter((message) => {
            if (!message.text) return false;
            const key = message.sourceId ? `id:${message.sourceId}` : `${message.role}:${message.text}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function sendRuntimeMessage<T>(payload: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(payload, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response as T);
        });
    });
}

class ChatSurfaceObserver {
    private observer: MutationObserver | null = null;
    private scheduledRefreshId: number | null = null;
    private lastSnapshot: ChatSurfaceSnapshot | null = null;

    start() {
        if (this.observer || !document.body) {
            return;
        }

        this.observer = new MutationObserver(() => this.scheduleRefresh('mutation'));
        this.observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true,
        });

        this.scheduleRefresh('initial');
    }

    private scheduleRefresh(trigger: 'initial' | 'mutation' | 'manual') {
        if (this.scheduledRefreshId !== null) {
            window.clearTimeout(this.scheduledRefreshId);
        }

        this.scheduledRefreshId = window.setTimeout(() => {
            this.scheduledRefreshId = null;
            void this.publishSnapshot(trigger);
        }, trigger === 'initial' ? 150 : 800);
    }

    private async publishSnapshot(trigger: 'initial' | 'mutation' | 'manual') {
        const adapter = getActiveAdapter();
        if (!adapter) {
            return;
        }

        const snapshot = buildChatSurfaceSnapshot({
            adapterId: adapter.id,
            adapterName: adapter.name,
            url: window.location.href,
            title: document.title,
            messages: scrapeChatMessages(),
            messageTexts: scrapeChatHistory(),
        });

        if (snapshotsEqual(this.lastSnapshot, snapshot)) {
            return;
        }

        this.lastSnapshot = snapshot;

        try {
            await sendRuntimeMessage<{ success?: boolean }>({
                type: 'CHAT_SURFACE_EVENT',
                trigger,
                snapshot,
            });
        } catch (error) {
            console.warn('[Hypercode Bridge] Failed to publish chat-surface snapshot:', error);
        }
    }
}

class HypercodeSidebarController {
    private host: HTMLDivElement | null = null;
    private shadow: ShadowRoot | null = null;
    private isOpen = true;
    private refreshIntervalId: number | null = null;

    mount() {
        if (document.getElementById(SIDEBAR_HOST_ID) || document.getElementById(SIDEBAR_TOGGLE_ID)) {
            return;
        }

        this.host = document.createElement('div');
        this.host.id = SIDEBAR_HOST_ID;
        this.host.style.position = 'fixed';
        this.host.style.top = '16px';
        this.host.style.right = '16px';
        this.host.style.zIndex = '2147483647';

        this.shadow = this.host.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = this.renderMarkup();
        document.documentElement.appendChild(this.host);

        const toggle = document.createElement('button');
        toggle.id = SIDEBAR_TOGGLE_ID;
        toggle.type = 'button';
        toggle.textContent = 'Hypercode';
        toggle.style.position = 'fixed';
        toggle.style.right = '16px';
        toggle.style.bottom = '16px';
        toggle.style.zIndex = '2147483647';
        toggle.style.border = '1px solid rgba(59,130,246,0.6)';
        toggle.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.95))';
        toggle.style.color = '#f8fafc';
        toggle.style.borderRadius = '999px';
        toggle.style.padding = '10px 14px';
        toggle.style.fontWeight = '700';
        toggle.style.cursor = 'pointer';
        toggle.style.boxShadow = '0 18px 45px rgba(2, 6, 23, 0.45)';
        document.documentElement.appendChild(toggle);

        this.bindEvents(toggle);
        this.refresh();
        this.refreshIntervalId = window.setInterval(() => this.refresh(), 2000);
    }

    private renderMarkup() {
        return `
            <style>
                :host { all: initial; }
                .panel {
                    width: 320px;
                    color: #e2e8f0;
                    font-family: Inter, Arial, sans-serif;
                    background: linear-gradient(180deg, rgba(15,23,42,0.97), rgba(2,6,23,0.97));
                    border: 1px solid rgba(59,130,246,0.28);
                    border-radius: 16px;
                    box-shadow: 0 24px 60px rgba(2, 6, 23, 0.55);
                    overflow: hidden;
                    backdrop-filter: blur(12px);
                }
                .hidden { display: none; }
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(148,163,184,0.16);
                    background: rgba(15, 23, 42, 0.72);
                }
                .title-wrap { display: flex; flex-direction: column; gap: 4px; }
                .eyebrow {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: #38bdf8;
                }
                .title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #f8fafc;
                }
                .header-actions { display: flex; gap: 8px; }
                .header-btn, .btn {
                    appearance: none;
                    border: 1px solid rgba(148,163,184,0.2);
                    border-radius: 10px;
                    background: rgba(30,41,59,0.85);
                    color: #e2e8f0;
                    cursor: pointer;
                }
                .header-btn {
                    width: 30px;
                    height: 30px;
                    font-size: 16px;
                    font-weight: 700;
                }
                .content { padding: 14px 16px 16px; display: grid; gap: 14px; }
                .card {
                    border: 1px solid rgba(148,163,184,0.14);
                    background: rgba(15,23,42,0.62);
                    border-radius: 12px;
                    padding: 12px;
                    display: grid;
                    gap: 10px;
                }
                .label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #94a3b8;
                    font-weight: 700;
                }
                .value {
                    font-size: 14px;
                    line-height: 1.4;
                    color: #f8fafc;
                }
                .subtle {
                    font-size: 12px;
                    line-height: 1.45;
                    color: #cbd5e1;
                }
                .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
                .metric {
                    border: 1px solid rgba(148,163,184,0.14);
                    border-radius: 10px;
                    background: rgba(2,6,23,0.45);
                    padding: 10px;
                }
                .metric .metric-value {
                    font-size: 18px;
                    font-weight: 800;
                    color: #f8fafc;
                    margin-top: 4px;
                }
                .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
                .pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    border-radius: 999px;
                    padding: 4px 8px;
                    font-size: 11px;
                    font-weight: 700;
                    border: 1px solid rgba(148,163,184,0.24);
                    color: #cbd5e1;
                    background: rgba(15,23,42,0.72);
                }
                .pill.ok {
                    border-color: rgba(34,197,94,0.4);
                    color: #86efac;
                    background: rgba(20, 83, 45, 0.28);
                }
                .pill.warn {
                    border-color: rgba(251,191,36,0.45);
                    color: #fde68a;
                    background: rgba(146, 64, 14, 0.24);
                }
                .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
                .btn {
                    padding: 10px 12px;
                    font-size: 12px;
                    font-weight: 700;
                    line-height: 1.3;
                }
                .btn.primary {
                    background: linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.95));
                    border-color: rgba(59,130,246,0.6);
                    color: #eff6ff;
                }
                .btn:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    font-size: 11px;
                    color: #94a3b8;
                }
                .message {
                    min-height: 18px;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #93c5fd;
                }
                .message.error { color: #fca5a5; }
                .message.success { color: #86efac; }
            </style>
            <div class="panel" id="panel">
                <div class="header">
                    <div class="title-wrap">
                        <div class="eyebrow">Hypercode Browser Bridge</div>
                        <div class="title">Adapter Scaffold Live</div>
                    </div>
                    <div class="header-actions">
                        <button class="header-btn" id="refreshBtn" title="Refresh adapter state">↻</button>
                        <button class="header-btn" id="closeBtn" title="Hide sidebar">×</button>
                    </div>
                </div>
                <div class="content">
                    <div class="card">
                        <div class="label">Current Surface</div>
                        <div class="value" id="surfaceName">Detecting…</div>
                        <div class="subtle" id="surfaceDetail">Mapping current host to Hypercode's MCP-SA adapter registry.</div>
                        <div class="pill-row" id="surfacePills"></div>
                    </div>
                    <div class="card">
                        <div class="label">Bridge Runtime</div>
                        <div class="grid">
                            <div class="metric">
                                <div class="label">Features</div>
                                <div class="metric-value" id="featureCount">0</div>
                            </div>
                            <div class="metric">
                                <div class="label">Messages</div>
                                <div class="metric-value" id="messageCount">0</div>
                            </div>
                        </div>
                        <div class="pill-row" id="featurePills"></div>
                    </div>
                    <div class="card">
                        <div class="label">Surface Actions</div>
                        <div class="actions">
                            <button class="btn primary" id="insertBtn">Insert note</button>
                            <button class="btn" id="submitBtn">Submit</button>
                            <button class="btn" id="absorbBtn">Absorb page</button>
                            <button class="btn" id="ragBtn">Ingest to RAG</button>
                            <button class="btn" id="dashboardBtn">Open dashboard</button>
                            <button class="btn" id="copyUrlBtn">Copy page URL</button>
                        </div>
                        <div class="message" id="message"></div>
                    </div>
                    <div class="footer">
                        <span>Alt+Shift+B toggles this sidebar.</span>
                        <span id="hostLabel">${window.location.host}</span>
                    </div>
                </div>
            </div>
        `;
    }

    private bindEvents(toggle: HTMLButtonElement) {
        if (!this.shadow) return;

        const panel = this.shadow.getElementById('panel') as HTMLElement | null;
        const refreshBtn = this.shadow.getElementById('refreshBtn') as HTMLButtonElement | null;
        const closeBtn = this.shadow.getElementById('closeBtn') as HTMLButtonElement | null;
        const insertBtn = this.shadow.getElementById('insertBtn') as HTMLButtonElement | null;
        const submitBtn = this.shadow.getElementById('submitBtn') as HTMLButtonElement | null;
        const absorbBtn = this.shadow.getElementById('absorbBtn') as HTMLButtonElement | null;
        const ragBtn = this.shadow.getElementById('ragBtn') as HTMLButtonElement | null;
        const dashboardBtn = this.shadow.getElementById('dashboardBtn') as HTMLButtonElement | null;
        const copyUrlBtn = this.shadow.getElementById('copyUrlBtn') as HTMLButtonElement | null;

        const setOpen = (open: boolean) => {
            this.isOpen = open;
            panel?.classList.toggle('hidden', !open);
        };

        toggle.addEventListener('click', () => setOpen(!this.isOpen));
        refreshBtn?.addEventListener('click', () => this.refresh());
        closeBtn?.addEventListener('click', () => setOpen(false));
        insertBtn?.addEventListener('click', () => void this.insertBridgeNote());
        submitBtn?.addEventListener('click', () => this.submitCurrentInput());
        absorbBtn?.addEventListener('click', () => void this.absorbPage());
        ragBtn?.addEventListener('click', () => void this.ingestPageToRag());
        dashboardBtn?.addEventListener('click', () => window.open(DASHBOARD_URL, '_blank', 'noopener,noreferrer'));
        copyUrlBtn?.addEventListener('click', () => void navigator.clipboard.writeText(window.location.href).then(() => {
            this.setMessage('Page URL copied to clipboard.', 'success');
        }, (error: unknown) => {
            this.setMessage(error instanceof Error ? error.message : 'Failed to copy URL.', 'error');
        }));

        window.addEventListener('keydown', (event) => {
            if (event.altKey && event.shiftKey && event.code === 'KeyB') {
                event.preventDefault();
                setOpen(!this.isOpen);
            }
        });
    }

    private getElement<T extends HTMLElement>(id: string) {
        return this.shadow?.getElementById(id) as T | null;
    }

    private renderPills(targetId: string, items: Array<{ label: string; tone?: 'ok' | 'warn' }>) {
        const container = this.getElement<HTMLElement>(targetId);
        if (!container) return;

        container.innerHTML = items
            .map((item) => `<span class="pill${item.tone ? ` ${item.tone}` : ''}">${item.label}</span>`)
            .join('');
    }

    private setMessage(text: string, tone: 'success' | 'error' | 'info' = 'info') {
        const message = this.getElement<HTMLElement>('message');
        if (!message) return;

        message.textContent = text;
        message.className = `message ${tone === 'info' ? '' : tone}`.trim();
    }

    private async insertBridgeNote() {
        const result = insertTextWithAdapter('Hypercode bridge connected. Adapter scaffold live and ready to accept tool results.', false);
        if (!result.success) {
            this.setMessage(result.reason || 'Could not locate the active chat input.', 'error');
            return;
        }

        this.setMessage('Inserted a Hypercode bridge note into the current input.', 'success');
        this.refresh();
    }

    private submitCurrentInput() {
        const adapter = getActiveAdapter();
        const submitButton = getSubmitButton(adapter);
        if (!submitButton) {
            this.setMessage('No visible submit control detected on this surface yet.', 'error');
            return;
        }

        submitButton.click();
        this.setMessage('Submitted the current surface input.', 'success');
    }

    private async absorbPage() {
        this.setMessage('Reading page content and sending it to Hypercode memory…');

        try {
            const page = extractReadablePage();
            const response = await sendRuntimeMessage<{ success?: boolean; error?: string }>({
                type: 'SAVE_CONTEXT',
                content: page.content,
                url: window.location.href,
                title: page.title,
            });

            if (!response?.success) {
                throw new Error(response?.error || 'Hypercode Core did not accept the page payload.');
            }

            this.setMessage('Page absorbed into Hypercode memory.', 'success');
        } catch (error) {
            this.setMessage(error instanceof Error ? error.message : 'Failed to absorb the page.', 'error');
        }
    }

    private async ingestPageToRag() {
        this.setMessage('Reading page content and sending it into Hypercode RAG…');

        try {
            const page = extractReadablePage();
            const response = await sendRuntimeMessage<{ success?: boolean; error?: string; data?: { chunksIngested?: number } }>({
                type: 'INGEST_RAG_TEXT',
                text: page.content,
                sourceName: page.title || window.location.href,
            });

            if (!response?.success) {
                throw new Error(response?.error || 'Hypercode Core did not ingest the page.');
            }

            const chunkInfo = response.data?.chunksIngested ? ` (${response.data.chunksIngested} chunks)` : '';
            this.setMessage(`Page ingested into Hypercode RAG${chunkInfo}.`, 'success');
        } catch (error) {
            this.setMessage(error instanceof Error ? error.message : 'Failed to ingest the page into RAG.', 'error');
        }
    }

    refresh() {
        const adapter = getActiveAdapter();
        const input = getChatInputElement(adapter);
        const submit = getSubmitButton(adapter);
        const messages = scrapeChatHistory();

        const surfaceName = this.getElement<HTMLElement>('surfaceName');
        const surfaceDetail = this.getElement<HTMLElement>('surfaceDetail');
        const featureCount = this.getElement<HTMLElement>('featureCount');
        const messageCount = this.getElement<HTMLElement>('messageCount');
        const submitBtn = this.getElement<HTMLButtonElement>('submitBtn');

        if (surfaceName) {
            surfaceName.textContent = adapter ? adapter.name : 'Unsupported surface';
        }

        if (surfaceDetail) {
            surfaceDetail.textContent = adapter
                ? `${adapter.name} is running with Hypercode's adapter scaffold. DOM injection, input detection, and bridge actions are available; full automation loops remain a later slice.`
                : 'This host is outside the current supported browser-chat footprint.';
        }

        if (featureCount) {
            featureCount.textContent = String(LIVE_BRIDGE_FEATURES.length);
        }

        if (messageCount) {
            messageCount.textContent = String(messages.length);
        }

        if (submitBtn) {
            submitBtn.disabled = !submit;
        }

        this.renderPills('surfacePills', [
            { label: adapter ? adapter.supportLevel === 'adapter-scaffold-live' ? 'Adapter scaffold live' : 'Generic bridge' : 'Outside footprint', tone: adapter ? 'ok' : 'warn' },
            { label: input ? 'Input detected' : 'Input not found', tone: input ? 'ok' : 'warn' },
            { label: submit ? 'Submit detected' : 'Submit pending', tone: submit ? 'ok' : 'warn' },
        ]);
        this.renderPills('featurePills', LIVE_BRIDGE_FEATURES.map((label) => ({ label, tone: 'ok' })));
    }
}

console.log('[Hypercode Bridge] Content Script Loaded.');

window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'HYPERCODE_REQUEST') {
        chrome.runtime.sendMessage({
            type: 'EXECUTE_TOOL',
            tool: event.data.tool,
            args: event.data.args,
        }, (response) => {
            postBridgeResponse(event.data.id, response);
        });
    }

    if (event.data.type === 'HYPERCODE_CONSOLE_LOG') {
        chrome.runtime.sendMessage({
            type: 'CONSOLE_LOG',
            level: event.data.level,
            message: event.data.message,
        });
    }
});

const injectAPI = () => {
    const script = document.createElement('script');
    script.textContent = `
    console.log("[Hypercode Bridge] API Injected");
    `;
    (document.head || document.documentElement).appendChild(script);
};
injectAPI();

const injectConsoleInterceptor = () => {
    const script = document.createElement('script');
    script.textContent = `
    (function() {
        const originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console)
        };

        const forwardLog = (level, args) => {
            try {
                window.postMessage({
                    type: 'HYPERCODE_CONSOLE_LOG',
                    level,
                    message: Array.from(args).map((value) => {
                        try { return typeof value === 'object' ? JSON.stringify(value) : String(value); }
                        catch { return '[Object]'; }
                    }).join(' ')
                }, '*');
            } catch (error) {}
        };

        console.log = function(...args) { forwardLog('log', args); return originalConsole.log(...args); };
        console.error = function(...args) { forwardLog('error', args); return originalConsole.error(...args); };
        console.warn = function(...args) { forwardLog('warn', args); return originalConsole.warn(...args); };
        console.info = function(...args) { forwardLog('info', args); return originalConsole.info(...args); };
    })();
    `;
    (document.head || document.documentElement).appendChild(script);
};
injectConsoleInterceptor();

let lastActivitySentAt = 0;
const ACTIVITY_THROTTLE_MS = 1500;

function emitUserActivity(trigger: string) {
    const now = Date.now();
    if ((now - lastActivitySentAt) < ACTIVITY_THROTTLE_MS) {
        return;
    }

    lastActivitySentAt = now;
    chrome.runtime.sendMessage({
        type: 'USER_ACTIVITY',
        lastActivityTime: now,
        trigger,
        activePage: {
            url: window.location.href,
            title: document.title,
            host: window.location.host,
        },
    });
}

window.addEventListener('focus', () => emitUserActivity('focus'));
window.addEventListener('click', () => emitUserActivity('click'), true);
window.addEventListener('keydown', () => emitUserActivity('keydown'), true);
window.addEventListener('scroll', () => emitUserActivity('scroll'), { passive: true });
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        emitUserActivity('visible');
    }
});
emitUserActivity('content_script_loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PASTE_INTO_CHAT') {
        console.log('[Hypercode Bridge] Received Paste Request:', message.text);

        const adapterInsert = insertTextWithAdapter(message.text, Boolean(message.submit));
        if (adapterInsert.success) {
            sendResponse({ success: true, mode: 'adapter' });
            return true;
        }

        const safeText = JSON.stringify(message.text);
        const autoSubmit = message.submit ? 'true' : 'false';

        const script = document.createElement('script');
        script.textContent = `
            if (window.injectDirectorMessage) {
                window.injectDirectorMessage(${safeText}, ${autoSubmit});
            } else {
                console.warn("[Hypercode Bridge] window.injectDirectorMessage not found! Is DirectorChat mounted?");
            }
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
        sendResponse({ success: true, mode: 'page-fallback', warning: adapterInsert.reason });
        return true;
    }

    if (message.type === 'ABSORB_PAGE') {
        console.log('[Hypercode Bridge] Absorbing page...');
        try {
            const page = extractReadablePage();
            sendResponse({ success: true, content: page.content, title: page.title });
        } catch (error: unknown) {
            console.error('[Hypercode Bridge] Absorb Error:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown absorb error' });
        }
        return true;
    }

    if (message.type === 'SCRAPE_CHAT') {
        console.log('[Hypercode Bridge] Scraping chat history...');
        sendResponse({ success: true, history: scrapeChatHistory() });
        return true;
    }

    return false;
});

const sidebar = new HypercodeSidebarController();
sidebar.mount();

const chatSurfaceObserver = new ChatSurfaceObserver();
chatSurfaceObserver.start();
