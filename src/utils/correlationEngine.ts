/**
 * Weather-Price Correlation Engine
 *
 * Z-score analog matching: compares current weather conditions against
 * historical patterns to find similar events and extract price responses.
 *
 * Algorithm:
 * 1. Compute historical mean/stddev for precip and temp within a calendar window
 * 2. Z-score normalize each historical period
 * 3. Classify events (drought, excess rain, freeze, heat stress)
 * 4. Match current forecast z-scores against historical via Euclidean distance
 * 5. Extract futures price changes at 7d, 14d, 30d horizons for each analog
 */

import type { HistoricalWeatherDay, HistoricalPriceDay, WeatherAnalog, PriceResponse, CorrelationResult } from '../types/historicalWeather';
import { computeConfidence } from '../types/historicalWeather';
import type { WeatherEventType } from '../types/weather';

// ===== Statistical Utilities =====

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function zScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - avg) / sd;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ===== Event Classification =====

export function classifyEvent(precipZ: number, tempZ: number, minTempC: number, month: number): WeatherEventType {
  const isGrowingSeason = month >= 4 && month <= 9; // Apr-Sep

  // Freeze: min temp below 0C during growing season
  if (isGrowingSeason && minTempC < 0) return 'freeze';

  // Drought: precip z-score well below normal AND not excessively cold
  if (precipZ < -1.5 && tempZ > -0.5) return 'drought';

  // Excess rain: precip z-score well above normal
  if (precipZ > 1.5) return 'excess-rain';

  // Heat stress: temp z-score well above normal during growing season
  if (isGrowingSeason && tempZ > 1.5) return 'heat-stress';

  return 'normal';
}

// ===== Window Computation =====

interface WindowStats {
  precipMean: number;
  precipStddev: number;
  tempMean: number;
  tempStddev: number;
}

/**
 * Compute mean and stddev for a calendar window (month +/- 2 weeks)
 * across all years of historical data for a location.
 */
export function computeWindowStats(
  weatherData: HistoricalWeatherDay[],
  targetMonth: number,
  windowWeeks: number = 2,
): WindowStats {
  // Filter to records within the calendar window
  const windowDays = weatherData.filter((d) => {
    const dateMonth = new Date(d.date).getMonth() + 1;
    const diff = Math.abs(dateMonth - targetMonth);
    const circularDiff = Math.min(diff, 12 - diff);
    return circularDiff <= Math.ceil(windowWeeks / 2);
  });

  if (windowDays.length === 0) {
    return { precipMean: 0, precipStddev: 0, tempMean: 0, tempStddev: 0 };
  }

  const precips = windowDays.map((d) => d.precipMm);
  const temps = windowDays.map((d) => (d.tempMaxC + d.tempMinC) / 2);

  return {
    precipMean: mean(precips),
    precipStddev: stddev(precips),
    tempMean: mean(temps),
    tempStddev: stddev(temps),
  };
}

// ===== Analog Matching =====

interface HistoricalPeriod {
  year: number;
  startDate: string;
  endDate: string;
  precipMm: number;
  avgTempC: number;
  minTempC: number;
}

/**
 * Group weather data into year-aligned periods matching the target window.
 * E.g., if target is July 15-21 2026, find July 15-21 for each historical year.
 */
export function groupByYearPeriods(
  weatherData: HistoricalWeatherDay[],
  targetStartMonth: number,
  targetStartDay: number,
  periodDays: number = 7,
): HistoricalPeriod[] {
  // Get unique years
  const years = new Set(weatherData.map((d) => new Date(d.date).getFullYear()));
  const periods: HistoricalPeriod[] = [];

  for (const year of years) {
    const periodStart = new Date(year, targetStartMonth - 1, targetStartDay);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDays - 1);

    const startStr = periodStart.toISOString().slice(0, 10);
    const endStr = periodEnd.toISOString().slice(0, 10);

    const daysInPeriod = weatherData.filter((d) => d.date >= startStr && d.date <= endStr);
    if (daysInPeriod.length < periodDays * 0.5) continue; // Need at least half the days

    const totalPrecip = daysInPeriod.reduce((s, d) => s + d.precipMm, 0);
    const avgTemp = mean(daysInPeriod.map((d) => (d.tempMaxC + d.tempMinC) / 2));
    const minTemp = Math.min(...daysInPeriod.map((d) => d.tempMinC));

    periods.push({
      year,
      startDate: startStr,
      endDate: endStr,
      precipMm: totalPrecip,
      avgTempC: avgTemp,
      minTempC: minTemp,
    });
  }

  return periods;
}

/**
 * Find historical analogs that match the current conditions.
 * Returns analogs sorted by similarity (highest first).
 */
export function findAnalogs(
  currentPrecipMm: number,
  currentAvgTempC: number,
  historicalPeriods: HistoricalPeriod[],
  windowStats: WindowStats,
  targetMonth: number,
): WeatherAnalog[] {
  if (historicalPeriods.length === 0) return [];

  const currentPrecipZ = zScore(currentPrecipMm, windowStats.precipMean, windowStats.precipStddev);
  const currentTempZ = zScore(currentAvgTempC, windowStats.tempMean, windowStats.tempStddev);

  const analogs: WeatherAnalog[] = [];

  for (const period of historicalPeriods) {
    const precipZ = zScore(period.precipMm, windowStats.precipMean, windowStats.precipStddev);
    const tempZ = zScore(period.avgTempC, windowStats.tempMean, windowStats.tempStddev);

    // Euclidean distance in z-score space
    const distance = Math.sqrt((precipZ - currentPrecipZ) ** 2 + (tempZ - currentTempZ) ** 2);

    // Convert distance to similarity (0-1 scale, 1 = identical)
    const similarity = Math.max(0, 1 - distance / 4);

    // Only include reasonably similar events (similarity > 0.3)
    if (similarity < 0.3) continue;

    const eventType = classifyEvent(precipZ, tempZ, period.minTempC, targetMonth);

    analogs.push({
      year: period.year,
      startDate: period.startDate,
      endDate: period.endDate,
      locationKey: '', // filled by caller
      precipMm: period.precipMm,
      precipZScore: precipZ,
      avgTempC: period.avgTempC,
      tempZScore: tempZ,
      similarity,
      eventType,
    });
  }

  return analogs.sort((a, b) => b.similarity - a.similarity);
}

// ===== Price Response Extraction =====

/**
 * For each analog, look up the commodity price at the analog's start date
 * and compute price changes at 7d, 14d, 30d horizons.
 */
export function extractPriceResponses(
  analogs: WeatherAnalog[],
  priceData: HistoricalPriceDay[],
  commodity: string,
): PriceResponse[] {
  if (priceData.length === 0 || analogs.length === 0) return [];

  // Build date → price map for fast lookup
  const priceMap = new Map<string, number>();
  for (const p of priceData) {
    priceMap.set(p.date, p.close);
  }

  // Helper: find nearest trading day price (within 5 days)
  function findPrice(dateStr: string): number | null {
    const d = new Date(dateStr);
    for (let offset = 0; offset <= 5; offset++) {
      const check = new Date(d);
      check.setDate(check.getDate() + offset);
      const key = check.toISOString().slice(0, 10);
      const price = priceMap.get(key);
      if (price != null) return price;
    }
    return null;
  }

  function findPriceAtOffset(startDate: string, daysOffset: number): number | null {
    const d = new Date(startDate);
    d.setDate(d.getDate() + daysOffset);
    return findPrice(d.toISOString().slice(0, 10));
  }

  const responses: PriceResponse[] = [];

  for (const analog of analogs) {
    const priceAtStart = findPrice(analog.startDate);
    if (priceAtStart == null) continue;

    const price7d = findPriceAtOffset(analog.startDate, 7);
    const price14d = findPriceAtOffset(analog.startDate, 14);
    const price30d = findPriceAtOffset(analog.startDate, 30);

    responses.push({
      analog,
      commodity,
      priceAtStart,
      priceChange7d: price7d != null ? price7d - priceAtStart : 0,
      priceChange14d: price14d != null ? price14d - priceAtStart : 0,
      priceChange30d: price30d != null ? price30d - priceAtStart : 0,
      percentChange7d: price7d != null ? ((price7d - priceAtStart) / priceAtStart) * 100 : 0,
      percentChange14d: price14d != null ? ((price14d - priceAtStart) / priceAtStart) * 100 : 0,
      percentChange30d: price30d != null ? ((price30d - priceAtStart) / priceAtStart) * 100 : 0,
    });
  }

  return responses;
}

// ===== Main Correlation Function =====

export interface CorrelateOptions {
  locationKey: string;
  weatherData: HistoricalWeatherDay[];
  priceData: HistoricalPriceDay[];
  commodity: string;
  /** Current 7-day forecast aggregates */
  currentPrecipMm: number;
  currentAvgTempC: number;
  currentMinTempC: number;
  /** Target calendar window (month/day from current forecast) */
  targetMonth: number;
  targetDay: number;
}

export function correlate(opts: CorrelateOptions): CorrelationResult {
  const {
    locationKey, weatherData, priceData, commodity,
    currentPrecipMm, currentAvgTempC, currentMinTempC,
    targetMonth, targetDay,
  } = opts;

  // Compute window statistics across all historical years
  const windowStats = computeWindowStats(weatherData, targetMonth);

  // Group historical data into year-aligned periods
  const periods = groupByYearPeriods(weatherData, targetMonth, targetDay);

  // Find analogs matching current conditions
  const analogs = findAnalogs(currentPrecipMm, currentAvgTempC, periods, windowStats, targetMonth);

  // Tag analogs with location
  for (const a of analogs) a.locationKey = locationKey;

  // Extract price responses
  const priceResponses = extractPriceResponses(analogs, priceData, commodity);

  // Compute aggregates
  const avgSimilarity = analogs.length > 0 ? mean(analogs.map((a) => a.similarity)) : 0;
  const confidenceLevel = computeConfidence(priceResponses.length, avgSimilarity);

  // Current condition as an analog (for display)
  const currentPrecipZ = zScore(currentPrecipMm, windowStats.precipMean, windowStats.precipStddev);
  const currentTempZ = zScore(currentAvgTempC, windowStats.tempMean, windowStats.tempStddev);
  const currentCondition: WeatherAnalog = {
    year: new Date().getFullYear(),
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    locationKey,
    precipMm: currentPrecipMm,
    precipZScore: currentPrecipZ,
    avgTempC: currentAvgTempC,
    tempZScore: currentTempZ,
    similarity: 1,
    eventType: classifyEvent(currentPrecipZ, currentTempZ, currentMinTempC, targetMonth),
  };

  return {
    currentCondition,
    analogs: priceResponses,
    medianChange14d: median(priceResponses.map((r) => r.priceChange14d)),
    avgChange14d: mean(priceResponses.map((r) => r.priceChange14d)),
    confidenceLevel,
    analogCount: priceResponses.length,
  };
}
