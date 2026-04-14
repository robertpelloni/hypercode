// Background Service Worker for HyperCode Director Link
console.log("HyperCode Browser Extension Background Service Worker Starting... 🚀");

let socket: WebSocket | null = null;
let requestIdCounter = 0;
const pendingRequests = new Map<number, (response: any) => void>();
let reconnectAttempts = 0;

function connect() {
  // Use 127.0.0.1 to avoid dual-stack localhost ambiguity
  console.log("Connecting to HyperCode MCP Server (ws://127.0.0.1:3001)...");
  socket = new WebSocket("ws://127.0.0.1:3001");

  socket.onopen = () => {
    console.log("✅ Connected to HyperCode Hub");
    reconnectAttempts = 0;
  };

  socket.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);
      // console.log("Received:", msg); // Noisy

      // Handle Responses to our requests
      if (msg.id !== undefined && pendingRequests.has(msg.id)) {
        const resolver = pendingRequests.get(msg.id);
        resolver && resolver(msg);
        pendingRequests.delete(msg.id);
        return;
      }

      // Handle Server Requests (Reverse Control)
      if (msg.method) {
        await handleServerRequest(msg);
      }

    } catch (e) {
      console.error("Error parsing message:", e);
    }
  };

  socket.onclose = () => {
    // console.log("❌ Disconnected. Reconnecting in 5s...");
    socket = null;
    const delay = Math.min(30000, 5000 * Math.pow(1.5, ++reconnectAttempts));
    setTimeout(connect, delay);
  };

  socket.onerror = (err) => {
    console.error("WebSocket Error:", err);
  };
}

async function handleServerRequest(msg: any) {
  // JSON-RPC processing
  if (msg.method === "ping") {
    send({ jsonrpc: "2.0", result: "pong", id: msg.id });
    return;
  }

  try {
    let result;
    if (msg.method === "browser_navigate") {
      result = await navigate(msg.params.url);
    } else if (msg.method === "browser_evaluate") {
      result = await getActiveTabContent();
    } else if (msg.method === "browser_id") {
      result = await getActiveTabId();
    } else if (msg.method === "browser_screenshot") {
      result = await captureScreenshot();
    } else if (msg.method === "browser_scrape") {
      result = await scrapeActiveTab();
    } else if (msg.method === "chat_reply" || msg.method === "browser_type") {
      result = await triggerActionInTab('PASTE_INTO_CHAT', msg.params);
    } else if (msg.method === "click_element" || msg.method === "browser_click") {
      result = await triggerActionInTab('CLICK_ELEMENT', msg.params);
    } else if (msg.method === "click_at") {
      result = await triggerActionInTab('CLICK_AT', msg.params);
    } else {
      console.warn("Unknown method:", msg.method);
      return;
    }

    if (msg.id !== undefined) {
      send({ jsonrpc: "2.0", result, id: msg.id });
    }
  } catch (e: any) {
    if (msg.id !== undefined) {
      send({ jsonrpc: "2.0", error: { code: -32000, message: e.message }, id: msg.id });
    }
  }
}

function send(msg: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    // console.warn("Socket not open. Message dropped.");
  }
}

// Scrape Logic
async function scrapeActiveTab(): Promise<any> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("No active tab found");

  // Send message to content script
  return chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PAGE' });
}

async function triggerActionInTab(type: string, payload: any): Promise<any> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("No active tab found");

  return chrome.tabs.sendMessage(tab.id, { type, ...payload });
}

// Browser Automation Helpers
async function getActiveTabContent() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.id) throw new Error("No active tab found");

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  });

  return result[0].result;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id || null;
}

async function captureScreenshot() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.windowId) throw new Error("No active tab window found");

  // Capture visible tab
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 60 });
  return dataUrl; // "data:image/jpeg;base64,..."
}

async function navigate(url: string) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.id) {
    await chrome.tabs.update(tab.id, { url });
    return `Navigated to ${url}`;
  } else {
    await chrome.tabs.create({ url });
    return `Opened ${url}`;
  }
}

// Message Listener (Content Script -> Background)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "MCP_REQUEST") {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      sendResponse({ error: "HyperCode Disconnected" });
      return true;
    }

    const internalId = ++requestIdCounter;
    const originalId = request.payload.id;
    const outboundMsg = { ...request.payload, id: internalId };

    pendingRequests.set(internalId, (responseMsg) => {
      const clientResponse = { ...responseMsg, id: originalId };
      sendResponse(clientResponse);
    });

    send(outboundMsg);
    return true; // Keep channel open
  }

  if (request.type === "CONSOLE_LOG") {
    // Forward to HyperCode Core
    send({
      type: "BROWSER_LOG",
      level: request.level,
      content: request.content,
      url: request.url,
      timestamp: request.timestamp
    });
    return; // No response needed
  }

  if (request.action === "ping") return sendResponse("pong");
});

// Start connection
connect();
