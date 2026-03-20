import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useContractStore } from '../../store/useContractStore';
import { useScenario } from '../../hooks/useScenario';
import { useUnpricedExposure } from '../../hooks/useUnpricedExposure';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatCurrency, formatBushelsShort } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { sortByCommodityOrder } from '../../utils/commodityColors';
import { weightedAverage } from '../../utils/weightedAverage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

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

  const [scenarioPrices, setScenarioPrices] = useState<Record<string, number>>(defaultPrices);

  // Sync defaults when data changes
  useEffect(() => {
    setScenarioPrices(defaultPrices);
  }, [defaultPrices]);

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handlePriceChange = useCallback((commodity: string, value: number) => {
    // Debounce slider updates
    if (debounceRef.current[commodity]) clearTimeout(debounceRef.current[commodity]);
    debounceRef.current[commodity] = setTimeout(() => {
      setScenarioPrices((prev) => ({ ...prev, [commodity]: value }));
    }, 50);
  }, []);

  const handleReset = useCallback(() => {
    setScenarioPrices(defaultPrices);
  }, [defaultPrices]);

  const { scenarios, totalPnl, commodities } = useScenario(scenarioPrices);
  const { totalNetExposure, commoditySummaries: exposureSummaries } = useUnpricedExposure();

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
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Reset to Current
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
        Adjust futures prices below to see the estimated impact on your open positions.
        This is a standalone simulation — it does not affect other modules.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L Impact"
          value={formatCurrency(totalPnl)}
          deltaDirection={totalPnl > 0 ? 'up' : totalPnl < 0 ? 'down' : 'neutral'}
          colorClass={totalPnl < 0 ? 'border-red-300 dark:border-red-700' : totalPnl > 0 ? 'border-green-300 dark:border-green-700' : ''}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-4">Futures Price Adjustments</h3>
        <div className="space-y-6">
          {sortedCommodities.map((commodity) => {
            const current = defaultPrices[commodity] || 5;
            const scenario = scenarioPrices[commodity] ?? current;
            const change = scenario - current;
            return (
              <div key={commodity} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(commodity) }} />
                    <span className="font-medium">{commodity}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Current: {formatCurrency(current)}
                    </span>
                    <span className="font-semibold">
                      Scenario: {formatCurrency(scenario)}
                    </span>
                    {change !== 0 && (
                      <span className={change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        ({change > 0 ? '+' : ''}{formatCurrency(change)})
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={0.05}
                  value={scenario}
                  onChange={(e) => handlePriceChange(commodity, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>$0.00</span>
                  <span>$25.00</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Impact breakdown per commodity */}
      {scenarios.map((sc) => {
        if (sc.impacts.length === 0) return null;
        return (
          <div key={sc.commodity} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(sc.commodity) }} />
                <h3 className="text-lg font-semibold">{sc.commodity}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${sc.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sc.totalPnl > 0 ? '+' : ''}{formatCurrency(sc.totalPnl)}
                </span>
                {sc.priceChange !== 0 && (
                  <AlertBadge level={sc.totalPnl >= 0 ? 'ok' : 'warning'}>
                    {sc.priceChange > 0 ? '+' : ''}{formatCurrency(sc.priceChange)}/bu
                  </AlertBadge>
                )}
              </div>
            </div>

            {/* Net exposure impact for this commodity */}
            {(() => {
              const nei = netExposureImpact.byCommodity.find((n) => n.commodity === sc.commodity);
              if (!nei) return null;
              return (
                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
                  <span className="font-medium text-blue-800 dark:text-blue-200">Net Unpriced: </span>
                  <span className={nei.netBu > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                    {nei.netBu > 0 ? 'Long' : 'Short'} {formatBushelsShort(Math.abs(nei.netBu))}
                  </span>
                  {nei.impact !== 0 && (
                    <span className={`ml-2 font-medium ${nei.impact >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
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
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({impact.contractCount} contracts, {formatBushelsShort(impact.totalBushels)} bu)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{impact.explanation}</p>
                  </div>
                  <span className={`font-semibold text-sm ${impact.pnlImpact > 0 ? 'text-green-600 dark:text-green-400' : impact.pnlImpact < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {impact.pnlImpact === 0 ? '$0.00' : `${impact.pnlImpact > 0 ? '+' : ''}${formatCurrency(impact.pnlImpact)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
