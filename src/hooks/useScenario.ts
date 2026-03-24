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
  futuresImpact: number;
  basisImpact: number;
  explanation: string;
}

export interface CommodityScenario {
  commodity: string;
  currentAvgFutures: number | null;
  currentAvgBasis: number | null;
  scenarioPrice: number;
  scenarioBasis: number;
  priceChange: number;
  basisChange: number;
  impacts: ScenarioImpact[];
  totalPnl: number;
  futuresPnl: number;
  basisPnl: number;
  basisContracts: number;
  htaContracts: number;
  pricedContracts: number;
  cashContracts: number;
}

export function useScenario(scenarioPrices: Record<string, number>, scenarioBasis: Record<string, number>) {
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

    // Compute current avg basis per commodity
    const currentBasisMap = new Map<string, { sum: number; weight: number }>();
    for (const c of openContracts) {
      if (c.basis !== null && c.basis !== undefined && c.balance > 0) {
        if (!currentBasisMap.has(c.commodityCode)) {
          currentBasisMap.set(c.commodityCode, { sum: 0, weight: 0 });
        }
        const entry = currentBasisMap.get(c.commodityCode)!;
        entry.sum += c.basis * c.balance;
        entry.weight += c.balance;
      }
    }

    const currentAvgBasisMap = new Map<string, number | null>();
    for (const commodity of commodities) {
      const entry = currentBasisMap.get(commodity);
      currentAvgBasisMap.set(commodity, entry && entry.weight > 0 ? entry.sum / entry.weight : null);
    }

    const scenarios: CommodityScenario[] = commodities.map((commodity) => {
      const group = byCommodity.get(commodity)!;
      const currentAvg = currentAvgFutures.get(commodity) ?? null;
      const currentBasis = currentAvgBasisMap.get(commodity) ?? null;
      // Use current avg as default, falling back to 5 for futures and 0 for basis
      const defaultFutures = currentAvg ?? 5;
      const defaultBasis = currentBasis ?? 0;
      const scenarioPrice = scenarioPrices[commodity] ?? defaultFutures;
      const scenBasis = scenarioBasis[commodity] ?? defaultBasis;
      // Always compute change from the default — even if currentAvg is null
      const priceChange = scenarioPrice - defaultFutures;
      const basisChange = scenBasis - defaultBasis;

      const impacts: ScenarioImpact[] = [];
      let totalPnl = 0;
      let totalFuturesPnl = 0;
      let totalBasisPnl = 0;
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
        let futuresImpact = 0;
        let basisImpact = 0;
        let explanation = '';

        switch (pricingType) {
          case 'Basis': {
            // Basis contracts: futures unpriced, basis locked.
            // Futures move affects cost/revenue. Basis change does NOT affect (already locked).
            const purchaseBu = typeGroup.filter((c) => c.contractType === 'Purchase').reduce((s, c) => s + c.balance, 0);
            const saleBu = typeGroup.filter((c) => c.contractType === 'Sale').reduce((s, c) => s + c.balance, 0);
            futuresImpact = (saleBu - purchaseBu) * priceChange;
            basisImpact = 0; // basis is locked on these
            explanation = `Futures unpriced: ${purchaseBu > 0 ? `${(purchaseBu / 1000).toFixed(0)}K buy` : ''}${purchaseBu > 0 && saleBu > 0 ? ', ' : ''}${saleBu > 0 ? `${(saleBu / 1000).toFixed(0)}K sell` : ''} exposed to futures. Basis locked — not affected by basis change.`;
            basisCount += contractCount;
            break;
          }
          case 'HTA': {
            // HTA: futures locked, basis unpriced. Basis changes affect P&L.
            // Purchase HTA: higher basis = higher buy cost = negative impact
            // Sale HTA: higher basis = higher sell revenue = positive impact
            // Same sign convention as Basis contracts with futures: (saleBu - purchaseBu)
            const purchaseBu = typeGroup.filter((c) => c.contractType === 'Purchase').reduce((s, c) => s + c.balance, 0);
            const saleBu = typeGroup.filter((c) => c.contractType === 'Sale').reduce((s, c) => s + c.balance, 0);
            futuresImpact = 0; // futures locked
            basisImpact = (saleBu - purchaseBu) * basisChange;
            explanation = `Basis unpriced: ${purchaseBu > 0 ? `${(purchaseBu / 1000).toFixed(0)}K buy` : ''}${purchaseBu > 0 && saleBu > 0 ? ', ' : ''}${saleBu > 0 ? `${(saleBu / 1000).toFixed(0)}K sell` : ''} exposed to basis movement. Futures locked.`;
            htaCount += contractCount;
            break;
          }
          case 'Priced': {
            // Fully priced: no futures or basis exposure
            futuresImpact = 0;
            basisImpact = 0;
            explanation = 'Fully priced — no futures or basis exposure';
            pricedCount += contractCount;
            break;
          }
          case 'Cash': {
            // Cash: no decomposition
            futuresImpact = 0;
            basisImpact = 0;
            explanation = 'Cash contract — no futures or basis component';
            cashCount += contractCount;
            break;
          }
        }

        const pnlImpact = futuresImpact + basisImpact;
        totalPnl += pnlImpact;
        totalFuturesPnl += futuresImpact;
        totalBasisPnl += basisImpact;

        impacts.push({
          commodity,
          pricingType,
          contractCount,
          totalBushels,
          currentAvgFutures: currentAvg,
          scenarioFutures: scenarioPrice,
          pnlImpact,
          futuresImpact,
          basisImpact,
          explanation,
        });
      }

      return {
        commodity,
        currentAvgFutures: currentAvg,
        currentAvgBasis: currentBasis,
        scenarioPrice,
        scenarioBasis: scenBasis,
        priceChange,
        basisChange,
        impacts,
        totalPnl,
        futuresPnl: totalFuturesPnl,
        basisPnl: totalBasisPnl,
        basisContracts: basisCount,
        htaContracts: htaCount,
        pricedContracts: pricedCount,
        cashContracts: cashCount,
      };
    });

    const totalPnl = scenarios.reduce((s, sc) => s + sc.totalPnl, 0);

    return { scenarios, totalPnl, commodities };
  }, [contracts, scenarioPrices, scenarioBasis]);
}
