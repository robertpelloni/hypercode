document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const msgDiv = document.getElementById('msg');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (msgDiv) msgDiv.textContent = "Saving...";

            try {
                // Get Active Tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tab.id) throw new Error("No active tab");

                // Get Content via Script Injection
                const content = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        return {
                            title: document.title,
                            url: window.location.href,
                            text: document.body.innerText
                        };
                    }
                });

                const data = content[0].result;
                if (!data) throw new Error("Failed to get page content");

                // Send to Background -> MCP
                chrome.runtime.sendMessage({
                    type: "MCP_REQUEST",
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call', // Standard MCP tool call
                        params: {
                            name: 'memory_saveContext', // Maps to memoryRouter.saveContext
                            arguments: {
                                source: 'browser_extension',
                                url: data.url,
                                title: data.title,
                                content: data.text
                            }
                        },
                        id: Date.now()
                    }
                }, (response) => {
                    // Response from Background (MCP response)
                    console.log("Save Response:", response);
                    if (response && response.error) {
                        if (msgDiv) msgDiv.textContent = "❌ Error: " + (response.error.message || JSON.stringify(response.error));
                    } else if (response && response.result) {
                        if (msgDiv) msgDiv.textContent = "✅ Saved to Memory!";
                    } else {
                        if (msgDiv) msgDiv.textContent = "⚠️ Unknown response";
                    }
                });

            } catch (e: any) {
                console.error(e);
                if (msgDiv) msgDiv.textContent = "❌ " + e.message;
            }
        });
    }
});
