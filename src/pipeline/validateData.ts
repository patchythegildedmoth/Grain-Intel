import type { RawContract, DataAnomaly, DataValidationResult } from '../types/contracts';
import { isOpenStatus, isCompletedStatus } from './filterContracts';

export function validateData(
  contracts: RawContract[],
  missingColumns: string[],
  cancelledCount: number,
  organicCount: number
): DataValidationResult {
  const anomalies: DataAnomaly[] = [];
  const nullCounts: Record<string, number> = {
    futureMonth: 0,
    futures: 0,
    basis: 0,
    cashPrice: 0,
    freightTerm: 0,
  };

  let openCount = 0;
  let completedCount = 0;

  for (const c of contracts) {
    if (isOpenStatus(c.contractStatus)) openCount++;
    if (isCompletedStatus(c.contractStatus)) completedCount++;

    // Count nulls
    if (c.futureMonth === null) nullCounts.futureMonth++;
    if (c.futures === null) nullCounts.futures++;
    if (c.basis === null) nullCounts.basis++;
    if (c.cashPrice === null) nullCounts.cashPrice++;
    if (c.freightTerm === null) nullCounts.freightTerm++;

    // Check cash price = futures + basis
    if (c.cashPrice !== null && c.futures !== null && c.basis !== null) {
      const expected = c.futures + c.basis;
      const diff = Math.abs(c.cashPrice - expected);
      if (diff > 0.01) {
        anomalies.push({
          contractNumber: c.contractNumber,
          field: 'Cash Price',
          issue: `Cash ($${c.cashPrice.toFixed(2)}) != Futures ($${c.futures.toFixed(2)}) + Basis ($${c.basis.toFixed(2)}) = $${expected.toFixed(2)}`,
          value: `Diff: $${diff.toFixed(2)}`,
        });
      }
    }

    // Negative balance
    if (c.balance < 0) {
      anomalies.push({
        contractNumber: c.contractNumber,
        field: 'Balance',
        issue: 'Negative balance',
        value: String(c.balance),
      });
    }

    // End date before start date
    if (c.startDate instanceof Date && c.endDate instanceof Date &&
        !isNaN(c.startDate.getTime()) && !isNaN(c.endDate.getTime()) &&
        c.endDate < c.startDate) {
      anomalies.push({
        contractNumber: c.contractNumber,
        field: 'Dates',
        issue: 'End date before start date',
        value: `${c.startDate.toLocaleDateString()} - ${c.endDate.toLocaleDateString()}`,
      });
    }
  }

  return {
    totalRows: contracts.length + cancelledCount + organicCount,
    cancelledCount,
    organicCount,
    usableCount: contracts.length,
    openCount,
    completedCount,
    missingColumns,
    anomalies,
    nullCounts,
  };
}
