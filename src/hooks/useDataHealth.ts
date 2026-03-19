import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { EXPECTED_COLUMNS } from '../types/contracts';

export interface FieldNullSummary {
  field: string;
  nullCount: number;
  totalCount: number;
  nullPercent: number;
}

export function useDataHealth() {
  const contracts = useContractStore((s) => s.contracts);
  const validation = useContractStore((s) => s.validation);
  const fileName = useContractStore((s) => s.fileName);
  const uploadDate = useContractStore((s) => s.uploadDate);

  return useMemo(() => {
    if (!validation) {
      return {
        validation: null,
        fileName,
        uploadDate,
        fieldNullSummaries: [],
        statusBreakdown: [],
        commodityBreakdown: [],
        pricingTypeBreakdown: [],
        contractTypeBreakdown: [],
        expectedColumns: EXPECTED_COLUMNS as unknown as string[],
      };
    }

    // Null counts as sorted list
    const fieldNullSummaries: FieldNullSummary[] = Object.entries(validation.nullCounts)
      .map(([field, nullCount]) => ({
        field,
        nullCount,
        totalCount: validation.usableCount,
        nullPercent: validation.usableCount > 0 ? nullCount / validation.usableCount : 0,
      }))
      .filter((f) => f.nullCount > 0)
      .sort((a, b) => b.nullCount - a.nullCount);

    // Status breakdown
    const statusMap = new Map<string, number>();
    for (const c of contracts) {
      const status = c.contractStatus || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }
    const statusBreakdown = [...statusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Commodity breakdown
    const commodityMap = new Map<string, number>();
    for (const c of contracts) {
      commodityMap.set(c.commodityCode, (commodityMap.get(c.commodityCode) || 0) + 1);
    }
    const commodityBreakdown = [...commodityMap.entries()]
      .map(([commodity, count]) => ({ commodity, count }))
      .sort((a, b) => b.count - a.count);

    // Pricing type breakdown
    const pricingMap = new Map<string, number>();
    for (const c of contracts) {
      pricingMap.set(c.pricingType, (pricingMap.get(c.pricingType) || 0) + 1);
    }
    const pricingTypeBreakdown = [...pricingMap.entries()]
      .map(([pricingType, count]) => ({ pricingType, count }))
      .sort((a, b) => b.count - a.count);

    // Contract type breakdown
    const typeMap = new Map<string, number>();
    for (const c of contracts) {
      typeMap.set(c.contractType, (typeMap.get(c.contractType) || 0) + 1);
    }
    const contractTypeBreakdown = [...typeMap.entries()]
      .map(([contractType, count]) => ({ contractType, count }))
      .sort((a, b) => b.count - a.count);

    return {
      validation,
      fileName,
      uploadDate,
      fieldNullSummaries,
      statusBreakdown,
      commodityBreakdown,
      pricingTypeBreakdown,
      contractTypeBreakdown,
      expectedColumns: EXPECTED_COLUMNS as unknown as string[],
    };
  }, [contracts, validation, fileName, uploadDate]);
}
