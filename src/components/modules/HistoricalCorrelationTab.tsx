/**
 * Historical Correlation Tab — lazy-loaded 4th tab of WeatherDashboard.
 * Uses IndexedDB for storage, Open-Meteo Archive + Yahoo Finance for data,
 * and the correlation engine for z-score analog matching.
 *
 * TODO: Full implementation with:
 * - useHistoricalCorrelation hook
 * - Event selector (location, commodity, event type, lookback)
 * - Price response chart (ComposedChart with analog paths)
 * - Analog detail table
 * - Seasonal pattern chart
 */

export default function HistoricalCorrelationTab() {
  return (
    <div className="py-12 text-center">
      <div className="text-4xl mb-4">📊</div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
        Historical Weather-Price Correlation
      </h3>
      <p className="text-[var(--text-muted)] max-w-md mx-auto mb-4">
        Analyze how similar weather events impacted commodity prices historically.
        Uses 10+ years of Open-Meteo weather archives and CBOT futures data to find
        analog events and project likely price responses.
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        Coming soon — requires IndexedDB storage layer and correlation engine.
      </p>
    </div>
  );
}
