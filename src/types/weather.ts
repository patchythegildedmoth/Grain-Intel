export type WeatherSeverity = 'low' | 'moderate' | 'high' | 'extreme';
export type WeatherEventType = 'drought' | 'freeze' | 'excess-rain' | 'heat-stress' | 'normal';

export interface WeatherDailyForecast {
  date: string;
  precipMm: number;
  tempMaxC: number;
  tempMinC: number;
  soilMoisture0to1cm: number;
  growingDegreeDays: number;
}

export interface WeatherForecast {
  lat: number;
  lon: number;
  locationName: string;
  locationKey: string;
  daily: WeatherDailyForecast[];
  fetchedAt: string;
}

export interface WeatherRisk {
  locationName: string;
  locationKey: string;
  entity: string;
  severity: WeatherSeverity;
  event: WeatherEventType;
  daysOut: number;
  precipForecastMm: number;
  tempMinC: number;
  soilMoisture: number;
}

export interface RegionalSummary {
  regionName: string;
  locations: string[];
  avgPrecipMm: number;
  avgTempMaxC: number;
  avgTempMinC: number;
  overallSeverity: WeatherSeverity;
  riskCount: number;
  entityCount: number;
}

export interface WeatherMorningBriefCard {
  headline: string;
  severity: WeatherSeverity;
  topRisks: WeatherRisk[];
  locationsMonitored: number;
  activeAlerts: number;
}

export const STATE_TO_REGION: Record<string, string> = {
  IA: 'Western Corn Belt', NE: 'Western Corn Belt', MN: 'Western Corn Belt',
  SD: 'Western Corn Belt', ND: 'Western Corn Belt',
  IL: 'Eastern Corn Belt', IN: 'Eastern Corn Belt', OH: 'Eastern Corn Belt',
  MO: 'Delta', AR: 'Delta', MS: 'Delta', LA: 'Delta',
  KS: 'Plains', OK: 'Plains', TX: 'Plains',
  TN: 'Southeast', KY: 'Southeast', GA: 'Southeast', AL: 'Southeast',
};

export const DEFAULT_REGION_CENTROIDS: { name: string; lat: number; lon: number }[] = [
  { name: 'Des Moines, IA', lat: 41.5868, lon: -93.625 },
  { name: 'Springfield, IL', lat: 39.7817, lon: -89.6501 },
  { name: 'Kansas City, MO', lat: 39.0997, lon: -94.5786 },
  { name: 'Memphis, TN', lat: 35.1495, lon: -90.049 },
  { name: 'Indianapolis, IN', lat: 39.7684, lon: -86.1581 },
];
