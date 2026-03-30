/**
 * Orchestrates historical data fetching + correlation engine.
 *
 * Progressive on-demand: fetches nothing until the Historical tab is opened.
 * First click loads 2 years, "Load More" extends to 5 or 10 years.
 */

import { useState, useCallback, useRef } from 'react';
import type { HistoricalWeatherDay, HistoricalFetchProgress, CorrelationResult } from '../types/historicalWeather';
import type { WeatherForecast } from '../types/weather';
import { fetchHistoricalWeather } from '../utils/historicalOpenMeteo';
import { fetchHistoricalPrices, getCachedPrices, CONTINUOUS_SYMBOLS } from '../utils/historicalYahoo';
import { correlate } from '../utils/correlationEngine';
import { getByIndex, isAvailable, STORES } from '../utils/indexedDb';
import { useMarketDataStore } from '../store/useMarketDataStore';

interface HistoricalCorrelationState {
  isLoading: boolean;
  isAvailable: boolean;
  progress: HistoricalFetchProgress | null;
  result: CorrelationResult | null;
  error: string | null;
  yearsLoaded: number;
}

export function useHistoricalCorrelation() {
  const [state, setState] = useState<HistoricalCorrelationState>({
    isLoading: false,
    isAvailable: true,
    progress: null,
    result: null,
    error: null,
    yearsLoaded: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const proxyUrl = useMarketDataStore((s) => s.proxyUrl);

  /** Fetch historical data and run correlation */
  const fetchAndCorrelate = useCallback(async (
    locations: { locationKey: string; lat: number; lon: number }[],
    commodity: string,
    forecast: WeatherForecast | null,
    lookbackYears: number = 2,
  ) => {
    // Check IndexedDB availability
    const dbAvailable = await isAvailable();
    if (!dbAvailable) {
      setState((s) => ({ ...s, isAvailable: false, error: 'Storage unavailable (private browsing?)' }));
      return;
    }

    if (!proxyUrl) {
      setState((s) => ({ ...s, error: 'Set Yahoo Finance proxy URL in Daily Inputs first' }));
      return;
    }

    if (locations.length === 0) {
      setState((s) => ({ ...s, error: 'No entity locations geocoded. Set up locations in Entity Map first.' }));
      return;
    }

    // Cancel any in-flight fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({ ...s, isLoading: true, error: null, progress: null }));

    try {
      // Phase 1: Fetch historical weather
      await fetchHistoricalWeather({
        locations,
        lookbackYears,
        onProgress: (p) => setState((s) => ({ ...s, progress: p })),
        signal: controller.signal,
      });

      // Phase 2: Fetch historical prices
      const commodities = Object.keys(CONTINUOUS_SYMBOLS);
      await fetchHistoricalPrices({
        commodities,
        lookbackYears,
        proxyUrl,
        onProgress: (p) => setState((s) => ({ ...s, progress: p })),
        signal: controller.signal,
      });

      // Phase 3: Run correlation if we have a forecast
      setState((s) => ({ ...s, progress: { phase: 'correlating', current: 0, total: 1, message: 'Computing correlations...' } }));

      let result: CorrelationResult | null = null;

      if (forecast && locations.length > 0) {
        const loc = locations[0];
        const symbol = CONTINUOUS_SYMBOLS[commodity];

        if (symbol) {
          // Load cached data from IndexedDB
          const weatherData = await getByIndex<HistoricalWeatherDay & { id: string }>(
            STORES.weatherHistory, 'by-location', loc.locationKey,
          );
          const startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - lookbackYears);
          const priceData = await getCachedPrices(
            symbol,
            startDate.toISOString().slice(0, 10),
            new Date().toISOString().slice(0, 10),
          );

          // Aggregate current forecast into summary values
          const currentPrecipMm = forecast.daily.reduce((s, d) => s + d.precipMm, 0);
          const currentAvgTempC = forecast.daily.reduce((s, d) => s + (d.tempMaxC + d.tempMinC) / 2, 0) / (forecast.daily.length || 1);
          const currentMinTempC = Math.min(...forecast.daily.map((d) => d.tempMinC));

          const today = new Date();
          result = correlate({
            locationKey: loc.locationKey,
            weatherData,
            priceData,
            commodity,
            currentPrecipMm,
            currentAvgTempC,
            currentMinTempC,
            targetMonth: today.getMonth() + 1,
            targetDay: today.getDate(),
          });
        }
      }

      setState({
        isLoading: false,
        isAvailable: true,
        progress: { phase: 'done', current: 1, total: 1, message: 'Complete' },
        result,
        error: null,
        yearsLoaded: lookbackYears,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState((s) => ({
        ...s,
        isLoading: false,
        error: `Failed: ${(err as Error).message}`,
        progress: null,
      }));
    }
  }, [proxyUrl]);

  /** Cancel in-flight fetch */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isLoading: false, progress: null }));
  }, []);

  return { ...state, fetchAndCorrelate, cancel };
}
