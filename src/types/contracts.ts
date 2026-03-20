export type ContractType = 'Purchase' | 'Sale';
export type ContractStatus = 'Open' | 'Re-Open' | 'Complete' | 'Short Close' | 'Cancelled';
export type PricingType = 'Priced' | 'Basis' | 'HTA' | 'Cash';

export interface RawContract {
  commodityCode: string;
  contractType: ContractType;
  contractStatus: ContractStatus;
  entity: string;
  contractNumber: string;
  startDate: Date;
  endDate: Date;
  futureMonth: string | null;
  balance: number;
  pricingType: PricingType;
  pricedQty: number;
  unpricedQty: number;
  futures: number | null;
  basis: number | null;
  cashPrice: number | null;
  createdDate: Date;
  freightTerm: string | null;
  salesperson: string;
}

export interface Contract extends RawContract {
  futureMonthDate: Date | null;
  futureMonthShort: string;
  futureMonthSortKey: string;
  isOpen: boolean;
  isCompleted: boolean;
  daysUntilDeliveryEnd: number;
  isOverdue: boolean;
  isUrgent: boolean;
}

export interface DataValidationResult {
  totalRows: number;
  cancelledCount: number;
  organicCount: number;
  usableCount: number;
  openCount: number;
  completedCount: number;
  missingColumns: string[];
  anomalies: DataAnomaly[];
  nullCounts: Record<string, number>;
}

export interface DataAnomaly {
  contractNumber: string;
  field: string;
  issue: string;
  value: string;
}

export interface PositionSnapshot {
  timestamp: string;
  positions: Record<string, Record<string, { long: number; short: number; net: number }>>;
  /** Per-commodity exposure snapshot for day-over-day delta. Optional for backward compat with old localStorage. */
  exposure?: Record<string, { gross: number; net: number; purchase: number; sale: number }>;
}

export const EXPECTED_COLUMNS = [
  'Commodity Code',
  'Contract Type',
  'Contract Status',
  'Entity',
  'Contract Number',
  'Start Date',
  'End Date',
  'Future Month',
  'Balance',
  'Pricing Type',
  'Priced Qty',
  'Unpriced Qty',
  'Futures',
  'Basis',
  'Cash Price',
  'Created Date',
  'Freight Term',
  'Salesperson',
] as const;

export const COLUMN_MAP: Record<string, keyof RawContract> = {
  'Commodity Code': 'commodityCode',
  'Contract Type': 'contractType',
  'Contract Status': 'contractStatus',
  'Entity': 'entity',
  'Contract Number': 'contractNumber',
  'Start Date': 'startDate',
  'End Date': 'endDate',
  'Future Month': 'futureMonth',
  'Balance': 'balance',
  'Pricing Type': 'pricingType',
  'Priced Qty': 'pricedQty',
  'Unpriced Qty': 'unpricedQty',
  'Futures': 'futures',
  'Basis': 'basis',
  'Cash Price': 'cashPrice',
  'Created Date': 'createdDate',
  'Freight Term': 'freightTerm',
  'Salesperson': 'salesperson',
};
