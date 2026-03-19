import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { sortByCommodityOrder } from '../utils/commodityColors';

export interface ScenarioImpact {
  commodity: string;
  pricingType: string;
  contractCount: number;
  totalBushels: number;
  currentAvgFutures: number | null;
  scenarioFutures: number;
  pnlImpact: number;
  explanation: string;
}

export interface CommodityScenario {
  commodity: string;
  currentAvgFutures: number | null;
  scenarioPrice: number;
  priceChange: number;
  impacts: ScenarioImpact[];
  totalPnl: number;
  basisContracts: number;
  htaContracts: number;
  pricedContracts: number;
  cashContracts: number;
}

export function useScenario(scenarioPrices: Record<string, number>) {
  const contracts = useContractStore((s) => s.contracts);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);

    // Group by commodity
    const byCommodity = new Map<string, typeof openContracts>();
    for (const c of openContracts) {
      if (!byCommodity.has(c.commodityCode)) byCommodity.set(c.commodityCode, []);
      byCommodity.get(c.commodityCode)!.push(c);
    }

    const commodities = [...byCommodity.keys()].sort(sortByCommodityOrder);

    // Compute current avg futures per commodity
    const currentFuturesMap = new Map<string, { sum: number; weight: number }>();
    for (const c of openContracts) {
      if (c.futures !== null && c.futures !== undefined && c.pricedQty > 0) {
        if (!currentFuturesMap.has(c.commodityCode)) {
          currentFuturesMap.set(c.commodityCode, { sum: 0, weight: 0 });
        }
        const entry = currentFuturesMap.get(c.commodityCode)!;
        entry.sum += c.futures * c.pricedQty;
        entry.weight += c.pricedQty;
      }
    }

    const currentAvgFutures = new Map<string, number | null>();
    for (const commodity of commodities) {
      const entry = currentFuturesMap.get(commodity);
      currentAvgFutures.set(commodity, entry && entry.weight > 0 ? entry.sum / entry.weight : null);
    }

    const scenarios: CommodityScenario[] = commodities.map((commodity) => {
      const group = byCommodity.get(commodity)!;
      const currentAvg = currentAvgFutures.get(commodity) || null;
      const scenarioPrice = scenarioPrices[commodity] ?? (currentAvg ?? 5);
      const priceChange = currentAvg !== null ? scenarioPrice - currentAvg : 0;

      const impacts: ScenarioImpact[] = [];
      let totalPnl = 0;
      let basisCount = 0;
      let htaCount = 0;
      let pricedCount = 0;
      let cashCount = 0;

      // Group by pricing type
      const byType = new Map<string, typeof group>();
      for (const c of group) {
        if (!byType.has(c.pricingType)) byType.set(c.pricingType, []);
        byType.get(c.pricingType)!.push(c);
      }

      for (const [pricingType, typeGroup] of byType) {
        const totalBushels = typeGroup.reduce((s, c) => s + c.balance, 0);
        const contractCount = typeGroup.length;
        let pnlImpact = 0;
        let explanation = '';

        switch (pricingType) {
          case 'Basis': {
            // Basis contracts: futures are unpriced. If futures move, their cost/revenue changes.
            // Purchase Basis: higher futures = higher cost = negative impact
            // Sale Basis: higher futures = higher revenue = positive impact
            const purchaseBu = typeGroup.filter((c) => c.contractType === 'Purchase').reduce((s, c) => s + c.balance, 0);
            const saleBu = typeGroup.filter((c) => c.contractType === 'Sale').reduce((s, c) => s + c.balance, 0);
            // Net exposure: sale bushels benefit from higher prices, purchase bushels hurt
            pnlImpact = (saleBu - purchaseBu) * priceChange;
            explanation = `Futures unpriced: ${purchaseBu > 0 ? `${(purchaseBu / 1000).toFixed(0)}K buy` : ''}${purchaseBu > 0 && saleBu > 0 ? ', ' : ''}${saleBu > 0 ? `${(saleBu / 1000).toFixed(0)}K sell` : ''} exposed to futures movement`;
            basisCount += contractCount;
            break;
          }
          case 'HTA': {
            // HTA: futures are locked, basis is unpriced. Futures movement doesn't affect P&L.
            pnlImpact = 0;
            explanation = 'Futures locked, basis unpriced — not affected by futures change';
            htaCount += contractCount;
            break;
          }
          case 'Priced': {
            // Fully priced: no exposure
            pnlImpact = 0;
            explanation = 'Fully priced — no futures exposure';
            pricedCount += contractCount;
            break;
          }
          case 'Cash': {
            // Cash: no futures component
            pnlImpact = 0;
            explanation = 'Cash contract — no futures component';
            cashCount += contractCount;
            break;
          }
        }

        totalPnl += pnlImpact;

        impacts.push({
          commodity,
          pricingType,
          contractCount,
          totalBushels,
          currentAvgFutures: currentAvg,
          scenarioFutures: scenarioPrice,
          pnlImpact,
          explanation,
        });
      }

      return {
        commodity,
        currentAvgFutures: currentAvg,
        scenarioPrice,
        priceChange,
        impacts,
        totalPnl,
        basisContracts: basisCount,
        htaContracts: htaCount,
        pricedContracts: pricedCount,
        cashContracts: cashCount,
      };
    });

    const totalPnl = scenarios.reduce((s, sc) => s + sc.totalPnl, 0);

    return { scenarios, totalPnl, commodities };
  }, [contracts, scenarioPrices]);
}
