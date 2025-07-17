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

  // Handle case where ingredients might be "No ingredients found" or error message
  if (ingredients.includes("No ingredients found") || 
      ingredients.includes("Failed to load") ||
      ingredients === "N/A") {
    return { found: false, matches: [] };
  }

  // Normalize the ingredients string
  // Replace common separators with spaces to improve word boundary detection
  const normalizedIngredients = ingredients
    .toLowerCase()
    .replace(/[,;:\(\)\[\]\/]/g, ' ');
  
  // Find matches
  const matches = allergies.filter(allergy => {
    if (!allergy || allergy.trim() === '') return false;
    
    // Normalize the allergy term
    const normalizedAllergy = allergy.toLowerCase().trim();
    
    // Create a regex that looks for the allergy as a whole word
    // This helps avoid false positives (e.g. "milk" matching "milkweed")
    const regex = new RegExp(`\\b${normalizedAllergy}\\b`, 'i');
    
    // Check for direct match
    if (regex.test(normalizedIngredients)) {
      return true;
    }
    
    // Check for common variations and derivatives
    // For example, if looking for "milk", also check for "dairy", "lactose", etc.
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
  // Common allergy variations map
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
  
  // If no specific variations found, return common word forms
  // e.g., singular/plural forms
  if (allergy.endsWith('s')) {
    return [allergy.slice(0, -1)]; // Remove 's' for plural
  } else {
    return [allergy + 's']; // Add 's' for singular
  }
}

/**
 * Highlights allergies in an ingredients string
 * @param ingredients - The ingredients string
 * @param allergies - Array of allergy terms to highlight
 * @returns HTML string with allergies highlighted in red and safe ingredients in green
 */
export function highlightAllergies(ingredients: string, allergies: string[]): string {
  if (!ingredients || !allergies || allergies.length === 0) {
    return ingredients;
  }

  // Clean up the ingredients string
  let result = ingredients.replace(/Opens in a new tab/g, '').trim();
  
  // Create a regex pattern for allergies and their variations
  const allergyTerms = allergies.flatMap(allergy => {
    const variations = getAllergyVariations(allergy.toLowerCase().trim());
    return [allergy.toLowerCase(), ...variations];
  });
  
  const allergyPattern = allergyTerms
    .filter((term, index, self) => self.indexOf(term) === index) // Remove duplicates
    .map(a => `\\b${a}\\b`)
    .join('|');
  
  if (!allergyPattern) return result;
  
  // First, split the ingredients by commas to get individual ingredients
  const ingredientsList = result.split(/,\s*/);
  
  // Process each ingredient
  const processedIngredients = ingredientsList.map(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    const regex = new RegExp(`(${allergyPattern})`, 'gi');
    
    // Check if this ingredient contains an allergen
    if (regex.test(lowerIngredient)) {
      // Reset regex lastIndex
      regex.lastIndex = 0;
      // Highlight the allergen in red
      return ingredient.replace(regex, '<span class="allergy-highlight">$1</span>');
    } else {
      // This is a safe ingredient, highlight in green
      return `<span class="safe-ingredient">${ingredient}</span>`;
    }
  });
  
  // Join the processed ingredients back together
  return processedIngredients.join(', ');
}