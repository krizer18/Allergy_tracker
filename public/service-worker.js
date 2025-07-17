// Log when the service worker is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Allergy Tracker extension installed');
});

// When the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id && tab.url?.includes('amazon.com')) {
    // Inject the content script if we're on Amazon
    injectContentScript(tab.id);
  }
});

// Function to inject the content script
function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js']
  }).then(() => {
    console.log('Content script injected successfully');
  }).catch((error) => {
    console.error('Error injecting content script:', error);
  });
}

// Handle messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Service worker received message:', message);
  
  // Forward messages as needed
  if (message.action === 'injectContentScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        injectContentScript(tabs[0].id);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Will respond asynchronously
  }
  
  return false; // No response
});