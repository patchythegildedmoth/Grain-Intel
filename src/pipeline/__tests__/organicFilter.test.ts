import { describe, it, expect } from 'vitest';
import { isOrganic } from '../filterContracts';
import type { RawContract } from '../../types/contracts';

function makeContract(overrides: Partial<RawContract>): RawContract {
  return {
    commodityCode: 'Corn',
    contractType: 'Purchase',
    contractStatus: 'Open',
    entity: 'Test Entity',
    contractNumber: '1000',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    futureMonth: '2025-03 (Mar 25)',
    balance: 5000,
    pricingType: 'Priced',
    pricedQty: 5000,
    unpricedQty: 0,
    futures: 4.50,
    basis: 1.20,
    cashPrice: 5.70,
    createdDate: new Date('2025-01-01'),
    freightTerm: 'Dlvd',
    freightTier: null,
    salesperson: 'Test',
    ...overrides,
  };
}

describe('isOrganic (commodity-aware)', () => {
  it('filters Corn with basis >= $3.00 as organic', () => {
    const c = makeContract({ commodityCode: 'Corn', basis: 5.00 });
    expect(isOrganic(c)).toBe(true);
  });

  it('filters Soybeans with basis >= $3.00 as organic', () => {
    const c = makeContract({ commodityCode: 'Soybeans', basis: 12.80 });
    expect(isOrganic(c)).toBe(true);
  });

  it('filters Wheat with basis >= $3.00 as organic', () => {
    const c = makeContract({ commodityCode: 'Wheat', basis: 8.73 });
    expect(isOrganic(c)).toBe(true);
  });

  it('does NOT filter Milo with basis >= $3.00 (commodity exempt)', () => {
    const c = makeContract({ commodityCode: 'Milo', basis: 6.40 });
    expect(isOrganic(c)).toBe(false);
  });

  it('does NOT filter Barley with basis >= $3.00 (commodity exempt)', () => {
    const c = makeContract({ commodityCode: 'Barley', basis: 4.50 });
    expect(isOrganic(c)).toBe(false);
  });

  it('does NOT filter Corn with basis under $3.00', () => {
    const c = makeContract({ commodityCode: 'Corn', basis: 2.50 });
    expect(isOrganic(c)).toBe(false);
  });

  it('does NOT filter when basis is null', () => {
    const c = makeContract({ commodityCode: 'Corn', basis: null });
    expect(isOrganic(c)).toBe(false);
  });
});
