/**
 * Mark-to-Market P&L calculations by contract type.
 *
 * Every open contract is compared against current market value:
 *   Current Market Value = Current Futures Settlement + Current Market Sell Basis
 *
 * The P&L decomposition (futures vs basis) tells the trader where gains/losses
 * are coming from — futures risk can be hedged, basis risk generally cannot.
 */

export interface M2MResult {
  totalPnl: number;
  futuresPnl: number | null; // null = component unpriced
  basisPnl: number | null; // null = component unpriced
  perBushelPnl: number;
  currentMarketValue: number | null;
  isMarkable: boolean; // false if missing market data
  missingReason: string | null; // explanation if not markable
}

/**
 * Calculate M2M for a fully priced PURCHASE contract.
 * P&L = (Market Value - Contract Cash Price) × Balance
 */
export function calcPricedPurchaseM2M(
  contractFutures: number,
  contractBasis: number,
  contractCashPrice: number,
  balance: number,
  currentFutures: number,
  currentSellBasis: number,
): M2MResult {
  const currentMarketValue = currentFutures + currentSellBasis;
  const perBushelPnl = currentMarketValue - contractCashPrice;
  const futuresPnl = (currentFutures - contractFutures) * balance;
  const basisPnl = (currentSellBasis - contractBasis) * balance;
  const totalPnl = perBushelPnl * balance;

  return {
    totalPnl,
    futuresPnl,
    basisPnl,
    perBushelPnl,
    currentMarketValue,
    isMarkable: true,
    missingReason: null,
  };
}

/**
 * Calculate M2M for a fully priced SALE contract.
 * P&L = (Contract Cash Price - Market Value) × Balance  [REVERSED from purchase]
 * On a sale, you want locked price HIGHER than current market.
 */
export function calcPricedSaleM2M(
  contractFutures: number,
  contractBasis: number,
  contractCashPrice: number,
  balance: number,
  currentFutures: number,
  currentSellBasis: number,
): M2MResult {
  const currentMarketValue = currentFutures + currentSellBasis;
  const perBushelPnl = contractCashPrice - currentMarketValue;
  const futuresPnl = (contractFutures - currentFutures) * balance;
  const basisPnl = (contractBasis - currentSellBasis) * balance;
  const totalPnl = perBushelPnl * balance;

  return {
    totalPnl,
    futuresPnl,
    basisPnl,
    perBushelPnl,
    currentMarketValue,
    isMarkable: true,
    missingReason: null,
  };
}

/**
 * Calculate M2M for a BASIS contract (basis locked, futures unpriced).
 * Only basis P&L can be calculated. Use pricedQty for basis P&L, not balance.
 */
export function calcBasisM2M(
  contractBasis: number,
  contractType: 'Purchase' | 'Sale',
  pricedQty: number,
  currentSellBasis: number,
): M2MResult {
  const basisPnl =
    contractType === 'Purchase'
      ? (currentSellBasis - contractBasis) * pricedQty
      : (contractBasis - currentSellBasis) * pricedQty;

  return {
    totalPnl: basisPnl,
    futuresPnl: null, // unpriced
    basisPnl,
    perBushelPnl: pricedQty > 0 ? basisPnl / pricedQty : 0,
    currentMarketValue: null, // can't compute full market value
    isMarkable: true,
    missingReason: null,
  };
}

/**
 * Calculate M2M for an HTA contract (futures locked, basis unpriced).
 * Only futures P&L can be calculated.
 */
export function calcHTAM2M(
  contractFutures: number,
  contractType: 'Purchase' | 'Sale',
  balance: number,
  currentFutures: number,
): M2MResult {
  const futuresPnl =
    contractType === 'Purchase'
      ? (currentFutures - contractFutures) * balance
      : (contractFutures - currentFutures) * balance;

  return {
    totalPnl: futuresPnl,
    futuresPnl,
    basisPnl: null, // unpriced
    perBushelPnl: balance > 0 ? futuresPnl / balance : 0,
    currentMarketValue: null,
    isMarkable: true,
    missingReason: null,
  };
}

/**
 * Calculate M2M for a CASH contract (flat price, no futures/basis decomposition).
 */
export function calcCashM2M(
  cashPrice: number,
  contractType: 'Purchase' | 'Sale',
  balance: number,
  currentFutures: number,
  currentSellBasis: number,
): M2MResult {
  const currentMarketValue = currentFutures + currentSellBasis;
  const perBushelPnl =
    contractType === 'Purchase'
      ? currentMarketValue - cashPrice
      : cashPrice - currentMarketValue;
  const totalPnl = perBushelPnl * balance;

  return {
    totalPnl,
    futuresPnl: null, // no decomposition for cash
    basisPnl: null,
    perBushelPnl,
    currentMarketValue,
    isMarkable: true,
    missingReason: null,
  };
}

/**
 * Return an unmarked result for contracts missing market data.
 */
export function unmmarkableResult(reason: string): M2MResult {
  return {
    totalPnl: 0,
    futuresPnl: null,
    basisPnl: null,
    perBushelPnl: 0,
    currentMarketValue: null,
    isMarkable: false,
    missingReason: reason,
  };
}
