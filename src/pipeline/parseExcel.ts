import * as XLSX from 'xlsx';
import { type RawContract, EXPECTED_COLUMNS } from '../types/contracts';

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function toNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function toDate(val: unknown): Date {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0);
  }
  if (typeof val === 'string' && val.trim()) {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(NaN);
}

function toString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toNullableString(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim();
}

export interface ParseResult {
  contracts: RawContract[];
  headers: string[];
  missingColumns: string[];
}

export function parseExcelFile(data: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No sheets found in the Excel file.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rows.length === 0) {
    throw new Error('No data rows found in the Excel file.');
  }

  const headers = Object.keys(rows[0]);
  const missingColumns = EXPECTED_COLUMNS.filter(col => !headers.includes(col));

  const contracts: RawContract[] = [];

  for (const row of rows) {
    const get = (col: string) => row[col];

    const contract: RawContract = {
      commodityCode: toString(get('Commodity Code')),
      contractType: toString(get('Contract Type')) as RawContract['contractType'],
      contractStatus: toString(get('Contract Status')) as RawContract['contractStatus'],
      entity: toString(get('Entity')),
      contractNumber: toString(get('Contract Number')),
      startDate: toDate(get('Start Date')),
      endDate: toDate(get('End Date')),
      futureMonth: toNullableString(get('Future Month')),
      balance: toNumber(get('Balance')),
      pricingType: toString(get('Pricing Type')) as RawContract['pricingType'],
      pricedQty: toNumber(get('Priced Qty')),
      unpricedQty: toNumber(get('Unpriced Qty')),
      futures: toNullableNumber(get('Futures')),
      basis: toNullableNumber(get('Basis')),
      cashPrice: toNullableNumber(get('Cash Price')),
      createdDate: toDate(get('Created Date')),
      freightTerm: toNullableString(get('Freight Term')),
      freightTier: toNullableString(get('Freight Tier')),
      salesperson: toString(get('Salesperson')),
    };

    contracts.push(contract);
  }

  return { contracts, headers, missingColumns };
}
