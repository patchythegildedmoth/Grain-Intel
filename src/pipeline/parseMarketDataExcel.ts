import * as XLSX from 'xlsx';
import type { MarketBasisEntry, FuturesSettlement } from '../types/marketData';

export interface ParsedMarketData {
  sellBasis: MarketBasisEntry[];
  settlements: FuturesSettlement[];
  inTransit: Record<string, number>;
  htaPaired: Record<string, number>;
  warnings: string[];
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function trimStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parse a market data Excel file.
 *
 * Supports two formats:
 *   A) Multi-sheet: sheets named "Sell Basis", "Settlements", "In-Transit", "HTA-Paired"
 *   B) Single-sheet: 4 labeled sections separated by header rows
 *
 * Column matching is case-insensitive and flexible (e.g., "commodity" or "Commodity").
 */
export function parseMarketDataExcel(buffer: ArrayBuffer): ParsedMarketData {
  const wb = XLSX.read(buffer, { type: 'array' });
  const warnings: string[] = [];

  const sheetNames = wb.SheetNames.map((n) => n.toLowerCase().trim());

  // Detect multi-sheet format
  const hasBasisSheet = sheetNames.some((n) => n.includes('basis'));
  const hasSettlementSheet = sheetNames.some((n) => n.includes('settlement'));

  if (hasBasisSheet || hasSettlementSheet) {
    return parseMultiSheet(wb, warnings);
  }

  // Single-sheet: try to parse all 4 sections from first sheet
  return parseSingleSheet(wb, warnings);
}

// ---------------------------------------------------------------------------
// Multi-sheet parser
// ---------------------------------------------------------------------------

function findSheet(wb: XLSX.WorkBook, keyword: string): XLSX.WorkSheet | null {
  const match = wb.SheetNames.find((n) => n.toLowerCase().includes(keyword));
  return match ? wb.Sheets[match] : null;
}

function sheetToRows(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

function findCol(headers: string[], ...candidates: string[]): string | null {
  for (const candidate of candidates) {
    const found = headers.find((h) => h.toLowerCase().replace(/[_\s-]/g, '') === candidate.toLowerCase().replace(/[_\s-]/g, ''));
    if (found) return found;
  }
  return null;
}

function parseMultiSheet(wb: XLSX.WorkBook, warnings: string[]): ParsedMarketData {
  const sellBasis = parseBasisSheet(findSheet(wb, 'basis'), warnings);
  const settlements = parseSettlementSheet(findSheet(wb, 'settlement'), warnings);
  const inTransit = parseBushelSheet(findSheet(wb, 'transit'), 'In-Transit', warnings);
  const htaPaired = parseBushelSheet(findSheet(wb, 'hta') ?? findSheet(wb, 'paired'), 'HTA-Paired', warnings);

  return { sellBasis, settlements, inTransit, htaPaired, warnings };
}

function parseBasisSheet(ws: XLSX.WorkSheet | null, warnings: string[]): MarketBasisEntry[] {
  if (!ws) { warnings.push('No "Sell Basis" sheet found'); return []; }

  const rows = sheetToRows(ws);
  if (rows.length === 0) { warnings.push('"Sell Basis" sheet is empty'); return []; }

  const headers = Object.keys(rows[0]);
  const commodityCol = findCol(headers, 'commodity', 'cmdty', 'grain');
  const monthCol = findCol(headers, 'deliverymonth', 'delivery month', 'deliverymo', 'month', 'delmo');
  const basisCol = findCol(headers, 'basis', 'sellbasis', 'sell basis', 'currentbasis');
  const futuresRefCol = findCol(headers, 'futuresref', 'futures ref', 'futuresreference', 'fmref', 'ref');

  if (!commodityCol || !basisCol) {
    warnings.push('Sell Basis sheet: missing required "Commodity" or "Basis" column');
    return [];
  }

  const results: MarketBasisEntry[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const commodity = trimStr(row[commodityCol]);
    const deliveryMonth = monthCol ? trimStr(row[monthCol]) : '';
    const basis = toNumber(row[basisCol]);
    const futuresRef = futuresRefCol ? trimStr(row[futuresRefCol]) : '';

    if (!commodity || basis === null) {
      if (commodity) warnings.push(`Sell Basis row ${i + 2}: skipped — missing basis value`);
      continue;
    }

    if (Math.abs(basis) > 3.0) {
      warnings.push(`${commodity} ${deliveryMonth}: basis ${basis.toFixed(2)} is outside ±$3.00`);
    }

    results.push({ commodity, deliveryMonth, basis, futuresRef });
  }

  return results;
}

function parseSettlementSheet(ws: XLSX.WorkSheet | null, warnings: string[]): FuturesSettlement[] {
  if (!ws) { warnings.push('No "Settlements" sheet found'); return []; }

  const rows = sheetToRows(ws);
  if (rows.length === 0) { warnings.push('"Settlements" sheet is empty'); return []; }

  const headers = Object.keys(rows[0]);
  const commodityCol = findCol(headers, 'commodity', 'cmdty', 'grain');
  const monthCol = findCol(headers, 'contractmonth', 'contract month', 'futuresmonth', 'futures month', 'month');
  const codeCol = findCol(headers, 'monthcode', 'month code', 'code');
  const priceCol = findCol(headers, 'price', 'settlement', 'settlementprice', 'settle', 'last');

  if (!commodityCol || !priceCol) {
    warnings.push('Settlements sheet: missing required "Commodity" or "Price" column');
    return [];
  }

  const results: FuturesSettlement[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const commodity = trimStr(row[commodityCol]);
    const contractMonth = monthCol ? trimStr(row[monthCol]) : '';
    const monthCode = codeCol ? trimStr(row[codeCol]) : '';
    const price = toNumber(row[priceCol]);

    if (!commodity || price === null) {
      if (commodity) warnings.push(`Settlements row ${i + 2}: skipped — missing price`);
      continue;
    }

    if (price <= 0) {
      warnings.push(`${commodity} ${contractMonth}: settlement price $${price.toFixed(2)} must be > $0`);
    }

    results.push({ commodity, contractMonth, monthCode, price });
  }

  return results;
}

function parseBushelSheet(ws: XLSX.WorkSheet | null, label: string, warnings: string[]): Record<string, number> {
  if (!ws) return {};

  const rows = sheetToRows(ws);
  if (rows.length === 0) return {};

  const headers = Object.keys(rows[0]);
  const commodityCol = findCol(headers, 'commodity', 'cmdty', 'grain');
  const bushelsCol = findCol(headers, 'bushels', 'bu', 'quantity', 'amount', 'volume');

  if (!commodityCol || !bushelsCol) {
    warnings.push(`${label} sheet: missing "Commodity" or "Bushels" column`);
    return {};
  }

  const result: Record<string, number> = {};
  for (const row of rows) {
    const commodity = trimStr(row[commodityCol]);
    const bushels = toNumber(row[bushelsCol]);
    if (commodity && bushels !== null) {
      result[commodity] = (result[commodity] ?? 0) + bushels;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Single-sheet parser — looks for section headers
// ---------------------------------------------------------------------------

function parseSingleSheet(wb: XLSX.WorkBook, warnings: string[]): ParsedMarketData {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    warnings.push('Workbook has no sheets');
    return { sellBasis: [], settlements: [], inTransit: {}, htaPaired: {}, warnings };
  }

  // Read as array-of-arrays so we can scan for section markers
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Find section start rows by looking for section header keywords
  let basisStart = -1;
  let settlementStart = -1;
  let inTransitStart = -1;
  let htaPairedStart = -1;

  for (let i = 0; i < aoa.length; i++) {
    const firstCell = trimStr(aoa[i][0]).toLowerCase();
    if (firstCell.includes('sell basis') || firstCell.includes('basis by')) basisStart = i;
    else if (firstCell.includes('settlement') || firstCell.includes('futures price')) settlementStart = i;
    else if (firstCell.includes('in-transit') || firstCell.includes('in transit') || firstCell.includes('intransit')) inTransitStart = i;
    else if (firstCell.includes('hta') || firstCell.includes('paired')) htaPairedStart = i;
  }

  // If no section markers found, try to parse the whole sheet as a settlement table
  if (basisStart === -1 && settlementStart === -1 && inTransitStart === -1 && htaPairedStart === -1) {
    warnings.push('No section headers found — trying to parse as flat table. Use the template for best results.');
    // Try parsing as multi-column flat format
    const rows = sheetToRows(ws);
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      const hasBasis = findCol(headers, 'basis', 'sellbasis') !== null;
      const hasPrice = findCol(headers, 'price', 'settlement', 'settle') !== null;

      if (hasBasis) {
        const sellBasis = parseBasisSheet(ws, warnings);
        return { sellBasis, settlements: [], inTransit: {}, htaPaired: {}, warnings };
      }
      if (hasPrice) {
        const settlements = parseSettlementSheet(ws, warnings);
        return { sellBasis: [], settlements, inTransit: {}, htaPaired: {}, warnings };
      }
    }
    warnings.push('Could not determine data format. Please use the downloadable template.');
    return { sellBasis: [], settlements: [], inTransit: {}, htaPaired: {}, warnings };
  }

  // Build sub-worksheets from the sections
  const sectionBounds = [
    { label: 'basis', start: basisStart },
    { label: 'settlement', start: settlementStart },
    { label: 'inTransit', start: inTransitStart },
    { label: 'htaPaired', start: htaPairedStart },
  ]
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start);

  const getSection = (label: string): unknown[][] => {
    const idx = sectionBounds.findIndex((s) => s.label === label);
    if (idx === -1) return [];
    const start = sectionBounds[idx].start + 1; // skip header row
    const end = idx < sectionBounds.length - 1 ? sectionBounds[idx + 1].start : aoa.length;
    // Include the column header row (first row after section label) and data rows
    return aoa.slice(start, end).filter((row) => row.some((cell) => cell !== null && trimStr(cell) !== ''));
  };

  const makeSheet = (rows: unknown[][]): XLSX.WorkSheet | null => {
    if (rows.length === 0) return null;
    return XLSX.utils.aoa_to_sheet(rows);
  };

  const sellBasis = parseBasisSheet(makeSheet(getSection('basis')), warnings);
  const settlements = parseSettlementSheet(makeSheet(getSection('settlement')), warnings);
  const inTransit = parseBushelSheet(makeSheet(getSection('inTransit')), 'In-Transit', warnings);
  const htaPaired = parseBushelSheet(makeSheet(getSection('htaPaired')), 'HTA-Paired', warnings);

  return { sellBasis, settlements, inTransit, htaPaired, warnings };
}

// ---------------------------------------------------------------------------
// Template generator — creates an .xlsx template pre-filled from scaffold rows
// ---------------------------------------------------------------------------

export interface TemplateData {
  basisRows: { commodity: string; deliveryMonth: string; basis: number | null; futuresRef: string }[];
  settlementRows: { commodity: string; contractMonth: string; monthCode: string; price: number | null }[];
  commodities: string[];
  inTransit: Record<string, number>;
  htaPaired: Record<string, number>;
}

export function generateMarketDataTemplate(data: TemplateData): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sell Basis
  const basisData = [
    ['Commodity', 'Delivery Month', 'Basis', 'Futures Ref'],
    ...data.basisRows.map((r) => [r.commodity, r.deliveryMonth, r.basis ?? '', r.futuresRef]),
  ];
  const basisWs = XLSX.utils.aoa_to_sheet(basisData);
  basisWs['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, basisWs, 'Sell Basis');

  // Sheet 2: Settlements
  const settlementData = [
    ['Commodity', 'Contract Month', 'Month Code', 'Price'],
    ...data.settlementRows.map((r) => [r.commodity, r.contractMonth, r.monthCode, r.price ?? '']),
  ];
  const settlementWs = XLSX.utils.aoa_to_sheet(settlementData);
  settlementWs['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, settlementWs, 'Settlements');

  // Sheet 3: In-Transit
  const transitData = [
    ['Commodity', 'Bushels'],
    ...data.commodities.map((c) => [c, data.inTransit[c] ?? 0]),
  ];
  const transitWs = XLSX.utils.aoa_to_sheet(transitData);
  transitWs['!cols'] = [{ wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, transitWs, 'In-Transit');

  // Sheet 4: HTA-Paired
  const htaData = [
    ['Commodity', 'Bushels'],
    ...data.commodities.map((c) => [c, data.htaPaired[c] ?? 0]),
  ];
  const htaWs = XLSX.utils.aoa_to_sheet(htaData);
  htaWs['!cols'] = [{ wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, htaWs, 'HTA-Paired');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}
