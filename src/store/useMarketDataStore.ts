import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailyMarketInputs, MarketBasisEntry, FuturesSettlement, M2MSnapshot } from '../types/marketData';
import { EMPTY_MARKET_INPUTS } from '../types/marketData';

interface MarketDataState {
  current: DailyMarketInputs;
  history: Record<string, DailyMarketInputs>;
  m2mSnapshots: Record<string, M2MSnapshot>;
  lastUpdated: string | null;
  proxyUrl: string; // Cloudflare Worker URL for Yahoo Finance proxy (also proxies NASS)
  nassApiKey: string; // USDA NASS QuickStats API key (free, public — no billing risk)

  // Actions
  updateSellBasis: (entries: MarketBasisEntry[]) => void;
  updateSettlements: (entries: FuturesSettlement[]) => void;
  updateInTransit: (values: Record<string, number>) => void;
  updateHtaPaired: (values: Record<string, number>) => void;
  updateFreightTiers: (values: Record<string, string>) => void;
  saveCurrentInputs: () => void;
  saveM2MSnapshot: (snapshot: Omit<M2MSnapshot, 'timestamp'>) => void;
  getInputsForDate: (date: string) => DailyMarketInputs | null;
  setProxyUrl: (url: string) => void;
  setNassApiKey: (key: string) => void;
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
      nassApiKey: '',

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

      updateFreightTiers: (values) =>
        set((s) => ({
          current: { ...s.current, freightTiers: values },
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
      setNassApiKey: (key) => set({ nassApiKey: key }),

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
      version: 2,
      partialize: (state) => ({
        current: state.current,
        history: state.history,
        m2mSnapshots: state.m2mSnapshots,
        lastUpdated: state.lastUpdated,
        proxyUrl: state.proxyUrl,
        nassApiKey: state.nassApiKey,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0) {
          // v0 → v1: add freightTiers field (was freightCosts or missing)
          const current = state.current as Record<string, unknown> | undefined;
          if (current && !current.freightTiers) {
            current.freightTiers = {};
            delete current.freightCosts;
          }
        }
        if (version <= 1) {
          // v1 → v2: add nassApiKey field
          if (!('nassApiKey' in state)) {
            state.nassApiKey = '';
          }
        }
        return state;
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[MarketDataStore] Failed to rehydrate, clearing corrupted state:', error);
          localStorage.removeItem('grain-intel-market-data');
        }
      },
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
