/**
 * USDA NASS QuickStats API client.
 *
 * Data fetched via existing Cloudflare Worker proxy (`/usda-nass` route).
 * The client sends `nassApiKey` as a query param; the Worker injects it into
 * the upstream NASS URL and strips it from the forwarded request.
 *
 * Cache TTL: 7 days (matches NASS weekly report cadence).
 * Multi-metric: makes 4 parallel requests per commodity (one per unit_desc).
 * Partial failure: on 1-3 of 4 requests failing, still returns what succeeded.
 */

import { put, get, getByIndex, STORES } from './indexedDb';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CropProgressRecord {
  /** Compound key: `{commodity}:{unitDesc}:{stateFipsCode ?? 'US'}:{referenceDate}` */
  id: string;
  commodity: string;
  unitDesc: string;
  statDesc: string;
  /** stateFipsCode: null = national (no state filter); 2-digit string = state */
  stateFipsCode: string | null;
  /** Reference period label from NASS (e.g., "WEEK ENDING MAR 30") */
  referencePeriodDesc: string;
  /** ISO date of the week ending */
  referenceDate: string;
  value: number;
  year: number;
  fetchedAt: string;
}

export interface CropProgressFetchMeta {
  key: string; // `crop-progress-meta:{commodity}:{year}`
  fetchedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** The 4 metrics we fetch per commodity/year */
export const CROP_PROGRESS_METRICS: string[] = [
  'PCT PLANTED',
  'PCT EMERGED',
  'PCT GOOD',
  'PCT EXCELLENT',
];

/** State FIPS codes for Corn Belt filter (IL, IA, MN, NE, IN) */
export const CORN_BELT_FIPS = ['17', '19', '27', '31', '18'];

/** Commodity name as NASS expects it */
export const NASS_COMMODITIES = {
  Corn: 'CORN',
  Soybeans: 'SOYBEANS',
  'Winter Wheat': 'WHEAT, WINTER',
} as const;
export type NassCommodity = keyof typeof NASS_COMMODITIES;

// ─── Cache helpers ────────────────────────────────────────────────────────────

function cacheMetaKey(commodity: string, year: number): string {
  return `crop-progress-meta:${commodity}:${year}`;
}

async function isCacheValid(commodity: string, year: number): Promise<boolean> {
  const meta = await get<CropProgressFetchMeta>(STORES.fetchMetadata, cacheMetaKey(commodity, year));
  if (!meta) return false;
  const age = Date.now() - new Date(meta.fetchedAt).getTime();
  return age < CACHE_TTL_MS;
}

async function saveCacheMeta(commodity: string, year: number): Promise<void> {
  await put(STORES.fetchMetadata, {
    key: cacheMetaKey(commodity, year),
    fetchedAt: new Date().toISOString(),
  });
}

// ─── NASS API response shape ──────────────────────────────────────────────────
interface NassApiItem {
  commodity_desc: string;
  statisticcat_desc: string;
  unit_desc: string;
  state_fips_code: string;
  state_name: string;
  reference_period_desc: string;
  week_ending: string; // "2026-03-30" format
  Value: string; // numeric string (may have commas)
  year: string;
}

interface NassApiResponse {
  data?: NassApiItem[];
}

// ─── Date helper ──────────────────────────────────────────────────────────────

/** Parse NASS week_ending field to ISO date. Returns empty string if invalid. */
function parseWeekEnding(weekEnding: string): string {
  if (!weekEnding) return '';
  // NASS returns dates like "2026-03-30" or "03/30/2026"
  if (/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) return weekEnding;
  const d = new Date(weekEnding);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ─── Fetch single metric ──────────────────────────────────────────────────────

async function fetchOneMetric(
  nassApiKey: string,
  proxyUrl: string,
  commodity: string,
  unitDesc: string,
  stateFipsCode: string | null,
  year: number,
): Promise<CropProgressRecord[]> {
  const params = new URLSearchParams({
    commodity_desc: NASS_COMMODITIES[commodity as NassCommodity] ?? commodity.toUpperCase(),
    statisticcat_desc: 'PROGRESS',
    unit_desc: unitDesc,
    freq_desc: 'WEEKLY',
    year: String(year),
    nassApiKey,
  });
  if (stateFipsCode) {
    params.set('state_fips_code', stateFipsCode);
  }

  const url = `${proxyUrl}/usda-nass?${params.toString()}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`NASS API ${resp.status} for ${commodity} ${unitDesc}`);

  const json = await resp.json() as NassApiResponse;
  if (!json.data || json.data.length === 0) return [];

  const now = new Date().toISOString();
  const records: CropProgressRecord[] = [];

  for (const item of json.data) {
    const valueStr = item.Value?.replace(/,/g, '').trim();
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;

    const referenceDate = parseWeekEnding(item.week_ending);
    if (!referenceDate) continue;

    const fipsCode = item.state_fips_code && item.state_fips_code !== '' ? item.state_fips_code : null;

    records.push({
      id: `${commodity}:${unitDesc}:${fipsCode ?? 'US'}:${referenceDate}`,
      commodity,
      unitDesc,
      statDesc: item.state_name ?? (fipsCode ? `State ${fipsCode}` : 'US'),
      stateFipsCode: fipsCode,
      referencePeriodDesc: item.reference_period_desc ?? '',
      referenceDate,
      value,
      year: parseInt(item.year),
      fetchedAt: now,
    });
  }

  return records;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface FetchCropProgressResult {
  records: CropProgressRecord[];
  /** Per-metric errors (empty if all succeeded) */
  metricErrors: Record<string, string>;
}

/**
 * Fetch crop progress for one commodity + year from NASS via proxy.
 * Makes 4 parallel requests (one per metric). Returns all that succeeded.
 * Partial failures are surfaced in `metricErrors` so the UI can show per-metric Retry.
 *
 * Also fetches national + Corn Belt states (6 requests per metric → 24 total).
 * Each is independent; failures don't block others.
 */
export async function fetchCropProgress(
  commodity: string,
  year: number,
  nassApiKey: string,
  proxyUrl: string,
): Promise<FetchCropProgressResult> {
  const metricErrors: Record<string, string> = {};
  const allRecords: CropProgressRecord[] = [];

  // Targets: national (null) + Corn Belt states
  const stateFipsCodes = [null, ...CORN_BELT_FIPS];

  // Run 4 metrics × 6 targets in parallel
  const promises = CROP_PROGRESS_METRICS.flatMap((unitDesc) =>
    stateFipsCodes.map(async (fips) => {
      try {
        const recs = await fetchOneMetric(nassApiKey, proxyUrl, commodity, unitDesc, fips, year);
        return { unitDesc, recs };
      } catch (err) {
        // Only record error once per metric (not per state)
        if (!metricErrors[unitDesc]) {
          metricErrors[unitDesc] = (err as Error).message;
        }
        return { unitDesc, recs: [] };
      }
    }),
  );

  const results = await Promise.all(promises);
  for (const { recs } of results) allRecords.push(...recs);

  // Cache what we got (even partial results — avoids re-fetching everything on retry)
  if (allRecords.length > 0) {
    await Promise.all(
      allRecords.map((r) => put(STORES.cropProgress, r as unknown as Record<string, unknown>)),
    );
    // Only mark as fully cached if no errors
    if (Object.keys(metricErrors).length === 0) {
      await saveCacheMeta(commodity, year);
    }
  }

  return { records: allRecords, metricErrors };
}

/**
 * Get cached crop progress from IndexedDB.
 * Returns empty array if not cached or cache is stale.
 */
export async function getCachedCropProgress(
  commodity: string,
  year: number,
): Promise<CropProgressRecord[]> {
  const valid = await isCacheValid(commodity, year);
  if (!valid) return [];
  const all = await getByIndex<CropProgressRecord>(STORES.cropProgress, 'by-commodity', commodity);
  return all.filter((r) => r.year === year);
}

/**
 * Get cached crop progress — returns even stale data (for display while refreshing).
 */
export async function getCachedCropProgressAny(commodity: string, year: number): Promise<CropProgressRecord[]> {
  const all = await getByIndex<CropProgressRecord>(STORES.cropProgress, 'by-commodity', commodity);
  return all.filter((r) => r.year === year);
}
