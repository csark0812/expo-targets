// Safari Web Extension Background Script
// Handles communication between popup and native Swift handler

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Forward messages to native handler if needed
  if (message.type === 'native') {
    browser.runtime
      .sendNativeMessage('', message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});
