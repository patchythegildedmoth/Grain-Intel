interface WeightedItem {
  value: number | null;
  weight: number;
}

/**
 * Calculates a weighted average, skipping items where value is null or weight <= 0.
 * Returns null if no valid items exist or total weight is 0.
 */
export function weightedAverage(items: WeightedItem[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const item of items) {
    if (item.value !== null && item.value !== undefined && item.weight > 0) {
      weightedSum += item.value * item.weight;
      totalWeight += item.weight;
    }
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}
