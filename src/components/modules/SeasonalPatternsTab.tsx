/**
 * SeasonalPatternsTab — shows 5-year seasonal price averages with ±1 SD bands
 * and current-year actual prices, per commodity (Corn / Soybeans / Wheat).
 *
 * Data source: IndexedDB price history (same cache as Historical Correlation tab).
 * No new APIs required.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { SegmentedControl } from '../shared/SegmentedControl';
import { getCachedPrices, fetchHistoricalPrices, CONTINUOUS_SYMBOLS } from '../../utils/historicalYahoo';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { getISOWeek, parseLocalDate } from '../../utils/isoWeek';
import type { HistoricalPriceDay } from '../../types/historicalWeather';

function getCurrentISOWeek(): number {
  return getISOWeek(new Date());
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Commodity = 'Corn' | 'Soybeans' | 'Wheat';

interface SeasonalPoint {
  week: number;
  mean: number | null;
  upper: number | null;
  lower: number | null;
  currentYear: number | null;
}

// ─── Statistical helpers ──────────────────────────────────────────────────────
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1));
}

// ─── Seasonal aggregation ─────────────────────────────────────────────────────
function buildSeasonalData(priceData: HistoricalPriceDay[]): SeasonalPoint[] {
  if (priceData.length === 0) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const fiveYearsAgo = currentYear - 5;

  // Roll-day filter: drop records where day-over-day change > ±15%
  // Compare against last ACCEPTED value (not sorted[i-1]) to avoid comparing
  // against a previously-skipped roll-day record.
  const sorted = [...priceData].sort((a, b) => a.date.localeCompare(b.date));
  const filtered: HistoricalPriceDay[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (filtered.length === 0) { filtered.push(sorted[i]); continue; }
    const prev = filtered[filtered.length - 1].close;
    const curr = sorted[i].close;
    if (prev > 0) {
      const change = Math.abs((curr - prev) / prev);
      if (change > 0.15) continue; // roll-day discontinuity — skip
    }
    filtered.push(sorted[i]);
  }

  // Group by ISO week
  // Historic years: fiveYearsAgo to currentYear-1 (for seasonal mean/SD)
  // Current year: currentYear (for actual overlay)
  const historicByWeek = new Map<number, number[]>(); // week → prices across years
  const currentByWeek = new Map<number, number>();    // week → latest price this year

  for (const day of filtered) {
    const year = parseInt(day.date.slice(0, 4));
    const week = getISOWeek(parseLocalDate(day.date));
    if (week < 1 || week > 52) continue;

    if (year >= fiveYearsAgo && year < currentYear) {
      const existing = historicByWeek.get(week) ?? [];
      existing.push(day.close);
      historicByWeek.set(week, existing);
    } else if (year === currentYear) {
      // Keep last price for this week (sorted, so last wins)
      currentByWeek.set(week, day.close);
    }
  }

  // Build 52 week points
  const points: SeasonalPoint[] = [];
  for (let week = 1; week <= 52; week++) {
    const historic = historicByWeek.get(week) ?? [];
    const avg = historic.length >= 2 ? mean(historic) : null;
    const sd = historic.length >= 2 ? stddev(historic) : null;
    const curr = currentByWeek.get(week) ?? null;

    points.push({
      week,
      mean: avg ? Math.round(avg * 100) / 100 : null,
      upper: avg && sd ? Math.round((avg + sd) * 100) / 100 : null,
      lower: avg && sd ? Math.round((avg - sd) * 100) / 100 : null,
      currentYear: curr ? Math.round(curr * 100) / 100 : null,
    });
  }

  return points;
}

// ─── Commodity colors (from CLAUDE.md) ────────────────────────────────────────
const COMMODITY_COLORS: Record<Commodity, string> = {
  Corn: '#EAB308',
  Soybeans: '#22C55E',
  Wheat: '#F59E0B',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function SeasonalPatternsTab() {
  const [commodity, setCommodity] = useState<Commodity>('Corn');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [insufficientHistory, setInsufficientHistory] = useState(false);

  // Use ref for priceData stability — avoids re-running 12K-record useMemo on every render
  const priceDataRef = useRef<HistoricalPriceDay[]>([]);
  const [priceDataVersion, setPriceDataVersion] = useState(0); // bump to trigger re-memoize

  const proxyUrl = useMarketDataStore((s) => s.proxyUrl);

  const symbol = CONTINUOUS_SYMBOLS[commodity] ?? '';

  // Load cached prices on mount and when commodity changes
  useEffect(() => {
    let cancelled = false;
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const start = fiveYearsAgo.toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);

    getCachedPrices(symbol, start, end).then((data) => {
      if (cancelled) return;
      priceDataRef.current = data;
      setPriceDataVersion((v) => v + 1);
      // Need at least 2 years of data (roughly 500 trading days)
      const years = new Set(data.map((d) => d.date.slice(0, 4)));
      setInsufficientHistory(years.size < 2);
    });

    return () => { cancelled = true; };
  }, [symbol]);

  // Seasonal computation — only runs when priceData changes
  const seasonalData = useMemo(() => {
    // priceDataVersion is consumed to force recompute when ref is updated
    void priceDataVersion;
    return buildSeasonalData(priceDataRef.current);
  }, [priceDataVersion]);

  const handleLoad = useCallback(async () => {
    if (!proxyUrl) {
      setLoadError('Set Yahoo Finance proxy URL in Daily Inputs first');
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      await fetchHistoricalPrices({
        commodities: [commodity],
        lookbackYears: 5,
        proxyUrl,
      });
      // Reload from cache
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const start = fiveYearsAgo.toISOString().slice(0, 10);
      const end = new Date().toISOString().slice(0, 10);
      const data = await getCachedPrices(symbol, start, end);
      priceDataRef.current = data;
      setPriceDataVersion((v) => v + 1);
      const years = new Set(data.map((d) => d.date.slice(0, 4)));
      setInsufficientHistory(years.size < 2);
    } catch (err) {
      setLoadError(`Failed to load: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [commodity, symbol, proxyUrl]);

  const currentWeek = getCurrentISOWeek();
  const currentYear = getCurrentYear();
  const color = COMMODITY_COLORS[commodity];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Seasonal Price Patterns</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            5-year average with ±1 SD bands · {currentYear} actual overlay · Week {currentWeek} highlighted
          </p>
        </div>
        <SegmentedControl
          segments={[
            { key: 'Corn', label: '🌽 Corn' },
            { key: 'Soybeans', label: '🫘 Soybeans' },
            { key: 'Wheat', label: '🌾 Wheat' },
          ]}
          activeKey={commodity}
          onChange={(k) => setCommodity(k as Commodity)}
        />
      </div>

      {/* Insufficient history — show load prompt */}
      {insufficientHistory && !isLoading && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-[var(--text-muted)] mb-4">
            {priceDataRef.current.length === 0
              ? `No ${commodity} price history found in cache.`
              : `${commodity} history has insufficient data (< 2 years).`}
            {commodity === 'Wheat' && priceDataRef.current.length === 0 && (
              <span className="block mt-1 text-sm">
                Wheat (ZW=F) is fetched separately from corn/beans — it may not be cached if you&apos;ve only run Historical Correlation for corn or beans.
              </span>
            )}
          </p>
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Load 5 Years of {commodity} Data
          </button>
          {loadError && (
            <p className="mt-3 text-sm text-[var(--negative)]">
              {loadError}{' '}
              <button onClick={handleLoad} className="underline">Retry</button>
            </p>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-sm">Fetching {commodity} price history...</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {!insufficientHistory && !isLoading && seasonalData.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={seasonalData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.5} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(w: number) => `W${w}`}
                interval={3}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    mean: '5yr avg',
                    upper: '+1 SD',
                    lower: '−1 SD',
                    currentYear: `${currentYear} actual`,
                  };
                  return [`$${value?.toFixed(2) ?? '—'}`, labels[name] ?? name];
                }}
                labelFormatter={(w: number) => `Week ${w}`}
              />

              {/* Current week reference line */}
              <ReferenceLine
                x={currentWeek}
                stroke="var(--accent)"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: 'Now', position: 'top', fontSize: 10, fill: 'var(--accent)' }}
              />

              {/* ±1 SD bands — dashed, lighter */}
              <Line
                type="monotone"
                dataKey="upper"
                stroke={color}
                strokeOpacity={0.4}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="lower"
                stroke={color}
                strokeOpacity={0.4}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls
              />

              {/* 5-year seasonal mean — solid */}
              <Line
                type="monotone"
                dataKey="mean"
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />

              {/* Current year actual — bold accent */}
              <Line
                type="monotone"
                dataKey="currentYear"
                stroke="var(--accent)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-2 px-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5" style={{ backgroundColor: color, opacity: 0.4 }} />
              ±1 SD band
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5" style={{ backgroundColor: color }} />
              5yr avg
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-[var(--accent)]" />
              {currentYear} actual
            </span>
            <span className="flex items-center gap-1.5 ml-auto">
              Symbol: <code className="font-mono text-[10px]">{symbol}</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
