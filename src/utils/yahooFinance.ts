/**
 * Yahoo Finance futures settlement price fetching.
 *
 * Maps commodity names from iRely (e.g., "Corn") to CBOT futures symbols
 * (e.g., "ZCK26.CBT") and fetches end-of-day prices via a CORS proxy.
 */

import type { ScaffoldSettlementRow } from '../hooks/useDailyInputScaffold';

/** Map iRely commodity names → CBOT futures root symbols */
export const COMMODITY_YAHOO_SYMBOLS: Record<string, string> = {
  'Corn': 'ZC',
  'Soybeans': 'ZS',
  'Wheat': 'ZW',
  'Oats': 'ZO',
  'Soybean Meal': 'ZM',
};

/** Commodities with no CBOT-traded futures */
export const NON_CBOT_COMMODITIES = ['Barley', 'Milo', 'Cottonseed', 'Commodity Other'];

/**
 * Build a Yahoo Finance symbol from scaffold row data.
 *
 * @example buildYahooSymbol("Corn", "K", "May 26") → "ZCK26.CBT"
 * @example buildYahooSymbol("Barley", "N", "Jul 26") → null (not on CBOT)
 */
export function buildYahooSymbol(
  commodity: string,
  monthCode: string,
  contractMonth: string,
): string | null {
  const root = COMMODITY_YAHOO_SYMBOLS[commodity];
  if (!root || !monthCode) return null;

  // Extract 2-digit year from "May 26", "Dec 27", etc.
  const yearMatch = contractMonth.match(/(\d{2})$/);
  if (!yearMatch) return null;

  return `${root}${monthCode}${yearMatch[1]}.CBT`;
}

export interface FetchSettlementsResult {
  /** Successfully fetched prices, keyed by "Commodity|ContractMonth" */
  settlements: Record<string, number>;
  /** Number of symbols successfully fetched */
  fetched: number;
  /** Total number of settlement rows attempted */
  total: number;
  /** Commodity names skipped because they're not on CBOT */
  skipped: string[];
  /** Symbols that failed to fetch (timeout, API error, etc.) */
  failed: string[];
}

/**
 * Fetch settlement prices for all scaffolded settlement rows via the CORS proxy.
 *
 * Prices populate the form for review — they are NOT saved automatically.
 */
export async function fetchSettlementPrices(
  proxyUrl: string,
  rows: ScaffoldSettlementRow[],
): Promise<FetchSettlementsResult> {
  const settlements: Record<string, number> = {};
  const skippedSet = new Set<string>();
  const failed: string[] = [];

  // Build symbol map: Yahoo symbol → list of row keys that need this price
  const symbolToKeys = new Map<string, { symbol: string; keys: string[] }>();

  for (const row of rows) {
    const symbol = buildYahooSymbol(row.commodity, row.monthCode, row.contractMonth);
    const key = `${row.commodity}|${row.contractMonth}`;

    if (!symbol) {
      skippedSet.add(row.commodity);
      continue;
    }

    if (!symbolToKeys.has(symbol)) {
      symbolToKeys.set(symbol, { symbol, keys: [] });
    }
    symbolToKeys.get(symbol)!.keys.push(key);
  }

  const total = symbolToKeys.size;
  const baseUrl = proxyUrl.replace(/\/+$/, ''); // strip trailing slash

  // Fetch all symbols in parallel
  const entries = [...symbolToKeys.values()];
  const results = await Promise.allSettled(
    entries.map(async ({ symbol, keys }) => {
      const url = `${baseUrl}?symbol=${encodeURIComponent(symbol)}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${symbol}`);
      }

      const json = await resp.json();
      const price = parseYahooChartPrice(json);

      if (price === null) {
        throw new Error(`No price data in response for ${symbol}`);
      }

      // Map price back to all row keys that share this symbol
      for (const key of keys) {
        settlements[key] = price;
      }
    }),
  );

  // Collect failures
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      failed.push(entries[i].symbol);
    }
  }

  return {
    settlements,
    fetched: total - failed.length,
    total,
    skipped: [...skippedSet],
    failed,
  };
}

/**
 * Extract the settlement/close price from a Yahoo Finance chart API response.
 *
 * Response shape: { chart: { result: [{ meta: { regularMarketPrice: 4.52 } }] } }
 */
function parseYahooChartPrice(json: unknown): number | null {
  try {
    const data = json as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
          };
        }>;
      };
    };

    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price === 'number' && price > 0) return price;
    return null;
  } catch {
    return null;
  }
}
