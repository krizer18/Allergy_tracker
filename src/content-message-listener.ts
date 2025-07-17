import { scrapeCartIngredients } from './scraping.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'scrapeCart') {
    const cartEl = document.querySelector('#sc-expanded-cart-localmarket');
    if (!cartEl) {
      return sendResponse({ error: 'Couldn’t find the Fresh cart in the DOM' });
    }
    scrapeCartIngredients(cartEl)
      .then(results => sendResponse({ results }))
      .catch(err => sendResponse({ error: err.message }));
    // indicates we’ll call sendResponse asynchronously
    return true;
  }
});
