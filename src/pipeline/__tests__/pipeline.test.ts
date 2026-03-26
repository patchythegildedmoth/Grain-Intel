import { describe, it, expect } from 'vitest';
import type { RawContract } from '../../types/contracts';
import { filterContracts, isOpenStatus, isCompletedStatus, isOrganic, normalizeFreightTerm } from '../filterContracts';
import { validateData } from '../validateData';
import { transformContracts } from '../transformContracts';

/** Build a minimal mock contract — only required fields */
function mockContract(overrides: Partial<RawContract> = {}): RawContract {
  return {
    commodityCode: 'Corn',
    contractType: 'Purchase',
    contractStatus: 'Open',
    entity: 'Test Farm',
    contractNumber: 'CN-001',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    futureMonth: '2026-05 (May 26)',
    balance: 10_000,
    pricingType: 'Priced',
    pricedQty: 10_000,
    unpricedQty: 0,
    futures: 4.50,
    basis: 0.30,
    cashPrice: 4.80,
    createdDate: new Date('2025-12-01'),
    freightTerm: 'Delivered',
    freightTier: null,
    salesperson: 'Dowd',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// filterContracts
// ---------------------------------------------------------------------------

describe('filterContracts', () => {
  it('removes cancelled contracts', () => {
    const contracts = [
      mockContract({ contractStatus: 'Open' }),
      mockContract({ contractStatus: 'Cancelled', contractNumber: 'CN-002' }),
      mockContract({ contractStatus: 'Re-Open', contractNumber: 'CN-003' }),
    ];
    const result = filterContracts(contracts);
    expect(result.filtered).toHaveLength(2);
    expect(result.cancelledCount).toBe(1);
  });

  it('removes organic contracts (basis >= 3.0)', () => {
    const contracts = [
      mockContract({ basis: 2.99 }),  // just below threshold — keep
      mockContract({ basis: 3.0, contractNumber: 'CN-002' }),   // exactly at threshold — organic
      mockContract({ basis: 5.0, contractNumber: 'CN-003' }),   // well above — organic
      mockContract({ basis: null, contractNumber: 'CN-004' }),  // null basis — keep (unpriced)
    ];
    const result = filterContracts(contracts);
    expect(result.filtered).toHaveLength(2);
    expect(result.organicCount).toBe(2);
    // Verify the null-basis contract is kept
    expect(result.filtered.some(c => c.contractNumber === 'CN-004')).toBe(true);
  });

  it('boundary: basis at exactly 3.0 is organic', () => {
    expect(isOrganic(mockContract({ basis: 3.0 }))).toBe(true);
    expect(isOrganic(mockContract({ basis: 2.9999 }))).toBe(false);
  });

  it('counts both cancelled and organic separately', () => {
    const contracts = [
      mockContract({ contractStatus: 'Cancelled' }),
      mockContract({ basis: 5.0, contractNumber: 'CN-002' }),
      mockContract({ contractNumber: 'CN-003' }),
    ];
    const result = filterContracts(contracts);
    expect(result.cancelledCount).toBe(1);
    expect(result.organicCount).toBe(1);
    expect(result.filtered).toHaveLength(1);
  });
});

describe('isOpenStatus / isCompletedStatus', () => {
  it('Open and Re-Open are open statuses', () => {
    expect(isOpenStatus('Open')).toBe(true);
    expect(isOpenStatus('Re-Open')).toBe(true);
    expect(isOpenStatus('Complete')).toBe(false);
    expect(isOpenStatus('Short Close')).toBe(false);
    expect(isOpenStatus('Cancelled')).toBe(false);
  });

  it('Complete and Short Close are completed statuses', () => {
    expect(isCompletedStatus('Complete')).toBe(true);
    expect(isCompletedStatus('Short Close')).toBe(true);
    expect(isCompletedStatus('Open')).toBe(false);
  });
});

describe('normalizeFreightTerm', () => {
  it('normalizes Deliver and Dlvd to Delivered', () => {
    expect(normalizeFreightTerm('Deliver')).toBe('Delivered');
    expect(normalizeFreightTerm('Dlvd')).toBe('Delivered');
  });
  it('passes through other terms', () => {
    expect(normalizeFreightTerm('FOB')).toBe('FOB');
    expect(normalizeFreightTerm('Picked Up')).toBe('Picked Up');
  });
  it('null returns Unknown', () => {
    expect(normalizeFreightTerm(null)).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// validateData
// ---------------------------------------------------------------------------

describe('validateData', () => {
  it('detects cash != futures + basis anomaly', () => {
    const contracts = [
      mockContract({ futures: 4.50, basis: 0.30, cashPrice: 5.00 }), // 4.50+0.30=4.80 ≠ 5.00
    ];
    const result = validateData(contracts, [], 0, 0);
    expect(result.anomalies).toHaveLength(1);
    expect(result.anomalies[0].field).toBe('Cash Price');
  });

  it('allows small rounding difference (within $0.01)', () => {
    const contracts = [
      mockContract({ futures: 4.50, basis: 0.30, cashPrice: 4.805 }), // diff = 0.005 < 0.01
    ];
    const result = validateData(contracts, [], 0, 0);
    expect(result.anomalies).toHaveLength(0);
  });

  it('detects negative balance', () => {
    const contracts = [mockContract({ balance: -500 })];
    const result = validateData(contracts, [], 0, 0);
    expect(result.anomalies.some(a => a.field === 'Balance')).toBe(true);
  });

  it('detects end date before start date', () => {
    const contracts = [
      mockContract({ startDate: new Date('2026-06-01'), endDate: new Date('2026-01-01') }),
    ];
    const result = validateData(contracts, [], 0, 0);
    expect(result.anomalies.some(a => a.field === 'Dates')).toBe(true);
  });

  it('counts null fields correctly', () => {
    const contracts = [
      mockContract({ futureMonth: null, futures: null, basis: null }),
      mockContract({ cashPrice: null, freightTerm: null, contractNumber: 'CN-002' }),
    ];
    const result = validateData(contracts, [], 0, 0);
    expect(result.nullCounts.futureMonth).toBe(1);
    expect(result.nullCounts.futures).toBe(1);
    expect(result.nullCounts.basis).toBe(1);
    expect(result.nullCounts.cashPrice).toBe(1);
    expect(result.nullCounts.freightTerm).toBe(1);
  });

  it('totalRows includes cancelled and organic counts', () => {
    const contracts = [mockContract()];
    const result = validateData(contracts, [], 5, 3);
    expect(result.totalRows).toBe(9); // 1 usable + 5 cancelled + 3 organic
    expect(result.usableCount).toBe(1);
  });

  it('counts open and completed correctly', () => {
    const contracts = [
      mockContract({ contractStatus: 'Open' }),
      mockContract({ contractStatus: 'Re-Open', contractNumber: 'CN-002' }),
      mockContract({ contractStatus: 'Complete', contractNumber: 'CN-003' }),
      mockContract({ contractStatus: 'Short Close', contractNumber: 'CN-004' }),
    ];
    const result = validateData(contracts, [], 0, 0);
    expect(result.openCount).toBe(2);
    expect(result.completedCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// transformContracts
// ---------------------------------------------------------------------------

describe('transformContracts', () => {
  it('sets isOpen for Open and Re-Open', () => {
    const contracts = [
      mockContract({ contractStatus: 'Open' }),
      mockContract({ contractStatus: 'Re-Open', contractNumber: 'CN-002' }),
      mockContract({ contractStatus: 'Complete', contractNumber: 'CN-003' }),
    ];
    const transformed = transformContracts(contracts);
    expect(transformed[0].isOpen).toBe(true);
    expect(transformed[1].isOpen).toBe(true);
    expect(transformed[2].isOpen).toBe(false);
  });

  it('sets isCompleted for Complete and Short Close', () => {
    const contracts = [
      mockContract({ contractStatus: 'Complete' }),
      mockContract({ contractStatus: 'Short Close', contractNumber: 'CN-002' }),
    ];
    const transformed = transformContracts(contracts);
    expect(transformed[0].isCompleted).toBe(true);
    expect(transformed[1].isCompleted).toBe(true);
  });

  it('parses futureMonthShort from futureMonth string', () => {
    const contracts = [mockContract({ futureMonth: '2026-05 (May 26)' })];
    const transformed = transformContracts(contracts);
    expect(transformed[0].futureMonthShort).toBe('May 26');
    expect(transformed[0].futureMonthSortKey).toBe('2026-05');
  });

  it('null futureMonth gets "Cash / No Futures"', () => {
    const contracts = [mockContract({ futureMonth: null })];
    const transformed = transformContracts(contracts);
    expect(transformed[0].futureMonthShort).toBe('Cash / No Futures');
    expect(transformed[0].futureMonthSortKey).toBe('zz-cash');
  });

  it('computes isOverdue for past end dates on open contracts', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const contracts = [mockContract({ contractStatus: 'Open', endDate: pastDate })];
    const transformed = transformContracts(contracts);
    expect(transformed[0].isOverdue).toBe(true);
    expect(transformed[0].isUrgent).toBe(false);
  });

  it('computes isUrgent for contracts within 14 days', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 7);
    const contracts = [mockContract({ contractStatus: 'Open', endDate: soonDate })];
    const transformed = transformContracts(contracts);
    expect(transformed[0].isUrgent).toBe(true);
    expect(transformed[0].isOverdue).toBe(false);
  });

  it('completed contracts are never overdue or urgent', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const contracts = [mockContract({ contractStatus: 'Complete', endDate: pastDate })];
    const transformed = transformContracts(contracts);
    expect(transformed[0].isOverdue).toBe(false);
    expect(transformed[0].isUrgent).toBe(false);
  });
});
