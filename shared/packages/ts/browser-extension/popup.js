// Popup logic (mostly just decoration, state is in background)
chrome.action.getBadgeText({}, (text) => {
    const el = document.getElementById('status');
    if (text === 'ON') {
        el.textContent = "Connected";
        el.className = "status connected";
    } else {
        el.textContent = "Disconnected";
        el.className = "status disconnected";
    }
});
