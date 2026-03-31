/**
 * ThisWeekTab — 90-second morning market-context summary.
 *
 * Three panels:
 *  1. Weather snapshot (top risk + 7-day precip) from useWeatherRisk()
 *  2. Seasonal context (current week's ZC=F vs 5yr mean) from IndexedDB
 *  3. Crop Progress (Corn % Good/Excellent — national, vs prior year)
 *
 * Each panel is clickable → navigates to its full tab.
 */

import { useState, useEffect } from 'react';
import { useWeatherRisk } from '../../hooks/useWeatherRisk';
import { useWeatherStore } from '../../store/useWeatherStore';
import { getCachedPrices, fetchHistoricalPrices, CONTINUOUS_SYMBOLS } from '../../utils/historicalYahoo';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { getCachedCropProgressAny } from '../../utils/usdaNass';
import { getISOWeek, parseLocalDate, filterRollDays } from '../../utils/isoWeek';
import type { MarketFactorsTab } from '../layout/SectionNav';

// ─── Compute seasonal context for current week ────────────────────────────────
interface SeasonalContext {
  currentClose: number | null;
  fiveYearMean: number | null;
  percentDiff: number | null;
  asOfDate: string | null;
  weeksOfHistory: number;
}

async function getSeasonalContext(symbol: string): Promise<SeasonalContext> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = getISOWeek(now);
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(currentYear - 5);

  const priceData = await getCachedPrices(
    symbol,
    fiveYearsAgo.toISOString().slice(0, 10),
    now.toISOString().slice(0, 10),
  );

  if (priceData.length === 0) return { currentClose: null, fiveYearMean: null, percentDiff: null, asOfDate: null, weeksOfHistory: 0 };

  // Roll-day filter (shared utility — compares against last accepted value)
  const filtered = filterRollDays(priceData);

  // Current year most recent close at current ISO week
  const currentYearDays = filtered.filter((d) => {
    const year = parseInt(d.date.slice(0, 4));
    const week = getISOWeek(parseLocalDate(d.date));
    return year === currentYear && week === currentWeek;
  });
  const currentClose = currentYearDays.length > 0 ? currentYearDays[currentYearDays.length - 1].close : null;
  const asOfDate = currentYearDays.length > 0 ? currentYearDays[currentYearDays.length - 1].date : null;

  // 5-year mean for the same week
  const historicForWeek = filtered.filter((d) => {
    const year = parseInt(d.date.slice(0, 4));
    const week = getISOWeek(parseLocalDate(d.date));
    return year >= currentYear - 5 && year < currentYear && week === currentWeek;
  });

  const years = new Set(historicForWeek.map((d) => d.date.slice(0, 4)));

  if (historicForWeek.length === 0) return { currentClose, fiveYearMean: null, percentDiff: null, asOfDate, weeksOfHistory: 0 };

  const fiveYearMean = historicForWeek.reduce((s, d) => s + d.close, 0) / historicForWeek.length;
  const percentDiff = currentClose != null
    ? ((currentClose - fiveYearMean) / fiveYearMean) * 100
    : null;

  return { currentClose, fiveYearMean, percentDiff, asOfDate, weeksOfHistory: years.size };
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
interface PanelProps {
  title: string;
  icon: string;
  tab: MarketFactorsTab;
  onTabChange: (tab: MarketFactorsTab) => void;
  children: React.ReactNode;
}

function Panel({ title, icon, tab, onTabChange, children }: PanelProps) {
  return (
    <button
      onClick={() => onTabChange(tab)}
      className="text-left flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 hover:border-[var(--accent)]/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-semibold text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
          {title}
        </span>
        <span className="ml-auto text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
          View full →
        </span>
      </div>
      {children}
    </button>
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    low: { label: 'No Risk', cls: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    moderate: { label: 'Moderate Risk', cls: 'bg-amber-500/10 text-[var(--warning)]' },
    high: { label: 'High Risk', cls: 'bg-red-500/10 text-[var(--negative)]' },
    extreme: { label: 'Extreme Risk', cls: 'bg-red-600/20 text-red-700 dark:text-red-400 font-bold' },
  };
  const { label, cls } = config[severity as keyof typeof config] ?? config.low;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Crop Progress snapshot ───────────────────────────────────────────────────

interface CropSnapshot {
  /** National % Good/Excellent for Corn (sum of PCT GOOD + PCT EXCELLENT) */
  goodExcellentCurrent: number | null;
  goodExcellentPriorYear: number | null;
  asOfDate: string | null;
}

async function getCropSnapshot(year: number): Promise<CropSnapshot> {
  const records = await getCachedCropProgressAny('Corn', year);
  const priorRecords = await getCachedCropProgressAny('Corn', year - 1);

  const now = new Date();
  const currentWeek = getISOWeek(now);

  // National records, most recent week at or before now
  const national = (recs: typeof records) =>
    recs
      .filter((r) => r.stateFipsCode === null && getISOWeek(parseLocalDate(r.referenceDate)) <= currentWeek)
      .sort((a, b) => b.referenceDate.localeCompare(a.referenceDate));

  const curNational = national(records);

  if (curNational.length === 0) {
    return { goodExcellentCurrent: null, goodExcellentPriorYear: null, asOfDate: null };
  }

  const latestDate = curNational[0].referenceDate;
  const latestWeek = getISOWeek(new Date(latestDate));

  const sumForWeek = (recs: typeof records, targetWeek: number, yr: number): number | null => {
    const good = recs.find(
      (r) =>
        r.stateFipsCode === null &&
        r.unitDesc === 'PCT GOOD' &&
        r.year === yr &&
        getISOWeek(parseLocalDate(r.referenceDate)) === targetWeek,
    );
    const excellent = recs.find(
      (r) =>
        r.stateFipsCode === null &&
        r.unitDesc === 'PCT EXCELLENT' &&
        r.year === yr &&
        getISOWeek(parseLocalDate(r.referenceDate)) === targetWeek,
    );
    if (good == null && excellent == null) return null;
    return (good?.value ?? 0) + (excellent?.value ?? 0);
  };

  const goodExcellentCurrent = sumForWeek(records, latestWeek, year);
  const goodExcellentPriorYear = sumForWeek(priorRecords, latestWeek, year - 1);

  return { goodExcellentCurrent, goodExcellentPriorYear, asOfDate: latestDate };
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ThisWeekTabProps {
  onTabChange: (tab: MarketFactorsTab) => void;
}

export function ThisWeekTab({ onTabChange }: ThisWeekTabProps) {
  const { morningBriefCard } = useWeatherRisk();
  const forecasts = useWeatherStore((s) => s.forecasts);
  const proxyUrl = useMarketDataStore((s) => s.proxyUrl);
  const nassApiKey = useMarketDataStore((s) => s.nassApiKey);

  const [seasonal, setSeasonal] = useState<SeasonalContext | null>(null);
  const [seasonalLoading, setSeasonalLoading] = useState(true);
  const [seasonalLoadError, setSeasonalLoadError] = useState<string | null>(null);
  const [isLoadingSeasonalData, setIsLoadingSeasonalData] = useState(false);

  const [cropSnapshot, setCropSnapshot] = useState<CropSnapshot | null>(null);
  const [cropLoading, setCropLoading] = useState(true);

  const currentWeek = getISOWeek(new Date());
  const currentYear = new Date().getFullYear();
  const cornSymbol = CONTINUOUS_SYMBOLS['Corn'];

  // 7-day total precip across all entity forecasts (simple average)
  const avgPrecip = (() => {
    const vals = Object.values(forecasts);
    if (vals.length === 0) return null;
    const totals = vals.map((f) => f.daily.reduce((s, d) => s + d.precipMm, 0));
    return totals.reduce((s, v) => s + v, 0) / totals.length;
  })();

  // Load seasonal context on mount — cancellation guard prevents stale setState
  useEffect(() => {
    let cancelled = false;
    setSeasonalLoading(true);
    getSeasonalContext(cornSymbol).then((ctx) => {
      if (!cancelled) {
        setSeasonal(ctx);
        setSeasonalLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [cornSymbol]);

  // Load crop progress snapshot on mount — cancellation guard prevents stale setState
  useEffect(() => {
    let cancelled = false;
    setCropLoading(true);
    getCropSnapshot(currentYear).then((snap) => {
      if (!cancelled) {
        setCropSnapshot(snap);
        setCropLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [currentYear]);

  const handleLoadSeasonalData = async () => {
    if (!proxyUrl) {
      setSeasonalLoadError('Set Yahoo Finance proxy URL in Daily Inputs first');
      return;
    }
    setIsLoadingSeasonalData(true);
    setSeasonalLoadError(null);
    try {
      await fetchHistoricalPrices({ commodities: ['Corn'], lookbackYears: 5, proxyUrl });
      const ctx = await getSeasonalContext(cornSymbol);
      setSeasonal(ctx);
    } catch (err) {
      setSeasonalLoadError(`Failed to load: ${(err as Error).message}`);
    } finally {
      setIsLoadingSeasonalData(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">This Week</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Morning market context — {today} · Week {currentWeek}</p>
      </div>

      {/* Three-panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Panel 1: Weather */}
        <Panel title="Weather" icon="🌦️" tab="weather" onTabChange={onTabChange}>
          {morningBriefCard ? (
            <div className="space-y-3">
              <SeverityBadge severity={morningBriefCard.severity} />
              <p className="text-sm text-[var(--text-primary)] font-medium leading-snug">
                {morningBriefCard.headline}
              </p>
              {avgPrecip != null && (
                <p className="text-xs text-[var(--text-muted)]">
                  7-day avg precip: <span className="font-medium text-[var(--text-primary)]">{avgPrecip.toFixed(1)} mm</span>
                </p>
              )}
              <p className="text-xs text-[var(--text-muted)]">
                {morningBriefCard.locationsMonitored} location{morningBriefCard.locationsMonitored !== 1 ? 's' : ''} monitored
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Visit the Weather tab to load forecasts for your entity locations.
            </p>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-3">As of {today}</p>
        </Panel>

        {/* Panel 2: Seasonal Context */}
        <Panel title="Seasonal — Corn" icon="📊" tab="seasonal" onTabChange={onTabChange}>
          {seasonalLoading ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
              <div className="w-4 h-4 border border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
              Loading...
            </div>
          ) : seasonal && seasonal.currentClose != null && seasonal.percentDiff != null ? (
            <div className="space-y-2">
              {/* Signed percentage vs seasonal average */}
              <div className={`text-2xl font-bold font-data ${seasonal.percentDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-[var(--negative)]'}`}>
                {seasonal.percentDiff >= 0 ? '+' : ''}{seasonal.percentDiff.toFixed(1)}%
              </div>
              <p className="text-xs text-[var(--text-muted)]">vs 5yr avg for wk {currentWeek}</p>
              <p className="text-sm text-[var(--text-primary)]">
                ZC=F: <span className="font-medium">${seasonal.currentClose.toFixed(2)}</span>
                {' '}/ avg: <span className="font-medium">${seasonal.fiveYearMean?.toFixed(2)}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Based on {seasonal.weeksOfHistory} prior yr{seasonal.weeksOfHistory !== 1 ? 's' : ''}
              </p>
            </div>
          ) : seasonal && seasonal.weeksOfHistory === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-muted)]">No corn price history in cache.</p>
              <button
                onClick={(e) => { e.stopPropagation(); void handleLoadSeasonalData(); }}
                disabled={isLoadingSeasonalData}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {isLoadingSeasonalData ? 'Loading...' : 'Load Seasonal Data'}
              </button>
              {seasonalLoadError && (
                <p className="text-xs text-[var(--negative)]">{seasonalLoadError}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Corn ZC=F data loaded but no price for week {currentWeek} in {currentYear}.
            </p>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-3">
            {seasonal?.asOfDate ? `As of ${seasonal.asOfDate}` : `As of ${today}`}
          </p>
        </Panel>

        {/* Panel 3: Crop Progress */}
        <Panel title="Crop Progress — Corn" icon="🌱" tab="crop-progress" onTabChange={onTabChange}>
          {!nassApiKey ? (
            <p className="text-sm text-[var(--text-muted)]">
              Enter your USDA NASS API key in Daily Inputs to load crop condition data.
            </p>
          ) : cropLoading ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
              <div className="w-4 h-4 border border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
              Loading...
            </div>
          ) : cropSnapshot && cropSnapshot.goodExcellentCurrent != null ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold font-data text-[var(--text-primary)]">
                {cropSnapshot.goodExcellentCurrent.toFixed(0)}%
              </div>
              <p className="text-xs text-[var(--text-muted)]">Good + Excellent (national)</p>
              {cropSnapshot.goodExcellentPriorYear != null && (
                <p className="text-sm text-[var(--text-secondary)]">
                  Prior year same week:{' '}
                  <span className={`font-medium ${
                    cropSnapshot.goodExcellentCurrent >= cropSnapshot.goodExcellentPriorYear
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-[var(--negative)]'
                  }`}>
                    {cropSnapshot.goodExcellentCurrent >= cropSnapshot.goodExcellentPriorYear ? '+' : ''}
                    {(cropSnapshot.goodExcellentCurrent - cropSnapshot.goodExcellentPriorYear).toFixed(0)}pp
                  </span>{' '}
                  vs {cropSnapshot.goodExcellentPriorYear.toFixed(0)}%
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No crop progress data yet. Click <strong>Load Data</strong> in the Crop Progress tab.
            </p>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-3">
            {cropSnapshot?.asOfDate
              ? `Week ending ${cropSnapshot.asOfDate} · USDA NASS`
              : 'Weekly · USDA NASS'}
          </p>
        </Panel>
      </div>

      {/* Footer hint */}
      <p className="text-xs text-[var(--text-muted)] text-center">
        Click any panel to open the full view · Data refreshed on tab visit
      </p>
    </div>
  );
}
