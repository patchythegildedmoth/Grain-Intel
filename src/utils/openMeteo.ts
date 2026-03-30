import type { WeatherForecast, WeatherDailyForecast, WeatherRisk, WeatherSeverity, WeatherEventType } from '../types/weather';

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';

export function computeGDD(tempMaxC: number, tempMinC: number): number {
  return Math.max(0, (tempMaxC + tempMinC) / 2 - 10);
}

export async function fetchForecast(lat: number, lon: number, locationName: string, locationKey: string): Promise<WeatherForecast> {
  const dailyUrl = `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=America/Chicago&forecast_days=7`;
  const hourlyUrl = `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}&hourly=soil_moisture_0_to_1cm&timezone=America/Chicago&forecast_days=7`;

  const [dailyRes, hourlyRes] = await Promise.all([
    fetch(dailyUrl).then((r) => { if (!r.ok) throw new Error(`Open-Meteo daily error: ${r.status}`); return r.json(); }),
    fetch(hourlyUrl).then((r) => { if (!r.ok) throw new Error(`Open-Meteo hourly error: ${r.status}`); return r.json(); }),
  ]);

  const dates: string[] = dailyRes.daily?.time ?? [];
  const precip: number[] = dailyRes.daily?.precipitation_sum ?? [];
  const tempMax: number[] = dailyRes.daily?.temperature_2m_max ?? [];
  const tempMin: number[] = dailyRes.daily?.temperature_2m_min ?? [];

  const hourlyTimes: string[] = hourlyRes.hourly?.time ?? [];
  const hourlySoil: number[] = hourlyRes.hourly?.soil_moisture_0_to_1cm ?? [];
  const dailySoilMap = new Map<string, { sum: number; count: number }>();
  for (let i = 0; i < hourlyTimes.length; i++) {
    const day = hourlyTimes[i].slice(0, 10);
    const val = hourlySoil[i];
    if (val == null) continue;
    const entry = dailySoilMap.get(day) ?? { sum: 0, count: 0 };
    entry.sum += val;
    entry.count += 1;
    dailySoilMap.set(day, entry);
  }

  const daily: WeatherDailyForecast[] = dates.map((date, i) => {
    const soil = dailySoilMap.get(date);
    const tMax = tempMax[i] ?? 0;
    const tMin = tempMin[i] ?? 0;
    return {
      date,
      precipMm: precip[i] ?? 0,
      tempMaxC: tMax,
      tempMinC: tMin,
      soilMoisture0to1cm: soil ? (soil.sum / soil.count) * 100 : 0,
      growingDegreeDays: computeGDD(tMax, tMin),
    };
  });

  return { lat, lon, locationName, locationKey, daily, fetchedAt: new Date().toISOString() };
}

export async function fetchBatchForecasts(
  locations: { lat: number; lon: number; name: string; key: string }[],
): Promise<{ forecasts: WeatherForecast[]; errors: { key: string; error: string }[] }> {
  if (locations.length === 0) return { forecasts: [], errors: [] };

  const deduplicated = deduplicateByProximity(locations, 0.25);
  const MAX_CONCURRENT = 10;
  const GROUP_SIZE = 50;
  const forecasts: WeatherForecast[] = [];
  const errors: { key: string; error: string }[] = [];

  for (let groupStart = 0; groupStart < deduplicated.length; groupStart += GROUP_SIZE) {
    if (groupStart > 0) await delay(100);
    const group = deduplicated.slice(groupStart, groupStart + GROUP_SIZE);
    let idx = 0;
    const results: Promise<void>[] = [];
    const runNext = (): Promise<void> => {
      if (idx >= group.length) return Promise.resolve();
      const loc = group[idx++];
      return fetchForecastWithRetry(loc.lat, loc.lon, loc.name, loc.key)
        .then((f) => forecasts.push(f))
        .catch((e: unknown) => errors.push({ key: loc.key, error: String(e) }))
        .then(() => runNext());
    };
    for (let i = 0; i < Math.min(MAX_CONCURRENT, group.length); i++) {
      results.push(runNext());
    }
    await Promise.all(results);
  }
  return { forecasts, errors };
}

async function fetchForecastWithRetry(lat: number, lon: number, name: string, key: string): Promise<WeatherForecast> {
  try {
    return await fetchForecast(lat, lon, name, key);
  } catch {
    await delay(5000);
    return await fetchForecast(lat, lon, name, key);
  }
}

function deduplicateByProximity(
  locations: { lat: number; lon: number; name: string; key: string }[],
  threshold: number,
): typeof locations {
  const result: typeof locations = [];
  for (const loc of locations) {
    const isDuplicate = result.some(
      (r) => Math.abs(r.lat - loc.lat) < threshold && Math.abs(r.lon - loc.lon) < threshold,
    );
    if (!isDuplicate) result.push(loc);
  }
  return result;
}

export function assessRisk(forecast: WeatherForecast, entity: string): WeatherRisk {
  const totalPrecip = forecast.daily.reduce((s, d) => s + d.precipMm, 0);
  const minTemp = Math.min(...forecast.daily.map((d) => d.tempMinC));
  const latestSoil = forecast.daily[forecast.daily.length - 1]?.soilMoisture0to1cm ?? 50;
  const now = new Date();
  const month = now.getMonth() + 1;
  const isGrowingSeason = month >= 4 && month <= 10;

  let severity: WeatherSeverity = 'low';
  let event: WeatherEventType = 'normal';
  let daysOut = 7;

  if (totalPrecip < 5 && latestSoil < 20) { severity = 'high'; event = 'drought'; daysOut = 0; }
  else if (totalPrecip < 10 && latestSoil < 30) { severity = 'moderate'; event = 'drought'; daysOut = 0; }

  if (isGrowingSeason) {
    for (let i = 0; i < Math.min(3, forecast.daily.length); i++) {
      if (forecast.daily[i].tempMinC < 0) {
        severity = severity === 'high' ? 'extreme' : 'high'; event = 'freeze'; daysOut = i; break;
      } else if (forecast.daily[i].tempMinC < 2) {
        if (severity === 'low' || severity === 'moderate') { severity = 'moderate'; event = 'freeze'; daysOut = i; } break;
      }
    }
  }

  if (totalPrecip > 100) { severity = severity === 'low' ? 'high' : severity; event = event === 'normal' ? 'excess-rain' : event; }
  else if (totalPrecip > 75) { if (severity === 'low') { severity = 'moderate'; event = 'excess-rain'; } }

  return { locationName: forecast.locationName, locationKey: forecast.locationKey, entity, severity, event, daysOut, precipForecastMm: totalPrecip, tempMinC: minTemp, soilMoisture: latestSoil };
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
