/**
 * Shared freight breakdown utilities.
 *
 * computeFreightBreakdown — weighted avg basis per freight term (used by Basis Spread)
 * groupByFreightTerm      — bushel sums per freight term + side (used by Net Exposure)
 */

export interface FreightBasisBreakdown {
  freightTerm: string;
  avgBasis: number | null;
  bushels: number;
  contractCount: number;
}

export interface FreightNetExposure {
  freightTerm: string;
  purchaseExposure: number;
  saleExposure: number;
  netExposure: number;
  grossExposure: number;
}

/**
 * Compute weighted average basis per freight term.
 * Used by Basis Spread Analysis for buy/sell basis breakdowns.
 */
export function computeFreightBreakdown(
  contracts: { freightTerm: string | null; basis: number | null; pricedQty: number; balance: number }[],
): FreightBasisBreakdown[] {
  const map = new Map<string, { totalBasis: number; totalWeight: number; count: number }>();
  for (const c of contracts) {
    const ft = c.freightTerm || 'Unknown';
    if (!map.has(ft)) map.set(ft, { totalBasis: 0, totalWeight: 0, count: 0 });
    const entry = map.get(ft)!;
    entry.count++;
    if (c.basis !== null && c.pricedQty > 0) {
      entry.totalBasis += c.basis * c.pricedQty;
      entry.totalWeight += c.pricedQty;
    }
  }
  return [...map.entries()]
    .map(([freightTerm, data]) => ({
      freightTerm,
      avgBasis: data.totalWeight > 0 ? data.totalBasis / data.totalWeight : null,
      bushels: contracts
        .filter((c) => (c.freightTerm || 'Unknown') === freightTerm)
        .reduce((s, c) => s + c.balance, 0),
      contractCount: data.count,
    }))
    .sort((a, b) => b.bushels - a.bushels);
}

/**
 * Group contracts by freight term and compute purchase/sale/net exposure bushels.
 * Used by Unpriced Exposure for freight-segmented net exposure.
 */
export function groupByFreightTerm(
  contracts: { freightTerm: string | null; contractType: string; exposureBushels: number }[],
): FreightNetExposure[] {
  const map = new Map<string, { purchase: number; sale: number; count: number }>();

  for (const c of contracts) {
    const ft = c.freightTerm || 'Unknown';
    if (!map.has(ft)) map.set(ft, { purchase: 0, sale: 0, count: 0 });
    const entry = map.get(ft)!;
    entry.count++;
    if (c.contractType === 'Purchase') {
      entry.purchase += c.exposureBushels;
    } else {
      entry.sale += c.exposureBushels;
    }
  }

  return [...map.entries()]
    .map(([freightTerm, data]) => ({
      freightTerm,
      purchaseExposure: data.purchase,
      saleExposure: data.sale,
      netExposure: data.purchase - data.sale,
      grossExposure: data.purchase + data.sale,
    }))
    .sort((a, b) => b.grossExposure - a.grossExposure);
}
