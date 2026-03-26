/**
 * Resolves M2M for a single contract given current market data.
 * Pure function — no store dependencies.
 */

import { getDeliveryMonth } from './futureMonth';
import { getFreightCost } from './freightTiers';
import {
  calcPricedPurchaseM2M,
  calcPricedSaleM2M,
  calcBasisM2M,
  calcHTAM2M,
  calcCashM2M,
  unmarkableResult,
  type M2MResult,
} from './m2mCalc';
import type { Contract } from '../types/contracts';

export interface ContractM2M {
  contract: Contract;
  deliveryMonth: string;
  m2m: M2MResult;
  currentFutures: number | null;
  currentSellBasis: number | null;
  currentMarketValue: number | null;
}

export interface MarketLookups {
  settlementMap: Map<string, number>;
  basisMap: Map<string, number>;
  freightTiers: Record<string, string>;
}

export function resolveContractM2M(
  c: Contract,
  lookups: MarketLookups,
): ContractM2M {
  const deliveryMonth = getDeliveryMonth(c.endDate) ?? 'Unknown';
  const currentFutures = lookups.settlementMap.get(`${c.commodityCode}|${c.futureMonthShort}`) ?? null;
  const rawSellBasis = lookups.basisMap.get(`${c.commodityCode}|${deliveryMonth}`) ?? null;

  // Freight adjustment: look up tier from Excel upload > iRely column > none
  const tier = lookups.freightTiers?.[c.contractNumber] ?? c.freightTier ?? null;
  const freightCost = getFreightCost(tier);
  const currentSellBasis = rawSellBasis !== null && freightCost > 0
    ? rawSellBasis - freightCost
    : rawSellBasis;

  const currentMarketValue =
    currentFutures !== null && currentSellBasis !== null
      ? currentFutures + currentSellBasis
      : null;

  let m2m: M2MResult;

  switch (c.pricingType) {
    case 'Priced': {
      if (c.futures === null || c.basis === null || c.cashPrice === null) {
        m2m = unmarkableResult('Missing contract price data');
        break;
      }
      if (currentFutures === null) {
        m2m = unmarkableResult(`No settlement for ${c.futureMonthShort}`);
        break;
      }
      if (currentSellBasis === null) {
        m2m = unmarkableResult(`No sell basis for ${deliveryMonth}`);
        break;
      }
      m2m =
        c.contractType === 'Purchase'
          ? calcPricedPurchaseM2M(c.futures, c.basis, c.cashPrice, c.balance, currentFutures, currentSellBasis)
          : calcPricedSaleM2M(c.futures, c.basis, c.cashPrice, c.balance, currentFutures, currentSellBasis);
      break;
    }
    case 'Basis': {
      if (c.basis === null) {
        m2m = unmarkableResult('No locked basis on contract');
        break;
      }
      if (currentSellBasis === null) {
        m2m = unmarkableResult(`No sell basis for ${deliveryMonth}`);
        break;
      }
      m2m = calcBasisM2M(c.basis, c.contractType, c.pricedQty, currentSellBasis);
      break;
    }
    case 'HTA': {
      if (c.futures === null) {
        m2m = unmarkableResult('No locked futures on HTA contract');
        break;
      }
      if (currentFutures === null) {
        m2m = unmarkableResult(`No settlement for ${c.futureMonthShort}`);
        break;
      }
      m2m = calcHTAM2M(c.futures, c.contractType, c.balance, currentFutures);
      break;
    }
    case 'Cash': {
      if (c.cashPrice === null) {
        m2m = unmarkableResult('No cash price on contract');
        break;
      }
      if (currentFutures === null || currentSellBasis === null) {
        m2m = unmarkableResult('Missing market data for cash contract');
        break;
      }
      m2m = calcCashM2M(c.cashPrice, c.contractType, c.balance, currentFutures, currentSellBasis);
      break;
    }
    default:
      m2m = unmarkableResult(`Unknown pricing type: ${c.pricingType}`);
  }

  return { contract: c, deliveryMonth, m2m, currentFutures, currentSellBasis, currentMarketValue };
}
