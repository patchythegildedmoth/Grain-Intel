import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

interface DataTableProps<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  footerRow?: Record<string, string | number>;
  /** Compact mode: 36px rows instead of 44px. Use for dense data views. */
  compact?: boolean;
}

export function DataTable<T>({ data, columns, footerRow, compact = false }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const cellPadding = compact ? 'py-1.5' : 'py-2';

  return (
    <div className="overflow-x-auto border border-[var(--border-default)] rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-inset)] sticky top-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer select-none hover:bg-[var(--bg-surface-raised)]"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="group hover:bg-[var(--bg-surface-raised)]">
              {row.getVisibleCells().map((cell, cellIdx) => (
                <td
                  key={cell.id}
                  className={`px-3 ${cellPadding} text-[var(--text-secondary)] whitespace-nowrap ${
                    cellIdx === 0
                      ? 'border-l-2 border-transparent group-hover:border-[var(--accent)] transition-colors duration-100'
                      : ''
                  }`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footerRow && (
          <tfoot className="bg-[var(--bg-inset)] font-semibold">
            <tr>
              {table.getAllColumns().map((col) => (
                <td key={col.id} className="px-3 py-2.5 text-[var(--text-primary)] whitespace-nowrap">
                  {footerRow[col.id] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {data.length === 0 && (
        <div className="p-8 text-center text-[var(--text-muted)]">No data to display</div>
      )}
    </div>
  );
}
