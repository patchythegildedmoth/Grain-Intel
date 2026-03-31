/**
 * CropProgressTab — USDA NASS Crop Progress weekly data.
 *
 * Four metrics per commodity (PCT PLANTED, PCT EMERGED, PCT GOOD, PCT EXCELLENT).
 * National + Corn Belt states (IL, IA, MN, NE, IN).
 * Div-based horizontal bar chart — 3 grouped bars per metric:
 *   current week (blue), prior year same week (gray), 5-year avg (dashed outline).
 * Partial failure: per-metric Retry on failed rows, rest still renders.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import {
  fetchCropProgress,
  fetchCropProgressOneMetric,
  updateCachePartialStatus,
  getCachedCropProgressAny,
  getCropProgressCacheMeta,
  CROP_PROGRESS_METRICS,
  CORN_BELT_FIPS,
  type CropProgressRecord,
} from '../../utils/usdaNass';
import { getISOWeek, parseLocalDate } from '../../utils/isoWeek';

// ─── Types ────────────────────────────────────────────────────────────────────

type CropCommodity = 'Corn' | 'Soybeans' | 'Winter Wheat';

interface MetricSummary {
  unitDesc: string;
  national: {
    current: number | null;
    priorYear: number | null;
    fiveYearAvg: number | null;
    currentDate: string | null;
  };
  states: {
    fips: string;
    label: string;
    current: number | null;
    priorYear: number | null;
  }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMODITIES: CropCommodity[] = ['Corn', 'Soybeans', 'Winter Wheat'];

const STATE_LABELS: Record<string, string> = {
  '17': 'IL',
  '19': 'IA',
  '27': 'MN',
  '31': 'NE',
  '18': 'IN',
};

const METRIC_LABELS: Record<string, string> = {
  'PCT PLANTED': '% Planted',
  'PCT EMERGED': '% Emerged',
  'PCT GOOD': '% Good',
  'PCT EXCELLENT': '% Excellent',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * From a set of records for one commodity, build MetricSummary[].
 * Computes:
 *  - current year most recent value for each metric
 *  - prior year same ISO week
 *  - 5-year avg for same ISO week
 */
function buildMetricSummaries(records: CropProgressRecord[]): MetricSummary[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = getISOWeek(now);

  return CROP_PROGRESS_METRICS.map((unitDesc) => {
    const metricRecords = records.filter((r) => r.unitDesc === unitDesc);

    // National records only (stateFipsCode === null)
    const nationalRecords = metricRecords.filter((r) => r.stateFipsCode === null);

    // Current year — latest record at or before this week
    const currentYearNational = nationalRecords
      .filter((r) => r.year === currentYear && getISOWeek(parseLocalDate(r.referenceDate)) <= currentWeek)
      .sort((a, b) => b.referenceDate.localeCompare(a.referenceDate));
    const currentEntry = currentYearNational[0] ?? null;
    const currentWeekActual = currentEntry ? getISOWeek(new Date(currentEntry.referenceDate)) : currentWeek;

    // Prior year same week
    const priorYearNational = nationalRecords.filter(
      (r) => r.year === currentYear - 1 && getISOWeek(parseLocalDate(r.referenceDate)) === currentWeekActual,
    );
    const priorEntry = priorYearNational[0] ?? null;

    // 5-year average (years: currentYear-5 through currentYear-1, same week)
    const fiveYearNational = nationalRecords.filter(
      (r) =>
        r.year >= currentYear - 5 &&
        r.year < currentYear &&
        getISOWeek(parseLocalDate(r.referenceDate)) === currentWeekActual,
    );
    const fiveYearAvg =
      fiveYearNational.length > 0
        ? fiveYearNational.reduce((s, r) => s + r.value, 0) / fiveYearNational.length
        : null;

    // State breakdown: current + prior year for each Corn Belt state
    const stateEntries = CORN_BELT_FIPS.map((fips) => {
      const stateCurrent = metricRecords
        .filter(
          (r) =>
            r.stateFipsCode === fips &&
            r.year === currentYear &&
            getISOWeek(parseLocalDate(r.referenceDate)) <= currentWeek,
        )
        .sort((a, b) => b.referenceDate.localeCompare(a.referenceDate))[0] ?? null;

      const statePrior = metricRecords.find(
        (r) =>
          r.stateFipsCode === fips &&
          r.year === currentYear - 1 &&
          getISOWeek(parseLocalDate(r.referenceDate)) === currentWeekActual,
      ) ?? null;

      return {
        fips,
        label: STATE_LABELS[fips] ?? fips,
        current: stateCurrent?.value ?? null,
        priorYear: statePrior?.value ?? null,
      };
    });

    return {
      unitDesc,
      national: {
        current: currentEntry?.value ?? null,
        priorYear: priorEntry?.value ?? null,
        fiveYearAvg,
        currentDate: currentEntry?.referenceDate ?? null,
      },
      states: stateEntries,
    };
  });
}

// ─── Bar chart row ────────────────────────────────────────────────────────────

interface BarRowProps {
  label: string;
  current: number | null;
  priorYear: number | null;
  fiveYearAvg: number | null;
}

function BarRow({ label, current, priorYear, fiveYearAvg }: BarRowProps) {
  const maxVal = Math.max(current ?? 0, priorYear ?? 0, fiveYearAvg ?? 0, 1);

  return (
    <div className="space-y-1">
      <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
      <div className="space-y-1.5">
        {/* Current year */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)] w-14 text-right shrink-0">
            {current != null ? `${current.toFixed(0)}%` : '—'}
          </span>
          <div className="flex-1 bg-[var(--bg-muted)] rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: current != null ? `${(current / maxVal) * 100}%` : '0%' }}
            />
          </div>
        </div>
        {/* Prior year */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)] w-14 text-right shrink-0">
            {priorYear != null ? `${priorYear.toFixed(0)}%` : '—'}
          </span>
          <div className="flex-1 bg-[var(--bg-muted)] rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[var(--text-muted)]/40 rounded-full transition-all duration-500"
              style={{ width: priorYear != null ? `${(priorYear / maxVal) * 100}%` : '0%' }}
            />
          </div>
        </div>
        {/* 5yr avg */}
        {fiveYearAvg != null && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] w-14 text-right shrink-0">
              {`${fiveYearAvg.toFixed(0)}%`}
            </span>
            <div className="flex-1 bg-[var(--bg-muted)] rounded-full h-3 overflow-hidden relative">
              <div
                className="absolute inset-y-0 rounded-full border border-[var(--text-secondary)] border-dashed"
                style={{ width: `${(fiveYearAvg / maxVal) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  summary: MetricSummary;
  hasError: boolean;
  onRetry: () => void;
}

function MetricCard({ summary, hasError, onRetry }: MetricCardProps) {
  const label = METRIC_LABELS[summary.unitDesc] ?? summary.unitDesc;

  if (hasError) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
          <button
            onClick={onRetry}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Retry
          </button>
        </div>
        <p className="text-xs text-[var(--negative)]">Failed to load — click Retry</p>
      </div>
    );
  }

  const { national, states } = summary;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        {national.currentDate && (
          <span className="text-[10px] text-[var(--text-muted)]">Week ending {national.currentDate}</span>
        )}
      </div>

      {/* National bar */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">National</p>
        <BarRow
          label="US"
          current={national.current}
          priorYear={national.priorYear}
          fiveYearAvg={national.fiveYearAvg}
        />
      </div>

      {/* State breakdown */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Corn Belt States</p>
        <div className="space-y-2">
          {states.map((s) => (
            <BarRow
              key={s.fips}
              label={s.label}
              current={s.current}
              priorYear={s.priorYear}
              fiveYearAvg={null}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Current yr</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-full bg-[var(--text-muted)]/40" />
          <span className="text-[10px] text-[var(--text-muted)]">Prior yr</span>
        </div>
        {national.fiveYearAvg != null && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-full border border-dashed border-[var(--text-secondary)]" />
            <span className="text-[10px] text-[var(--text-muted)]">5yr avg</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CropProgressTab() {
  const nassApiKey = useMarketDataStore((s) => s.nassApiKey);
  const proxyUrl = useMarketDataStore((s) => s.proxyUrl);

  const [activeCommodity, setActiveCommodity] = useState<CropCommodity>('Corn');
  const [records, setRecords] = useState<CropProgressRecord[]>([]);
  const [metricErrors, setMetricErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [isPartialCache, setIsPartialCache] = useState(false);

  const currentYear = new Date().getFullYear();

  // Load cached records on mount + commodity change; detect partial cache
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCachedCropProgressAny(activeCommodity, currentYear),
      getCropProgressCacheMeta(activeCommodity, currentYear),
    ]).then(([cached, meta]) => {
      if (cancelled) return;
      if (cached.length > 0) {
        setRecords(cached);
        const latest = cached.reduce((a, b) => (a.fetchedAt > b.fetchedAt ? a : b));
        setLastFetchedAt(latest.fetchedAt);
        setIsPartialCache(meta?.partial === true);
      } else {
        setRecords([]);
        setIsPartialCache(false);
      }
    });
    return () => { cancelled = true; };
  }, [activeCommodity, currentYear]);

  const handleFetch = useCallback(
    async (retryMetric?: string) => {
      if (!nassApiKey) {
        setFetchError('Enter your USDA NASS API key in Daily Inputs to load crop progress data.');
        return;
      }
      if (!proxyUrl) {
        setFetchError('Set the Yahoo Finance proxy URL in Daily Inputs first.');
        return;
      }

      setIsLoading(true);
      setFetchError(null);

      try {
        if (retryMetric) {
          // Per-metric retry: only 6 requests (national + 5 states), not 24
          const result = await fetchCropProgressOneMetric(
            activeCommodity, currentYear, retryMetric, nassApiKey, proxyUrl,
          );
          setRecords((prev) => {
            const filtered = prev.filter((r) => r.unitDesc !== retryMetric);
            return [...filtered, ...result.records];
          });
          setMetricErrors((prev) => {
            const next = { ...prev };
            if (!result.metricErrors[retryMetric]) delete next[retryMetric];
            else next[retryMetric] = result.metricErrors[retryMetric];
            // Update partial flag in IndexedDB based on remaining errors
            void updateCachePartialStatus(activeCommodity, currentYear, next);
            setIsPartialCache(Object.keys(next).length > 0);
            return next;
          });
          if (result.records.length > 0) setLastFetchedAt(new Date().toISOString());
        } else {
          // Full refresh: all 24 requests
          const result = await fetchCropProgress(activeCommodity, currentYear, nassApiKey, proxyUrl);
          setRecords((prev) => {
            const map = new Map(prev.map((r) => [r.id, r]));
            for (const r of result.records) map.set(r.id, r);
            return Array.from(map.values());
          });
          setMetricErrors(result.metricErrors);
          setIsPartialCache(Object.keys(result.metricErrors).length > 0);
          if (result.records.length > 0) {
            setLastFetchedAt(new Date().toISOString());
          } else if (Object.keys(result.metricErrors).length === CROP_PROGRESS_METRICS.length) {
            setFetchError('All metric requests failed. Check your NASS API key and proxy URL.');
          }
        }
      } catch (err) {
        setFetchError(`Fetch failed: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [activeCommodity, currentYear, nassApiKey, proxyUrl],
  );

  const metricSummaries = buildMetricSummaries(
    records.filter((r) => r.commodity === activeCommodity),
  );

  const nassUrl = `https://quickstats.nass.usda.gov/api/`;

  // No API key configured
  if (!nassApiKey) {
    return (
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Crop Progress</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">USDA NASS Weekly Crop Progress & Condition</p>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-center space-y-3">
          <p className="text-2xl">🌱</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">NASS API Key Required</p>
          <p className="text-sm text-[var(--text-muted)]">
            Enter your free USDA NASS QuickStats API key in{' '}
            <span className="font-medium">Daily Inputs</span> to load weekly crop
            progress data (% planted, % emerged, % good/excellent).
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Register free at{' '}
            <a
              href={nassUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              quickstats.nass.usda.gov/api/
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Crop Progress</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            USDA NASS Weekly · {currentYear}
            {lastFetchedAt && (
              <span className="ml-2">
                · Last updated {new Date(lastFetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => void handleFetch()}
          disabled={isLoading}
          className="text-sm px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
              Loading...
            </span>
          ) : records.length === 0 ? 'Load Data' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-[var(--negative)]">
          {fetchError}
        </div>
      )}

      {/* Partial cache banner — shown on reload when a previous fetch partially failed */}
      {isPartialCache && !fetchError && !isLoading && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--warning)]">
            ⚠ Some metrics are missing from the last fetch. Use the per-metric Retry buttons below, or click Refresh to reload all.
          </p>
          <button
            onClick={() => void handleFetch()}
            className="text-xs text-[var(--warning)] underline hover:no-underline shrink-0"
          >
            Refresh all
          </button>
        </div>
      )}

      {/* Commodity tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg bg-[var(--bg-muted)] w-fit"
        role="tablist"
      >
        {COMMODITIES.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={activeCommodity === c}
            onClick={() => setActiveCommodity(c)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeCommodity === c
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {c === 'Winter Wheat' ? 'Wtr Wheat' : c}
          </button>
        ))}
      </div>

      {/* No data yet */}
      {records.filter((r) => r.commodity === activeCommodity).length === 0 && !isLoading && !fetchError && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No {activeCommodity} crop progress data loaded for {currentYear}.{' '}
            Click <strong>Load Data</strong> to fetch from USDA NASS.
          </p>
          {!proxyUrl && (
            <p className="text-xs text-[var(--warning)] mt-2">
              ⚠ Set proxy URL in Daily Inputs first.
            </p>
          )}
        </div>
      )}

      {/* Metric cards — 2 columns on md+ */}
      {metricSummaries.some((m) => m.national.current != null || metricErrors[m.unitDesc]) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metricSummaries.map((summary) => (
            <MetricCard
              key={summary.unitDesc}
              summary={summary}
              hasError={!!metricErrors[summary.unitDesc] && summary.national.current == null}
              onRetry={() => void handleFetch(summary.unitDesc)}
            />
          ))}
        </div>
      )}

      {/* NASS commodity note for Winter Wheat */}
      {activeCommodity === 'Winter Wheat' && (
        <p className="text-xs text-[var(--text-muted)]">
          Note: NASS reports Winter Wheat as "WHEAT, WINTER". Planting/emergence data
          available fall–early winter; condition ratings available spring through harvest.
        </p>
      )}

      {/* Data source */}
      <p className="text-xs text-[var(--text-muted)]">
        Source: USDA National Agricultural Statistics Service (NASS) QuickStats ·{' '}
        <a
          href="https://quickstats.nass.usda.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          quickstats.nass.usda.gov
        </a>{' '}
        · Corn Belt states: IL, IA, MN, NE, IN
      </p>
    </div>
  );
}
