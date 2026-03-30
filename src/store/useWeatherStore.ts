import { create } from 'zustand';
import type { WeatherForecast } from '../types/weather';

interface WeatherState {
  forecasts: Record<string, WeatherForecast>;
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;
  setForecasts: (forecasts: WeatherForecast[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCache: () => void;
  isCacheValid: () => boolean;
}

const CACHE_TTL_MS = 30 * 60 * 1000;

export const useWeatherStore = create<WeatherState>((set, get) => ({
  forecasts: {},
  lastFetched: null,
  isLoading: false,
  error: null,
  setForecasts: (forecasts) => {
    const map: Record<string, WeatherForecast> = {};
    for (const f of forecasts) map[f.locationKey] = f;
    set({ forecasts: map, lastFetched: Date.now(), error: null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clearCache: () => set({ forecasts: {}, lastFetched: null, error: null }),
  isCacheValid: () => {
    const { lastFetched } = get();
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_TTL_MS;
  },
}));
