import { describe, it, expect } from 'vitest';
import { adjustBasisForProfitability } from '../freightTiers';

describe('adjustBasisForProfitability', () => {
  it('uses tier from freightTiers map when available', () => {
    // Tier B = $0.25
    const result = adjustBasisForProfitability(
      -0.15, 'S-001', null, { 'S-001': 'B' }, 'FOB', 0.85,
    );
    expect(result).toBeCloseTo(-0.15 + 0.25);
  });

  it('uses tier from contract column when no map entry', () => {
    // Tier C = $0.35
    const result = adjustBasisForProfitability(
      -0.20, 'S-002', 'C', {}, 'FOB', 0.85,
    );
    expect(result).toBeCloseTo(-0.20 + 0.35);
  });

  it('applies default freight cost for FOB when no tier exists', () => {
    const result = adjustBasisForProfitability(
      -0.15, 'S-003', null, {}, 'FOB', 0.85,
    );
    expect(result).toBeCloseTo(-0.15 + 0.85);
  });

  it('applies default freight cost for Pickup when no tier exists', () => {
    const result = adjustBasisForProfitability(
      0.10, 'S-004', null, {}, 'Pickup', 0.65,
    );
    expect(result).toBeCloseTo(0.10 + 0.65);
  });

  it('no adjustment for Delivered contracts without tier', () => {
    const result = adjustBasisForProfitability(
      1.20, 'S-005', null, {}, 'Dlvd', 0.85,
    );
    expect(result).toBe(1.20);
  });

  it('returns null when basis is null', () => {
    const result = adjustBasisForProfitability(
      null, 'S-006', null, {}, 'FOB', 0.85,
    );
    expect(result).toBeNull();
  });

  it('no adjustment when default freight cost is 0', () => {
    const result = adjustBasisForProfitability(
      -0.15, 'S-007', null, {}, 'FOB', 0,
    );
    expect(result).toBe(-0.15);
  });

  it('tier takes priority over default freight cost', () => {
    // Tier E = $0.55, default = $0.85 — tier wins
    const result = adjustBasisForProfitability(
      0.10, 'S-008', 'E', {}, 'FOB', 0.85,
    );
    expect(result).toBeCloseTo(0.10 + 0.55);
  });
});
