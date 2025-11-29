/* global browser */
// Demo Safari Native Extension - Background Script

// Handle messages from popup or content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // Handle native message relay
  if (message.type === 'native') {
    browser.runtime
      .sendNativeMessage('', message.payload)
      .then((response) => {
        sendResponse({ success: true, response });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  // Handle other message types
  if (message.type === 'ping') {
    sendResponse({ type: 'pong', timestamp: Date.now() });
  }
});

// Log when extension is installed/updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('Demo Safari Native extension installed:', details.reason);
});

console.log('Demo Safari Native background script loaded');
