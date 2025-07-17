// content-script.ts
// This file will be bundled and injected into Amazon pages

// Error constants
const HrefConversionErrors = {
  MissingHref: "Missing href attribute on element",
};

const ParseErrors = {
  NoIngredientsFound: "No ingredients section found in the parsed HTML",
};

// Convert href → absolute, throwing if absent
function toAbsolute(href: string | null): string {
  if (!href) {
    throw new Error(HrefConversionErrors.MissingHref);
  }
  return new URL(href, window.location.origin).href;
}

// Parse "Ingredients" out of a product‐page HTML
function parseIngredients(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // a) detailBullets list
  for (const li of Array.from(
    doc.querySelectorAll<HTMLLIElement>("#detailBullets_feature_div li")
  )) {
    const label = li.querySelector<HTMLSpanElement>("span.a-text-bold");
    if (label && /ingredients/i.test(label.textContent || "")) {
      return li.textContent!
        .replace(/Ingredients[:\s]*/i, "")
        .trim();
    }
  }

  // b) productDetails table
  for (const row of Array.from(
    doc.querySelectorAll<HTMLTableRowElement>("#productDetails_detailBullets_sections1 tr")
  )) {
    const th = row.querySelector<HTMLTableCellElement>("th");
    if (th && /ingredients/i.test(th.textContent || "")) {
      const td = row.querySelector<HTMLTableCellElement>("td");
      if (td?.textContent) {
        return td.textContent.trim();
      }
    }
  }

  // c) feature‐bullets fallback
  const featureText = doc
    .querySelector<HTMLElement>("#feature-bullets")
    ?.textContent || "";
  const m = /Ingredients[:\s]*([^.]+)/i.exec(featureText);
  if (m) {
    return m[1].trim();
  }

  // d) Important Information section
  // Amazon often puts "Important information" in a div with id="importantInformation"
  // or as a heading with following sibling containing the info
  const importantInfoSection = doc.querySelector("#importantInformation, #important-information");
  if (importantInfoSection) {
    // Try to find a heading or bold text with "Ingredients"
    const headings = importantInfoSection.querySelectorAll("h5, h4, b, strong");
    for (const heading of Array.from(headings)) {
      if (/ingredients/i.test(heading.textContent || "")) {
        // Look for the next sibling or parent element's text
        let info = "";
        // Try next sibling
        const next = heading.nextElementSibling;
        if (next && next.textContent) {
          info = next.textContent.trim();
        }
        // If not, try parent
        if (!info && heading.parentElement && heading.parentElement.textContent) {
          info = heading.parentElement.textContent.replace(/Ingredients[:\s]*/i, "").trim();
        }
        if (info) {
          return info;
        }
      }
    }
    // Fallback: search for "Ingredients:" in the section text
    const text = importantInfoSection.textContent || "";
    const match = /Ingredients[:\s]*([^\n]+)/i.exec(text);
    if (match) {
      return match[1].trim();
    }
  }

  // e) Fallback: search anywhere in the document for "Ingredients:"
  const allText = doc.body.textContent || "";
  const globalMatch = /Ingredients[:\s]*([^\n]+)/i.exec(allText);
  if (globalMatch) {
    return globalMatch[1].trim();
  }

  throw new Error(ParseErrors.NoIngredientsFound);
}

interface ScrapeResult {
  url: string;
  title: string;
  ingredients: string;
  error?: string;
  allergyFound?: boolean;
  allergyMatches?: string[];
}

// Scrape the cart container
async function scrapeCartIngredients(): Promise<ScrapeResult[]> {
  // Find the cart element
  const cartEl = document.querySelector("#sc-expanded-cart-localmarket") || 
                document.querySelector(".sc-list-body") || 
                document.querySelector(".sc-list-item-content");
  
  if (!cartEl) {
    throw new Error("Cart not found");
  }
  
  // grab product links and titles
  const items = Array.from(
    cartEl.querySelectorAll(".sc-list-item")
  ).map(item => {
    const titleEl = item.querySelector<HTMLAnchorElement>("a.sc-product-link");
    const href = titleEl?.getAttribute("href");
    const title = titleEl?.textContent?.trim() || "Unknown Product";
    
    return {
      url: href ? toAbsolute(href) : "",
      title
    };
  }).filter(item => item.url);

  console.log(`Found ${items.length} items in cart`);
  
  const results: ScrapeResult[] = [];

  for (const item of items) {
    try {
      console.log(`Fetching: ${item.url}`);
      const res = await fetch(item.url);
      const html = await res.text();
      try {
        const ingredients = parseIngredients(html);
        results.push({ 
          url: item.url, 
          title: item.title,
          ingredients 
        });
        console.log(`Found ingredients for ${item.title}`);
      } catch {
        results.push({ 
          url: item.url, 
          title: item.title,
          ingredients: "No ingredients found",
          error: "No ingredients section found" 
        });
        console.log(`No ingredients found for ${item.title}`);
      }
    } catch (err) {
      console.error("Failed to load or parse", item.url, err);
      results.push({ 
        url: item.url, 
        title: item.title,
        ingredients: "Failed to load product page",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  }

  return results;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "scrapeCart") {
    console.log("Starting cart scraping...");
    
    // Extract allergies from the message if provided
    const userAllergies = message.allergies || [];
    
    scrapeCartIngredients()
      .then(results => {
        // Check for allergies in the ingredients
        const resultsWithAllergyCheck = results.map(item => {
          if (!item.ingredients || item.error) {
            return item;
          }
          
          // Check if any allergies are found in the ingredients
          const allergyMatches = checkIngredientsForAllergies(item.ingredients, userAllergies);
          
          return {
            ...item,
            allergyFound: allergyMatches.found,
            allergyMatches: allergyMatches.matches
          };
        });
        
        console.log("Scraping complete, sending results:", resultsWithAllergyCheck);
        sendResponse({ success: true, results: resultsWithAllergyCheck });
      })
      .catch(err => {
        console.error("Scraping failed:", err);
        sendResponse({ 
          success: false, 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Function to check ingredients for allergies
function checkIngredientsForAllergies(ingredients: string, allergies: string[]): {
  found: boolean;
  matches: string[];
} {
  if (!ingredients || !allergies || allergies.length === 0) {
    return { found: false, matches: [] };
  }

  // Normalize the ingredients string
  const normalizedIngredients = ingredients.toLowerCase();
  
  // Find matches
  const matches = allergies.filter(allergy => {
    // Create a regex that looks for the allergy as a whole word
    const regex = new RegExp(`\\b${allergy.toLowerCase()}\\b`, 'i');
    return regex.test(normalizedIngredients);
  });

  return {
    found: matches.length > 0,
    matches
  };
}

// Log that the content script has loaded
console.log("Allergy Tracker content script loaded");