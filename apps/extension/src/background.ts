
// Background Service Worker
// Proxies requests from Content Script (Web Page) to Local Borg Core

// Default URLs — overridable via extension options/storage
let CORE_URL = 'http://localhost:3001';
let WS_URL = 'ws://localhost:3001';

// Load configured URLs from chrome.storage (set via options page or popup)
chrome.storage.sync.get(['borgCoreUrl', 'borgWsUrl'], (result) => {
    if (result.borgCoreUrl) CORE_URL = result.borgCoreUrl;
    if (result.borgWsUrl) WS_URL = result.borgWsUrl;
    // Reconnect WebSocket with potentially new URL
    if (ws) { ws.close(); } else { connectWebSocket(); }
});

// Keep-alive setup for Service Worker
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

// Console Log Capture Buffer
let consoleLogBuffer: Array<{ level: string; message: string; timestamp: number; url: string }> = [];
const MAX_CONSOLE_BUFFER = 100;
let mirrorIntervalId: any = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_TOOL') {
        handleToolExecution(message.tool, message.args)
            .then(result => sendResponse({ success: true, result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Async response
    }

    if (message.type === 'CHECK_CONNECTION') {
        fetch(`${CORE_URL}/health`)
            .then(res => res.json())
            .then(data => sendResponse({ connected: data?.result?.data?.status === 'running' }))
            .catch(() => sendResponse({ connected: false }));
        return true;
    }

    if (message.type === 'SAVE_CONTEXT') {
        fetch(`${CORE_URL}/director.memorize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message.content, source: message.url, title: message.title })
        })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // Console Log Capture from content scripts
    if (message.type === 'CONSOLE_LOG') {
        consoleLogBuffer.push({
            level: message.level,
            message: message.message,
            timestamp: Date.now(),
            url: sender.tab?.url || 'unknown'
        });
        // Trim buffer to max size
        if (consoleLogBuffer.length > MAX_CONSOLE_BUFFER) {
            consoleLogBuffer = consoleLogBuffer.slice(-MAX_CONSOLE_BUFFER);
        }
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'GET_CONSOLE_LOGS') {
        sendResponse({ success: true, logs: [...consoleLogBuffer] });
        return true;
    }
});


// WebSocket Connection to Core
let ws: WebSocket | null = null;

function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('[Borg Ext] WS Connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'PASTE_INTO_CHAT') {
                // Determine active tab
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'PASTE_INTO_CHAT',
                            text: data.text,
                            submit: data.submit
                        });
                    }
                });
            }
            else if (data.type === 'GET_CHAT_HISTORY') {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'SCRAPE_CHAT' }, (response) => {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'CHAT_HISTORY_RESPONSE',
                                    requestId: data.requestId,
                                    history: response?.history || []
                                }));
                            }
                        });
                    }
                });
            }
            // Browser Scraping (Reader Mode)
            else if (data.method === 'browser_scrape') {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'ABSORB_PAGE' }, (response) => {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'STATUS_UPDATE', // Core expects STATUS_UPDATE for most resolutions
                                    requestId: data.id,
                                    status: {
                                        url: tabs[0].url,
                                        title: response?.title || tabs[0].title,
                                        content: response?.content || "Readability failed to parse page."
                                    }
                                }));
                            }
                        });
                    }
                });
            }
            // Browser Screenshot
            else if (data.method === 'browser_screenshot') {
                chrome.tabs.captureVisibleTab(null as any, { format: 'jpeg', quality: 80 }, (dataUrl) => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'STATUS_UPDATE',
                            requestId: data.id,
                            status: dataUrl
                        }));
                    }
                });
            }
            // Browser History
            else if (data.method === 'browser_get_history') {
                const query = data.params?.query || '';
                const maxResults = data.params?.maxResults || 20;
                chrome.history.search({ text: query, maxResults }, (historyItems) => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'STATUS_UPDATE',
                            requestId: data.id,
                            status: historyItems.map(item => ({
                                url: item.url,
                                title: item.title,
                                lastVisitTime: item.lastVisitTime,
                                visitCount: item.visitCount
                            }))
                        }));
                    }
                });
            }
            // Console Log Retrieval via WebSocket
            else if (data.type === 'GET_CONSOLE_LOGS') {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'CONSOLE_LOGS_RESPONSE',
                        requestId: data.requestId,
                        logs: [...consoleLogBuffer]
                    }));
                }
            }
            // Tab Mirroring (Phase 16)
            else if (data.type === 'SET_MIRROR_ACTIVE') {
                if (mirrorIntervalId) {
                    clearInterval(mirrorIntervalId);
                    mirrorIntervalId = null;
                }

                if (data.active) {
                    console.log('[Borg Ext] Enabling Tab Mirroring');
                    mirrorIntervalId = setInterval(() => {
                        chrome.tabs.captureVisibleTab(null as any, { format: 'jpeg', quality: 50 }, (dataUrl) => {
                            if (ws && ws.readyState === WebSocket.OPEN && dataUrl) {
                                ws.send(JSON.stringify({
                                    type: 'BROWSER_MIRROR_UPDATE',
                                    screenshot: dataUrl
                                }));
                            }
                        });
                    }, data.interval || 5000);
                } else {
                    console.log('[Borg Ext] Disabling Tab Mirroring');
                }
            }
            // Active Debugger Proxy (Phase 16)
            else if (data.method === 'browser_debug') {
                const { action, method, params } = data.params;
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tabId = tabs[0]?.id;
                    if (!tabId) {
                        ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: { error: 'No active tab' } }));
                        return;
                    }

                    const debugTarget = { tabId };

                    if (action === 'attach') {
                        chrome.debugger.attach(debugTarget, '1.3', () => {
                            if (chrome.runtime.lastError) {
                                ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: { error: chrome.runtime.lastError.message } }));
                            } else {
                                ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: { success: true } }));
                            }
                        });
                    } else if (action === 'detach') {
                        chrome.debugger.detach(debugTarget, () => {
                            ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: { success: true } }));
                        });
                    } else if (action === 'command') {
                        chrome.debugger.sendCommand(debugTarget, method, params, (result) => {
                            if (chrome.runtime.lastError) {
                                ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: { error: chrome.runtime.lastError.message } }));
                            } else {
                                ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: result }));
                            }
                        });
                    }
                });
            }
            // Proxy Fetch (Phase 16)
            else if (data.method === 'browser_proxy_fetch') {
                const { url, options } = data.params;
                fetch(url, options)
                    .then(async res => {
                        const text = await res.text();
                        ws?.send(JSON.stringify({
                            type: 'STATUS_UPDATE',
                            requestId: data.id,
                            status: {
                                status: res.status,
                                statusText: res.statusText,
                                body: text
                            }
                        }));
                    })
                    .catch(e => {
                        ws?.send(JSON.stringify({ type: 'STATUS_UPDATE', requestId: data.id, status: { error: e.message } }));
                    });
            }
        } catch (e) {
            console.error('WS Error:', e);
        }
    };

    ws.onclose = () => {
        console.log('[Borg Ext] WS Closed. Reconnecting in 5s...');
        if (mirrorIntervalId) {
            clearInterval(mirrorIntervalId);
            mirrorIntervalId = null;
        }
        ws = null;
        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (err) => {
        console.error('[Borg Ext] WS Error:', err);
        ws?.close();
    };
}

// Start WS
connectWebSocket();
chrome.runtime.onStartup.addListener(connectWebSocket);

// CDP Event Relay
chrome.debugger.onEvent.addListener((source, method, params) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'BROWSER_DEBUG_EVENT',
            tabId: source.tabId,
            method,
            params
        }));
    }
});

async function handleToolExecution(toolName: string, args: any) {
    if (toolName === 'chat') {
        const response = await fetch(`${CORE_URL}/director.chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: args.message })
        });
        const json = await response.json();
        return json.result?.data;
    }
    throw new Error(`Tool ${toolName} not supported via Bridge yet.`);
}

