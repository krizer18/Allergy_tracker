/**
 * Utility functions for checking ingredients against allergies
 */

/**
 * Checks if any allergies are found in the ingredients
 * @param ingredients - The ingredients string to check
 * @param allergies - Array of allergy terms to look for
 * @returns Object with match results
 */
export function checkAllergies(ingredients: string, allergies: string[]): {
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
    // This helps avoid false positives (e.g. "milk" matching "milkweed")
    const regex = new RegExp(`\\b${allergy.toLowerCase()}\\b`, 'i');
    return regex.test(normalizedIngredients);
  });

  return {
    found: matches.length > 0,
    matches
  };
}

/**
 * Highlights allergies in an ingredients string
 * @param ingredients - The ingredients string
 * @param allergies - Array of allergy terms to highlight
 * @returns HTML string with allergies highlighted
 */
export function highlightAllergies(ingredients: string, allergies: string[]): string {
  if (!ingredients || !allergies || allergies.length === 0) {
    return ingredients;
  }

  let result = ingredients;
  
  // Create a regex that matches any of the allergies as whole words
  const allergyPattern = allergies
    .map(a => `\\b${a.toLowerCase()}\\b`)
    .join('|');
  
  if (!allergyPattern) return ingredients;
  
  const regex = new RegExp(`(${allergyPattern})`, 'gi');
  
  // Replace matches with highlighted version
  result = result.replace(regex, '<span class="allergy-highlight">$1</span>');
  
  return result;
}