// Content script to scrape page details
<<<<<<< HEAD:archive/ts-legacy/packages/browser/src/content.ts
console.log('hypercode Content Script Loaded');
=======
console.log('borg Content Script Loaded');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/browser/src/content.ts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'read_page') {
        sendResponse({
            title: document.title,
            url: window.location.href,
            content: document.body.innerText.substring(0, 5000) // Truncate
        });
    }
});
