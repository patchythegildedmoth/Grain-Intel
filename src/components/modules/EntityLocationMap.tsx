import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useEntityMap, type MapEntity } from '../../hooks/useEntityMap';
import { useEntityLocationStore } from '../../store/useEntityLocationStore';
import { geocodeAddress, geocodeBatch, parseEntityCSV } from '../../utils/nominatim';
import { StatCard } from '../shared/StatCard';
import { DataTable } from '../shared/DataTable';
import { Breadcrumb } from '../shared/Breadcrumb';
import { formatBushelsShort, formatCurrency, formatPercent } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { FREIGHT_TIERS } from '../../utils/freightTiers';
import type { EntityLocation } from '../../types/entityLocation';

// Fix Leaflet default marker icon in bundled environments
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// ─── Table columns ──────────────────────────────────────────────────────────

const col = createColumnHelper<MapEntity>();
const tableColumns = [
  col.accessor('entity', { header: 'Entity' }),
  col.accessor('address', {
    header: 'Location',
    cell: (info) => <span className="text-xs text-[var(--text-muted)]">{info.getValue()}</span>,
  }),
  col.accessor('totalBushels', {
    header: 'Bushels',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  col.accessor('primaryCommodity', {
    header: 'Primary Commodity',
    cell: (info) => (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCommodityColor(info.getValue()) }} />
        <span>{info.getValue()}</span>
      </div>
    ),
  }),
  col.accessor('contractCount', { header: 'Contracts' }),
  col.accessor('avgFreightTier', {
    header: 'Freight Tier',
    cell: (info) => {
      const tier = info.getValue();
      if (!tier) return '—';
      const cost = FREIGHT_TIERS[tier] ?? 0;
      return `${tier} ($${cost.toFixed(2)})`;
    },
  }),
];

// ─── Map auto-fit component ─────────────────────────────────────────────────

function FitBounds({ entities, elevatorLat, elevatorLon }: { entities: MapEntity[]; elevatorLat?: number; elevatorLon?: number }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = entities.map((e) => [e.lat, e.lon]);
    if (elevatorLat !== undefined && elevatorLon !== undefined) {
      points.push([elevatorLat, elevatorLon]);
    }
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [entities, elevatorLat, elevatorLon, map]);
  return null;
}

// ─── Main component ─────────────────────────────────────────────────────────

interface Props {
  onNavigate?: (id: string) => void;
}

export function EntityLocationMap({ onNavigate }: Props) {
  const {
    mapEntities,
    unmappedEntities,
    totalEntities,
    mappedCount,
    volumeCoverage,
    avgFreightTier,
    farthestEntity,
    elevatorLocation,
    commodities,
  } = useEntityMap();

  const { setEntityLocation, setElevatorLocation, removeEntityLocation } = useEntityLocationStore();

  // State
  const [showManager, setShowManager] = useState(false);
  const [activeCommodities, setActiveCommodities] = useState<Set<string>>(new Set(commodities));
  const [searchTerm, setSearchTerm] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // Sync commodity filters when commodities change
  useEffect(() => {
    setActiveCommodities(new Set(commodities));
  }, [commodities]);

  // Watch dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    let result = mapEntities;
    if (activeCommodities.size < commodities.length) {
      result = result.filter((e) => activeCommodities.has(e.primaryCommodity));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((e) => e.entity.toLowerCase().includes(term));
    }
    return result;
  }, [mapEntities, activeCommodities, commodities.length, searchTerm]);

  // Marker sizing
  const maxBu = useMemo(() => Math.max(1, ...mapEntities.map((e) => e.totalBushels)), [mapEntities]);
  const getRadius = useCallback(
    (bushels: number) => {
      const ratio = Math.log(bushels + 1) / Math.log(maxBu + 1);
      return 6 + ratio * 14;
    },
    [maxBu],
  );

  const toggleCommodity = useCallback((commodity: string) => {
    setActiveCommodities((prev) => {
      const next = new Set(prev);
      if (next.has(commodity)) next.delete(commodity);
      else next.add(commodity);
      return next;
    });
  }, []);

  // Empty state — no data loaded at all
  const hasContracts = totalEntities > 0;

  return (
    <div className="p-6 space-y-6 print:p-2 print:space-y-4">
      <Breadcrumb activeModule="entity-map" onNavigate={onNavigate ?? (() => {})} />

      <h2 className="text-2xl font-bold">Entity Map</h2>

      {/* KPI StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="📍 Entities Mapped"
          value={hasContracts ? `${mappedCount} / ${totalEntities}` : '—'}
          delta={unmappedEntities.length > 0 ? `${unmappedEntities.length} unmapped` : undefined}
          deltaDirection={mappedCount === totalEntities ? 'up' : mappedCount > 0 ? 'neutral' : 'down'}
        />
        <StatCard
          label="Volume Coverage"
          value={hasContracts ? formatPercent(volumeCoverage / 100) : '—'}
          deltaDirection={volumeCoverage > 80 ? 'up' : volumeCoverage > 50 ? 'neutral' : 'down'}
        />
        <StatCard
          label="Avg Freight Tier"
          value={avgFreightTier ? `${avgFreightTier} ($${(FREIGHT_TIERS[avgFreightTier] ?? 0).toFixed(2)}/bu)` : '—'}
        />
        <StatCard
          label="Farthest Entity"
          value={farthestEntity ? farthestEntity.entity : '—'}
          delta={farthestEntity ? `Tier ${farthestEntity.tier} ($${farthestEntity.cost.toFixed(2)}/bu)` : undefined}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        {/* Commodity filters */}
        {commodities.map((c) => (
          <button
            key={c}
            onClick={() => toggleCommodity(c)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              activeCommodities.has(c)
                ? 'text-white border-transparent'
                : 'text-[var(--text-muted)] border-[var(--border-default)] bg-transparent'
            }`}
            style={activeCommodities.has(c) ? { backgroundColor: getCommodityColor(c) } : undefined}
          >
            {c}
          </button>
        ))}

        <div className="flex-1" />

        {/* Entity search */}
        <input
          type="text"
          placeholder="Search entities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] dark:bg-gray-700 w-48"
        />

        {/* Manage Locations button */}
        <button
          onClick={() => setShowManager(!showManager)}
          className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showManager ? 'Hide Manager' : 'Manage Locations'}
        </button>
      </div>

      {/* Location Manager Panel */}
      {showManager && (
        <LocationManager
          unmappedEntities={unmappedEntities}
          mappedEntities={mapEntities}
          elevatorLocation={elevatorLocation}
          onSetEntity={setEntityLocation}
          onSetElevator={setElevatorLocation}
          onRemoveEntity={removeEntityLocation}
        />
      )}

      {/* Map */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden no-print">
        {!hasContracts ? (
          <div className="h-[400px] flex items-center justify-center text-[var(--text-muted)]">
            Upload iRely contracts to see entities on the map
          </div>
        ) : (
          <MapContainer
            center={
              elevatorLocation
                ? [elevatorLocation.lat, elevatorLocation.lon]
                : [39.8, -98.5]
            }
            zoom={elevatorLocation ? 8 : 4}
            className="h-[400px] md:h-[500px] lg:h-[600px] w-full z-0"
          >
            <TileLayer
              key={isDark ? 'dark' : 'light'}
              url={isDark ? DARK_TILES : LIGHT_TILES}
              attribution={TILE_ATTRIBUTION}
            />

            {filteredEntities.length > 0 && (
              <FitBounds
                entities={filteredEntities}
                elevatorLat={elevatorLocation?.lat}
                elevatorLon={elevatorLocation?.lon}
              />
            )}

            {/* Elevator marker */}
            {elevatorLocation && (
              <Marker position={[elevatorLocation.lat, elevatorLocation.lon]}>
                <Popup>
                  <strong>{elevatorLocation.name}</strong>
                  <br />
                  <span className="text-xs text-[var(--text-muted)]">Elevator Location</span>
                </Popup>
              </Marker>
            )}

            {/* Entity markers */}
            {filteredEntities.map((entity) => (
              <CircleMarker
                key={entity.entity}
                center={[entity.lat, entity.lon]}
                radius={getRadius(entity.totalBushels)}
                pathOptions={{
                  color: getCommodityColor(entity.primaryCommodity),
                  fillColor: getCommodityColor(entity.primaryCommodity),
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <div className="font-bold text-base mb-1">{entity.entity}</div>
                    <div className="text-[var(--text-muted)] text-xs mb-2">{entity.address}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Volume:</span>
                        <span className="font-semibold">{formatBushelsShort(entity.totalBushels)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contracts:</span>
                        <span className="font-semibold">{entity.contractCount}</span>
                      </div>
                      {entity.avgFreightTier && (
                        <div className="flex justify-between">
                          <span>Freight:</span>
                          <span className="font-semibold">
                            Tier {entity.avgFreightTier} ({formatCurrency(entity.avgFreightCostPerBu ?? 0)}/bu)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
                      <div className="text-xs font-medium mb-1">Commodities:</div>
                      {entity.commodities.map((c) => (
                        <div key={c.commodity} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: getCommodityColor(c.commodity) }}
                          />
                          <span>{c.commodity}</span>
                          <span className="text-[var(--text-muted)] ml-auto">{formatBushelsShort(c.bushels)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Entity Detail Table */}
      {mapEntities.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="font-semibold mb-3">Mapped Entities ({mapEntities.length})</h3>
          <DataTable columns={tableColumns} data={filteredEntities} />
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-[var(--text-muted)] mt-8 pt-4 border-t">
        Ag Source Grain Intelligence &middot; Entity Map
      </div>
    </div>
  );
}

// ─── Location Manager Panel ─────────────────────────────────────────────────

interface LocationManagerProps {
  unmappedEntities: string[];
  mappedEntities: MapEntity[];
  elevatorLocation: { lat: number; lon: number; name: string } | null;
  onSetEntity: (loc: EntityLocation) => void;
  onSetElevator: (loc: { lat: number; lon: number; name: string }) => void;
  onRemoveEntity: (entity: string) => void;
}

function LocationManager({
  unmappedEntities,
  mappedEntities,
  elevatorLocation,
  onSetEntity,
  onSetElevator,
  onRemoveEntity,
}: LocationManagerProps) {
  const [elevatorAddress, setElevatorAddress] = useState('');
  const [elevatorName, setElevatorName] = useState(elevatorLocation?.name ?? 'Ag Source Elevator');
  const [entityName, setEntityName] = useState('');
  const [entityAddress, setEntityAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSetElevator = async () => {
    if (!elevatorAddress.trim()) return;
    setGeocoding(true);
    setGeocodeMsg('');
    const result = await geocodeAddress(elevatorAddress);
    if (result) {
      onSetElevator({ lat: result.lat, lon: result.lon, name: elevatorName || 'Elevator' });
      setGeocodeMsg(`Set elevator at ${result.displayName}`);
      setElevatorAddress('');
    } else {
      setGeocodeMsg('Could not find that address. Try a more specific location.');
    }
    setGeocoding(false);
  };

  const handleAddEntity = async () => {
    if (!entityName.trim() || !entityAddress.trim()) return;
    setGeocoding(true);
    setGeocodeMsg('');
    const result = await geocodeAddress(entityAddress);
    if (result) {
      onSetEntity({
        entity: entityName.trim(),
        lat: result.lat,
        lon: result.lon,
        address: result.displayName,
        geocodedAt: new Date().toISOString(),
      });
      setGeocodeMsg(`Added ${entityName}`);
      setEntityName('');
      setEntityAddress('');
    } else {
      setGeocodeMsg('Could not geocode that address.');
    }
    setGeocoding(false);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const items = parseEntityCSV(text);
    if (items.length === 0) {
      setGeocodeMsg('No valid rows found in CSV. Expected columns: Entity Name, Address');
      return;
    }

    setGeocodeMsg(`Geocoding ${items.length} entities (1/sec rate limit)...`);
    setBatchProgress({ done: 0, total: items.length });

    const controller = new AbortController();
    abortRef.current = controller;

    const results = await geocodeBatch(
      items,
      (done, total) => setBatchProgress({ done, total }),
      controller.signal,
    );

    abortRef.current = null;
    setBatchProgress(null);

    // Save results
    const locs: EntityLocation[] = [];
    for (const [entity, result] of results) {
      locs.push({
        entity,
        lat: result.lat,
        lon: result.lon,
        address: result.displayName,
        geocodedAt: new Date().toISOString(),
      });
    }

    if (locs.length > 0) {
      const store = useEntityLocationStore.getState();
      store.setEntityLocations(locs);
    }

    const failed = items.length - results.size;
    setGeocodeMsg(
      `Geocoded ${results.size} of ${items.length} entities${failed > 0 ? ` (${failed} could not be found)` : ''}`,
    );

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelBatch = () => {
    abortRef.current?.abort();
    setBatchProgress(null);
    setGeocodeMsg('Batch geocoding cancelled');
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4 space-y-5 no-print">
      <h3 className="font-semibold text-lg">Location Manager</h3>

      {/* Elevator Setup */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">Elevator Location</h4>
        {elevatorLocation ? (
          <div className="text-sm">
            <span className="font-medium">{elevatorLocation.name}</span>
            <span className="text-[var(--text-muted)] ml-2">
              ({elevatorLocation.lat.toFixed(4)}, {elevatorLocation.lon.toFixed(4)})
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Not set — configure your elevator's location</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Elevator name"
            value={elevatorName}
            onChange={(e) => setElevatorName(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] dark:bg-gray-700 w-40"
          />
          <input
            type="text"
            placeholder="Address (e.g., 123 Main St, Anytown, IA)"
            value={elevatorAddress}
            onChange={(e) => setElevatorAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetElevator()}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] dark:bg-gray-700 flex-1"
          />
          <button
            onClick={handleSetElevator}
            disabled={geocoding || !elevatorAddress.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {geocoding ? 'Searching...' : 'Set Location'}
          </button>
        </div>
      </div>

      {/* Add Single Entity */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">Add Entity Location</h4>
        <div className="flex gap-2">
          <select
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] dark:bg-gray-700 w-56"
          >
            <option value="">Select entity...</option>
            {unmappedEntities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Address (e.g., Ames, IA or full address)"
            value={entityAddress}
            onChange={(e) => setEntityAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddEntity()}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] dark:bg-gray-700 flex-1"
          />
          <button
            onClick={handleAddEntity}
            disabled={geocoding || !entityName || !entityAddress.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {geocoding ? 'Searching...' : 'Add'}
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">Bulk Import (CSV)</h4>
        <p className="text-xs text-[var(--text-muted)]">
          Upload a CSV with columns: Entity Name, Address (or Entity Name, City, State)
        </p>
        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleCSVUpload}
            disabled={!!batchProgress}
            className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[var(--border-default)] dark:file:border-gray-600 file:text-sm file:font-medium file:bg-[var(--bg-surface)] dark:file:bg-gray-700 file:text-[var(--text-secondary)] dark:file:text-[var(--text-muted)] hover:file:bg-[var(--bg-surface-raised)] dark:hover:file:bg-gray-600 file:transition-colors"
          />
          {batchProgress && (
            <>
              <div className="flex-1 bg-[var(--bg-inset)] dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {batchProgress.done}/{batchProgress.total}
              </span>
              <button
                onClick={handleCancelBatch}
                className="text-xs text-[var(--negative)] hover:text-[var(--negative)] font-medium"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status message */}
      {geocodeMsg && (
        <p className="text-sm text-[var(--accent)]">{geocodeMsg}</p>
      )}

      {/* Mapped entities list (compact) */}
      {mappedEntities.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">
            Mapped Entities ({mappedEntities.length})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {mappedEntities.map((e) => (
              <div key={e.entity} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--bg-surface-raised)] dark:hover:bg-gray-750">
                <span className="font-medium">{e.entity}</span>
                <button
                  onClick={() => onRemoveEntity(e.entity)}
                  className="text-red-500 hover:text-[var(--negative)] text-xs"
                  title="Remove location"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
