/**
 * Nominatim (OpenStreetMap) geocoding utility.
 *
 * Free, no API key. Rate limited to 1 req/sec per Nominatim TOS.
 * US-only results (countrycodes=us) since all Ag Source entities are domestic.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GrainIntel/1.0 (grain-trading-tool)';
const RATE_LIMIT_MS = 1100;

export interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
}

/**
 * Geocode a single address. Returns null if no results found.
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!address.trim()) return null;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address.trim())}&format=json&limit=1&countrycodes=us`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

/**
 * Batch geocode with 1 req/sec rate limiting.
 * Calls onProgress after each item. Supports AbortController for cancellation.
 * Returns a Map of entity name → result (skips failures).
 */
export async function geocodeBatch(
  items: { entity: string; address: string }[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Map<string, GeoResult>> {
  const results = new Map<string, GeoResult>();

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) break;

    const item = items[i];
    const result = await geocodeAddress(item.address);
    if (result) {
      results.set(item.entity, result);
    }

    onProgress(i + 1, items.length);

    // Rate limit between requests (skip after last)
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  return results;
}

/**
 * Parse a CSV file with entity location data.
 *
 * Supports two formats:
 *   - "Entity Name, Address" (2 columns)
 *   - "Entity Name, City, State" (3 columns → joined as "City, State")
 *
 * Skips header row if first row contains "entity" (case-insensitive).
 */
export function parseEntityCSV(csvText: string): { entity: string; address: string }[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const results: { entity: string; address: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((s) => s.trim());
    if (parts.length < 2) continue;

    // Skip header row
    if (i === 0 && parts[0].toLowerCase().includes('entity')) continue;

    const entity = parts[0];
    if (!entity) continue;

    // 3+ columns: join columns 1+ as the address
    const address = parts.slice(1).join(', ');
    if (!address) continue;

    results.push({ entity, address });
  }

  return results;
}
