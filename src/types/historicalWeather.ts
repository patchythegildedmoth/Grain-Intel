export interface HistoricalWeatherDay {
  id: string;
  locationKey: string;
  date: string;
  lat: number;
  lon: number;
  precipMm: number;
  tempMaxC: number;
  tempMinC: number;
  soilMoisture: number | null;
}

export interface HistoricalPriceDay {
  id: string;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FetchMetadata {
  key: string;
  type: 'weather' | 'price';
  fetchedRanges: { start: string; end: string }[];
  lastFetchedAt: string;
}

export interface WeatherAnalog {
  year: number;
  startDate: string;
  endDate: string;
  locationKey: string;
  precipMm: number;
  precipZScore: number;
  avgTempC: number;
  tempZScore: number;
  similarity: number;
  eventType: 'drought' | 'excess-rain' | 'heat-stress' | 'freeze' | 'normal';
}

export interface PriceResponse {
  analog: WeatherAnalog;
  commodity: string;
  priceAtStart: number;
  priceChange7d: number;
  priceChange14d: number;
  priceChange30d: number;
  percentChange7d: number;
  percentChange14d: number;
  percentChange30d: number;
}

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface CorrelationResult {
  currentCondition: WeatherAnalog;
  analogs: PriceResponse[];
  medianChange14d: number;
  avgChange14d: number;
  confidenceLevel: ConfidenceLevel;
  analogCount: number;
}

export function computeConfidence(analogCount: number, avgSimilarity: number): ConfidenceLevel {
  if (analogCount >= 5 && avgSimilarity > 0.7) return 'high';
  if (analogCount >= 3 || avgSimilarity >= 0.5) return 'moderate';
  return 'low';
}

export interface HistoricalFetchProgress {
  phase: 'weather' | 'prices' | 'correlating' | 'done';
  current: number;
  total: number;
  message: string;
}
