import { type ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { DarkModeToggle } from './DarkModeToggle';
import { AlertDrawer, AlertBellButton } from './AlertDrawer';
import { useContractStore } from '../../store/useContractStore';

interface AppShellProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
  children: ReactNode;
}

export function AppShell({ activeModule, onModuleChange, children }: AppShellProps) {
  const fileName = useContractStore((s) => s.fileName);
  const uploadDate = useContractStore((s) => s.uploadDate);
  const clearData = useContractStore((s) => s.clearData);
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center px-4 gap-4 no-print">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
          Ag Source <span className="text-blue-600 dark:text-blue-400">Grain Intelligence</span>
        </h1>

        <div className="flex-1" />

        {fileName && (
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="truncate max-w-48" title={fileName}>{fileName}</span>
            {uploadDate && (
              <span className="text-xs">
                {uploadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => { clearData(); onModuleChange('upload'); }}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Re-upload
            </button>
          </div>
        )}

        <AlertBellButton onClick={() => setAlertDrawerOpen(!alertDrawerOpen)} />
        <DarkModeToggle />
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeModule={activeModule} onModuleChange={onModuleChange} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Alert Drawer */}
      <AlertDrawer
        open={alertDrawerOpen}
        onClose={() => setAlertDrawerOpen(false)}
        onNavigate={(id) => { onModuleChange(id); setAlertDrawerOpen(false); }}
      />

      {/* Footer */}
      <footer className="h-7 shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center px-4 text-xs text-gray-400 dark:text-gray-500 no-print">
        Grain Trading Intelligence Module v1.0.0 &middot; Ag Source LLC
      </footer>
    </div>
  );
}
