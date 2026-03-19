import { createColumnHelper } from '@tanstack/react-table';
import { useDataHealth, type FieldNullSummary } from '../../hooks/useDataHealth';
import { DataTable } from '../shared/DataTable';
import { AlertBadge } from '../shared/AlertBadge';
import { formatPercent, formatDate } from '../../utils/formatters';
import type { DataAnomaly } from '../../types/contracts';

const nullCol = createColumnHelper<FieldNullSummary>();
const nullColumns = [
  nullCol.accessor('field', { header: 'Field' }),
  nullCol.accessor('nullCount', { header: 'Null Count' }),
  nullCol.accessor('totalCount', { header: 'Total Records' }),
  nullCol.accessor('nullPercent', {
    header: '% Null',
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={v > 0.1 ? 'text-red-600 dark:text-red-400 font-semibold' : v > 0.01 ? 'text-amber-600 dark:text-amber-400' : ''}>
          {formatPercent(v)}
        </span>
      );
    },
  }),
];

const anomalyCol = createColumnHelper<DataAnomaly>();
const anomalyColumns = [
  anomalyCol.accessor('contractNumber', { header: 'Contract #' }),
  anomalyCol.accessor('field', { header: 'Field' }),
  anomalyCol.accessor('issue', { header: 'Issue' }),
  anomalyCol.accessor('value', { header: 'Value' }),
];

export function DataHealth() {
  const {
    validation,
    fileName,
    uploadDate,
    fieldNullSummaries,
    statusBreakdown,
    commodityBreakdown,
    pricingTypeBreakdown,
    contractTypeBreakdown,
    expectedColumns,
  } = useDataHealth();

  if (!validation) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Data Health</h2>
        <p className="text-gray-500 dark:text-gray-400">No data loaded.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Data Health</h2>

      {/* File info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3">Import Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">File:</span>{' '}
            <span className="font-medium">{fileName}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>{' '}
            <span className="font-medium">{uploadDate ? formatDate(uploadDate) : '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Rows:</span>{' '}
            <span className="font-medium">{validation.totalRows.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3">Pipeline</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            Parsed {validation.totalRows.toLocaleString()}
          </span>
          <span className="text-gray-400">&rarr;</span>
          <span className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-1 rounded">
            -{validation.cancelledCount} cancelled
          </span>
          <span className="text-gray-400">&rarr;</span>
          <span className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
            -{validation.organicCount} organic
          </span>
          <span className="text-gray-400">&rarr;</span>
          <span className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 rounded">
            {validation.usableCount.toLocaleString()} usable
          </span>
          <span className="text-gray-400">&rarr;</span>
          <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
            {validation.openCount} open
          </span>
        </div>
      </div>

      {/* Column validation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3">Column Validation</h3>
        {validation.missingColumns.length > 0 ? (
          <div className="mb-3">
            <AlertBadge level="critical">MISSING COLUMNS</AlertBadge>
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {validation.missingColumns.join(', ')}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <AlertBadge level="ok">ALL {expectedColumns.length} COLUMNS PRESENT</AlertBadge>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {expectedColumns.map((col) => {
            const missing = validation.missingColumns.includes(col);
            return (
              <span
                key={col}
                className={`text-xs px-2 py-1 rounded ${
                  missing
                    ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                }`}
              >
                {missing ? '✗' : '✓'} {col}
              </span>
            );
          })}
        </div>
      </div>

      {/* Data distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="font-semibold mb-2">By Status</h4>
          <div className="space-y-1 text-sm">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="flex justify-between">
                <span>{s.status}</span>
                <span className="font-mono">{s.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="font-semibold mb-2">By Commodity</h4>
          <div className="space-y-1 text-sm">
            {commodityBreakdown.map((c) => (
              <div key={c.commodity} className="flex justify-between">
                <span>{c.commodity}</span>
                <span className="font-mono">{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="font-semibold mb-2">By Pricing Type</h4>
          <div className="space-y-1 text-sm">
            {pricingTypeBreakdown.map((p) => (
              <div key={p.pricingType} className="flex justify-between">
                <span>{p.pricingType}</span>
                <span className="font-mono">{p.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="font-semibold mb-2">By Contract Type</h4>
          <div className="space-y-1 text-sm">
            {contractTypeBreakdown.map((ct) => (
              <div key={ct.contractType} className="flex justify-between">
                <span>{ct.contractType}</span>
                <span className="font-mono">{ct.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Null values */}
      {fieldNullSummaries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Null Values by Field</h3>
          <DataTable data={fieldNullSummaries} columns={nullColumns} />
        </div>
      )}

      {/* Anomalies */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Anomalies
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({validation.anomalies.length} found)
          </span>
        </h3>
        {validation.anomalies.length > 0 ? (
          <DataTable data={validation.anomalies.slice(0, 100)} columns={anomalyColumns} />
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            No anomalies detected.
          </div>
        )}
        {validation.anomalies.length > 100 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Showing first 100 of {validation.anomalies.length} anomalies.
          </p>
        )}
      </div>
    </div>
  );
}
