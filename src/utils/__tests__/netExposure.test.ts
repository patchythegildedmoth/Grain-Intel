import { describe, it, expect } from 'vitest';
import { groupByFreightTerm, type FreightNetExposure } from '../freightBreakdown';

/**
 * Tests for net exposure computation logic.
 * These test the pure computation patterns used by useUnpricedExposure
 * without requiring React hook testing infrastructure.
 */

// Helper: simulate the net exposure computation from the hook
function computeNetExposure(
  contracts: { contractType: string; exposureBushels: number; futureMonth: string; freightTerm: string | null }[],
) {
  const purchaseExposure = contracts
    .filter((c) => c.contractType === 'Purchase')
    .reduce((s, c) => s + c.exposureBushels, 0);
  const saleExposure = contracts
    .filter((c) => c.contractType === 'Sale')
    .reduce((s, c) => s + c.exposureBushels, 0);
  const netExposure = purchaseExposure - saleExposure;
  const grossExposure = purchaseExposure + saleExposure;

  // FM breakdown
  const fmMap = new Map<string, { purchase: number; sale: number; contracts: typeof contracts }>();
  for (const c of contracts) {
    if (!fmMap.has(c.futureMonth)) fmMap.set(c.futureMonth, { purchase: 0, sale: 0, contracts: [] });
    const entry = fmMap.get(c.futureMonth)!;
    entry.contracts.push(c);
    if (c.contractType === 'Purchase') entry.purchase += c.exposureBushels;
    else entry.sale += c.exposureBushels;
  }
  const fmBreakdown = [...fmMap.entries()].map(([fm, data]) => ({
    futureMonth: fm,
    purchaseExposure: data.purchase,
    saleExposure: data.sale,
    netExposure: data.purchase - data.sale,
    grossExposure: data.purchase + data.sale,
    freightBreakdown: groupByFreightTerm(data.contracts),
  }));

  // Commodity-level freight: derived from FM sums
  const freightAgg = new Map<string, { purchase: number; sale: number }>();
  for (const fm of fmBreakdown) {
    for (const fb of fm.freightBreakdown) {
      if (!freightAgg.has(fb.freightTerm)) freightAgg.set(fb.freightTerm, { purchase: 0, sale: 0 });
      const entry = freightAgg.get(fb.freightTerm)!;
      entry.purchase += fb.purchaseExposure;
      entry.sale += fb.saleExposure;
    }
  }
  const freightBreakdown: FreightNetExposure[] = [...freightAgg.entries()]
    .map(([ft, data]) => ({
      freightTerm: ft,
      purchaseExposure: data.purchase,
      saleExposure: data.sale,
      netExposure: data.purchase - data.sale,
      grossExposure: data.purchase + data.sale,
    }));

  return { purchaseExposure, saleExposure, netExposure, grossExposure, fmBreakdown, freightBreakdown };
}

describe('net exposure computation', () => {
  it('computes net = purchase - sale', () => {
    const contracts = [
      { contractType: 'Purchase', exposureBushels: 100_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Sale', exposureBushels: 80_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
    ];
    const result = computeNetExposure(contracts);
    expect(result.netExposure).toBe(20_000); // net long
    expect(result.grossExposure).toBe(180_000);
    expect(result.purchaseExposure).toBe(100_000);
    expect(result.saleExposure).toBe(80_000);
  });

  it('returns negative net when sales exceed purchases', () => {
    const contracts = [
      { contractType: 'Purchase', exposureBushels: 30_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Sale', exposureBushels: 80_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
    ];
    const result = computeNetExposure(contracts);
    expect(result.netExposure).toBe(-50_000); // net short
  });

  it('handles all-purchase (no sales) → net = gross', () => {
    const contracts = [
      { contractType: 'Purchase', exposureBushels: 50_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Purchase', exposureBushels: 30_000, futureMonth: 'Sep 26', freightTerm: 'Dlvd' },
    ];
    const result = computeNetExposure(contracts);
    expect(result.netExposure).toBe(80_000);
    expect(result.grossExposure).toBe(80_000);
  });

  it('handles all-sale (no purchases) → net = -gross', () => {
    const contracts = [
      { contractType: 'Sale', exposureBushels: 60_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
    ];
    const result = computeNetExposure(contracts);
    expect(result.netExposure).toBe(-60_000);
    expect(result.grossExposure).toBe(60_000);
  });

  it('handles empty contracts', () => {
    const result = computeNetExposure([]);
    expect(result.netExposure).toBe(0);
    expect(result.grossExposure).toBe(0);
  });

  it('computes FM breakdown correctly', () => {
    const contracts = [
      { contractType: 'Purchase', exposureBushels: 50_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Sale', exposureBushels: 30_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Purchase', exposureBushels: 20_000, futureMonth: 'Sep 26', freightTerm: 'Dlvd' },
    ];
    const result = computeNetExposure(contracts);
    expect(result.fmBreakdown).toHaveLength(2);

    const jul = result.fmBreakdown.find((fm) => fm.futureMonth === 'Jul 26')!;
    expect(jul.netExposure).toBe(20_000);
    expect(jul.grossExposure).toBe(80_000);

    const sep = result.fmBreakdown.find((fm) => fm.futureMonth === 'Sep 26')!;
    expect(sep.netExposure).toBe(20_000);
    expect(sep.grossExposure).toBe(20_000);
  });

  it('derives commodity freight from FM-level sums', () => {
    const contracts = [
      { contractType: 'Purchase', exposureBushels: 50_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Sale', exposureBushels: 30_000, futureMonth: 'Jul 26', freightTerm: 'Dlvd' },
      { contractType: 'Purchase', exposureBushels: 20_000, futureMonth: 'Sep 26', freightTerm: 'Pickup' },
    ];
    const result = computeNetExposure(contracts);

    // Commodity-level freight should aggregate across FM
    const pickup = result.freightBreakdown.find((f) => f.freightTerm === 'Pickup')!;
    expect(pickup.purchaseExposure).toBe(70_000); // 50K + 20K
    expect(pickup.saleExposure).toBe(0);
    expect(pickup.netExposure).toBe(70_000);

    const dlvd = result.freightBreakdown.find((f) => f.freightTerm === 'Dlvd')!;
    expect(dlvd.purchaseExposure).toBe(0);
    expect(dlvd.saleExposure).toBe(30_000);
    expect(dlvd.netExposure).toBe(-30_000);
  });

  it('FM freight breakdown sums to commodity freight breakdown', () => {
    const contracts = [
      { contractType: 'Purchase', exposureBushels: 50_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Sale', exposureBushels: 30_000, futureMonth: 'Jul 26', freightTerm: 'Pickup' },
      { contractType: 'Purchase', exposureBushels: 20_000, futureMonth: 'Sep 26', freightTerm: 'Pickup' },
      { contractType: 'Sale', exposureBushels: 10_000, futureMonth: 'Sep 26', freightTerm: 'Dlvd' },
    ];
    const result = computeNetExposure(contracts);

    // Sum FM-level pickup across months
    const fmPickupPurchase = result.fmBreakdown.reduce((s, fm) => {
      const fb = fm.freightBreakdown.find((f) => f.freightTerm === 'Pickup');
      return s + (fb?.purchaseExposure ?? 0);
    }, 0);

    // Should match commodity-level
    const pickup = result.freightBreakdown.find((f) => f.freightTerm === 'Pickup')!;
    expect(pickup.purchaseExposure).toBe(fmPickupPurchase);
  });
});
