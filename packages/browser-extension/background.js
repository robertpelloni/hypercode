// HyperCode Director Link - Background Worker

const SOCKET_URL = 'ws://localhost:3001';
let socket = null;
let keepAliveInterval = null;

// Connect to HyperCode Core
function connect() {
    console.log(`[BorgLink] Connecting to ${SOCKET_URL}...`);
    socket = new WebSocket(SOCKET_URL);

    socket.onopen = () => {
        console.log("[BorgLink] Connected!");
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

        // Register as Browser Extension
        socket.send(JSON.stringify({
            type: 'REGISTER_CLIENT',
            clientType: 'browser-extension',
            capabilities: ['read_page', 'chat_reply', 'click_element']
        }));

        startKeepAlive();
    };

    socket.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);
            console.log("[BorgLink] Received:", msg);
            handleMessage(msg);
        } catch (e) {
            console.error("Failed to parse message", e);
        }
    };

    socket.onclose = () => {
        console.log("[BorgLink] Disconnected. Reconnecting in 5s...");
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
        stopKeepAlive();
        setTimeout(connect, 5000);
    };

    socket.onerror = (err) => {
        console.error("[BorgLink] Socket Error:", err);
        socket.close();
    };
}

function startKeepAlive() {
    stopKeepAlive();
    keepAliveInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
        }
    }, 30000);
}

function stopKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
}

// Handle Commands from Director
async function handleMessage(msg) {
    if (msg.type === 'read_page') {
        const tab = await getActiveTab();
        if (!tab) return sendResponse(msg.requestId, { error: "No active tab" });

        // Execute script in tab to get content
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        }, (results) => {
            const content = results?.[0]?.result || "";
            const url = tab.url;
            const title = tab.title;
            sendResponse(msg.requestId, { url, title, content });
        });
    }

    else if (msg.type === 'chat_reply' || msg.type === 'PASTE_INTO_CHAT') {
        const tab = await getActiveTab();
        if (!tab) return;

        const text = msg.text;
        const submit = msg.submit || false;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [text, submit],
            func: (textToType, shouldSubmit) => {
                // Heuristic to find chat inputs
                const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
                // Filter visible
                const visible = Array.from(inputs).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
                });

                // Sort by size (chat boxes are usually big) or position? 
                // Using the last one is often a good heuristic for chat UIs
                const target = visible[visible.length - 1];

                if (target) {
                    target.focus();

                    // Simulate typing (required for React/Vue inputs)
                    // We set value but also trigger input events
                    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                        nativeInputValueSetter.call(target, textToType);
                        target.value = textToType;
                    } else {
                        target.innerText = textToType;
                    }

                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));

                    if (shouldSubmit) {
                        setTimeout(() => {
                            // Try button click first
                            const buttons = document.querySelectorAll('button[type="submit"], button[aria-label="Send"], button[data-testid="send-button"]');
                            if (buttons.length > 0) {
                                buttons[buttons.length - 1].click();
                            } else {
                                // Fallback to Enter key
                                target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                            }
                        }, 500);
                    }
                }
            }
        });
    }

    else if (msg.type === 'click_element') {
        const tab = await getActiveTab();
        if (!tab) return sendResponse(msg.requestId, { error: "No active tab" });

        const targetText = msg.text || msg.target || msg.query || "";

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [targetText],
            func: (text) => {
                if (!text) return { error: "No text provided" };

                const query = text.toLowerCase().trim();
                const clickables = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
                });

                let bestMatch = null;
                let bestScore = 0;

                for (const el of clickables) {
                    const elText = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim();
                    if (!elText) continue;

                    if (elText === query) {
                        bestMatch = el;
                        bestScore = 100;
                        break;
                    } else if (elText.includes(query)) {
                        const score = (query.length / elText.length) * 10;
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = el;
                        }
                    }
                }

                if (bestMatch) {
                    try {
                        bestMatch.click();
                        return { success: true, clicked: bestMatch.innerText || bestMatch.value || 'element' };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
                return { error: "Element not found" };
            }
        }, (results) => {
            const result = results?.[0]?.result || { error: "Failed to execute script" };
            sendResponse(msg.requestId, result);
        });
    }
}

function sendResponse(requestId, data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'STATUS_UPDATE',
            requestId: requestId,
            status: { content: [{ type: 'text', text: JSON.stringify(data) }] }
        }));
    }
}

async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
}

// Start
connect();
