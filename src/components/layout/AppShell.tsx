import { type ReactNode, useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { DarkModeToggle } from './DarkModeToggle';
import { AlertDrawer, AlertBellButton } from './AlertDrawer';
import { CommandPalette } from './CommandPalette';
import { Breadcrumb } from '../shared/Breadcrumb';
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
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handlePaletteNavigate = useCallback(
    (moduleId: string) => {
      onModuleChange(moduleId);
      setPaletteOpen(false);
    },
    [onModuleChange],
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center px-4 gap-4 no-print">
        <h1 className="text-lg font-bold text-[var(--text-primary)] whitespace-nowrap">
          Ag Source <span className="text-[var(--accent)]">Grain Intelligence</span>
        </h1>

        <div className="flex-1" />

        {fileName && (
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <span className="truncate max-w-48" title={fileName}>{fileName}</span>
            {uploadDate && (
              <span className="text-xs">
                {uploadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => { clearData(); onModuleChange('upload'); }}
              className="text-xs px-2 py-1 rounded bg-[var(--bg-inset)] hover:bg-[var(--bg-surface-raised)]"
            >
              Re-upload
            </button>
          </div>
        )}

        <button
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[var(--text-muted)] bg-[var(--bg-inset)] hover:bg-[var(--bg-surface-raised)] transition-colors"
          title="Search (⌘K)"
        >
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)]">⌘K</span>
        </button>

        <AlertBellButton onClick={() => setAlertDrawerOpen(!alertDrawerOpen)} />
        <DarkModeToggle />
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeModule={activeModule} onModuleChange={onModuleChange} />
        <main className="flex-1 overflow-y-auto">
          {activeModule !== 'morning-brief' && (
            <div className="px-6 pt-3 pb-0">
              <Breadcrumb activeModule={activeModule} onNavigate={onModuleChange} />
            </div>
          )}
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
      <footer className="h-7 shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center px-4 text-xs text-[var(--text-muted)] no-print">
        Grain Trading Intelligence Module v1.0.0 &middot; Ag Source LLC
      </footer>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handlePaletteNavigate}
      />
    </div>
  );
}
