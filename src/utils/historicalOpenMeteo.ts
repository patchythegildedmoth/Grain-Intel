/**
 * Open-Meteo Historical Archive API fetcher.
 * https://archive-api.open-meteo.com/v1/archive
 *
 * Fetches daily weather data in 2-year chunks with gap-aware caching via IndexedDB.
 */

import type { HistoricalWeatherDay, FetchMetadata, HistoricalFetchProgress } from '../types/historicalWeather';
import { put, get, putBatch, STORES } from './indexedDb';

const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const MAX_CONCURRENT = 5;
const CHUNK_YEARS = 2;

interface ArchiveResponse {
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetch one 2-year chunk for a single location */
async function fetchChunk(
  lat: number, lon: number, startDate: string, endDate: string,
): Promise<ArchiveResponse> {
  const url = `${ARCHIVE_BASE}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo archive: ${resp.status}`);
  return resp.json();
}

/** Convert archive API response to HistoricalWeatherDay[] */
function parseChunk(data: ArchiveResponse, locationKey: string, lat: number, lon: number): HistoricalWeatherDay[] {
  const { time, precipitation_sum, temperature_2m_max, temperature_2m_min } = data.daily;
  return time.map((date, i) => ({
    id: `${locationKey}:${date}`,
    locationKey,
    date,
    lat,
    lon,
    precipMm: precipitation_sum[i] ?? 0,
    tempMaxC: temperature_2m_max[i] ?? 0,
    tempMinC: temperature_2m_min[i] ?? 0,
    soilMoisture: null, // ERA5 soil moisture requires hourly endpoint, not included in archive batch
  }));
}

/** Get the date ranges we already have for a location */
async function getFetchedRanges(locationKey: string): Promise<{ start: string; end: string }[]> {
  const meta = await get<FetchMetadata>(STORES.fetchMetadata, `weather:${locationKey}`);
  return meta?.fetchedRanges ?? [];
}

/** Save updated fetch metadata */
async function saveFetchMeta(locationKey: string, ranges: { start: string; end: string }[]): Promise<void> {
  const meta: FetchMetadata & { key: string } = {
    key: `weather:${locationKey}`,
    type: 'weather',
    fetchedRanges: ranges,
    lastFetchedAt: new Date().toISOString(),
  };
  await put(STORES.fetchMetadata, meta as unknown as Record<string, unknown>);
}

/** Merge overlapping ranges */
function mergeRanges(ranges: { start: string; end: string }[]): { start: string; end: string }[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  const merged: { start: string; end: string }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = sorted[i].end > last.end ? sorted[i].end : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

/** Check if a date range is already covered */
function isCovered(ranges: { start: string; end: string }[], start: string, end: string): boolean {
  return ranges.some((r) => r.start <= start && r.end >= end);
}

export interface FetchHistoricalWeatherOptions {
  locations: { locationKey: string; lat: number; lon: number }[];
  lookbackYears: number;
  onProgress?: (p: HistoricalFetchProgress) => void;
  signal?: AbortSignal;
}

/**
 * Fetch historical weather for multiple locations, gap-aware.
 * Only downloads date ranges not already in IndexedDB.
 */
export async function fetchHistoricalWeather({
  locations, lookbackYears, onProgress, signal,
}: FetchHistoricalWeatherOptions): Promise<number> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - lookbackYears);
  let totalFetched = 0;
  const totalChunks = locations.length * Math.ceil(lookbackYears / CHUNK_YEARS);
  let completedChunks = 0;

  // Throttle: process locations in batches of MAX_CONCURRENT
  for (let i = 0; i < locations.length; i += MAX_CONCURRENT) {
    if (signal?.aborted) break;
    const batch = locations.slice(i, i + MAX_CONCURRENT);

    await Promise.all(batch.map(async (loc) => {
      const existingRanges = await getFetchedRanges(loc.locationKey);

      // Build chunk list for this location
      const chunks: { start: string; end: string }[] = [];
      let chunkStart = new Date(startDate);
      while (chunkStart < today) {
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setFullYear(chunkEnd.getFullYear() + CHUNK_YEARS);
        if (chunkEnd > today) chunkEnd.setTime(today.getTime());

        const cs = formatDate(chunkStart);
        const ce = formatDate(chunkEnd);
        if (!isCovered(existingRanges, cs, ce)) {
          chunks.push({ start: cs, end: ce });
        }
        chunkStart = new Date(chunkEnd);
        chunkStart.setDate(chunkStart.getDate() + 1);
      }

      for (const chunk of chunks) {
        if (signal?.aborted) return;
        try {
          const data = await fetchChunk(loc.lat, loc.lon, chunk.start, chunk.end);
          const days = parseChunk(data, loc.locationKey, loc.lat, loc.lon);
          await putBatch(STORES.weatherHistory, days as unknown as Record<string, unknown>[]);
          totalFetched += days.length;

          const updatedRanges = mergeRanges([...existingRanges, chunk]);
          await saveFetchMeta(loc.locationKey, updatedRanges);
        } catch (err) {
          console.warn(`Failed to fetch weather for ${loc.locationKey} ${chunk.start}-${chunk.end}:`, err);
        }

        completedChunks++;
        onProgress?.({
          phase: 'weather',
          current: completedChunks,
          total: totalChunks,
          message: `Weather: ${loc.locationKey} (${chunk.start} to ${chunk.end})`,
        });
      }

      // If no chunks needed (all cached), still count progress
      if (chunks.length === 0) {
        completedChunks += Math.ceil(lookbackYears / CHUNK_YEARS);
        onProgress?.({
          phase: 'weather',
          current: Math.min(completedChunks, totalChunks),
          total: totalChunks,
          message: `Weather: ${loc.locationKey} (cached)`,
        });
      }
    }));
  }

  return totalFetched;
}
