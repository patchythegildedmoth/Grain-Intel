import { describe, it, expect } from 'vitest';
import { computeMedianFreightCost } from '../freightTiers';

describe('computeMedianFreightCost', () => {
  it('computes median from multiple tiers', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
      { commodityCode: 'Corn', contractNumber: 'C2', freightTier: null },
      { commodityCode: 'Corn', contractNumber: 'C3', freightTier: null },
    ];
    // B=$0.25, H=$0.85, J=$1.05 → sorted: 0.25, 0.85, 1.05 → median = 0.85
    const tiers = { C1: 'B', C2: 'H', C3: 'J' };
    expect(computeMedianFreightCost('Corn', contracts, tiers)).toBeCloseTo(0.85);
  });

  it('computes median with even number of tiers', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
      { commodityCode: 'Corn', contractNumber: 'C2', freightTier: null },
    ];
    // E=$0.55, H=$0.85 → avg = 0.70
    const tiers = { C1: 'E', C2: 'H' };
    expect(computeMedianFreightCost('Corn', contracts, tiers)).toBeCloseTo(0.70);
  });

  it('returns single tier cost when only one exists', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
    ];
    const tiers = { C1: 'F' }; // F=$0.65
    expect(computeMedianFreightCost('Corn', contracts, tiers)).toBeCloseTo(0.65);
  });

  it('returns 0 when no tiers exist for commodity', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
    ];
    expect(computeMedianFreightCost('Corn', contracts, {})).toBe(0);
  });

  it('returns 0 when freightTiers map is undefined', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
    ];
    expect(computeMedianFreightCost('Corn', contracts, undefined)).toBe(0);
  });

  it('only includes contracts matching the commodity', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
      { commodityCode: 'Soybeans', contractNumber: 'C2', freightTier: null },
    ];
    // Only C1 matches Corn, C2 is Soybeans
    const tiers = { C1: 'H', C2: 'B' }; // H=$0.85, B=$0.25
    expect(computeMedianFreightCost('Corn', contracts, tiers)).toBeCloseTo(0.85);
  });

  it('uses contract freightTier column as fallback', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: 'E' },
    ];
    // No entry in freightTiers map, falls back to contract column. E=$0.55
    expect(computeMedianFreightCost('Corn', contracts, {})).toBeCloseTo(0.55);
  });

  it('skips tier A (cost = 0, not a freight cost)', () => {
    const contracts = [
      { commodityCode: 'Corn', contractNumber: 'C1', freightTier: null },
      { commodityCode: 'Corn', contractNumber: 'C2', freightTier: null },
    ];
    // A=$0 (skipped), H=$0.85 → only one cost → 0.85
    const tiers = { C1: 'A', C2: 'H' };
    expect(computeMedianFreightCost('Corn', contracts, tiers)).toBeCloseTo(0.85);
  });
});
