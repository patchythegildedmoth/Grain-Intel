import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useContractStore } from '../../store/useContractStore';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { useScenario } from '../../hooks/useScenario';
import { useUnpricedExposure } from '../../hooks/useUnpricedExposure';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatCurrency, formatBushelsShort } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { sortByCommodityOrder } from '../../utils/commodityColors';
import { weightedAverage } from '../../utils/weightedAverage';
import { FREIGHT_TIERS } from '../../utils/freightTiers';
import { resolveContractFreight, calcMarginByTier } from '../../utils/freightMarginCalc';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const TIER_LETTERS = Object.keys(FREIGHT_TIERS); // ['A', 'B', 'C', ...]

export function ScenarioPanel() {
  const contracts = useContractStore((s) => s.contracts);

  // Compute default prices (current avg futures per commodity)
  const defaultPrices = useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);
    const prices: Record<string, number> = {};
    const commodities = new Set<string>();
    for (const c of openContracts) commodities.add(c.commodityCode);

    for (const commodity of commodities) {
      const group = openContracts.filter((c) => c.commodityCode === commodity);
      const avg = weightedAverage(group.map((c) => ({ value: c.futures, weight: c.pricedQty })));
      prices[commodity] = avg !== null ? Math.round(avg * 100) / 100 : 5;
    }
    return prices;
  }, [contracts]);

  // Compute default basis (current avg basis per commodity)
  const defaultBasis = useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);
    const basis: Record<string, number> = {};
    const commodities = new Set<string>();
    for (const c of openContracts) commodities.add(c.commodityCode);

    for (const commodity of commodities) {
      const group = openContracts.filter((c) => c.commodityCode === commodity);
      const avg = weightedAverage(group.map((c) => ({ value: c.basis, weight: c.balance })));
      basis[commodity] = avg !== null ? Math.round(avg * 100) / 100 : 0;
    }
    return basis;
  }, [contracts]);

  const [scenarioPrices, setScenarioPrices] = useState<Record<string, number>>(defaultPrices);
  const [scenarioBasisState, setScenarioBasisState] = useState<Record<string, number>>(defaultBasis);

  // Sync defaults when data changes
  useEffect(() => {
    setScenarioPrices(defaultPrices);
    setScenarioBasisState(defaultBasis);
  }, [defaultPrices, defaultBasis]);

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handlePriceChange = useCallback((commodity: string, value: number) => {
    if (debounceRef.current[commodity]) clearTimeout(debounceRef.current[commodity]);
    debounceRef.current[commodity] = setTimeout(() => {
      setScenarioPrices((prev) => ({ ...prev, [commodity]: value }));
    }, 50);
  }, []);

  const handleBasisChange = useCallback((commodity: string, value: number) => {
    const key = `basis_${commodity}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      setScenarioBasisState((prev) => ({ ...prev, [commodity]: value }));
    }, 50);
  }, []);

  const handleReset = useCallback(() => {
    setScenarioPrices(defaultPrices);
    setScenarioBasisState(defaultBasis);
  }, [defaultPrices, defaultBasis]);

  const { scenarios, totalPnl, commodities } = useScenario(scenarioPrices, scenarioBasisState);
  const { totalNetExposure, commoditySummaries: exposureSummaries } = useUnpricedExposure();

  // Freight tier what-if
  const [freightTierCap, setFreightTierCap] = useState<string | null>(null);
  const sellBasis = useMarketDataStore((s) => s.current.sellBasis);
  const freightTiers = useMarketDataStore((s) => s.current.freightTiers);

  const freightWhatIf = useMemo(() => {
    if (!freightTierCap) return null;

    const enriched = resolveContractFreight(contracts, freightTiers, sellBasis);
    if (enriched.length === 0) return null;

    // Baseline margins
    const baseline = calcMarginByTier(enriched);

    // Build tier overrides: any contract with a tier > cap gets capped
    const capIdx = TIER_LETTERS.indexOf(freightTierCap);
    const overrides: Record<string, string> = {};
    for (const c of enriched) {
      if (c.resolvedTier) {
        const tierIdx = TIER_LETTERS.indexOf(c.resolvedTier);
        if (tierIdx > capIdx) {
          overrides[c.contractNumber] = freightTierCap;
        }
      }
    }

    const whatIf = calcMarginByTier(enriched, overrides);

    // Compute total margin delta
    const baselineTotal = baseline.reduce((s, m) => {
      const tierTotal = m.tiers.reduce((ts, t) => ts + (t.totalNetMargin ?? 0), 0);
      return s + tierTotal;
    }, 0);
    const whatIfTotal = whatIf.reduce((s, m) => {
      const tierTotal = m.tiers.reduce((ts, t) => ts + (t.totalNetMargin ?? 0), 0);
      return s + tierTotal;
    }, 0);

    const contractsAffected = Object.keys(overrides).length;

    return {
      marginDelta: whatIfTotal - baselineTotal,
      contractsAffected,
      hasSellBasis: sellBasis.length > 0,
    };
  }, [contracts, freightTiers, sellBasis, freightTierCap]);

  // Compute net exposure dollar impact from scenario price changes
  const netExposureImpact = useMemo(() => {
    let total = 0;
    const byCommodity: { commodity: string; netBu: number; priceChange: number; impact: number }[] = [];
    for (const sc of scenarios) {
      const es = exposureSummaries.find((e) => e.commodity === sc.commodity);
      if (es && sc.priceChange !== 0) {
        // Net long: exposed to price drops (purchase unpriced > sale unpriced)
        // If price goes up $1 and we're net long 50K, our purchase cost increases by $50K = negative impact
        // If price goes up $1 and we're net short 50K, our sale revenue increases = positive impact
        // Impact = -netExposure * priceChange (net long loses when prices rise for purchases)
        // Actually: Basis purchase = cost goes up when futures rise = negative
        //           Basis sale = revenue goes up when futures rise = positive
        // So impact for net = (saleExposure - purchaseExposure) * priceChange = -netExposure * priceChange
        const impact = -es.netExposure * sc.priceChange;
        total += impact;
        if (es.netExposure !== 0) {
          byCommodity.push({
            commodity: sc.commodity,
            netBu: es.netExposure,
            priceChange: sc.priceChange,
            impact,
          });
        }
      }
    }
    return { total, byCommodity };
  }, [scenarios, exposureSummaries]);

  const sortedCommodities = useMemo(
    () => [...commodities].sort(sortByCommodityOrder),
    [commodities]
  );

  const chartData = useMemo(() => {
    return scenarios
      .filter((s) => s.totalPnl !== 0)
      .map((s) => ({
        commodity: s.commodity,
        pnl: s.totalPnl,
        color: getCommodityColor(s.commodity),
      }));
  }, [scenarios]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">What-If Scenario Panel</h2>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm bg-[var(--bg-inset)] dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Reset to Current
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-600/20 dark:border-blue-600/20 rounded-lg p-3 text-sm text-[var(--accent)]">
        Adjust futures prices below to see the estimated impact on your open positions.
        This is a standalone simulation — it does not affect other modules.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L Impact"
          value={formatCurrency(totalPnl)}
          deltaDirection={totalPnl > 0 ? 'up' : totalPnl < 0 ? 'down' : 'neutral'}
          colorClass={totalPnl < 0 ? 'border-red-600/20 dark:border-red-700' : totalPnl > 0 ? 'border-green-300 dark:border-green-700' : ''}
        />
        <StatCard label="Commodities" value={String(commodities.length)} />
        <StatCard
          label="Exposed Contracts"
          value={String(scenarios.reduce((s, sc) => s + sc.basisContracts, 0))}
        />
        <StatCard
          label="Net Exposure"
          value={totalNetExposure === 0 ? 'Flat' : `${totalNetExposure > 0 ? 'Long' : 'Short'} ${formatBushelsShort(Math.abs(totalNetExposure))}`}
          delta={netExposureImpact.total !== 0 ? `Impact: ${netExposureImpact.total > 0 ? '+' : ''}${formatCurrency(netExposureImpact.total)}` : undefined}
          deltaDirection={netExposureImpact.total > 0 ? 'up' : netExposureImpact.total < 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* P&L chart */}
      {chartData.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="text-lg font-semibold mb-3">P&L Impact by Commodity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis dataKey="commodity" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <ReferenceLine y={0} stroke="#666" />
              <Bar dataKey="pnl" name="P&L Impact" radius={[4, 4, 4, 4]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? '#22C55E' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Price sliders */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
        <h3 className="text-lg font-semibold mb-4">Price Adjustments</h3>
        <div className="space-y-6">
          {sortedCommodities.map((commodity) => {
            const currentFut = defaultPrices[commodity] || 5;
            const scenarioFut = scenarioPrices[commodity] ?? currentFut;
            const futChange = scenarioFut - currentFut;
            const currentBas = defaultBasis[commodity] || 0;
            const scenarioBas = scenarioBasisState[commodity] ?? currentBas;
            const basChange = scenarioBas - currentBas;
            return (
              <div key={commodity} className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(commodity) }} />
                  <span className="font-medium">{commodity}</span>
                </div>
                {/* Futures slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)] text-xs font-medium uppercase">Futures</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)]">
                        Current: {formatCurrency(currentFut)}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(scenarioFut)}
                      </span>
                      {futChange !== 0 && (
                        <span className={futChange > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>
                          ({futChange > 0 ? '+' : ''}{formatCurrency(futChange)})
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={0.05}
                    value={scenarioFut}
                    onChange={(e) => handlePriceChange(commodity, parseFloat(e.target.value))}
                    className="w-full h-2 bg-[var(--bg-inset)] dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>
                {/* Basis slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)] text-xs font-medium uppercase">Basis</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)]">
                        Current: {formatCurrency(currentBas)}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(scenarioBas)}
                      </span>
                      {basChange !== 0 && (
                        <span className={basChange > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>
                          ({basChange > 0 ? '+' : ''}{formatCurrency(basChange)})
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-3}
                    max={5}
                    step={0.01}
                    value={scenarioBas}
                    onChange={(e) => handleBasisChange(commodity, parseFloat(e.target.value))}
                    className="w-full h-2 bg-[var(--bg-inset)] dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Freight Tier What-If */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
        <h3 className="text-lg font-semibold mb-3">🚚 Freight Tier Cap</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          What if all contracts above a certain tier were capped? See the margin impact of renegotiating freight terms.
        </p>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">Cap at tier:</label>
          <select
            value={freightTierCap ?? ''}
            onChange={(e) => setFreightTierCap(e.target.value || null)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] dark:bg-gray-700 text-sm"
          >
            <option value="">No cap (current)</option>
            {TIER_LETTERS.filter((t) => t !== 'A').map((tier) => (
              <option key={tier} value={tier}>
                Tier {tier} (${FREIGHT_TIERS[tier].toFixed(2)}/bu max)
              </option>
            ))}
          </select>
          {freightWhatIf && freightWhatIf.hasSellBasis && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[var(--text-muted)]">
                {freightWhatIf.contractsAffected} contracts affected
              </span>
              <span className={`font-semibold ${freightWhatIf.marginDelta > 0 ? 'text-[var(--positive)]' : freightWhatIf.marginDelta < 0 ? 'text-[var(--negative)]' : ''}`}>
                {freightWhatIf.marginDelta > 0 ? '+' : ''}
                {formatCurrency(freightWhatIf.marginDelta)} margin impact
              </span>
            </div>
          )}
          {freightWhatIf && !freightWhatIf.hasSellBasis && (
            <span className="text-sm text-[var(--text-muted)]">Enter sell basis in Daily Inputs to see margin impact</span>
          )}
        </div>
      </div>

      {/* Impact breakdown per commodity */}
      {scenarios.map((sc) => {
        if (sc.impacts.length === 0) return null;
        return (
          <div key={sc.commodity} className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(sc.commodity) }} />
                <h3 className="text-lg font-semibold">{sc.commodity}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${sc.totalPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {sc.totalPnl > 0 ? '+' : ''}{formatCurrency(sc.totalPnl)}
                </span>
                {sc.priceChange !== 0 && (
                  <AlertBadge level={sc.futuresPnl >= 0 ? 'ok' : 'warning'}>
                    F: {sc.priceChange > 0 ? '+' : ''}{formatCurrency(sc.priceChange)}/bu
                  </AlertBadge>
                )}
                {sc.basisChange !== 0 && (
                  <AlertBadge level={sc.basisPnl >= 0 ? 'ok' : 'warning'}>
                    B: {sc.basisChange > 0 ? '+' : ''}{formatCurrency(sc.basisChange)}/bu
                  </AlertBadge>
                )}
              </div>
            </div>

            {/* Net exposure impact for this commodity */}
            {(() => {
              const nei = netExposureImpact.byCommodity.find((n) => n.commodity === sc.commodity);
              if (!nei) return null;
              return (
                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-600/20 dark:border-blue-600/20 text-sm">
                  <span className="font-medium text-[var(--accent)]">Net Unpriced: </span>
                  <span className={nei.netBu > 0 ? 'text-green-700 dark:text-green-300' : 'text-[var(--negative)] dark:text-red-300'}>
                    {nei.netBu > 0 ? 'Long' : 'Short'} {formatBushelsShort(Math.abs(nei.netBu))}
                  </span>
                  {nei.impact !== 0 && (
                    <span className={`ml-2 font-medium ${nei.impact >= 0 ? 'text-green-700 dark:text-green-300' : 'text-[var(--negative)] dark:text-red-300'}`}>
                      → {nei.impact > 0 ? '+' : ''}{formatCurrency(nei.impact)} impact
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              {sc.impacts.map((impact) => (
                <div
                  key={impact.pricingType}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{impact.pricingType}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ({impact.contractCount} contracts, {formatBushelsShort(impact.totalBushels)} bu)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{impact.explanation}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold text-sm ${impact.pnlImpact > 0 ? 'text-[var(--positive)]' : impact.pnlImpact < 0 ? 'text-[var(--negative)]' : 'text-[var(--text-muted)]'}`}>
                      {impact.pnlImpact === 0 ? '$0.00' : `${impact.pnlImpact > 0 ? '+' : ''}${formatCurrency(impact.pnlImpact)}`}
                    </span>
                    {(impact.futuresImpact !== 0 || impact.basisImpact !== 0) && impact.pnlImpact !== 0 && (
                      <div className="text-xs text-[var(--text-muted)]">
                        {impact.futuresImpact !== 0 && <span>F: {impact.futuresImpact > 0 ? '+' : ''}{formatCurrency(impact.futuresImpact)}</span>}
                        {impact.futuresImpact !== 0 && impact.basisImpact !== 0 && <span> · </span>}
                        {impact.basisImpact !== 0 && <span>B: {impact.basisImpact > 0 ? '+' : ''}{formatCurrency(impact.basisImpact)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
