import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useEntityLocationStore } from '../store/useEntityLocationStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { getFreightCost, FREIGHT_TIERS } from '../utils/freightTiers';
import { groupBy } from '../utils/groupBy';
import { sortByCommodityOrder } from '../utils/commodityColors';
import type { ElevatorLocation } from '../types/entityLocation';

export interface MapEntity {
  entity: string;
  lat: number;
  lon: number;
  address: string;
  totalBushels: number;
  purchaseBushels: number;
  saleBushels: number;
  purchaseContracts: number;
  saleContracts: number;
  netDirection: 'supplier' | 'buyer' | 'both' | 'none';
  commodities: { commodity: string; bushels: number; percent: number }[];
  primaryCommodity: string;
  contractCount: number;
  freightMix: { term: string; count: number; percent: number }[];
  avgFreightTier: string | null;
  avgFreightCostPerBu: number | null;
}

export interface EntityMapResult {
  mapEntities: MapEntity[];
  unmappedEntities: string[];
  totalEntities: number;
  mappedCount: number;
  volumeCoverage: number;
  avgFreightTier: string | null;
  farthestEntity: { entity: string; tier: string; cost: number } | null;
  elevatorLocation: ElevatorLocation | null;
  commodities: string[];
}

/** Normalize entity name for lookup — must match store normalization */
function normalize(name: string): string {
  return name.trim().toUpperCase();
}

/** Find the nearest tier letter for a given avg cost */
function costToTierLetter(cost: number): string | null {
  if (cost <= 0) return null;
  let closest: string | null = null;
  let closestDist = Infinity;
  for (const [letter, tierCost] of Object.entries(FREIGHT_TIERS)) {
    const dist = Math.abs(tierCost - cost);
    if (dist < closestDist) {
      closestDist = dist;
      closest = letter;
    }
  }
  return closest;
}

export function useEntityMap(showAllGeocoded = false): EntityMapResult {
  const contracts = useContractStore((s) => s.contracts);
  const entityLocations = useEntityLocationStore((s) => s.entityLocations);
  const elevatorLocation = useEntityLocationStore((s) => s.elevatorLocation);
  const freightTiers = useMarketDataStore((s) => s.current.freightTiers);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen && c.balance > 0);

    // Group by entity
    const byEntity = groupBy(openContracts, (c) => normalize(c.entity));
    const allEntityNames = Array.from(byEntity.keys());

    const mapEntities: MapEntity[] = [];
    const unmappedEntities: string[] = [];
    let totalBushels = 0;
    let mappedBushels = 0;

    for (const [entityKey, entityContracts] of byEntity) {
      const entityBu = entityContracts.reduce((s, c) => s + c.balance, 0);
      totalBushels += entityBu;

      const location = entityLocations[entityKey];
      if (!location) {
        // Use original entity name (not normalized) for display
        unmappedEntities.push(entityContracts[0].entity);
        continue;
      }

      mappedBushels += entityBu;

      // Purchase vs Sale breakdown
      const purchases = entityContracts.filter((c) => c.contractType === 'Purchase');
      const sales = entityContracts.filter((c) => c.contractType === 'Sale');
      const purchaseBushels = purchases.reduce((s, c) => s + c.balance, 0);
      const saleBushels = sales.reduce((s, c) => s + c.balance, 0);
      const netDirection: MapEntity['netDirection'] =
        purchaseBushels > 0 && saleBushels > 0 ? 'both'
        : purchaseBushels > 0 ? 'supplier'
        : saleBushels > 0 ? 'buyer'
        : 'none';

      // Commodity breakdown
      const byCommodity = groupBy(entityContracts, (c) => c.commodityCode);
      const commodities = Array.from(byCommodity.entries())
        .map(([commodity, cs]) => {
          const bushels = cs.reduce((s, c) => s + c.balance, 0);
          return { commodity, bushels, percent: entityBu > 0 ? (bushels / entityBu) * 100 : 0 };
        })
        .sort((a, b) => b.bushels - a.bushels);

      const primaryCommodity = commodities[0]?.commodity ?? 'Commodity Other';

      // Freight mix
      const byFreight = groupBy(entityContracts, (c) => c.freightTerm ?? 'Unknown');
      const freightMix = Array.from(byFreight.entries())
        .map(([term, cs]) => ({
          term,
          count: cs.length,
          percent: (cs.length / entityContracts.length) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Average freight cost
      let totalFreightCost = 0;
      let freightBushels = 0;
      for (const c of entityContracts) {
        const tier = freightTiers?.[c.contractNumber] ?? c.freightTier ?? null;
        const cost = getFreightCost(tier);
        totalFreightCost += cost * c.balance;
        freightBushels += c.balance;
      }
      const avgFreightCostPerBu = freightBushels > 0 ? totalFreightCost / freightBushels : null;
      const avgFreightTier = avgFreightCostPerBu !== null ? costToTierLetter(avgFreightCostPerBu) : null;

      mapEntities.push({
        entity: entityContracts[0].entity, // original display name
        lat: location.lat,
        lon: location.lon,
        address: location.address,
        totalBushels: entityBu,
        purchaseBushels,
        saleBushels,
        purchaseContracts: purchases.length,
        saleContracts: sales.length,
        netDirection,
        commodities,
        primaryCommodity,
        contractCount: entityContracts.length,
        freightMix,
        avgFreightTier,
        avgFreightCostPerBu,
      });
    }

    // Include geocoded entities that aren't in current contracts
    if (showAllGeocoded) {
      for (const [key, location] of Object.entries(entityLocations)) {
        if (!byEntity.has(key)) {
          mapEntities.push({
            entity: location.entity,
            lat: location.lat,
            lon: location.lon,
            address: location.address,
            totalBushels: 0,
            purchaseBushels: 0,
            saleBushels: 0,
            purchaseContracts: 0,
            saleContracts: 0,
            netDirection: 'none',
            commodities: [],
            primaryCommodity: 'Commodity Other',
            contractCount: 0,
            freightMix: [],
            avgFreightTier: null,
            avgFreightCostPerBu: null,
          });
        }
      }
    }

    // Sort mapped entities by volume descending (active first, then geocoded-only)
    mapEntities.sort((a, b) => b.totalBushels - a.totalBushels);

    // Sort unmapped alphabetically
    unmappedEntities.sort();

    // KPIs
    const volumeCoverage = totalBushels > 0 ? (mappedBushels / totalBushels) * 100 : 0;

    // Farthest entity by freight cost
    let farthestEntity: EntityMapResult['farthestEntity'] = null;
    for (const me of mapEntities) {
      if (me.avgFreightCostPerBu !== null && me.avgFreightTier !== null) {
        if (!farthestEntity || me.avgFreightCostPerBu > farthestEntity.cost) {
          farthestEntity = {
            entity: me.entity,
            tier: me.avgFreightTier,
            cost: me.avgFreightCostPerBu,
          };
        }
      }
    }

    // Overall avg freight tier across mapped entities
    const totalMappedFreightCost = mapEntities.reduce(
      (s, e) => s + (e.avgFreightCostPerBu ?? 0) * e.totalBushels,
      0,
    );
    const totalMappedBu = mapEntities.reduce((s, e) => s + e.totalBushels, 0);
    const overallAvgCost = totalMappedBu > 0 ? totalMappedFreightCost / totalMappedBu : null;
    const avgFreightTier = overallAvgCost !== null ? costToTierLetter(overallAvgCost) : null;

    // Unique commodities for filter
    const commoditySet = new Set<string>();
    for (const c of openContracts) commoditySet.add(c.commodityCode);
    const commodities = Array.from(commoditySet).sort(sortByCommodityOrder);

    return {
      mapEntities,
      unmappedEntities,
      totalEntities: allEntityNames.length,
      mappedCount: mapEntities.length,
      volumeCoverage,
      avgFreightTier,
      farthestEntity,
      elevatorLocation,
      commodities,
    };
  }, [contracts, entityLocations, elevatorLocation, freightTiers, showAllGeocoded]);
}
