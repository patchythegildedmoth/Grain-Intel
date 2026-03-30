/**
 * Historical Correlation Tab — lazy-loaded 4th tab of WeatherDashboard.
 *
 * Fetches historical weather + price data on first open (progressive),
 * runs z-score analog matching, and displays:
 * - KPI cards (analogs found, median 14d move, confidence)
 * - Price response chart (median path + analog range + individual years)
 * - Analog detail table
 */

import { useState, useEffect } from 'react';
import { useHistoricalCorrelation } from '../../hooks/useHistoricalCorrelation';
import { useEntityLocationStore } from '../../store/useEntityLocationStore';
import { useWeatherStore } from '../../store/useWeatherStore';
import { FetchProgressBar } from '../shared/FetchProgressBar';
import { StatCard } from '../shared/StatCard';
import { COMMODITY_YAHOO_SYMBOLS } from '../../utils/yahooFinance';
import { formatCurrency } from '../../utils/formatters';


const LOOKBACK_OPTIONS = [
  { label: '2 yr', value: 2 },
  { label: '5 yr', value: 5 },
  { label: '10 yr', value: 10 },
];

const COMMODITY_OPTIONS = Object.keys(COMMODITY_YAHOO_SYMBOLS);

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-600 dark:text-green-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  low: 'text-red-600 dark:text-red-400',
};

export default function HistoricalCorrelationTab() {
  const [selectedCommodity, setSelectedCommodity] = useState('Corn');
  const [lookbackYears, setLookbackYears] = useState(2);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string>('');

  const entityLocations = useEntityLocationStore((s) => s.entityLocations);
  const forecasts = useWeatherStore((s) => s.forecasts);
  const { isLoading, isAvailable: dbAvailable, progress, result, error, yearsLoaded, fetchAndCorrelate, cancel } = useHistoricalCorrelation();

  // Convert entity locations to the format the hook expects, preserving display name
  const locations = Object.values(entityLocations).map((loc) => ({
    locationKey: loc.entity.trim().toUpperCase(),
    displayName: loc.entity.trim(),
    lat: loc.lat,
    lon: loc.lon,
  }));

  // Init selected location when locations first load
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationKey) {
      setSelectedLocationKey(locations[0].locationKey);
    }
  }, [locations.length, selectedLocationKey]);

  // Resolve selected location object and its forecast
  const selectedLocation = locations.find((l) => l.locationKey === selectedLocationKey) ?? locations[0];
  const forecast = selectedLocation ? forecasts[selectedLocation.locationKey] ?? null : null;

  // Put selected location first so the hook correlates against it
  const orderedLocations = selectedLocation
    ? [selectedLocation, ...locations.filter((l) => l.locationKey !== selectedLocation.locationKey)]
    : locations;

  // Auto-fetch on first render
  useEffect(() => {
    if (!hasInitialized && orderedLocations.length > 0 && !isLoading) {
      setHasInitialized(true);
      fetchAndCorrelate(orderedLocations, selectedCommodity, forecast, lookbackYears);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, orderedLocations.length, isLoading]);

  // Re-run correlation when commodity, lookback, or location changes (after initial load)
  const handleRerun = () => {
    fetchAndCorrelate(orderedLocations, selectedCommodity, forecast, lookbackYears);
  };

  // Empty state: no entity locations
  if (Object.keys(entityLocations).length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-4xl mb-4">📍</div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Entity Locations Required
        </h3>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Historical correlation needs geocoded entity locations to fetch weather data.
          Set up locations in the Entity Map module first.
        </p>
      </div>
    );
  }

  // Storage unavailable
  if (!dbAvailable) {
    return (
      <div className="py-12 text-center">
        <div className="text-4xl mb-4">💾</div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Storage Unavailable
        </h3>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Historical data requires IndexedDB storage, which is blocked in private browsing mode.
          Please use a normal browser window.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Location selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Location</label>
          {locations.length <= 1 ? (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {selectedLocation?.displayName ?? '—'}
            </span>
          ) : (
            <select
              value={selectedLocationKey}
              onChange={(e) => setSelectedLocationKey(e.target.value)}
              className="text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] px-3 py-1.5"
            >
              {locations.map((l) => (
                <option key={l.locationKey} value={l.locationKey}>{l.displayName}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Commodity</label>
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            className="text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] px-3 py-1.5"
          >
            {COMMODITY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-[var(--text-secondary)] mr-1">Lookback:</span>
          {LOOKBACK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLookbackYears(opt.value)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                lookbackYears === opt.value
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium'
                  : 'bg-[var(--bg-inset)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleRerun}
          disabled={isLoading}
          className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Loading...' : yearsLoaded > 0 ? 'Re-analyze' : 'Load Data'}
        </button>

        {isLoading && (
          <button onClick={cancel} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-inset)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)]">
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar during fetch */}
      {isLoading && progress && (
        <FetchProgressBar
          progress={progress}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Analogs Found"
              value={String(result.analogCount)}
            />
            <StatCard
              label="Median 14d Move"
              value={result.medianChange14d >= 0 ? `+${formatCurrency(result.medianChange14d)}` : formatCurrency(result.medianChange14d)}
              delta={String(result.medianChange14d)}
              deltaDirection={result.medianChange14d > 0 ? 'up' : result.medianChange14d < 0 ? 'down' : 'neutral'}
            />
            <StatCard
              label="Current Event"
              value={result.currentCondition.eventType.replace('-', ' ')}
            />
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Confidence</div>
              <div className={`mt-2 text-2xl font-bold uppercase ${CONFIDENCE_COLORS[result.confidenceLevel] ?? ''}`}>
                {result.confidenceLevel}
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                {result.analogCount} analogs, avg sim {result.analogs.length > 0 ? (result.analogs.reduce((s, a) => s + a.analog.similarity, 0) / result.analogs.length).toFixed(2) : '0'}
              </div>
            </div>
          </div>

          {/* Analog Detail Table */}
          {result.analogs.length > 0 ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-default)]">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Historical Analogs — {selectedCommodity}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-inset)]">
                      <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Year</th>
                      <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">Event</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">Precip (mm)</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">Temp (°C)</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">Similarity</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">7d Move</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">14d Move</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">30d Move</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analogs.map((pr) => (
                      <tr key={`${pr.analog.year}-${pr.analog.startDate}`} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-inset)]">
                        <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{pr.analog.year}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            pr.analog.eventType === 'drought' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            pr.analog.eventType === 'excess-rain' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            pr.analog.eventType === 'heat-stress' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                            pr.analog.eventType === 'freeze' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {pr.analog.eventType.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{pr.analog.precipMm.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{pr.analog.avgTempC.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{pr.analog.similarity.toFixed(2)}</td>
                        <td className={`px-4 py-2 text-right tabular-nums font-medium ${pr.priceChange7d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {pr.priceChange7d >= 0 ? '+' : ''}{formatCurrency(pr.priceChange7d)}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums font-medium ${pr.priceChange14d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {pr.priceChange14d >= 0 ? '+' : ''}{formatCurrency(pr.priceChange14d)}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums font-medium ${pr.priceChange30d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {pr.priceChange30d >= 0 ? '+' : ''}{formatCurrency(pr.priceChange30d)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
              <p className="text-[var(--text-muted)]">
                No similar weather events found in {yearsLoaded} years of data.
                {yearsLoaded < 10 && ' Try extending the lookback period.'}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-[var(--text-muted)] italic">
            Historical analogs are statistical matches, not predictions. Past weather-price relationships may not repeat.
            Soil moisture data is modeled (ERA5) and may lag actual conditions in extreme drought.
          </p>
        </>
      )}

      {/* Initial empty state */}
      {!result && !isLoading && !error && (
        <div className="py-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Historical Weather-Price Correlation
          </h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto mb-4">
            Click "Load Data" to fetch {lookbackYears} years of weather archives and CBOT futures prices.
            The engine will find historical analog events matching current conditions and show how prices responded.
          </p>
        </div>
      )}
    </div>
  );
}
