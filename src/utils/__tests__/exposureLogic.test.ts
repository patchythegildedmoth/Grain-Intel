import { describe, it, expect } from 'vitest';

/**
 * Tests for the unpriced exposure classification rules.
 * These rules are embedded in useUnpricedExposure.ts but are tested here
 * as pure logic to validate the business rules independently.
 */

// Replicate the exposure classification logic from useUnpricedExposure
function classifyExposure(contract: {
  pricingType: string;
  contractType: 'Purchase' | 'Sale';
  balance: number;
  unpricedQty: number;
}): { isExposed: boolean; reason: string; exposureBushels: number; signedExposure: number } {
  let isExposed = false;
  let reason = '';
  let exposureBushels = 0;

  if (contract.unpricedQty > 0) {
    isExposed = true;
    reason = 'Futures Unpriced';
    exposureBushels = contract.unpricedQty;
  } else if (contract.pricingType === 'HTA' && contract.balance > 0) {
    isExposed = true;
    reason = 'Basis Unpriced';
    exposureBushels = contract.balance;
  }

  const sign = contract.contractType === 'Purchase' ? 1 : -1;
  const signedExposure = exposureBushels * sign;

  return { isExposed, reason, exposureBushels, signedExposure };
}

describe('unpriced exposure classification', () => {
  it('unpricedQty > 0 → Futures Unpriced', () => {
    const r = classifyExposure({
      pricingType: 'Basis',
      contractType: 'Purchase',
      balance: 10_000,
      unpricedQty: 8_000,
    });
    expect(r.isExposed).toBe(true);
    expect(r.reason).toBe('Futures Unpriced');
    expect(r.exposureBushels).toBe(8_000);
  });

  it('HTA with balance > 0 → Basis Unpriced', () => {
    const r = classifyExposure({
      pricingType: 'HTA',
      contractType: 'Sale',
      balance: 5_000,
      unpricedQty: 0,
    });
    expect(r.isExposed).toBe(true);
    expect(r.reason).toBe('Basis Unpriced');
    expect(r.exposureBushels).toBe(5_000);
  });

  it('fully priced contract is NOT exposed', () => {
    const r = classifyExposure({
      pricingType: 'Priced',
      contractType: 'Purchase',
      balance: 10_000,
      unpricedQty: 0,
    });
    expect(r.isExposed).toBe(false);
    expect(r.exposureBushels).toBe(0);
  });

  it('cash contract is NOT exposed', () => {
    const r = classifyExposure({
      pricingType: 'Cash',
      contractType: 'Sale',
      balance: 3_000,
      unpricedQty: 0,
    });
    expect(r.isExposed).toBe(false);
  });

  it('HTA with zero balance is NOT exposed', () => {
    const r = classifyExposure({
      pricingType: 'HTA',
      contractType: 'Purchase',
      balance: 0,
      unpricedQty: 0,
    });
    expect(r.isExposed).toBe(false);
  });
});

describe('signed exposure (directional)', () => {
  it('purchase = positive signed exposure', () => {
    const r = classifyExposure({
      pricingType: 'Basis',
      contractType: 'Purchase',
      balance: 10_000,
      unpricedQty: 10_000,
    });
    expect(r.signedExposure).toBe(10_000);
  });

  it('sale = negative signed exposure', () => {
    const r = classifyExposure({
      pricingType: 'Basis',
      contractType: 'Sale',
      balance: 10_000,
      unpricedQty: 10_000,
    });
    expect(r.signedExposure).toBe(-10_000);
  });

  it('net exposure = purchase - sale', () => {
    const purchase = classifyExposure({
      pricingType: 'Basis', contractType: 'Purchase', balance: 100_000, unpricedQty: 100_000,
    });
    const sale = classifyExposure({
      pricingType: 'Basis', contractType: 'Sale', balance: 80_000, unpricedQty: 80_000,
    });
    const net = purchase.signedExposure + sale.signedExposure;
    expect(net).toBe(20_000); // net long 20K
  });

  it('net short when sales exceed purchases', () => {
    const purchase = classifyExposure({
      pricingType: 'HTA', contractType: 'Purchase', balance: 30_000, unpricedQty: 0,
    });
    const sale = classifyExposure({
      pricingType: 'HTA', contractType: 'Sale', balance: 50_000, unpricedQty: 0,
    });
    const net = purchase.signedExposure + sale.signedExposure;
    expect(net).toBe(-20_000); // net short 20K
  });

  it('non-exposed contracts contribute zero to net', () => {
    const priced = classifyExposure({
      pricingType: 'Priced', contractType: 'Purchase', balance: 500_000, unpricedQty: 0,
    });
    expect(priced.signedExposure).toBe(0);
  });
});
