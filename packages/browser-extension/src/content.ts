import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

console.log("HyperCode Browser Extension Content Script Loaded 🚀");

// 0. Console Hook Injection
// Intercept console.log/warn/error and forward to window
const consoleScript = document.createElement('script');
consoleScript.textContent = `
(function() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function formatArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch(e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    console.log = function(...args) {
        window.postMessage({ type: 'BORG_CONSOLE_LOG', level: 'info', content: formatArgs(args) }, '*');
        originalLog.apply(console, args);
    };

    console.warn = function(...args) {
        window.postMessage({ type: 'BORG_CONSOLE_LOG', level: 'warn', content: formatArgs(args) }, '*');
        originalWarn.apply(console, args);
    };

    console.error = function(...args) {
        window.postMessage({ type: 'BORG_CONSOLE_LOG', level: 'error', content: formatArgs(args) }, '*');
        originalError.apply(console, args);
    };
    
    // Also inject hypercode globals if needed
    window.hypercode = {
        callTool: function(name, args) {
             return new Promise((resolve, reject) => {
                const id = Math.random().toString(36).substring(7);
                const handler = (event) => {
                    if (event.source !== window || !event.data || event.data.type !== 'BORG_MCP_RESPONSE') return;
                    if (event.data.payload.id !== id) return;
                    window.removeEventListener('message', handler);
                    if (event.data.payload.error) reject(event.data.payload.error);
                    else resolve(event.data.payload.result);
                };
                window.addEventListener('message', handler);
                window.postMessage({
                    type: 'BORG_MCP_CALL',
                    payload: { jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args }, id }
                }, '*');
            });
        }
    };
    console.log("✅ window.hypercode injected");
    
})();
`;
(document.head || document.documentElement).appendChild(consoleScript);
consoleScript.remove();


// 1. Listen for Messages from Page (Console & MCP Calls)
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'BORG_MCP_CALL') {
        const payload = event.data.payload;
        chrome.runtime.sendMessage({ type: "MCP_REQUEST", payload }, (response) => {
            window.postMessage({ type: 'BORG_MCP_RESPONSE', payload: response }, '*');
        });
    }

    if (event.data.type === 'BORG_CONSOLE_LOG') {
        // Forward to background (fire and forget)
        chrome.runtime.sendMessage({
            type: "CONSOLE_LOG",
            level: event.data.level,
            content: event.data.content,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }
});


// 2. Listen for messages from Background (Scraper & Reverse Control)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_PAGE') {
        try {
            const documentClone = document.cloneNode(true) as Document;
            const reader = new Readability(documentClone);
            const article = reader.parse();

            if (!article) {
                sendResponse({ success: false, error: 'Readability failed to parse article' });
                return;
            }

            const turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                hr: '---',
                bulletListMarker: '-'
            });
            const markdown = turndownService.turndown(article.content || "");

            sendResponse({
                success: true,
                data: {
                    title: article.title,
                    byline: article.byline,
                    content: markdown,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
        }
    }

    // --- DOM AUTOMATION ---
    if (request.type === 'CLICK_ELEMENT') {
        const query = (request.target || request.text || "").toLowerCase().trim();
        if (!query) {
            sendResponse({ success: false, error: 'No target text provided' });
            return;
        }

        const elements = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"], [role="button"]'));

        // Filter out hidden elements
        const visibleElements = elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && (el as HTMLElement).offsetParent !== null;
        });

        let bestMatch: HTMLElement | null = null;
        let bestScore = 0;

        for (const el of visibleElements) {
            const elText = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '').toLowerCase().trim();
            if (!elText) continue;

            if (elText === query) {
                bestMatch = el as HTMLElement;
                bestScore = 100;
                break; // Exact match
            } else if (elText.includes(query)) {
                // Ratio of match length to total length (higher is better)
                const score = (query.length / elText.length) * 10;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = el as HTMLElement;
                }
            }
        }

        if (bestMatch) {
            const hel = bestMatch;
            hel.style.outline = '4px solid yellow';
            hel.style.transition = 'all 0.2s';
            setTimeout(() => {
                hel.click();
                hel.style.outline = '';
                sendResponse({ success: true, message: `Clicked "${query}"` });
            }, 500);
        } else {
            sendResponse({ success: false, error: `Element not found: ${query}` });
        }
    }

    if (request.type === 'CLICK_AT') {
        const x = request.x;
        const y = request.y;

        // Show indicator at coordinates
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.left = `${x - 10}px`;
        indicator.style.top = `${y - 10}px`;
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        indicator.style.border = '2px solid red';
        indicator.style.borderRadius = '50%';
        indicator.style.zIndex = '999999';
        indicator.style.pointerEvents = 'none';
        document.body.appendChild(indicator);

        setTimeout(() => indicator.remove(), 1000);

        const el = document.elementFromPoint(x, y);
        if (el) {
            const hEl = el as HTMLElement;
            hEl.click();
            sendResponse({ success: true, message: `Clicked at (${x},${y})` });
        } else {
            sendResponse({ success: false, error: `No element at (${x},${y})` });
        }
    }

    if (request.type === 'PASTE_INTO_CHAT') {
        // Universal "Chat Input" finder
        const inputs = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]'));
        // Sort by visibility/size to find the "main" chat box
        const mainInput = inputs.find(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 200 && rect.height > 20;
        }) as HTMLElement;

        if (mainInput) {
            mainInput.focus();
            // Try native execCommand for compat
            document.execCommand('insertText', false, request.text);

            // Fallback: Value setter for Textarea
            if (mainInput instanceof HTMLTextAreaElement && mainInput.value !== undefined) {
                if (mainInput.value !== request.text) mainInput.value += request.text; // Simple append check
            } else {
                mainInput.innerText = request.text; // ContentEditable
            }

            mainInput.style.border = '2px solid #00ff00';
            setTimeout(() => mainInput.style.border = '', 1000);

            if (request.submit) {
                setTimeout(() => {
                    const enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter'
                    });
                    mainInput.dispatchEvent(enterEvent);
                    // Also try clicking the submit button if visible nearby
                    const submitBtn = document.querySelector('button[aria-label="Send"], button[type="submit"]');
                    if (submitBtn) (submitBtn as HTMLElement).click();
                }, 500);
            }
            sendResponse({ success: true, message: `Pasted text` });
        } else {
            sendResponse({ success: false, error: `No chat input found` });
        }
    }

    return true;
});
