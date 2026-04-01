/**
 * Freight tier system for FOB/Pickup contracts.
 *
 * Each contract is assigned a letter tier that maps to a fixed $/bu freight cost.
 * Tier A = no freight (delivered). B starts at $0.25, then increments by $0.10.
 *
 * Sources (in priority order):
 *   1. Freight Excel tab upload (overrides iRely)
 *   2. "Freight Tier" column in iRely export
 */

export const FREIGHT_TIERS: Record<string, number> = {
  A: 0,
  B: 0.25,
  C: 0.35,
  D: 0.45,
  E: 0.55,
  F: 0.65,
  G: 0.75,
  H: 0.85,
  I: 0.95,
  J: 1.05,
  K: 1.15,
  L: 1.25,
};

/** Look up freight cost for a tier letter. Returns 0 if tier is unknown or empty. */
export function getFreightCost(tier: string | null | undefined): number {
  if (!tier) return 0;
  return FREIGHT_TIERS[tier.toUpperCase().trim()] ?? 0;
}

/**
 * Returns the freight-adjusted (delivered-equivalent) basis for a contract.
 * FOB/Pickup contracts have a lower locked basis; adding freight cost back
 * normalizes to delivered-equivalent for apples-to-apples comparison.
 *
 * Tier resolution priority: Excel upload > iRely column > none.
 */
export function adjustBasisForFreight(
  basis: number | null,
  contractNumber: string,
  contractFreightTier: string | null | undefined,
  freightTiers: Record<string, string> | undefined,
): number | null {
  if (basis === null) return null;
  const tier = freightTiers?.[contractNumber] ?? contractFreightTier ?? null;
  const freightCost = getFreightCost(tier);
  return freightCost > 0 ? basis + freightCost : basis;
}

/** Validate a tier letter. Returns the normalized uppercase letter or null. */
export function normalizeFreightTier(tier: string | null | undefined): string | null {
  if (!tier) return null;
  const normalized = tier.toUpperCase().trim();
  return normalized in FREIGHT_TIERS ? normalized : null;
}
