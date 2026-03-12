
// Popup Logic
console.log("Popup loaded");

type SurfaceSupport = {
    name: string;
    hosts: string[];
    supportLevel: 'generic-bridge' | 'adapter-scaffold-live';
};

const SURFACE_SUPPORT: SurfaceSupport[] = [
    { name: 'ChatGPT', hosts: ['chatgpt.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Claude', hosts: ['claude.ai'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Gemini', hosts: ['gemini.google.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Google AI Studio', hosts: ['aistudio.google.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Perplexity', hosts: ['perplexity.ai', 'www.perplexity.ai'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Grok', hosts: ['grok.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'DeepSeek', hosts: ['chat.deepseek.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'OpenRouter', hosts: ['openrouter.ai'], supportLevel: 'adapter-scaffold-live' },
    { name: 'T3 Chat', hosts: ['t3.chat'], supportLevel: 'adapter-scaffold-live' },
    { name: 'GitHub Copilot', hosts: ['github.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Mistral', hosts: ['chat.mistral.ai'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Kimi', hosts: ['kimi.com'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Qwen Chat', hosts: ['chat.qwen.ai'], supportLevel: 'adapter-scaffold-live' },
    { name: 'Z.ai', hosts: ['chat.z.ai'], supportLevel: 'adapter-scaffold-live' },
];

const LIVE_BRIDGE_FEATURES = [
    'Adapter registry',
    'Sidebar shell',
    'Input detection',
    'Submit detection',
    'Page absorb',
    'URL ingest',
    'RAG ingest',
    'WebSocket bridge',
    'Chat paste',
    'History search',
    'Screenshot',
    'CDP debug',
    'Proxy fetch',
];

const statusSpan = document.getElementById('status')!;
const detailSpan = document.getElementById('detail')!;
const endpointSpan = document.getElementById('endpoints')!;
const urlInput = document.getElementById('urlInput') as HTMLInputElement;
const ingestUrlBtn = document.getElementById('ingestUrlBtn')!;
const saveBtn = document.getElementById('saveBtn')!;
const ragBtn = document.getElementById('ragBtn')!;
const settingsBtn = document.getElementById('settingsBtn')!;
const msgDiv = document.getElementById('msg')!;
const surfaceSummary = document.getElementById('surfaceSummary')!;
const surfaceTags = document.getElementById('surfaceTags')!;
const platformTags = document.getElementById('platformTags')!;
const featureTags = document.getElementById('featureTags')!;
const supportedCount = document.getElementById('supportedCount')!;
const featureCount = document.getElementById('featureCount')!;

function renderPills(container: HTMLElement, items: Array<{ label: string; tone?: 'ok' | 'warn' }>) {
    container.innerHTML = items
        .map((item) => `<span class="pill${item.tone ? ` ${item.tone}` : ''}">${item.label}</span>`)
        .join('');
}

function findSurfaceByUrl(url?: string | null): SurfaceSupport | null {
    if (!url) return null;

    try {
        const hostname = new URL(url).hostname;
        return SURFACE_SUPPORT.find((surface) =>
            surface.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
        ) ?? null;
    } catch {
        return null;
    }
}

function renderStaticReference() {
    supportedCount.textContent = String(SURFACE_SUPPORT.length);
    featureCount.textContent = String(LIVE_BRIDGE_FEATURES.length);
    renderPills(platformTags, SURFACE_SUPPORT.map((surface) => ({ label: surface.name, tone: 'ok' })));
    renderPills(featureTags, LIVE_BRIDGE_FEATURES.map((feature) => ({ label: feature, tone: 'ok' })));
}

function renderSurfaceState(tabUrl?: string) {
    const surface = findSurfaceByUrl(tabUrl);

    if (!tabUrl) {
        surfaceSummary.textContent = 'No active tab detected.';
        renderPills(surfaceTags, [{ label: 'No active surface', tone: 'warn' }]);
        return;
    }

    if (!surface) {
        surfaceSummary.textContent = 'This page is outside the current browser-chat bridge footprint.';
        renderPills(surfaceTags, [
            { label: 'Outside supported footprint', tone: 'warn' },
            { label: new URL(tabUrl).hostname },
        ]);
        return;
    }

    surfaceSummary.textContent = `${surface.name} is inside Borg's current MCP-SA migration footprint.`;
    renderPills(surfaceTags, [
        { label: surface.name, tone: 'ok' },
        { label: 'Adapter scaffold live', tone: 'ok' },
        { label: 'Automation parity pending', tone: 'warn' },
    ]);
}

function setActionState(enabled: boolean) {
    if (enabled) {
        ingestUrlBtn.removeAttribute('disabled');
        saveBtn.removeAttribute('disabled');
        ragBtn.removeAttribute('disabled');
    } else {
        ingestUrlBtn.setAttribute('disabled', 'true');
        saveBtn.setAttribute('disabled', 'true');
        ragBtn.setAttribute('disabled', 'true');
    }
}

function setStatus(response: { connected?: boolean; coreUrl?: string; wsUrl?: string; status?: string; error?: string } | undefined) {
    const connected = !!response?.connected;
    statusSpan.textContent = connected ? 'ONLINE' : 'OFFLINE';
    statusSpan.style.color = connected ? 'green' : 'red';
    detailSpan.textContent = connected
        ? `Core status: ${response?.status || 'online'}`
        : `Core unreachable${response?.error ? ` — ${response.error}` : '. Start Borg Core or update settings.'}`;
    endpointSpan.textContent = `HTTP ${response?.coreUrl || 'http://localhost:3001'} • WS ${response?.wsUrl || 'ws://localhost:3001'}`;
    setActionState(connected);
}

function refreshConnection() {
    chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' }, (response) => {
        setStatus(response);
    });
}

refreshConnection();
renderStaticReference();

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url && !urlInput.value) {
        urlInput.value = tab.url;
    }

    renderSurfaceState(tab?.url);
});

settingsBtn.addEventListener('click', async () => {
    await chrome.runtime.openOptionsPage();
});

ingestUrlBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        msgDiv.textContent = 'Enter a URL to ingest first.';
        return;
    }

    msgDiv.textContent = 'Ingesting URL into Borg Knowledge...';
    chrome.runtime.sendMessage({ type: 'INGEST_URL', url }, (res) => {
        if (res && res.success) {
            msgDiv.textContent = '✅ URL ingested into Knowledge!';
            setTimeout(() => msgDiv.textContent = '', 3000);
        } else {
            msgDiv.textContent = 'URL Ingest Error: ' + (res?.error || 'Core unreachable');
        }
    });
});

async function scrapeActivePage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
        throw new Error('No active tab');
    }

    return new Promise<{ tab: chrome.tabs.Tab; content: string; title: string }>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, { type: 'ABSORB_PAGE' }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error('Content script not ready. Try reloading page.'));
                return;
            }

            if (!response || !response.success) {
                reject(new Error(response?.error || 'Unknown scrape error'));
                return;
            }

            resolve({ tab, content: response.content, title: response.title });
        });
    });
}

// 2. Save Context
saveBtn.addEventListener('click', async () => {
    msgDiv.textContent = 'Scraping Page...';

    try {
        const { tab, content, title } = await scrapeActivePage();
        msgDiv.textContent = 'Saving to Borg Core...';

        chrome.runtime.sendMessage({
            type: 'SAVE_CONTEXT',
            content,
            url: tab.url,
            title
        }, (res) => {
            if (res && res.success) {
                msgDiv.textContent = '✅ Absorbed into Memory!';
                setTimeout(() => msgDiv.textContent = '', 3000);
            } else {
                msgDiv.textContent = 'Error Saving: ' + (res?.error || 'Core unreachable');
            }
        });
    } catch (e: any) {
        msgDiv.textContent = 'Exception: ' + e.message;
    }
});

// 3. Ingest into RAG
ragBtn.addEventListener('click', async () => {
    msgDiv.textContent = 'Scraping Page for RAG...';

    try {
        const { tab, content, title } = await scrapeActivePage();
        msgDiv.textContent = 'Ingesting into Borg RAG...';

        chrome.runtime.sendMessage({
            type: 'INGEST_RAG_TEXT',
            text: content,
            sourceName: title || tab.url || 'browser-extension-page'
        }, (res) => {
            if (res && res.success) {
                const chunks = res.data?.chunksIngested ?? 0;
                msgDiv.textContent = `✅ Ingested into RAG (${chunks} chunks)!`;
                setTimeout(() => msgDiv.textContent = '', 3000);
            } else {
                msgDiv.textContent = 'RAG Ingest Error: ' + (res?.error || 'Core unreachable');
            }
        });
    } catch (e: any) {
        msgDiv.textContent = 'Exception: ' + e.message;
    }
});

window.addEventListener('focus', refreshConnection);
