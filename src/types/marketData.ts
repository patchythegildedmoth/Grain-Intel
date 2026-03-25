/** Daily manual market data inputs — entered by traders after market close */

export interface MarketBasisEntry {
  commodity: string;
  deliveryMonth: string; // e.g., "Mar 26"
  basis: number; // current delivered sell basis (per bushel)
  futuresRef: string; // e.g., "May 26 (K)"
}

export interface FuturesSettlement {
  commodity: string;
  contractMonth: string; // e.g., "May 26 (K)"
  monthCode: string; // e.g., "K"
  price: number; // settlement price
}

export interface DailyMarketInputs {
  sellBasis: MarketBasisEntry[];
  settlements: FuturesSettlement[];
  inTransit: Record<string, number>; // keyed by commodity
  htaPaired: Record<string, number>; // keyed by commodity
  freightTiers: Record<string, string>; // keyed by contractNumber, tier letter (A-L)
}

export interface M2MSnapshot {
  totalPnl: number;
  openPnl: number;
  dailyCarryCost: number;
  timestamp: string;
  avgFreightCostPerBu?: number;
  totalFreightAdjustedBushels?: number;
}

export interface MarketDataState {
  current: DailyMarketInputs;
  history: Record<string, DailyMarketInputs>; // keyed by "2026-03-20"
  m2mSnapshots: Record<string, M2MSnapshot>; // keyed by date
  lastUpdated: string | null; // ISO timestamp
}

export const EMPTY_MARKET_INPUTS: DailyMarketInputs = {
  sellBasis: [],
  settlements: [],
  inTransit: {},
  htaPaired: {},
  freightTiers: {},
};

/** CBOT futures month codes */
export const CBOT_MONTH_CODES: Record<string, string> = {
  F: 'Jan',
  G: 'Feb',
  H: 'Mar',
  J: 'Apr',
  K: 'May',
  M: 'Jun',
  N: 'Jul',
  Q: 'Aug',
  U: 'Sep',
  V: 'Oct',
  X: 'Nov',
  Z: 'Dec',
};

/** Reverse lookup: month name → CBOT code */
export const MONTH_TO_CBOT: Record<string, string> = Object.fromEntries(
  Object.entries(CBOT_MONTH_CODES).map(([code, month]) => [month, code]),
);
