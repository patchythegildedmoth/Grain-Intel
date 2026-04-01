import { describe, it, expect } from 'vitest';
import { getFreightCost } from '../freightTiers';

/**
 * Tests the effective-basis freight adjustment applied in useCustomerAnalysis.
 *
 * Logic:
 *   tier = freightTiers[contractNumber] ?? contract.freightTier ?? null
 *   freightCost = getFreightCost(tier)
 *   effectiveBasis = basis !== null && freightCost > 0 ? basis + freightCost : basis
 *
 * FOB/Pickup contracts have a tier assigned. Adding freight cost back to the contract's
 * locked FOB basis yields the true realized margin vs. a delivered buy basis.
 */
function effectiveBasis(
  basis: number | null,
  contractNumber: string,
  contractFreightTier: string | null,
  freightTiers: Record<string, string>,
): number | null {
  const tier = freightTiers[contractNumber] ?? contractFreightTier ?? null;
  const cost = getFreightCost(tier);
  return basis !== null && cost > 0 ? basis + cost : basis;
}

describe('customer profitability freight adjustment', () => {
  it('adds freight cost to FOB basis from Excel tier map', () => {
    // Tier B = $0.25/bu
    const result = effectiveBasis(-0.15, 'S-001', null, { 'S-001': 'B' });
    expect(result).toBeCloseTo(-0.15 + 0.25);
  });

  it('adds freight cost to FOB basis from iRely contract column', () => {
    // Tier C = $0.35/bu, no Excel override
    const result = effectiveBasis(-0.20, 'S-002', 'C', {});
    expect(result).toBeCloseTo(-0.20 + 0.35);
  });

  it('Excel tier overrides iRely column', () => {
    // Excel says tier D ($0.45), iRely says tier B ($0.25) — Excel wins
    const result = effectiveBasis(-0.10, 'S-003', 'B', { 'S-003': 'D' });
    expect(result).toBeCloseTo(-0.10 + 0.45);
  });

  it('no adjustment for delivered contracts (no tier)', () => {
    const result = effectiveBasis(0.10, 'S-004', null, {});
    expect(result).toBe(0.10);
  });

  it('no adjustment for tier A (delivered equivalent)', () => {
    // Tier A = $0.00
    const result = effectiveBasis(0.10, 'S-005', 'A', {});
    expect(result).toBe(0.10);
  });

  it('returns null unchanged when basis is null', () => {
    const result = effectiveBasis(null, 'S-006', 'B', { 'S-006': 'B' });
    expect(result).toBeNull();
  });
});
