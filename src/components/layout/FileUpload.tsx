import { useCallback, useState } from 'react';
import { useContractStore } from '../../store/useContractStore';

export function FileUpload() {
  const loadContracts = useContractStore((s) => s.loadContracts);
  const error = useContractStore((s) => s.error);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      return;
    }
    setLoading(true);
    await loadContracts(file);
    setLoading(false);
  }, [loadContracts]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex items-center justify-center min-h-[42vh] py-8 px-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`w-full max-w-lg p-12 rounded-2xl border-2 border-dashed text-center transition-colors
          ${dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
          }`}
      >
        <div className="mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-[var(--text-secondary)] mb-2 text-balance">
          Upload iRely Contract Export
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Drag and drop your Excel file here, or click to browse
        </p>

        <label className="inline-block cursor-pointer">
          <span className="px-6 py-3 bg-[var(--accent)] text-white rounded-md font-semibold hover:bg-[var(--accent-hover)] transition-colors">
            {loading ? 'Processing...' : 'Choose File'}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleChange}
            className="hidden"
            disabled={loading}
          />
        </label>

        {error && (
          <div className="mt-4 p-3 bg-red-600/10 dark:bg-red-600/10 border border-red-600/20 dark:border-red-800 rounded-lg text-sm text-[var(--negative)] dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
