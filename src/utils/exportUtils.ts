import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  try {
    saveAs(blob, `${filename}.csv`);
  } catch {
    alert('Download was blocked. Check your browser settings.');
  }
}

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  try {
    saveAs(blob, `${filename}.xlsx`);
  } catch {
    alert('Download was blocked. Check your browser settings.');
  }
}
