import { useState, useCallback, useRef } from 'react';
import { useMarketDataStore, isMarketDataStale } from '../../store/useMarketDataStore';
import { useContractStore } from '../../store/useContractStore';
import { useDailyInputScaffold } from '../../hooks/useDailyInputScaffold';
import { parseMarketDataExcel, generateMarketDataTemplate } from '../../pipeline/parseMarketDataExcel';
import type { MarketBasisEntry, FuturesSettlement } from '../../types/marketData';
import { formatNumber, formatDate } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';

export function DailyInputs() {
  const isLoaded = useContractStore((s) => s.isLoaded);
  const { basisRows, settlementRows, commodities, gaps } = useDailyInputScaffold();
  const { current, lastUpdated, updateSellBasis, updateSettlements, updateInTransit, updateHtaPaired, saveCurrentInputs } = useMarketDataStore();
  const stale = isMarketDataStale(lastUpdated);

  // Local state for form editing
  const [basisEdits, setBasisEdits] = useState<Record<string, { basis: string; futuresRef: string }>>({});
  const [settlementEdits, setSettlementEdits] = useState<Record<string, string>>({});
  const [inTransitEdits, setInTransitEdits] = useState<Record<string, string>>({});
  const [htaPairedEdits, setHtaPairedEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setUploadError('Please upload an .xlsx or .xls file');
      return;
    }

    try {
      setUploadError(null);
      setUploadSuccess(null);

      const buffer = await file.arrayBuffer();
      const parsed = parseMarketDataExcel(buffer);

      // Apply parsed data to edit state so user can review before saving
      const newBasisEdits: Record<string, { basis: string; futuresRef: string }> = {};
      for (const entry of parsed.sellBasis) {
        newBasisEdits[`${entry.commodity}|${entry.deliveryMonth}`] = {
          basis: String(entry.basis),
          futuresRef: entry.futuresRef,
        };
      }
      setBasisEdits(newBasisEdits);

      const newSettlementEdits: Record<string, string> = {};
      for (const entry of parsed.settlements) {
        newSettlementEdits[`${entry.commodity}|${entry.contractMonth}`] = String(entry.price);
      }
      setSettlementEdits(newSettlementEdits);

      const newInTransitEdits: Record<string, string> = {};
      for (const [commodity, bushels] of Object.entries(parsed.inTransit)) {
        newInTransitEdits[commodity] = String(bushels);
      }
      if (Object.keys(newInTransitEdits).length > 0) setInTransitEdits(newInTransitEdits);

      const newHtaPairedEdits: Record<string, string> = {};
      for (const [commodity, bushels] of Object.entries(parsed.htaPaired)) {
        newHtaPairedEdits[commodity] = String(bushels);
      }
      if (Object.keys(newHtaPairedEdits).length > 0) setHtaPairedEdits(newHtaPairedEdits);

      const parts: string[] = [];
      if (parsed.sellBasis.length > 0) parts.push(`${parsed.sellBasis.length} basis entries`);
      if (parsed.settlements.length > 0) parts.push(`${parsed.settlements.length} settlements`);
      if (Object.keys(parsed.inTransit).length > 0) parts.push('in-transit');
      if (Object.keys(parsed.htaPaired).length > 0) parts.push('HTA-paired');

      const summary = parts.length > 0
        ? `Loaded ${parts.join(', ')} from ${file.name}. Review values below and click Save All.`
        : `No market data found in ${file.name}. Check the file format.`;

      if (parts.length > 0) {
        setUploadSuccess(summary);
      } else {
        setUploadError(summary);
      }

      if (parsed.warnings.length > 0) {
        setValidationWarnings(parsed.warnings);
      }
    } catch (err) {
      setUploadError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Reset file input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const templateData = {
      basisRows: basisRows.map((r) => ({
        commodity: r.commodity,
        deliveryMonth: r.deliveryMonth,
        basis: r.basis,
        futuresRef: r.futuresRef,
      })),
      settlementRows: settlementRows.map((r) => ({
        commodity: r.commodity,
        contractMonth: r.contractMonth,
        monthCode: r.monthCode,
        price: r.price,
      })),
      commodities,
      inTransit: current.inTransit,
      htaPaired: current.htaPaired,
    };

    const buffer = generateMarketDataTemplate(templateData);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `Market_Inputs_Template_${today}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [basisRows, settlementRows, commodities, current.inTransit, current.htaPaired]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadFile(file);
  }, [handleUploadFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
  }, [handleUploadFile]);

  if (!isLoaded) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-semibold">Upload contracts first</p>
        <p className="text-sm mt-1">Daily market data inputs require contract data to generate the input rows.</p>
      </div>
    );
  }

  const getBasisValue = (commodity: string, deliveryMonth: string): { basis: string; futuresRef: string } => {
    const key = `${commodity}|${deliveryMonth}`;
    if (basisEdits[key]) return basisEdits[key];
    const row = basisRows.find((r) => r.commodity === commodity && r.deliveryMonth === deliveryMonth);
    return {
      basis: row?.basis !== null ? String(row?.basis ?? '') : '',
      futuresRef: row?.futuresRef ?? '',
    };
  };

  const getSettlementValue = (commodity: string, contractMonth: string): string => {
    const key = `${commodity}|${contractMonth}`;
    if (settlementEdits[key]) return settlementEdits[key];
    const row = settlementRows.find((r) => r.commodity === commodity && r.contractMonth === contractMonth);
    return row?.price !== null ? String(row?.price ?? '') : '';
  };

  const getInTransitValue = (commodity: string): string => {
    if (inTransitEdits[commodity] !== undefined) return inTransitEdits[commodity];
    return String(current.inTransit[commodity] ?? '');
  };

  const getHtaPairedValue = (commodity: string): string => {
    if (htaPairedEdits[commodity] !== undefined) return htaPairedEdits[commodity];
    return String(current.htaPaired[commodity] ?? '');
  };

  const handleSave = useCallback(() => {
    const warnings: string[] = [];

    // Build sell basis entries
    const sellBasis: MarketBasisEntry[] = basisRows.map((row) => {
      const edit = basisEdits[`${row.commodity}|${row.deliveryMonth}`];
      const basis = edit ? parseFloat(edit.basis) : row.basis;
      const futuresRef = edit ? edit.futuresRef : row.futuresRef;

      if (basis !== null && !isNaN(basis as number) && (basis as number > 3.0 || basis as number < -3.0)) {
        warnings.push(`${row.commodity} ${row.deliveryMonth}: basis ${basis} is outside ±$3.00 range`);
      }

      return {
        commodity: row.commodity,
        deliveryMonth: row.deliveryMonth,
        basis: basis !== null && !isNaN(basis as number) ? (basis as number) : 0,
        futuresRef: futuresRef || '',
      };
    });

    // Build settlement entries
    const settlements: FuturesSettlement[] = settlementRows.map((row) => {
      const edit = settlementEdits[`${row.commodity}|${row.contractMonth}`];
      const price = edit ? parseFloat(edit) : row.price;

      if (price !== null && !isNaN(price as number) && (price as number) <= 0) {
        warnings.push(`${row.commodity} ${row.contractMonth}: settlement price must be > $0`);
      }

      return {
        commodity: row.commodity,
        contractMonth: row.contractMonth,
        monthCode: row.monthCode,
        price: price !== null && !isNaN(price as number) ? (price as number) : 0,
      };
    });

    // Build in-transit
    const inTransit: Record<string, number> = {};
    for (const c of commodities) {
      const val = inTransitEdits[c] !== undefined ? parseFloat(inTransitEdits[c]) : (current.inTransit[c] ?? 0);
      inTransit[c] = isNaN(val) ? 0 : val;
    }

    // Build HTA-paired
    const htaPaired: Record<string, number> = {};
    for (const c of commodities) {
      const val = htaPairedEdits[c] !== undefined ? parseFloat(htaPairedEdits[c]) : (current.htaPaired[c] ?? 0);
      htaPaired[c] = isNaN(val) ? 0 : val;
    }

    setValidationWarnings(warnings);
    updateSellBasis(sellBasis);
    updateSettlements(settlements);
    updateInTransit(inTransit);
    updateHtaPaired(htaPaired);
    saveCurrentInputs();

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [basisRows, settlementRows, commodities, basisEdits, settlementEdits, inTransitEdits, htaPairedEdits, current, updateSellBasis, updateSettlements, updateInTransit, updateHtaPaired, saveCurrentInputs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Daily Market Inputs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter current market data for mark-to-market calculations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className={`text-xs ${stale ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
              {stale ? '⚠️ Stale — ' : ''}Last updated: {formatDate(new Date(lastUpdated))}
              {' '}at{' '}
              {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            {saved ? '✓ Saved' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Excel Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Upload Market Data Excel
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Drag & drop or click to upload. Values populate the form for review before saving.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              ↓ Download Template
            </button>
            <label className="cursor-pointer">
              <span className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors inline-block">
                Choose File
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {uploadSuccess && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-xs text-green-700 dark:text-green-300">
            ✓ {uploadSuccess}
          </div>
        )}
        {uploadError && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-300">
            ✗ {uploadError}
          </div>
        )}
      </div>

      {/* Gaps warning */}
      {gaps.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            ⚠️ {gaps.length} missing market data {gaps.length === 1 ? 'entry' : 'entries'} for open contracts
          </p>
          <ul className="mt-1 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
            {gaps.slice(0, 5).map((g, i) => (
              <li key={i}>
                {g.commodity} {g.month}: no {g.type === 'basis' ? 'sell basis' : 'settlement price'} ({g.contractCount} contracts)
              </li>
            ))}
            {gaps.length > 5 && <li>...and {gaps.length - 5} more</li>}
          </ul>
        </div>
      )}

      {/* Validation warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Validation warnings (saved anyway):</p>
          <ul className="mt-1 text-xs text-red-600 dark:text-red-400 space-y-0.5">
            {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Section 1: Current Market Sell Basis */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">1. Current Market Sell Basis by Delivery Month</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">What Ag Source could sell grain for today, by delivery month</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <th className="px-4 py-2">Commodity</th>
                <th className="px-4 py-2">Delivery Month</th>
                <th className="px-4 py-2">Current Sell Basis</th>
                <th className="px-4 py-2">Futures Ref</th>
                <th className="px-4 py-2 text-right"># Contracts</th>
                <th className="px-4 py-2 text-right">Open Bu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {basisRows.map((row) => {
                const val = getBasisValue(row.commodity, row.deliveryMonth);
                const color = getCommodityColor(row.commodity);
                return (
                  <tr key={`${row.commodity}|${row.deliveryMonth}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-2 font-medium">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: color }} />
                      {row.commodity}
                    </td>
                    <td className="px-4 py-2">{row.deliveryMonth}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={val.basis}
                        onChange={(e) =>
                          setBasisEdits((p) => ({
                            ...p,
                            [`${row.commodity}|${row.deliveryMonth}`]: { ...val, basis: e.target.value },
                          }))
                        }
                        className={`w-24 px-2 py-1 border rounded text-right text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${
                          val.basis && Math.abs(parseFloat(val.basis)) > 3
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-300'
                        }`}
                        placeholder="+0.00"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={val.futuresRef}
                        onChange={(e) =>
                          setBasisEdits((p) => ({
                            ...p,
                            [`${row.commodity}|${row.deliveryMonth}`]: { ...val, futuresRef: e.target.value },
                          }))
                        }
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        placeholder="May 26 (K)"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{row.openContractCount}</td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{formatNumber(row.openBushels)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Futures Settlements */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">2. Current Futures Settlement Prices</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Daily settlement price for each active CBOT futures contract month</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <th className="px-4 py-2">Commodity</th>
                <th className="px-4 py-2">Contract Month</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Settlement Price</th>
                <th className="px-4 py-2 text-right"># Contracts</th>
                <th className="px-4 py-2 text-right">Open Bu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {settlementRows.map((row) => {
                const val = getSettlementValue(row.commodity, row.contractMonth);
                const color = getCommodityColor(row.commodity);
                return (
                  <tr key={`${row.commodity}|${row.contractMonth}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-2 font-medium">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: color }} />
                      {row.commodity}
                    </td>
                    <td className="px-4 py-2">{row.contractMonth}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{row.monthCode}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-1">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={val}
                          onChange={(e) =>
                            setSettlementEdits((p) => ({
                              ...p,
                              [`${row.commodity}|${row.contractMonth}`]: e.target.value,
                            }))
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{row.openContractCount}</td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{formatNumber(row.openBushels)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 & 4: In-Transit and HTA-Paired (side by side) */}
      <div className="grid grid-cols-2 gap-4">
        {/* In-Transit */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">3. In-Transit Bushels</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bushels on trucks/rail heading to buyers (locked margin)</p>
          </div>
          <div className="p-4 space-y-3">
            {commodities.map((c) => (
              <div key={c} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getCommodityColor(c) }} />
                  {c}
                </span>
                <input
                  type="number"
                  value={getInTransitValue(c)}
                  onChange={(e) => setInTransitEdits((p) => ({ ...p, [c]: e.target.value }))}
                  className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </section>

        {/* HTA-Paired */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">4. HTA-Paired Bushels</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Purchase bushels paired against HTA sales (basis-only exposure)</p>
          </div>
          <div className="p-4 space-y-3">
            {commodities.map((c) => (
              <div key={c} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getCommodityColor(c) }} />
                  {c}
                </span>
                <input
                  type="number"
                  value={getHtaPairedValue(c)}
                  onChange={(e) => setHtaPairedEdits((p) => ({ ...p, [c]: e.target.value }))}
                  className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
