// Error constants
export const HrefConversionErrors = {
  MissingHref: "Missing href attribute on element",
} as const;
export type HrefConversionError = typeof HrefConversionErrors[keyof typeof HrefConversionErrors];

export const ParseErrors = {
  NoIngredientsFound: "No ingredients section found in the parsed HTML",
} as const;
export type ParseError = typeof ParseErrors[keyof typeof ParseErrors];

// Convert href → absolute
export function toAbsolute(href: string | null): string {
  if (!href) {
    throw new Error(HrefConversionErrors.MissingHref);
  }
  return new URL(href, window.location.origin).href;
}

// Parse "Ingredients" out of HTML
export function parseIngredients(html: string): string {
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

  // extra check
  const featureText = doc
    .querySelector<HTMLElement>("#feature-bullets, .a-unordered-list")
    ?.textContent || "";
  const m = /Ingredients[:\s]*([^.]+)/i.exec(featureText);
  if (m) {
    return m[1].trim();
  }

  // extra check 2
  const importantInfoSection = doc.querySelector("#importantInformation, #important-information, .important-information, .product-facts");
  if (importantInfoSection) {
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
    // extra pt 2
    const text = importantInfoSection.textContent || "";
    const match = /Ingredients[:\s]*([^\n.]+)/i.exec(text);
    if (match) {
      return match[1].trim();
    }
  }

  // search for any sections containing ingredients
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

  // search entire doc
  const allText = doc.body.textContent || "";
  const globalMatch = /Ingredients[:\s]*([^\n.]+)/i.exec(allText);
  if (globalMatch) {
    return globalMatch[1].trim();
  }
  
  // facts section search as extra backup
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

    return true;
  }
});

// Scrape the cart
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
      console.error("Failed to load or parse", url, err);
    }
  }

  return results;
}