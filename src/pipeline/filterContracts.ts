import type { RawContract } from '../types/contracts';

const ORGANIC_BASIS_THRESHOLD = 3.0;

/** Commodities that have organic specialty variants trading at 3x+ conventional basis. */
const ORGANIC_COMMODITIES = new Set(['Corn', 'Soybeans', 'Wheat']);

export function isOpenStatus(status: string): boolean {
  return status === 'Open' || status === 'Re-Open';
}

export function isCompletedStatus(status: string): boolean {
  return status === 'Complete' || status === 'Short Close';
}

export function isCancelled(contract: RawContract): boolean {
  return contract.contractStatus === 'Cancelled';
}

/**
 * Organic filter: basis >= $3.00 for Corn, Soybeans, and Wheat only.
 * Other commodities (Milo, Barley, Oats, etc.) are exempt because they
 * legitimately trade at high basis values without being organic.
 */
export function isOrganic(contract: RawContract): boolean {
  if (!ORGANIC_COMMODITIES.has(contract.commodityCode)) return false;
  return contract.basis !== null && contract.basis >= ORGANIC_BASIS_THRESHOLD;
}

export interface FilterResult {
  filtered: RawContract[];
  cancelledCount: number;
  organicCount: number;
}

export function filterContracts(contracts: RawContract[]): FilterResult {
  let cancelledCount = 0;
  let organicCount = 0;
  const filtered: RawContract[] = [];

  for (const c of contracts) {
    if (isCancelled(c)) {
      cancelledCount++;
      continue;
    }
    if (isOrganic(c)) {
      organicCount++;
      continue;
    }
    filtered.push(c);
  }

  return { filtered, cancelledCount, organicCount };
}

/**
 * Normalize freight terms: "Deliver" and "Dlvd" are treated as equivalent.
 */
export function normalizeFreightTerm(term: string | null): string {
  if (!term) return 'Unknown';
  const t = term.trim();
  if (t === 'Deliver' || t === 'Dlvd') return 'Delivered';
  return t;
}
