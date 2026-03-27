/**
 * Nominatim (OpenStreetMap) geocoding utility.
 *
 * Free, no API key. Rate limited to 1 req/sec per Nominatim TOS.
 * US-only results (countrycodes=us) since all Ag Source entities are domestic.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GrainIntel/1.0 (grain-trading-tool)';
const RATE_LIMIT_MS = 1200; // slightly over 1/sec for safety

export interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
}

/**
 * Geocode a single address. Retries once on 429 (rate limit).
 * Returns null if no results found.
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!address.trim()) return null;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address.trim())}&format=json&limit=1&countrycodes=us`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      // Rate limited — wait and retry once
      if (resp.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (!resp.ok) return null;

      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return null;
    }
  }

  return null;
}

/**
 * Batch geocode with rate limiting.
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
 * Parse a CSV row respecting quoted fields.
 * Handles: entity names with commas (e.g., "Oesterling's Feed Co., Inc")
 * and addresses with commas.
 */
function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse a CSV file with entity location data.
 *
 * Expects 2 columns: "Entity Name" and "Address".
 * Handles quoted fields (commas in entity names or addresses).
 * Skips header row if first row contains "entity" (case-insensitive).
 */
export function parseEntityCSV(csvText: string): { entity: string; address: string }[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const results: { entity: string; address: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const fields = parseCSVRow(lines[i]);
    if (fields.length < 2) continue;

    // Skip header row
    if (i === 0 && fields[0].toLowerCase().includes('entity')) continue;

    const entity = fields[0];
    if (!entity) continue;

    // Second field is the full address
    const address = fields[1];
    if (!address) continue;

    results.push({ entity, address });
  }

  return results;
}
