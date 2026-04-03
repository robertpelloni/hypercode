/// <reference types="chrome" />

export {};

const DEFAULT_CORE_URL = 'http://localhost:3001';
const DEFAULT_WS_URL = 'ws://localhost:3001';

const coreUrlInput = document.getElementById('coreUrl') as HTMLInputElement;
const wsUrlInput = document.getElementById('wsUrl') as HTMLInputElement;
const saveSettingsBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const resetSettingsBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

function setStatus(message: string, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#fca5a5' : '#93c5fd';
}

function loadSettings() {
    chrome.storage.sync.get(['hypercodeCoreUrl', 'hypercodeWsUrl'], (result: { hypercodeCoreUrl?: string; hypercodeWsUrl?: string }) => {
        coreUrlInput.value = result.hypercodeCoreUrl || DEFAULT_CORE_URL;
        wsUrlInput.value = result.hypercodeWsUrl || DEFAULT_WS_URL;
        setStatus('Settings loaded.');
    });
}

saveSettingsBtn.addEventListener('click', () => {
    const coreUrl = coreUrlInput.value.trim() || DEFAULT_CORE_URL;
    const wsUrl = wsUrlInput.value.trim() || DEFAULT_WS_URL;

    chrome.storage.sync.set({ hypercodeCoreUrl: coreUrl, hypercodeWsUrl: wsUrl }, () => {
        if (chrome.runtime.lastError) {
            setStatus(`Failed to save settings: ${chrome.runtime.lastError.message}`, true);
            return;
        }
        setStatus('Settings saved. Reopen the popup to refresh connection state.');
    });
});

resetSettingsBtn.addEventListener('click', () => {
    coreUrlInput.value = DEFAULT_CORE_URL;
    wsUrlInput.value = DEFAULT_WS_URL;
    chrome.storage.sync.set({ hypercodeCoreUrl: DEFAULT_CORE_URL, hypercodeWsUrl: DEFAULT_WS_URL }, () => {
        if (chrome.runtime.lastError) {
            setStatus(`Failed to reset settings: ${chrome.runtime.lastError.message}`, true);
            return;
        }
        setStatus('Defaults restored.');
    });
});

loadSettings();
