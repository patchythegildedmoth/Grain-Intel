/**
 * Yahoo Finance historical OHLCV fetcher.
 * Uses continuous contract symbols (ZC=F, ZS=F) via the existing CORS proxy.
 *
 * Gap-aware: tracks fetched date ranges in IndexedDB fetch-metadata store.
 */

import type { HistoricalPriceDay, FetchMetadata, HistoricalFetchProgress } from '../types/historicalWeather';
import { put, get, putBatch, STORES } from './indexedDb';
import { COMMODITY_YAHOO_SYMBOLS } from './yahooFinance';

/** Continuous front-month contract symbols for historical data */
export const CONTINUOUS_SYMBOLS: Record<string, string> = {
  Corn: 'ZC=F',
  Soybeans: 'ZS=F',
  Wheat: 'ZW=F',
  Oats: 'ZO=F',
  'Soybean Meal': 'ZM=F',
};

/** Commodities that trade in cents/bu on Yahoo (need /100 conversion) */
const CENTS_COMMODITIES = new Set(['Corn', 'Soybeans', 'Wheat', 'Oats']);

function toUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function fromUnix(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

interface YahooChartResponse {
  chart: {
    result?: [{
      timestamp: number[];
      indicators: {
        quote: [{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }];
      };
    }];
    error?: { code: string; description: string };
  };
}

async function fetchYahooHistorical(
  symbol: string,
  period1: number,
  period2: number,
  proxyUrl: string,
): Promise<YahooChartResponse> {
  const url = `${proxyUrl}?symbol=${encodeURIComponent(symbol)}&period1=${period1}&period2=${period2}&interval=1d`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) throw new Error(`Yahoo historical: ${resp.status}`);
  return resp.json();
}

function parsePriceResponse(
  data: YahooChartResponse,
  symbol: string,
  commodity: string,
): HistoricalPriceDay[] {
  const result = data.chart?.result?.[0];
  if (!result?.timestamp) return [];

  const { timestamp, indicators } = result;
  const quote = indicators.quote[0];
  const needsConversion = CENTS_COMMODITIES.has(commodity);
  const days: HistoricalPriceDay[] = [];

  for (let i = 0; i < timestamp.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    const v = quote.volume[i];
    if (o == null || h == null || l == null || c == null) continue;

    const divisor = needsConversion ? 100 : 1;
    const date = fromUnix(timestamp[i]);
    days.push({
      id: `${symbol}:${date}`,
      symbol,
      date,
      open: o / divisor,
      high: h / divisor,
      low: l / divisor,
      close: c / divisor,
      volume: v ?? 0,
    });
  }

  return days;
}

async function getFetchedRanges(symbol: string): Promise<{ start: string; end: string }[]> {
  const meta = await get<FetchMetadata>(STORES.fetchMetadata, `price:${symbol}`);
  return meta?.fetchedRanges ?? [];
}

async function saveFetchMeta(symbol: string, ranges: { start: string; end: string }[]): Promise<void> {
  await put(STORES.fetchMetadata, {
    key: `price:${symbol}`,
    type: 'price' as const,
    fetchedRanges: ranges,
    lastFetchedAt: new Date().toISOString(),
  });
}

export interface FetchHistoricalPricesOptions {
  commodities: string[];
  lookbackYears: number;
  proxyUrl: string;
  onProgress?: (p: HistoricalFetchProgress) => void;
  signal?: AbortSignal;
}

/**
 * Fetch historical OHLCV for commodities via continuous contract symbols.
 * Gap-aware: only fetches date ranges not already in IndexedDB.
 */
export async function fetchHistoricalPrices({
  commodities, lookbackYears, proxyUrl, onProgress, signal,
}: FetchHistoricalPricesOptions): Promise<number> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - lookbackYears);

  let totalFetched = 0;
  const total = commodities.length;

  for (let i = 0; i < commodities.length; i++) {
    if (signal?.aborted) break;

    const commodity = commodities[i];
    const symbol = CONTINUOUS_SYMBOLS[commodity];
    if (!symbol) {
      onProgress?.({ phase: 'prices', current: i + 1, total, message: `${commodity}: no futures symbol, skipped` });
      continue;
    }

    // Check what we already have
    const existingRanges = await getFetchedRanges(symbol);
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);
    const alreadyCovered = existingRanges.some((r) => r.start <= startStr && r.end >= endStr);

    if (alreadyCovered) {
      onProgress?.({ phase: 'prices', current: i + 1, total, message: `${commodity} (cached)` });
      continue;
    }

    try {
      const data = await fetchYahooHistorical(
        symbol,
        toUnix(startStr),
        toUnix(endStr),
        proxyUrl,
      );
      const days = parsePriceResponse(data, symbol, commodity);
      if (days.length > 0) {
        await putBatch(STORES.priceHistory, days as unknown as Record<string, unknown>[]);
        const newRange = { start: days[0].date, end: days[days.length - 1].date };
        const merged = [...existingRanges, newRange].sort((a, b) => a.start.localeCompare(b.start));
        await saveFetchMeta(symbol, merged);
        totalFetched += days.length;
      }
    } catch (err) {
      console.warn(`Failed to fetch historical prices for ${commodity} (${symbol}):`, err);
    }

    onProgress?.({ phase: 'prices', current: i + 1, total, message: `${commodity}: ${totalFetched} days` });
  }

  return totalFetched;
}

/** Get all cached price data for a symbol within a date range */
export async function getCachedPrices(symbol: string, startDate: string, endDate: string): Promise<HistoricalPriceDay[]> {
  const { getByIndex } = await import('./indexedDb');
  const all = await getByIndex<HistoricalPriceDay & { id: string }>(STORES.priceHistory, 'by-symbol', symbol);
  return all.filter((d) => d.date >= startDate && d.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
}

export { COMMODITY_YAHOO_SYMBOLS };
