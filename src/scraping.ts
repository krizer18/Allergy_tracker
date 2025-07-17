// scraping.ts

// 1️⃣ Error constants
export const HrefConversionErrors = {
  MissingHref: "Missing href attribute on element",
} as const;
export type HrefConversionError = typeof HrefConversionErrors[keyof typeof HrefConversionErrors];

export const ParseErrors = {
  NoIngredientsFound: "No ingredients section found in the parsed HTML",
} as const;
export type ParseError = typeof ParseErrors[keyof typeof ParseErrors];

// 2️⃣ Convert href → absolute, throwing if absent
export function toAbsolute(href: string | null): string {
  if (!href) {
    throw new Error(HrefConversionErrors.MissingHref);
  }
  return new URL(href, window.location.origin).href;
}

// 3️⃣ Parse "Ingredients" out of a product‐page HTML
export function parseIngredients(html: string): string {
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

  // c) feature‐bullets fallback
  const featureText = doc
    .querySelector<HTMLElement>("#feature-bullets, .a-unordered-list")
    ?.textContent || "";
  const m = /Ingredients[:\s]*([^.]+)/i.exec(featureText);
  if (m) {
    return m[1].trim();
  }

  // d) Important Information section
  const importantInfoSection = doc.querySelector("#importantInformation, #important-information, .important-information, .product-facts");
  if (importantInfoSection) {
    // Try to find a heading or bold text with "Ingredients"
    const headings = importantInfoSection.querySelectorAll("h5, h4, h3, b, strong, .a-text-bold");
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
    const match = /Ingredients[:\s]*([^\n.]+)/i.exec(text);
    if (match) {
      return match[1].trim();
    }
  }

  // e) Look for any section with "ingredients" in the heading
  const allHeadings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, .a-section .a-text-bold");
  for (const heading of Array.from(allHeadings)) {
    if (/ingredients/i.test(heading.textContent || "")) {
      // Check the parent section or div
      const section = heading.closest(".a-section, div");
      if (section) {
        const text = section.textContent || "";
        // Remove the heading text and extract ingredients
        const headingText = heading.textContent || "";
        const ingredientsText = text.replace(headingText, "").trim();
        if (ingredientsText) {
          return ingredientsText;
        }
      }
      
      // Try next sibling or parent
      const nextEl = heading.nextElementSibling;
      if (nextEl && nextEl.textContent) {
        return nextEl.textContent.trim();
      }
    }
  }

  // f) Fallback: search anywhere in the document for "Ingredients:"
  const allText = doc.body.textContent || "";
  const globalMatch = /Ingredients[:\s]*([^\n.]+)/i.exec(allText);
  if (globalMatch) {
    return globalMatch[1].trim();
  }
  
  // g) Look for nutrition facts section which might contain ingredients
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

export interface ScrapeResult {
  url: string;
  ingredients: string;
  error?: string;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SCRAPE_CART") {
    const cartEl = document.querySelector("#sc-expanded-cart-localmarket");
    if (!cartEl) {
      return sendResponse({ error: "Cart not found" });
    }

    scrapeCartIngredients(cartEl)
      .then(results => sendResponse({ results }))
      .catch(err => sendResponse({ error: err.message }));

    // indicate that we'll call sendResponse asynchronously
    return true;
  }
});

// 4️⃣ Scrape the cart container
export async function scrapeCartIngredients(
  cartEl: Element
): Promise<ScrapeResult[]> {
  // grab product links
  const anchors = Array.from(
    cartEl.querySelectorAll<HTMLAnchorElement>(
      "a.sc-product-link.sc-product-title[href]"
    )
  );

  // dedupe + absolutify
  const urls = Array.from(
    new Set(anchors.map(a => {
      try {
        return toAbsolute(a.getAttribute("href"));
      } catch (e) {
        console.error(e);
        return null;
      }
    }))
  ).filter((u): u is string => !!u);

  const results: ScrapeResult[] = [];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const ingredients = parseIngredients(html);
      results.push({ url, ingredients });
    } catch (err) {
      // push an error so the UI can show it
      console.error("Failed to load or parse", url, err);
    }
  }

  return results;
}