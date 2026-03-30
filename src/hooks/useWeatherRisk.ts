import { useMemo } from 'react';
import { useWeatherStore } from '../store/useWeatherStore';
import { useContractStore } from '../store/useContractStore';
import { assessRisk } from '../utils/openMeteo';
import type { WeatherRisk, WeatherMorningBriefCard, RegionalSummary, WeatherSeverity } from '../types/weather';
import type { AlertLevel } from '../utils/alerts';

export interface WeatherAlert {
  level: AlertLevel;
  message: string;
  module: string;
  moduleId: string;
}

interface WeatherRiskResult {
  risks: WeatherRisk[];
  alerts: WeatherAlert[];
  regionalSummaries: RegionalSummary[];
  morningBriefCard: WeatherMorningBriefCard;
  hasWeatherData: boolean;
  isStale: boolean;
  lastFetchedAt: string | null;
}

const STALE_THRESHOLD_MS = 60 * 60 * 1000;

export function useWeatherRisk(): WeatherRiskResult {
  const forecasts = useWeatherStore((s) => s.forecasts);
  const lastFetched = useWeatherStore((s) => s.lastFetched);
  const contracts = useContractStore((s) => s.contracts);

  return useMemo(() => {
    const forecastList = Object.values(forecasts);
    const hasWeatherData = forecastList.length > 0;
    const isStale = lastFetched ? Date.now() - lastFetched > STALE_THRESHOLD_MS : true;
    const lastFetchedAt = lastFetched ? new Date(lastFetched).toISOString() : null;

    if (!hasWeatherData) {
      return {
        risks: [], alerts: [], regionalSummaries: [],
        morningBriefCard: { headline: 'No weather data', severity: 'low' as WeatherSeverity, topRisks: [], locationsMonitored: 0, activeAlerts: 0 },
        hasWeatherData: false, isStale: true, lastFetchedAt: null,
      };
    }

    const entityBushels = new Map<string, number>();
    const openContracts = contracts.filter((c) => c.isOpen);
    for (const c of openContracts) {
      const key = c.entity.trim().toUpperCase();
      entityBushels.set(key, (entityBushels.get(key) ?? 0) + Math.abs(c.balance));
    }

    const risks: WeatherRisk[] = [];
    for (const forecast of forecastList) {
      const risk = assessRisk(forecast, forecast.locationKey);
      if (risk.severity !== 'low') risks.push(risk);
    }

    const severityOrder: Record<WeatherSeverity, number> = { extreme: 0, high: 1, moderate: 2, low: 3 };
    risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const alerts: WeatherAlert[] = [];
    for (const risk of risks) {
      if (risk.severity === 'high' || risk.severity === 'extreme') {
        const bushels = entityBushels.get(risk.entity) ?? 0;
        if (bushels > 50_000) {
          alerts.push({
            level: risk.severity === 'extreme' ? 'critical' : 'warning',
            message: `${risk.event} risk at ${risk.locationName} — ${Math.round(bushels / 1000)}K bu exposure`,
            module: 'Weather', moduleId: 'weather',
          });
        }
      }
    }

    // Regional summaries
    const regionMap = new Map<string, { precipSum: number; tempMaxSum: number; tempMinSum: number; count: number; risks: number; locations: string[] }>();
    for (const forecast of forecastList) {
      const region = inferRegion(forecast.lat, forecast.lon);
      const entry = regionMap.get(region) ?? { precipSum: 0, tempMaxSum: 0, tempMinSum: 0, count: 0, risks: 0, locations: [] };
      const avgPrecip = forecast.daily.reduce((s, d) => s + d.precipMm, 0);
      const avgTempMax = forecast.daily.reduce((s, d) => s + d.tempMaxC, 0) / (forecast.daily.length || 1);
      const avgTempMin = forecast.daily.reduce((s, d) => s + d.tempMinC, 0) / (forecast.daily.length || 1);
      entry.precipSum += avgPrecip; entry.tempMaxSum += avgTempMax; entry.tempMinSum += avgTempMin;
      entry.count += 1; entry.locations.push(forecast.locationName);
      const riskMatch = risks.find((r) => r.locationKey === forecast.locationKey);
      if (riskMatch && riskMatch.severity !== 'low') entry.risks += 1;
      regionMap.set(region, entry);
    }

    const regionalSummaries: RegionalSummary[] = [];
    for (const [regionName, data] of regionMap) {
      const overallSeverity: WeatherSeverity = data.risks > data.count * 0.5 ? 'high' : data.risks > 0 ? 'moderate' : 'low';
      regionalSummaries.push({
        regionName, locations: data.locations,
        avgPrecipMm: data.precipSum / data.count, avgTempMaxC: data.tempMaxSum / data.count,
        avgTempMinC: data.tempMinSum / data.count, overallSeverity, riskCount: data.risks,
        entityCount: data.count,
      });
    }

    const topRisks = risks.slice(0, 3);
    const headline = risks.length === 0 ? 'No active weather risks' : `${risks[0].event} risk: ${risks[0].locationName}`;
    const severity: WeatherSeverity = risks.length > 0 ? risks[0].severity : 'low';

    return {
      risks, alerts, regionalSummaries,
      morningBriefCard: { headline, severity, topRisks, locationsMonitored: forecastList.length, activeAlerts: risks.length },
      hasWeatherData, isStale, lastFetchedAt,
    };
  }, [forecasts, lastFetched, contracts]);
}

function inferRegion(lat: number, lon: number): string {
  if (lat >= 40 && lat <= 49 && lon >= -104 && lon <= -90) return 'Western Corn Belt';
  if (lat >= 37 && lat <= 42 && lon >= -90 && lon <= -80) return 'Eastern Corn Belt';
  if (lat >= 26 && lat <= 40 && lon >= -104 && lon <= -94) return 'Plains';
  if (lat >= 29 && lat <= 40 && lon >= -94 && lon <= -88) return 'Delta';
  if (lat >= 30 && lat <= 39 && lon >= -88 && lon <= -81) return 'Southeast';
  return 'Other';
}
