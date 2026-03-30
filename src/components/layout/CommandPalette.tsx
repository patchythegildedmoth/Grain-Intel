import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NAV_ITEMS } from './Sidebar';
import { useContractStore } from '../../store/useContractStore';

/** Session-level recently visited modules (most recent first, max 5) */
const recentModules: string[] = [];
function trackVisit(moduleId: string) {
  const idx = recentModules.indexOf(moduleId);
  if (idx >= 0) recentModules.splice(idx, 1);
  recentModules.unshift(moduleId);
  if (recentModules.length > 5) recentModules.length = 5;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (moduleId: string) => void;
}

interface SearchResult {
  id: string;
  label: string;
  group: 'Recent' | 'Modules' | 'Contracts' | 'Entities' | 'Actions';
  icon: string;
  hint?: string;
  action: () => void;
}

const QUICK_ACTIONS = [
  { id: 'action-upload', label: 'Upload File', icon: '📂' },
  { id: 'action-fetch', label: 'Fetch Settlements', icon: '📡' },
  { id: 'action-dark', label: 'Toggle Dark Mode', icon: '🌙' },
] as const;

const MAX_PER_GROUP = 8;

export function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const contracts = useContractStore((s) => s.contracts);
  const clearData = useContractStore((s) => s.clearData);

  // Build unique entity list
  const entities = useMemo(() => {
    const set = new Set<string>();
    for (const c of contracts) {
      if (c.entity) set.add(c.entity);
    }
    return Array.from(set).sort();
  }, [contracts]);

  // Determine best module for a contract
  const getContractModule = useCallback((contract: typeof contracts[0]) => {
    if (contract.isOverdue || contract.isUrgent) return 'delivery-timeline';
    if (contract.unpricedQty > 0 || (contract.pricingType === 'HTA' && contract.balance > 0)) return 'unpriced-exposure';
    return 'net-position';
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', !isDark);
    localStorage.setItem('grain-intel-dark', String(!isDark));
  }, []);

  // Build search results
  const results = useMemo(() => {
    const items: SearchResult[] = [];
    const q = query.toLowerCase().trim();

    // Show recently visited when no query
    if (!q && recentModules.length > 0) {
      for (const modId of recentModules) {
        const nav = NAV_ITEMS.find((n) => n.id === modId);
        if (nav) {
          items.push({
            id: `recent-${nav.id}`,
            label: nav.label,
            group: 'Recent',
            icon: nav.icon,
            action: () => onNavigate(nav.id),
          });
        }
      }
    }

    // Always show modules if no query or matching
    const moduleResults: SearchResult[] = [];
    for (let i = 0; i < NAV_ITEMS.length; i++) {
      const nav = NAV_ITEMS[i];
      if (!q || nav.label.toLowerCase().includes(q) || nav.id.toLowerCase().includes(q)) {
        moduleResults.push({
          id: `mod-${nav.id}`,
          label: nav.label,
          group: 'Modules',
          icon: nav.icon,
          hint: i < 9 ? `⌘${i + 1}` : undefined,
          action: () => onNavigate(nav.id),
        });
      }
    }
    items.push(...moduleResults.slice(0, MAX_PER_GROUP));

    // Only search contracts/entities/actions when >=2 chars
    if (q.length >= 2) {
      // Contracts
      const contractResults: SearchResult[] = [];
      for (const c of contracts) {
        if (contractResults.length >= MAX_PER_GROUP) break;
        if (
          c.contractNumber.toLowerCase().includes(q) ||
          c.entity.toLowerCase().includes(q) ||
          c.commodityCode.toLowerCase().includes(q)
        ) {
          contractResults.push({
            id: `ct-${c.contractNumber}`,
            label: `${c.contractNumber} — ${c.entity} (${c.commodityCode})`,
            group: 'Contracts',
            icon: c.contractType === 'Purchase' ? '🟢' : '🔴',
            action: () => onNavigate(getContractModule(c)),
          });
        }
      }
      items.push(...contractResults);

      // Entities
      const entityResults: SearchResult[] = [];
      for (const name of entities) {
        if (entityResults.length >= MAX_PER_GROUP) break;
        if (name.toLowerCase().includes(q)) {
          entityResults.push({
            id: `ent-${name}`,
            label: name,
            group: 'Entities',
            icon: '👤',
            action: () => onNavigate('customer-concentration'),
          });
        }
      }
      items.push(...entityResults);

      // Quick Actions
      for (const act of QUICK_ACTIONS) {
        if (act.label.toLowerCase().includes(q)) {
          items.push({
            id: act.id,
            label: act.label,
            group: 'Actions',
            icon: act.icon,
            action: () => {
              if (act.id === 'action-upload') {
                clearData();
                onNavigate('upload');
              } else if (act.id === 'action-fetch') {
                onNavigate('daily-inputs');
              } else if (act.id === 'action-dark') {
                toggleDarkMode();
              }
            },
          });
        }
      }
    }

    return items;
  }, [query, contracts, entities, onNavigate, getContractModule, clearData, toggleDarkMode]);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Focus after the modal renders
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Clamp selected index when results change
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].action();
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, onClose],
  );

  if (!open) return null;

  // Group results for rendering
  const groups: { label: string; items: { result: SearchResult; flatIndex: number }[] }[] = [];
  const groupOrder: SearchResult['group'][] = ['Recent', 'Modules', 'Contracts', 'Entities', 'Actions'];
  let flatIdx = 0;
  for (const groupLabel of groupOrder) {
    const groupItems: { result: SearchResult; flatIndex: number }[] = [];
    for (const r of results) {
      if (r.group === groupLabel) {
        groupItems.push({ result: r, flatIndex: flatIdx });
        flatIdx++;
      }
    }
    if (groupItems.length > 0) {
      groups.push({ label: groupLabel, items: groupItems });
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 no-print"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none no-print">
        <div
          role="dialog"
          aria-label="Search"
          className="w-full max-w-lg bg-[var(--bg-surface)] rounded-xl shadow-[var(--shadow-lg)] border border-[var(--border-default)] overflow-hidden pointer-events-auto"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)]">
            <svg
              className="h-5 w-5 text-[var(--text-muted)] shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules, contracts, entities..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-gray-400 outline-none"
            />
            <kbd className="hidden sm:inline-block text-xs text-[var(--text-muted)] bg-[var(--bg-inset)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {groups.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">
                No results found
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {group.label}
                  </p>
                  {group.items.map(({ result, flatIndex }) => {
                    const isSelected = flatIndex === selectedIndex;
                    return (
                      <button
                        key={result.id}
                        role="option"
                        aria-selected={isSelected}
                        data-selected={isSelected}
                        onClick={() => {
                          result.action();
                          if (result.group === 'Modules' || result.group === 'Recent') {
                            const modId = result.id.replace(/^(mod-|recent-)/, '');
                            trackVisit(modId);
                          }
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                          ${isSelected
                            ? 'bg-[var(--accent)]/8 text-[var(--accent)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)]'
                          }`}
                      >
                        <span className="text-base shrink-0">{result.icon}</span>
                        <span className="truncate flex-1">{result.label}</span>
                        {result.hint && (
                          <kbd className="hidden sm:inline-block text-[10px] text-[var(--text-muted)] bg-[var(--bg-inset)] px-1 py-0.5 rounded border border-[var(--border-default)] ml-auto shrink-0">
                            {result.hint}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-[var(--border-default)] flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] mr-1">↑↓</kbd>
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] mr-1">↵</kbd>
              select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] mr-1">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
