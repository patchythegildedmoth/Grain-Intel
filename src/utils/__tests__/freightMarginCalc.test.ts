import { describe, it, expect } from 'vitest';
import {
  resolveContractFreight,
  calcMarginByTier,
  calcTierImbalance,
  calcBlendedFreightCost,
  calcFreightMarginPercent,
} from '../freightMarginCalc';
import type { Contract } from '../../types/contracts';

// Helper to create a minimal open contract for testing
function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    commodityCode: 'Corn',
    contractType: 'Purchase',
    contractStatus: 'Open',
    entity: 'Test Farm',
    contractNumber: 'C-001',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    futureMonth: '2026-05 (May 26)',
    balance: 10000,
    pricingType: 'Priced',
    pricedQty: 10000,
    unpricedQty: 0,
    futures: 4.50,
    basis: -0.20,
    cashPrice: 4.30,
    createdDate: new Date('2025-12-01'),
    freightTerm: 'FOB',
    freightTier: null,
    salesperson: 'Test',
    futureMonthDate: new Date('2026-05-01'),
    futureMonthShort: 'May 26 (K)',
    futureMonthSortKey: '2026-05',
    isOpen: true,
    isCompleted: false,
    daysUntilDeliveryEnd: 30,
    isOverdue: false,
    isUrgent: false,
    ...overrides,
  };
}

describe('resolveContractFreight', () => {
  it('resolves tier from Excel upload (priority over iRely)', () => {
    const contracts = [makeContract({ contractNumber: 'C-001', freightTier: 'B' })];
    const freightTiers = { 'C-001': 'D' }; // Excel says D
    const result = resolveContractFreight(contracts, freightTiers, []);
    expect(result[0].resolvedTier).toBe('D');
    expect(result[0].freightCost).toBeCloseTo(0.45);
  });

  it('falls back to iRely tier when no Excel override', () => {
    const contracts = [makeContract({ freightTier: 'C' })];
    const result = resolveContractFreight(contracts, {}, []);
    expect(result[0].resolvedTier).toBe('C');
    expect(result[0].freightCost).toBeCloseTo(0.35);
  });

  it('resolves null tier for delivered contracts', () => {
    const contracts = [makeContract({ freightTier: null })];
    const result = resolveContractFreight(contracts, {}, []);
    expect(result[0].resolvedTier).toBeNull();
    expect(result[0].freightCost).toBe(0);
  });

  it('looks up sell basis by commodity + delivery month', () => {
    const contracts = [makeContract({ commodityCode: 'Corn', endDate: new Date('2026-03-15') })];
    const sellBasis = [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }];
    const result = resolveContractFreight(contracts, {}, sellBasis);
    expect(result[0].currentSellBasis).toBe(-0.10);
  });

  it('filters to open contracts with balance > 0', () => {
    const contracts = [
      makeContract({ isOpen: true, balance: 5000 }),
      makeContract({ isOpen: false, balance: 5000, contractNumber: 'C-002' }),
      makeContract({ isOpen: true, balance: 0, contractNumber: 'C-003' }),
    ];
    const result = resolveContractFreight(contracts, {}, []);
    expect(result).toHaveLength(1);
  });

  it('returns empty for empty input', () => {
    expect(resolveContractFreight([], {}, [])).toEqual([]);
  });
});

describe('calcMarginByTier', () => {
  it('computes net margin correctly', () => {
    const contracts = [
      makeContract({ commodityCode: 'Corn', freightTier: 'D', basis: -0.20 }),
    ];
    const enriched = resolveContractFreight(contracts, {},
      [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }],
    );
    const result = calcMarginByTier(enriched);
    expect(result).toHaveLength(1);
    const corn = result[0];
    expect(corn.commodity).toBe('Corn');
    expect(corn.tiers).toHaveLength(1);
    const tier = corn.tiers[0];
    expect(tier.tier).toBe('D');
    expect(tier.grossMarginPerBu).toBeCloseTo(0.10); // -0.10 - (-0.20) = 0.10
    expect(tier.freightCostPerBu).toBeCloseTo(0.45);
    expect(tier.netMarginPerBu).toBeCloseTo(-0.35); // 0.10 - 0.45
    expect(tier.isProfitable).toBe(false);
  });

  it('returns null margins when no sell basis', () => {
    const contracts = [makeContract({ freightTier: 'B' })];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcMarginByTier(enriched);
    expect(result[0].tiers[0].grossMarginPerBu).toBeNull();
    expect(result[0].tiers[0].netMarginPerBu).toBeNull();
  });

  it('applies tier overrides for what-if scenarios', () => {
    const contracts = [makeContract({ contractNumber: 'C-001', freightTier: 'G' })];
    const enriched = resolveContractFreight(contracts, {},
      [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }],
    );
    const baseline = calcMarginByTier(enriched);
    const whatIf = calcMarginByTier(enriched, { 'C-001': 'B' });

    // Tier G costs $0.75, Tier B costs $0.25 — $0.50 difference
    const baselineNet = baseline[0].tiers[0].netMarginPerBu!;
    const whatIfNet = whatIf[0].tiers[0].netMarginPerBu!;
    expect(whatIfNet - baselineNet).toBeCloseTo(0.50);
  });

  it('sorts commodities by standard order', () => {
    const contracts = [
      makeContract({ commodityCode: 'Soybeans', contractNumber: 'C-002', freightTier: 'B' }),
      makeContract({ commodityCode: 'Corn', contractNumber: 'C-001', freightTier: 'B' }),
    ];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcMarginByTier(enriched);
    expect(result[0].commodity).toBe('Corn');
    expect(result[1].commodity).toBe('Soybeans');
  });
});

describe('calcTierImbalance', () => {
  it('separates purchase and sale volumes by tier', () => {
    const contracts = [
      makeContract({ contractType: 'Purchase', freightTier: 'D', balance: 10000 }),
      makeContract({ contractType: 'Sale', freightTier: 'D', balance: 5000, contractNumber: 'S-001' }),
      makeContract({ contractType: 'Purchase', freightTier: 'B', balance: 8000, contractNumber: 'C-002' }),
    ];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcTierImbalance(enriched);

    const tierB = result.tiers.find((t) => t.tier === 'B')!;
    expect(tierB.purchaseBushels).toBe(8000);
    expect(tierB.saleBushels).toBe(0);

    const tierD = result.tiers.find((t) => t.tier === 'D')!;
    expect(tierD.purchaseBushels).toBe(10000);
    expect(tierD.saleBushels).toBe(5000);
    expect(tierD.netFlow).toBe(5000);
  });

  it('computes weighted avg tier cost', () => {
    const contracts = [
      makeContract({ contractType: 'Purchase', freightTier: 'B', balance: 10000 }), // $0.25
      makeContract({ contractType: 'Purchase', freightTier: 'D', balance: 10000, contractNumber: 'C-002' }), // $0.45
    ];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcTierImbalance(enriched);
    expect(result.purchaseWeightedAvgTierCost).toBeCloseTo(0.35); // (0.25*10000 + 0.45*10000) / 20000
  });
});

describe('calcBlendedFreightCost', () => {
  it('computes volume-weighted average for purchases', () => {
    const contracts = [
      makeContract({ freightTier: 'B', balance: 10000 }), // $0.25
      makeContract({ freightTier: 'F', balance: 5000, contractNumber: 'C-002' }), // $0.65
    ];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcBlendedFreightCost(enriched);
    // (0.25*10000 + 0.65*5000) / 15000 = 5750 / 15000 = 0.3833
    expect(result).toBeCloseTo(0.3833, 3);
  });

  it('returns null for empty contracts', () => {
    expect(calcBlendedFreightCost([])).toBeNull();
  });

  it('returns 0 when all contracts are delivered (no tier)', () => {
    const contracts = [makeContract({ freightTier: null, balance: 10000 })];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcBlendedFreightCost(enriched);
    expect(result).toBe(0);
  });
});

describe('calcFreightMarginPercent', () => {
  it('calculates freight as percentage of gross margin', () => {
    const contracts = [makeContract({ freightTier: 'D', basis: -0.30 })]; // freight = $0.45
    const enriched = resolveContractFreight(contracts, {},
      [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }],
    );
    const result = calcFreightMarginPercent(enriched);
    expect(result.contracts).toHaveLength(1);
    // grossMargin = -0.10 - (-0.30) = 0.20
    // freightPercent = 0.45 / 0.20 * 100 = 225%
    expect(result.contracts[0].freightPercent).toBeCloseTo(225);
    expect(result.contracts[0].riskLevel).toBe('critical');
  });

  it('handles zero gross margin as critical', () => {
    const contracts = [makeContract({ freightTier: 'B', basis: -0.10 })];
    const enriched = resolveContractFreight(contracts, {},
      [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }],
    );
    const result = calcFreightMarginPercent(enriched);
    expect(result.contracts[0].freightPercent).toBeNull();
    expect(result.contracts[0].riskLevel).toBe('critical');
  });

  it('handles negative gross margin as critical', () => {
    const contracts = [makeContract({ freightTier: 'B', basis: -0.05 })]; // buying at -0.05
    const enriched = resolveContractFreight(contracts, {},
      [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }], // selling at -0.10
    );
    const result = calcFreightMarginPercent(enriched);
    // grossMargin = -0.10 - (-0.05) = -0.05 (negative)
    expect(result.contracts[0].freightPercent).toBeNull();
    expect(result.contracts[0].riskLevel).toBe('critical');
  });

  it('skips contracts without freight tier', () => {
    const contracts = [makeContract({ freightTier: null })];
    const enriched = resolveContractFreight(contracts, {}, []);
    const result = calcFreightMarginPercent(enriched);
    expect(result.contracts).toHaveLength(0);
  });

  it('groups by entity', () => {
    const contracts = [
      makeContract({ entity: 'Farm A', freightTier: 'D', basis: -0.30 }),
      makeContract({ entity: 'Farm A', freightTier: 'D', basis: -0.25, contractNumber: 'C-002' }),
      makeContract({ entity: 'Farm B', freightTier: 'B', basis: -0.30, contractNumber: 'C-003' }),
    ];
    const enriched = resolveContractFreight(contracts, {},
      [{ commodity: 'Corn', deliveryMonth: 'Mar 26', basis: -0.10, futuresRef: 'May 26 (K)' }],
    );
    const result = calcFreightMarginPercent(enriched);
    expect(result.byEntity).toHaveLength(2);
    const farmA = result.byEntity.find((e) => e.entity === 'Farm A')!;
    expect(farmA.contractCount).toBe(2);
  });

  it('returns empty for no contracts', () => {
    const result = calcFreightMarginPercent([]);
    expect(result.contracts).toEqual([]);
    expect(result.avgFreightPercent).toBeNull();
    expect(result.criticalCount).toBe(0);
  });
});
