/**
 * Maps issue category strings to ServiceCenter enum types.
 * Handles both old category names and new rule-based category names.
 * @param {string} category
 * @returns {'Police'|'Medical'|'Fire'|'Infrastructure'}
 */
const mapCategoryToTargetType = (category) => {
  if (!category) return 'Infrastructure';
  const cat = category.toLowerCase();

  // Fire & hazard
  if (cat.includes('fire') || cat.includes('hazard') || cat.includes('explosion') || cat.includes('gas leak')) {
    return 'Fire';
  }

  // Safety / Police related
  if (cat.includes('safety') || cat.includes('police') || cat.includes('crime') ||
      cat.includes('violence') || cat.includes('robbery') || cat.includes('assault') ||
      cat.includes('weapon') || cat.includes('theft') || cat.includes('shooting')) {
    return 'Police';
  }

  // Medical
  if (cat.includes('health') || cat.includes('medical') || cat.includes('sanitation') ||
      cat.includes('hospital') || cat.includes('emergency') || cat.includes('injury') ||
      cat.includes('accident')) {
    return 'Medical';
  }

  // Flooding → Infrastructure (municipal)
  if (cat.includes('flood') || cat.includes('drainage') || cat.includes('waterlog')) {
    return 'Infrastructure';
  }

  return 'Infrastructure';
};

module.exports = { mapCategoryToTargetType };
