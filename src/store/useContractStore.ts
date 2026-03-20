import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Contract, DataValidationResult, PositionSnapshot } from '../types/contracts';
import { parseExcelFile } from '../pipeline/parseExcel';
import { filterContracts } from '../pipeline/filterContracts';
import { validateData } from '../pipeline/validateData';
import { transformContracts } from '../pipeline/transformContracts';

interface ContractState {
  contracts: Contract[];
  isLoaded: boolean;
  fileName: string | null;
  uploadDate: Date | null;
  validation: DataValidationResult | null;
  previousSnapshot: PositionSnapshot | null;
  error: string | null;

  loadContracts: (file: File) => Promise<void>;
  clearData: () => void;
}

function buildPositionSnapshot(contracts: Contract[]): PositionSnapshot {
  const positions: PositionSnapshot['positions'] = {};
  const openContracts = contracts.filter((c) => c.isOpen);

  for (const c of openContracts) {
    const commodity = c.commodityCode;
    const fm = c.futureMonthSortKey;

    if (!positions[commodity]) positions[commodity] = {};
    if (!positions[commodity][fm]) positions[commodity][fm] = { long: 0, short: 0, net: 0 };

    if (c.contractType === 'Purchase') {
      positions[commodity][fm].long += c.balance;
    } else {
      positions[commodity][fm].short += c.balance;
    }
    positions[commodity][fm].net = positions[commodity][fm].long - positions[commodity][fm].short;
  }

  // Compute per-commodity unpriced exposure for day-over-day delta
  const exposure: PositionSnapshot['exposure'] = {};
  for (const c of openContracts) {
    let exposureBu = 0;
    if (c.unpricedQty > 0) {
      exposureBu = c.unpricedQty;
    } else if (c.pricingType === 'HTA' && c.balance > 0) {
      exposureBu = c.balance;
    }
    if (exposureBu > 0) {
      const commodity = c.commodityCode;
      if (!exposure[commodity]) exposure[commodity] = { gross: 0, net: 0, purchase: 0, sale: 0 };
      exposure[commodity].gross += exposureBu;
      if (c.contractType === 'Purchase') {
        exposure[commodity].purchase += exposureBu;
      } else {
        exposure[commodity].sale += exposureBu;
      }
      exposure[commodity].net = exposure[commodity].purchase - exposure[commodity].sale;
    }
  }

  return { timestamp: new Date().toISOString(), positions, exposure };
}

export const useContractStore = create<ContractState>()(
  persist(
    (set, get) => ({
      contracts: [],
      isLoaded: false,
      fileName: null,
      uploadDate: null,
      validation: null,
      previousSnapshot: null,
      error: null,

      loadContracts: async (file: File) => {
        try {
          const data = await file.arrayBuffer();

          console.group('Grain Intel: Data Pipeline');
          console.log('Parsing file:', file.name);

          const { contracts: rawContracts, headers, missingColumns } = parseExcelFile(data);
          console.log(`Parsed ${rawContracts.length} rows, headers:`, headers.length);

          const { filtered, cancelledCount, organicCount } = filterContracts(rawContracts);
          console.log(`Filtered: ${cancelledCount} cancelled, ${organicCount} organic → ${filtered.length} usable`);

          const validation = validateData(filtered, missingColumns, cancelledCount, organicCount);
          console.log(`Open: ${validation.openCount}, Completed: ${validation.completedCount}`);
          console.log(`Anomalies: ${validation.anomalies.length}, Missing columns: ${missingColumns.length}`);

          const contracts = transformContracts(filtered);
          console.log(`Transformed ${contracts.length} contracts with derived fields`);
          console.groupEnd();

          // Save current snapshot as previous before overwriting
          const currentContracts = get().contracts;
          const previousSnapshot = currentContracts.length > 0
            ? buildPositionSnapshot(currentContracts)
            : get().previousSnapshot;

          set({
            contracts,
            isLoaded: true,
            fileName: file.name,
            uploadDate: new Date(),
            validation,
            previousSnapshot,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to parse file';
          console.error('Grain Intel: Parse error:', err);
          set({ error: message, isLoaded: false });
        }
      },

      clearData: () => {
        set({
          contracts: [],
          isLoaded: false,
          fileName: null,
          uploadDate: null,
          validation: null,
          error: null,
        });
      },
    }),
    {
      name: 'grain-intel-store',
      partialize: (state) => ({ previousSnapshot: state.previousSnapshot }),
    }
  )
);
