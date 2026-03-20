import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailyMarketInputs, MarketBasisEntry, FuturesSettlement, M2MSnapshot } from '../types/marketData';
import { EMPTY_MARKET_INPUTS } from '../types/marketData';

interface MarketDataState {
  current: DailyMarketInputs;
  history: Record<string, DailyMarketInputs>;
  m2mSnapshots: Record<string, M2MSnapshot>;
  lastUpdated: string | null;
  proxyUrl: string; // Cloudflare Worker URL for Yahoo Finance proxy

  // Actions
  updateSellBasis: (entries: MarketBasisEntry[]) => void;
  updateSettlements: (entries: FuturesSettlement[]) => void;
  updateInTransit: (values: Record<string, number>) => void;
  updateHtaPaired: (values: Record<string, number>) => void;
  saveCurrentInputs: () => void;
  saveM2MSnapshot: (snapshot: Omit<M2MSnapshot, 'timestamp'>) => void;
  getInputsForDate: (date: string) => DailyMarketInputs | null;
  setProxyUrl: (url: string) => void;
  clearData: () => void;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-03-20"
}

/** Prune history entries older than 365 days */
function pruneHistory<T>(records: Record<string, T>, maxDays = 365): Record<string, T> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const pruned: Record<string, T> = {};
  for (const [key, value] of Object.entries(records)) {
    if (key >= cutoffKey) pruned[key] = value;
  }
  return pruned;
}

export const useMarketDataStore = create<MarketDataState>()(
  persist(
    (set, get) => ({
      current: { ...EMPTY_MARKET_INPUTS },
      history: {},
      m2mSnapshots: {},
      lastUpdated: null,
      proxyUrl: '',

      updateSellBasis: (entries) =>
        set((s) => ({
          current: { ...s.current, sellBasis: entries },
          lastUpdated: new Date().toISOString(),
        })),

      updateSettlements: (entries) =>
        set((s) => ({
          current: { ...s.current, settlements: entries },
          lastUpdated: new Date().toISOString(),
        })),

      updateInTransit: (values) =>
        set((s) => ({
          current: { ...s.current, inTransit: values },
          lastUpdated: new Date().toISOString(),
        })),

      updateHtaPaired: (values) =>
        set((s) => ({
          current: { ...s.current, htaPaired: values },
          lastUpdated: new Date().toISOString(),
        })),

      saveCurrentInputs: () => {
        const state = get();
        const key = todayKey();
        set({
          history: pruneHistory({ ...state.history, [key]: { ...state.current } }),
          lastUpdated: new Date().toISOString(),
        });
        console.log(`[MarketData] Saved daily inputs for ${key}`);
      },

      saveM2MSnapshot: (snapshot) => {
        const key = todayKey();
        set((s) => ({
          m2mSnapshots: pruneHistory({
            ...s.m2mSnapshots,
            [key]: { ...snapshot, timestamp: new Date().toISOString() },
          }),
        }));
      },

      getInputsForDate: (date) => {
        return get().history[date] ?? null;
      },

      setProxyUrl: (url) => set({ proxyUrl: url }),

      clearData: () =>
        set({
          current: { ...EMPTY_MARKET_INPUTS },
          history: {},
          m2mSnapshots: {},
          lastUpdated: null,
        }),
    }),
    {
      name: 'grain-intel-market-data',
      partialize: (state) => ({
        current: state.current,
        history: state.history,
        m2mSnapshots: state.m2mSnapshots,
        lastUpdated: state.lastUpdated,
        proxyUrl: state.proxyUrl,
      }),
    },
  ),
);

/** Check if market data is stale (>24 hours old) */
export function isMarketDataStale(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true;
  const updated = new Date(lastUpdated).getTime();
  const now = Date.now();
  return now - updated > 24 * 60 * 60 * 1000;
}
