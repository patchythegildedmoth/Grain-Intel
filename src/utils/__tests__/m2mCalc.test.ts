import { describe, it, expect } from 'vitest';
import {
  calcPricedPurchaseM2M,
  calcPricedSaleM2M,
  calcBasisM2M,
  calcHTAM2M,
  calcCashM2M,
  unmarkableResult,
} from '../m2mCalc';

describe('calcPricedPurchaseM2M', () => {
  // Corn purchase: bought at $4.50 futures + $0.30 basis = $4.80 cash
  // Market now: $4.70 futures + $0.25 sell basis = $4.95
  // P&L: ($4.95 - $4.80) × 10,000 = +$1,500
  it('positive P&L when market above cost', () => {
    const r = calcPricedPurchaseM2M(4.50, 0.30, 4.80, 10_000, 4.70, 0.25);
    expect(r.isMarkable).toBe(true);
    expect(r.totalPnl).toBeCloseTo(1_500, 2);
    expect(r.futuresPnl).toBeCloseTo(2_000, 2);  // (4.70 - 4.50) × 10K
    expect(r.basisPnl).toBeCloseTo(-500, 2);      // (0.25 - 0.30) × 10K
    expect(r.perBushelPnl).toBeCloseTo(0.15, 4);
    expect(r.currentMarketValue).toBeCloseTo(4.95, 4);
  });

  // Market dropped: $4.30 futures + $0.20 sell basis = $4.50
  // P&L: ($4.50 - $4.80) × 10,000 = -$3,000
  it('negative P&L when market below cost', () => {
    const r = calcPricedPurchaseM2M(4.50, 0.30, 4.80, 10_000, 4.30, 0.20);
    expect(r.totalPnl).toBeCloseTo(-3_000, 2);
    expect(r.futuresPnl).toBeCloseTo(-2_000, 2);  // (4.30 - 4.50) × 10K
    expect(r.basisPnl).toBeCloseTo(-1_000, 2);    // (0.20 - 0.30) × 10K
  });

  it('zero balance returns zero P&L', () => {
    const r = calcPricedPurchaseM2M(4.50, 0.30, 4.80, 0, 4.70, 0.25);
    expect(r.totalPnl).toBeCloseTo(0, 10);
    expect(r.futuresPnl).toBeCloseTo(0, 10);
    expect(r.basisPnl).toBeCloseTo(0, 10);
  });

  it('futures + basis P&L sum to total P&L', () => {
    const r = calcPricedPurchaseM2M(4.65, 1.35, 6.00, 50_000, 4.605, 0.50);
    expect(r.futuresPnl! + r.basisPnl!).toBeCloseTo(r.totalPnl, 2);
  });
});

describe('calcPricedSaleM2M', () => {
  // Corn sale: sold at $4.80 futures + $0.40 basis = $5.20 cash
  // Market now: $4.70 futures + $0.25 sell basis = $4.95
  // Sold ABOVE market → P&L positive: ($5.20 - $4.95) × 5,000 = +$1,250
  it('positive P&L when locked price above market (sale profits)', () => {
    const r = calcPricedSaleM2M(4.80, 0.40, 5.20, 5_000, 4.70, 0.25);
    expect(r.isMarkable).toBe(true);
    expect(r.totalPnl).toBeCloseTo(1_250, 2);
    expect(r.futuresPnl).toBeCloseTo(500, 2);   // (4.80 - 4.70) × 5K — sold at higher futures
    expect(r.basisPnl).toBeCloseTo(750, 2);     // (0.40 - 0.25) × 5K — sold at higher basis
    expect(r.perBushelPnl).toBeCloseTo(0.25, 4);
  });

  // Market rallied above sale price → loss
  // Market: $5.10 futures + $0.50 sell basis = $5.60
  // P&L: ($5.20 - $5.60) × 5,000 = -$2,000
  it('negative P&L when market above locked sale price', () => {
    const r = calcPricedSaleM2M(4.80, 0.40, 5.20, 5_000, 5.10, 0.50);
    expect(r.totalPnl).toBeCloseTo(-2_000, 2);
    expect(r.futuresPnl).toBeCloseTo(-1_500, 2); // (4.80 - 5.10) × 5K
    expect(r.basisPnl).toBeCloseTo(-500, 2);     // (0.40 - 0.50) × 5K
  });

  it('sale direction is reversed from purchase', () => {
    const purchase = calcPricedPurchaseM2M(4.50, 0.30, 4.80, 10_000, 4.70, 0.25);
    const sale = calcPricedSaleM2M(4.50, 0.30, 4.80, 10_000, 4.70, 0.25);
    // Same contract terms, same market — P&L should be exactly opposite
    expect(purchase.totalPnl).toBeCloseTo(-sale.totalPnl, 2);
    expect(purchase.futuresPnl!).toBeCloseTo(-sale.futuresPnl!, 2);
    expect(purchase.basisPnl!).toBeCloseTo(-sale.basisPnl!, 2);
  });

  it('futures + basis P&L sum to total P&L for sales', () => {
    const r = calcPricedSaleM2M(4.80, 0.40, 5.20, 25_000, 4.70, 0.35);
    expect(r.futuresPnl! + r.basisPnl!).toBeCloseTo(r.totalPnl, 2);
  });
});

describe('calcBasisM2M', () => {
  // Basis Purchase: locked buy basis at -$0.20, market sell basis now +$0.10
  // P&L: (0.10 - (-0.20)) × 8,000 = $0.30 × 8,000 = +$2,400
  it('purchase: positive P&L when sell basis above contract basis', () => {
    const r = calcBasisM2M(-0.20, 'Purchase', 8_000, 0.10);
    expect(r.isMarkable).toBe(true);
    expect(r.totalPnl).toBeCloseTo(2_400, 2);
    expect(r.basisPnl).toBeCloseTo(2_400, 2);
    expect(r.futuresPnl).toBeNull(); // futures unpriced
  });

  // Basis Sale: locked sell basis at +$0.50, market sell basis now +$0.30
  // P&L: (0.50 - 0.30) × 5,000 = +$1,000 — sold at higher basis, good for sale
  it('sale: positive P&L when locked basis above current market', () => {
    const r = calcBasisM2M(0.50, 'Sale', 5_000, 0.30);
    expect(r.totalPnl).toBeCloseTo(1_000, 2);
  });

  // Sale with basis risen → loss
  it('sale: negative P&L when market basis above locked sell basis', () => {
    const r = calcBasisM2M(0.30, 'Sale', 5_000, 0.50);
    expect(r.totalPnl).toBeCloseTo(-1_000, 2);
  });

  it('uses pricedQty, not balance', () => {
    // If pricedQty is different from what balance would be, ensure pricedQty is used
    const r = calcBasisM2M(-0.10, 'Purchase', 3_000, 0.10);
    expect(r.totalPnl).toBeCloseTo(600, 2); // (0.10 - (-0.10)) × 3,000
    expect(r.perBushelPnl).toBeCloseTo(0.20, 4);
  });

  it('zero pricedQty returns zero P&L and zero perBushel', () => {
    const r = calcBasisM2M(-0.10, 'Purchase', 0, 0.10);
    expect(r.totalPnl).toBe(0);
    expect(r.perBushelPnl).toBe(0);
  });
});

describe('calcHTAM2M', () => {
  // HTA Purchase: locked futures at $4.50, current settlement $4.70
  // P&L: (4.70 - 4.50) × 10,000 = +$2,000 — market went up, purchase gains
  it('purchase: positive P&L when current futures above locked', () => {
    const r = calcHTAM2M(4.50, 'Purchase', 10_000, 4.70);
    expect(r.isMarkable).toBe(true);
    expect(r.totalPnl).toBeCloseTo(2_000, 2);
    expect(r.futuresPnl).toBeCloseTo(2_000, 2);
    expect(r.basisPnl).toBeNull(); // basis unpriced
  });

  // HTA Sale: locked futures at $4.50, current $4.70
  // P&L: (4.50 - 4.70) × 10,000 = -$2,000 — market went up, sale loses
  it('sale: negative P&L when current futures above locked', () => {
    const r = calcHTAM2M(4.50, 'Sale', 10_000, 4.70);
    expect(r.totalPnl).toBeCloseTo(-2_000, 2);
  });

  it('purchase and sale are opposite for same terms', () => {
    const purchase = calcHTAM2M(11.50, 'Purchase', 5_000, 11.80);
    const sale = calcHTAM2M(11.50, 'Sale', 5_000, 11.80);
    expect(purchase.totalPnl).toBeCloseTo(-sale.totalPnl, 2);
  });

  it('zero balance returns zero', () => {
    const r = calcHTAM2M(4.50, 'Purchase', 0, 4.70);
    expect(r.totalPnl).toBe(0);
  });
});

describe('calcCashM2M', () => {
  // Cash Purchase: paid $5.00, market now $5.30
  // P&L: ($5.30 - $5.00) × 10,000 = +$3,000
  it('purchase: positive when market above cash price', () => {
    const r = calcCashM2M(5.00, 'Purchase', 10_000, 4.70, 0.60);
    expect(r.isMarkable).toBe(true);
    expect(r.currentMarketValue).toBeCloseTo(5.30, 4);
    expect(r.totalPnl).toBeCloseTo(3_000, 2);
    expect(r.futuresPnl).toBeNull(); // no decomposition for cash
    expect(r.basisPnl).toBeNull();
  });

  // Cash Sale: sold at $5.00, market now $5.30
  // P&L: ($5.00 - $5.30) × 10,000 = -$3,000
  it('sale: negative when market above cash price', () => {
    const r = calcCashM2M(5.00, 'Sale', 10_000, 4.70, 0.60);
    expect(r.totalPnl).toBeCloseTo(-3_000, 2);
  });

  it('purchase and sale are opposite for same terms', () => {
    const purchase = calcCashM2M(5.00, 'Purchase', 10_000, 4.70, 0.30);
    const sale = calcCashM2M(5.00, 'Sale', 10_000, 4.70, 0.30);
    expect(purchase.totalPnl).toBeCloseTo(-sale.totalPnl, 2);
  });
});

describe('unmarkableResult', () => {
  it('returns isMarkable false with zero P&L', () => {
    const r = unmarkableResult('No settlement for May 26');
    expect(r.isMarkable).toBe(false);
    expect(r.totalPnl).toBe(0);
    expect(r.futuresPnl).toBeNull();
    expect(r.basisPnl).toBeNull();
    expect(r.perBushelPnl).toBe(0);
    expect(r.currentMarketValue).toBeNull();
    expect(r.missingReason).toBe('No settlement for May 26');
  });
});
