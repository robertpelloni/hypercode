console.log("[HyperCodeLink] Content Script Loaded");

// Listen for messages from background (if we switch to message passing architecture)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDOM") {
        sendResponse({
            title: document.title,
            url: window.location.href,
            html: document.body.innerHTML,
            text: document.body.innerText
        });
    }
});
