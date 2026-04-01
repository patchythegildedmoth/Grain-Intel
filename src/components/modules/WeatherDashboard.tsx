import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useWeatherRisk } from '../../hooks/useWeatherRisk';
import { useWeatherStore } from '../../store/useWeatherStore';
import { useEntityLocationStore } from '../../store/useEntityLocationStore';
import { fetchBatchForecasts } from '../../utils/openMeteo';
import { SegmentedControl } from '../shared/SegmentedControl';
import { StatCard } from '../shared/StatCard';
import { WeatherRiskBadge } from '../shared/WeatherRiskBadge';
import { Breadcrumb } from '../shared/Breadcrumb';
import type { WeatherForecast, WeatherSeverity } from '../../types/weather';

const HistoricalCorrelationTab = lazy(() => import('./HistoricalCorrelationTab'));

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'forecast', label: 'Forecast Charts' },
  { key: 'soil-gdd', label: 'Soil & GDD' },
  { key: 'historical', label: 'Historical' },
];

const SEVERITY_COLORS: Record<WeatherSeverity, string> = {
  extreme: 'text-red-700 dark:text-red-400',
  high: 'text-red-600 dark:text-red-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  low: 'text-green-600 dark:text-green-400',
};

interface WeatherDashboardProps {
  onNavigate: (moduleId: string) => void;
}

export function WeatherDashboard({ onNavigate }: WeatherDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const entityLocations = useEntityLocationStore((s) => s.entityLocations);
  const forecasts = useWeatherStore((s) => s.forecasts);
  const isLoading = useWeatherStore((s) => s.isLoading);
  const error = useWeatherStore((s) => s.error);
  const setForecasts = useWeatherStore((s) => s.setForecasts);
  const setLoading = useWeatherStore((s) => s.setLoading);
  const setError = useWeatherStore((s) => s.setError);
  const isCacheValid = useWeatherStore((s) => s.isCacheValid);

  const { risks, regionalSummaries, morningBriefCard, hasWeatherData, isStale, lastFetchedAt } = useWeatherRisk();

  const locationList = useMemo(() => {
    return Object.values(entityLocations).map((loc) => ({
      lat: loc.lat,
      lon: loc.lon,
      name: loc.entity,
      key: loc.entity.trim().toUpperCase(),
    }));
  }, [entityLocations]);

  const forecastList = useMemo(() => Object.values(forecasts), [forecasts]);

  // Fetch forecasts on mount if cache is stale
  useEffect(() => {
    if (locationList.length === 0) return;
    if (isCacheValid()) return;

    let cancelled = false;
    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchBatchForecasts(locationList);
        if (!cancelled) {
          setForecasts(result.forecasts);
          if (result.errors.length > 0) {
            setError(`${result.errors.length} location(s) failed to fetch`);
          }
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    };
    doFetch();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationList.length]);

  // Selected forecast for charts
  const selectedForecast: WeatherForecast | null = useMemo(() => {
    if (selectedLocation) return forecasts[selectedLocation] ?? null;
    if (forecastList.length > 0) return forecastList[0];
    return null;
  }, [selectedLocation, forecasts, forecastList]);

  // Avg 7-day precip across PA locations only (lat ~39.7-42.3, lon ~-80.5 to -74.7)
  const avgPrecipPA = useMemo(() => {
    const paForecasts = forecastList.filter(
      (f) => f.lat >= 39.7 && f.lat <= 42.3 && f.lon >= -80.5 && f.lon <= -74.7,
    );
    if (paForecasts.length === 0) return null;
    const total = paForecasts.reduce((sum, f) => sum + f.daily.reduce((s, d) => s + d.precipMm, 0), 0);
    return total / paForecasts.length;
  }, [forecastList]);

  const droughtCount = useMemo(() => risks.filter((r) => r.event === 'drought').length, [risks]);

  // Empty state: no entity locations
  if (Object.keys(entityLocations).length === 0) {
    return (
      <div className="space-y-4">
        <Breadcrumb activeModule="weather" onNavigate={onNavigate} />
        <div className="py-16 text-center">
          <div className="text-5xl mb-4">🌦️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Weather Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Set up entity locations on the Entity Map first. Weather forecasts are fetched
            for each geocoded entity location using the Open-Meteo API.
          </p>
          <button
            onClick={() => onNavigate('entity-map')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Entity Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb activeModule="weather" activeTab={activeTab} onNavigate={onNavigate} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Weather Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            7-day forecasts from Open-Meteo for {locationList.length} entity location{locationList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetchedAt && (
            <span className={`text-xs ${isStale ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {isStale ? 'Stale — ' : ''}Updated {new Date(lastFetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchBatchForecasts(locationList)
                .then((result) => {
                  setForecasts(result.forecasts);
                  if (result.errors.length > 0) setError(`${result.errors.length} location(s) failed`);
                  setLoading(false);
                })
                .catch((e: unknown) => {
                  setError(e instanceof Error ? e.message : String(e));
                  setLoading(false);
                });
            }}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Alerts"
          value={String(morningBriefCard.activeAlerts)}
          delta={morningBriefCard.activeAlerts > 0 ? morningBriefCard.headline : undefined}
          deltaDirection={morningBriefCard.activeAlerts > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label="Locations Monitored"
          value={String(morningBriefCard.locationsMonitored)}
        />
        <StatCard
          label="Avg 7-Day Precip (PA)"
          value={avgPrecipPA !== null ? `${avgPrecipPA.toFixed(1)} mm` : 'No PA data'}
        />
        <StatCard
          label="Drought Risks"
          value={String(droughtCount)}
          delta={droughtCount > 0 ? 'Active drought conditions' : 'No drought risks'}
          deltaDirection={droughtCount > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Tab control */}
      <SegmentedControl segments={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Fetching weather data...
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab regionalSummaries={regionalSummaries} risks={risks} hasWeatherData={hasWeatherData} />}
      {activeTab === 'forecast' && (
        <ForecastChartsTab
          forecastList={forecastList}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          selectedForecast={selectedForecast}
        />
      )}
      {activeTab === 'soil-gdd' && <SoilGddTab selectedForecast={selectedForecast} forecastList={forecastList} selectedLocation={selectedLocation} onSelectLocation={setSelectedLocation} />}
      {activeTab === 'historical' && (
        <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading...</div>}>
          <HistoricalCorrelationTab />
        </Suspense>
      )}
    </div>
  );
}

/* ─── Overview Tab ─── */
interface OverviewTabProps {
  regionalSummaries: ReturnType<typeof useWeatherRisk>['regionalSummaries'];
  risks: ReturnType<typeof useWeatherRisk>['risks'];
  hasWeatherData: boolean;
}

function OverviewTab({ regionalSummaries, risks, hasWeatherData }: OverviewTabProps) {
  if (!hasWeatherData) {
    return <div className="py-8 text-center text-gray-400 dark:text-gray-500">No weather data loaded yet. Click Refresh to fetch forecasts.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Regional Summary Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Regional Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Region</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Locations</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Avg Precip (mm)</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Avg High (&deg;C)</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Avg Low (&deg;C)</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Risks</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {regionalSummaries.map((region) => (
                <tr key={region.regionName} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{region.regionName}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{region.entityCount}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{region.avgPrecipMm.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{region.avgTempMaxC.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{region.avgTempMinC.toFixed(1)}</td>
                  <td className="px-4 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{region.riskCount}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs font-semibold ${SEVERITY_COLORS[region.overallSeverity]}`}>
                      {region.overallSeverity.charAt(0).toUpperCase() + region.overallSeverity.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
              {regionalSummaries.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No regional data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Weather Alerts */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active Weather Alerts ({risks.length})</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {risks.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">No active weather alerts</div>
          )}
          {risks.map((risk, i) => (
            <div key={`${risk.locationKey}-${i}`} className="px-4 py-3 flex items-center gap-3">
              <WeatherRiskBadge risk={risk} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{risk.locationName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {risk.event} &middot; {risk.precipForecastMm.toFixed(1)} mm precip &middot; Min {risk.tempMinC.toFixed(1)}&deg;C
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {risk.daysOut === 0 ? 'Now' : `${risk.daysOut}d out`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Location Filter Pills ─── */
interface LocationPillsProps {
  forecastList: WeatherForecast[];
  selectedLocation: string | null;
  onSelectLocation: (key: string | null) => void;
}

function LocationPills({ forecastList, selectedLocation, onSelectLocation }: LocationPillsProps) {
  if (forecastList.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {forecastList.map((f) => (
        <button
          key={f.locationKey}
          onClick={() => onSelectLocation(selectedLocation === f.locationKey ? null : f.locationKey)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedLocation === f.locationKey
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {f.locationName}
        </button>
      ))}
    </div>
  );
}

/* ─── Forecast Charts Tab ─── */
interface ForecastChartsTabProps {
  forecastList: WeatherForecast[];
  selectedLocation: string | null;
  onSelectLocation: (key: string | null) => void;
  selectedForecast: WeatherForecast | null;
}

function ForecastChartsTab({ forecastList, selectedLocation, onSelectLocation, selectedForecast }: ForecastChartsTabProps) {
  const precipData = useMemo(() => {
    if (!selectedForecast) return [];
    return selectedForecast.daily.map((d) => ({
      date: d.date.slice(5),
      precipMm: Number(d.precipMm.toFixed(1)),
    }));
  }, [selectedForecast]);

  const tempData = useMemo(() => {
    if (!selectedForecast) return [];
    return selectedForecast.daily.map((d) => ({
      date: d.date.slice(5),
      tempMax: Number(d.tempMaxC.toFixed(1)),
      tempMin: Number(d.tempMinC.toFixed(1)),
    }));
  }, [selectedForecast]);

  if (!selectedForecast) {
    return <div className="py-8 text-center text-gray-400 dark:text-gray-500">No forecast data available. Click Refresh.</div>;
  }

  return (
    <div className="space-y-6">
      <LocationPills forecastList={forecastList} selectedLocation={selectedLocation} onSelectLocation={onSelectLocation} />

      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Showing: {selectedForecast.locationName}
      </div>

      {/* Precipitation Bar Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">7-Day Precipitation (mm)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={precipData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="precipMm" name="Precip (mm)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Temperature Area Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">7-Day Temperature Range (&deg;C)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={tempData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="tempMax" name="High" stroke="#EF4444" fill="#FEE2E2" fillOpacity={0.5} />
            <Area type="monotone" dataKey="tempMin" name="Low" stroke="#3B82F6" fill="#DBEAFE" fillOpacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Soil & GDD Tab ─── */
interface SoilGddTabProps {
  selectedForecast: WeatherForecast | null;
  forecastList: WeatherForecast[];
  selectedLocation: string | null;
  onSelectLocation: (key: string | null) => void;
}

function SoilGddTab({ selectedForecast, forecastList, selectedLocation, onSelectLocation }: SoilGddTabProps) {
  const soilData = useMemo(() => {
    if (!selectedForecast) return [];
    return selectedForecast.daily.map((d) => ({
      date: d.date.slice(5),
      soilMoisture: Number(d.soilMoisture0to1cm.toFixed(1)),
    }));
  }, [selectedForecast]);

  const gddData = useMemo(() => {
    if (!selectedForecast) return [];
    let cumulative = 0;
    return selectedForecast.daily.map((d) => {
      cumulative += d.growingDegreeDays;
      return {
        date: d.date.slice(5),
        dailyGDD: Number(d.growingDegreeDays.toFixed(1)),
        cumulativeGDD: Number(cumulative.toFixed(1)),
      };
    });
  }, [selectedForecast]);

  if (!selectedForecast) {
    return <div className="py-8 text-center text-gray-400 dark:text-gray-500">No forecast data available. Click Refresh.</div>;
  }

  return (
    <div className="space-y-6">
      <LocationPills forecastList={forecastList} selectedLocation={selectedLocation} onSelectLocation={onSelectLocation} />

      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Showing: {selectedForecast.locationName}
      </div>

      {/* Soil Moisture Line Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Soil Moisture (0-1cm, %)</h4>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Surface layer only. Open-Meteo soil moisture is modeled, not measured. Use as directional indicator only.
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={soilData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="soilMoisture" name="Soil Moisture (%)" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative GDD Area Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Cumulative Growing Degree Days (Base 10&deg;C)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={gddData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="cumulativeGDD" name="Cumulative GDD" stroke="#EAB308" fill="#FEF9C3" fillOpacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
