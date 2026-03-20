import { describe, it, expect } from 'vitest';
import { computeFreightBreakdown, groupByFreightTerm } from '../freightBreakdown';

describe('computeFreightBreakdown', () => {
  it('computes weighted avg basis per freight term', () => {
    const contracts = [
      { freightTerm: 'Pickup', basis: -0.20, pricedQty: 5000, balance: 5000 },
      { freightTerm: 'Pickup', basis: -0.30, pricedQty: 5000, balance: 5000 },
      { freightTerm: 'Dlvd', basis: -0.10, pricedQty: 10000, balance: 10000 },
    ];
    const result = computeFreightBreakdown(contracts);
    expect(result).toHaveLength(2);

    const dlvd = result.find((r) => r.freightTerm === 'Dlvd')!;
    expect(dlvd.avgBasis).toBeCloseTo(-0.10);
    expect(dlvd.bushels).toBe(10000);
    expect(dlvd.contractCount).toBe(1);

    const pickup = result.find((r) => r.freightTerm === 'Pickup')!;
    expect(pickup.avgBasis).toBeCloseTo(-0.25); // (-0.20*5000 + -0.30*5000) / 10000
    expect(pickup.bushels).toBe(10000);
    expect(pickup.contractCount).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(computeFreightBreakdown([])).toEqual([]);
  });

  it('handles null freight term as Unknown', () => {
    const contracts = [
      { freightTerm: null, basis: -0.15, pricedQty: 5000, balance: 5000 },
    ];
    const result = computeFreightBreakdown(contracts);
    expect(result).toHaveLength(1);
    expect(result[0].freightTerm).toBe('Unknown');
  });

  it('returns null avgBasis when pricedQty is 0', () => {
    const contracts = [
      { freightTerm: 'Pickup', basis: null, pricedQty: 0, balance: 5000 },
    ];
    const result = computeFreightBreakdown(contracts);
    expect(result[0].avgBasis).toBeNull();
  });

  it('sorts by bushels descending', () => {
    const contracts = [
      { freightTerm: 'Pickup', basis: -0.10, pricedQty: 1000, balance: 1000 },
      { freightTerm: 'Dlvd', basis: -0.20, pricedQty: 5000, balance: 5000 },
    ];
    const result = computeFreightBreakdown(contracts);
    expect(result[0].freightTerm).toBe('Dlvd');
    expect(result[1].freightTerm).toBe('Pickup');
  });
});

describe('groupByFreightTerm', () => {
  it('groups purchase and sale exposure by freight term', () => {
    const contracts = [
      { freightTerm: 'Pickup', contractType: 'Purchase', exposureBushels: 5000 },
      { freightTerm: 'Pickup', contractType: 'Sale', exposureBushels: 3000 },
      { freightTerm: 'Dlvd', contractType: 'Purchase', exposureBushels: 10000 },
    ];
    const result = groupByFreightTerm(contracts);
    expect(result).toHaveLength(2);

    const dlvd = result.find((r) => r.freightTerm === 'Dlvd')!;
    expect(dlvd.purchaseExposure).toBe(10000);
    expect(dlvd.saleExposure).toBe(0);
    expect(dlvd.netExposure).toBe(10000);
    expect(dlvd.grossExposure).toBe(10000);

    const pickup = result.find((r) => r.freightTerm === 'Pickup')!;
    expect(pickup.purchaseExposure).toBe(5000);
    expect(pickup.saleExposure).toBe(3000);
    expect(pickup.netExposure).toBe(2000);
    expect(pickup.grossExposure).toBe(8000);
  });

  it('returns empty array for empty input', () => {
    expect(groupByFreightTerm([])).toEqual([]);
  });

  it('handles null freight term as Unknown', () => {
    const contracts = [
      { freightTerm: null, contractType: 'Purchase', exposureBushels: 5000 },
    ];
    const result = groupByFreightTerm(contracts);
    expect(result[0].freightTerm).toBe('Unknown');
  });

  it('computes negative net when sales exceed purchases', () => {
    const contracts = [
      { freightTerm: 'Pickup', contractType: 'Purchase', exposureBushels: 2000 },
      { freightTerm: 'Pickup', contractType: 'Sale', exposureBushels: 8000 },
    ];
    const result = groupByFreightTerm(contracts);
    expect(result[0].netExposure).toBe(-6000);
  });

  it('sorts by gross exposure descending', () => {
    const contracts = [
      { freightTerm: 'FOB', contractType: 'Purchase', exposureBushels: 1000 },
      { freightTerm: 'Dlvd', contractType: 'Purchase', exposureBushels: 10000 },
    ];
    const result = groupByFreightTerm(contracts);
    expect(result[0].freightTerm).toBe('Dlvd');
  });
});
