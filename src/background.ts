// background.ts - Handles extension state persistence

// Listen for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Allergy Tracker extension installed or updated');
});

// Keep the service worker alive
chrome.runtime.onConnect.addListener(function(port) {
  port.onDisconnect.addListener(function() {
    console.log('Port disconnected');
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'injectContentScript') {
    // Forward to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content-script.js']
        })
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      }
    });
    return true; // Keep the message channel open for async response
  }
});