// Error constants
const HrefConversionErrors = {
  MissingHref: "Missing href attribute on element",
};

const ParseErrors = {
  NoIngredientsFound: "No ingredients section found in the parsed HTML",
};

// Convert href → absolute
function toAbsolute(href: string | null): string {
  if (!href) {
    throw new Error(HrefConversionErrors.MissingHref);
  }
  return new URL(href, window.location.origin).href;
}

// Parse "Ingredients" subheading out of a product‐page HTML
function parseIngredients(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // list
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

  // table
  for (const row of Array.from(
    doc.querySelectorAll<HTMLTableRowElement>("#productDetails_detailBullets_sections1 tr, #productDetails tr, .prodDetTable tr, .a-keyvalue tr")
  )) {
    const th = row.querySelector<HTMLTableCellElement>("th");
    if (th && /ingredients/i.test(th.textContent || "")) {
      const td = row.querySelector<HTMLTableCellElement>("td");
      if (td?.textContent) {
        return td.textContent.trim();
      }
    }
  }

  // fallback
  const featureText = doc
    .querySelector<HTMLElement>("#feature-bullets, .a-unordered-list")
    ?.textContent || "";
  const m = /Ingredients[:\s]*([^.]+)/i.exec(featureText);
  if (m) {
    return m[1].trim();
  }

  // extra: important info section
  const importantInfoSection = doc.querySelector("#importantInformation, #important-information, .important-information, .product-facts");
  if (importantInfoSection) {
    // find a heading with "Ingredients" as title
    const headings = importantInfoSection.querySelectorAll("h5, h4, h3, b, strong, .a-text-bold");
    for (const heading of Array.from(headings)) {
      if (/ingredients/i.test(heading.textContent || "")) {
        let info = "";
        const next = heading.nextElementSibling;
        if (next && next.textContent) {
          info = next.textContent.trim();
        }
        if (!info && heading.parentElement && heading.parentElement.textContent) {
          info = heading.parentElement.textContent.replace(/Ingredients[:\s]*/i, "").trim();
        }
        if (info) {
          return info;
        }
      }
    }
    // extra pt 2: search for "Ingredients:" in the description text
    const text = importantInfoSection.textContent || "";
    const match = /Ingredients[:\s]*([^\n.]+)/i.exec(text);
    if (match) {
      return match[1].trim();
    }
  }

  //search heading if not found (extra backup)
  const allHeadings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, .a-section .a-text-bold");
  for (const heading of Array.from(allHeadings)) {
    if (/ingredients/i.test(heading.textContent || "")) {
      const section = heading.closest(".a-section, div");
      if (section) {
        const text = section.textContent || "";
        const headingText = heading.textContent || "";
        const ingredientsText = text.replace(headingText, "").trim();
        if (ingredientsText) {
          return ingredientsText;
        }
      }

      const nextEl = heading.nextElementSibling;
      if (nextEl && nextEl.textContent) {
        return nextEl.textContent.trim();
      }
    }
  }

  // search everywhere else for "Ingredients:"
  const allText = doc.body.textContent || "";
  const globalMatch = /Ingredients[:\s]*([^\n.]+)/i.exec(allText);
  if (globalMatch) {
    return globalMatch[1].trim();
  }
  
  // nutrition facts section if it exists
  const nutritionSection = doc.querySelector(".nutritionFacts, #nutrition-facts, .nutrition-facts");
  if (nutritionSection) {
    const text = nutritionSection.textContent || "";
    const match = /Ingredients[:\s]*([^\n.]+)/i.exec(text);
    if (match) {
      return match[1].trim();
    }
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
  // Find the cart
  const cartEl = document.querySelector("#sc-expanded-cart-localmarket") || 
                document.querySelector(".sc-list-body") || 
                document.querySelector(".sc-list-item-content") ||
                document.querySelector(".sc-list-items") ||
                document.querySelector(".a-container");
  
  if (!cartEl) {
    throw new Error("Cart not found. Please make sure you're on the Amazon Fresh cart page.");
  }
  
  // Grab product links and titles
  const items = Array.from(
    cartEl.querySelectorAll(".sc-list-item, .sc-list-item-content, .sc-product-item")
  ).map(item => {
    // Try the different link selectors
    const titleEl = item.querySelector<HTMLAnchorElement>("a.sc-product-link") ||
                   item.querySelector<HTMLAnchorElement>(".a-link-normal") ||
                   item.querySelector<HTMLAnchorElement>("a[href*='/dp/']");
                   
    const href = titleEl?.getAttribute("href");
    const title = titleEl?.textContent?.trim() || "Unknown Product";
    
    return {
      url: href ? toAbsolute(href) : "",
      title
    };
  }).filter(item => item.url);

  console.log(`Found ${items.length} items in cart`);
  
  if (items.length === 0) {
    throw new Error("No products found in cart. Please make sure your cart contains items.");
  }
  
  // Define a function to process each single item
  async function processItem(item: {url: string, title: string}): Promise<ScrapeResult> {
    try {
      console.log(`Fetching: ${item.url}`);
      const res = await fetch(item.url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch product page: ${res.status} ${res.statusText}`);
      }
      
      const html = await res.text();
      try {
        const ingredients = parseIngredients(html);
        console.log(`Found ingredients for ${item.title}`);
        return { 
          url: item.url, 
          title: item.title,
          ingredients 
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (parseErr) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const categoryEl = doc.querySelector("#wayfinding-breadcrumbs_feature_div, .a-breadcrumb");
        const category = categoryEl?.textContent?.trim() || "Unknown category";
        
        console.log(`No ingredients found for ${item.title}`);
        return { 
          url: item.url, 
          title: item.title,
          ingredients: "No ingredients found",
          error: `No ingredients section found. This may be a non-food item or the ingredients are not listed. Category: ${category}` 
        };
      }
    } catch (err) {
      console.error("Failed to load or parse", item.url, err);
      return { 
        url: item.url, 
        title: item.title,
        ingredients: "Failed to load product page",
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  }

  // Process all items in parallel with a concurrency limit
  const BATCH_SIZE = 5; // Process 5 items at a time to avoid overwhelming the browser
  const results: ScrapeResult[] = [];
  
  // Process items in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(item => processItem(item)));
    results.push(...batchResults);
  }

  // Count successful results
  const successCount = results.filter(item => !item.error).length;
  
  // Add a summary message if some products failed to be scraped
  if (successCount < items.length) {
    console.log(`Successfully found ingredients for ${successCount} out of ${items.length} products`);
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

    return true;
  }
});

function checkIngredientsForAllergies(ingredients: string, allergies: string[]): {
  found: boolean;
  matches: string[];
} {
  if (!ingredients || !allergies || allergies.length === 0) {
    return { found: false, matches: [] };
  }

  if (ingredients.includes("No ingredients found") || 
      ingredients.includes("Failed to load") ||
      ingredients === "N/A") {
    return { found: false, matches: [] };
  }

  const normalizedIngredients = ingredients
    .toLowerCase()
    .replace(/[,;:()[\]/]/g, ' ');

  const matches = allergies.filter(allergy => {
    if (!allergy || allergy.trim() === '') return false;

    const normalizedAllergy = allergy.toLowerCase().trim();

    const regex = new RegExp(`\\b${normalizedAllergy}\\b`, 'i');

    if (regex.test(normalizedIngredients)) {
      return true;
    }

    const allergyVariations = getAllergyVariations(normalizedAllergy);
    return allergyVariations.some(variation => {
      const variationRegex = new RegExp(`\\b${variation}\\b`, 'i');
      return variationRegex.test(normalizedIngredients);
    });
  });

  return {
    found: matches.length > 0,
    matches
  };
}

/**
 * Get common variations and derivatives of allergy terms
 * @param allergy - The base allergy term
 * @returns Array of related terms to check
 */
function getAllergyVariations(allergy: string): string[] {
  // Common allergy variations mapping
  const allergyMap: Record<string, string[]> = {
    'milk': ['dairy', 'lactose', 'whey', 'casein', 'butter', 'cream', 'cheese'],
    'egg': ['eggs', 'albumin', 'ovalbumin', 'lysozyme', 'globulin'],
    'peanut': ['peanuts', 'arachis', 'goober', 'groundnut'],
    'tree nut': ['almond', 'hazelnut', 'walnut', 'cashew', 'pistachio', 'pecan', 'macadamia'],
    'soy': ['soya', 'soybean', 'edamame', 'tofu', 'tempeh', 'miso'],
    'wheat': ['gluten', 'flour', 'bread', 'cereal', 'pasta', 'bran', 'starch'],
    'fish': ['cod', 'salmon', 'tuna', 'tilapia', 'halibut', 'anchovy', 'mahi'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'prawn', 'crayfish', 'clam', 'mussel', 'oyster'],
    'sesame': ['tahini', 'benne', 'gingelly'],
    'mustard': ['mustard seed', 'mustard powder', 'dijon'],
    'celery': ['celeriac', 'celery seed', 'celery salt'],
    'lupin': ['lupine', 'lupin flour', 'lupin bean'],
    'sulfite': ['sulphite', 'sulfur dioxide', 'e220', 'preservative']
  };
  
  // Check if the allergy is a key in our map
  for (const [key, variations] of Object.entries(allergyMap)) {
    if (allergy === key || variations.includes(allergy)) {
      // Return both the key and all variations
      return [key, ...variations].filter(v => v !== allergy);
    }
  }
  
  // If no specific variations found, return common words
  if (allergy.endsWith('s')) {
    return [allergy.slice(0, -1)]; // Remove 's' for plural
  } else {
    return [allergy + 's']; // Add 's' for singular
  }
}

console.log("Allergy Tracker content script loaded");