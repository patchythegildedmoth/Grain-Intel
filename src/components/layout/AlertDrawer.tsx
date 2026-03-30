import { useState, useEffect, useRef } from 'react';
import { useGlobalAlerts, type GlobalAlert } from '../../hooks/useGlobalAlerts';
import { AlertBadge } from '../shared/AlertBadge';

interface AlertDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (moduleId: string) => void;
}

export function AlertDrawer({ open, onClose, onNavigate }: AlertDrawerProps) {
  const { alerts, criticalCount, warningCount } = useGlobalAlerts();

  const criticals = alerts.filter((a) => a.level === 'critical');
  const warnings = alerts.filter((a) => a.level === 'warning');
  const infos = alerts.filter((a) => a.level === 'info');

  const handleAlertClick = (alert: GlobalAlert) => {
    onNavigate(alert.moduleId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-30 no-print"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Alerts"
        className={`fixed top-14 right-0 bottom-0 w-80 bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-[var(--shadow-lg)] z-40 transition-transform duration-200 overflow-y-auto no-print
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">
            Alerts ({alerts.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
          >
            ✕
          </button>
        </div>

        {alerts.length === 0 && (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm">No alerts. Everything looks good.</p>
          </div>
        )}

        {/* Critical */}
        {criticals.length > 0 && (
          <AlertSection title={`Critical (${criticalCount})`} alerts={criticals} onAlertClick={handleAlertClick} />
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <AlertSection title={`Warnings (${warningCount})`} alerts={warnings} onAlertClick={handleAlertClick} />
        )}

        {/* Info */}
        {infos.length > 0 && (
          <AlertSection title={`Info (${infos.length})`} alerts={infos} onAlertClick={handleAlertClick} />
        )}
      </aside>
    </>
  );
}

function AlertSection({ title, alerts, onAlertClick }: { title: string; alerts: GlobalAlert[]; onAlertClick: (a: GlobalAlert) => void }) {
  return (
    <div className="px-4 py-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{title}</h4>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <button
            key={i}
            onClick={() => onAlertClick(alert)}
            className="w-full text-left p-2.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-raised)] transition-colors group"
          >
            <div className="flex items-start gap-2">
              <AlertBadge level={alert.level}>{alert.module}</AlertBadge>
              <span className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
                {alert.message}
              </span>
            </div>
            <span className="text-[10px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
              View in {alert.module} →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bell icon button for the header */
export function AlertBellButton({ onClick }: { onClick: () => void }) {
  const { criticalCount } = useGlobalAlerts();
  const prevCountRef = useRef(criticalCount);
  const [popping, setPopping] = useState(false);

  // Trigger pop animation when count changes
  useEffect(() => {
    if (criticalCount !== prevCountRef.current && criticalCount > 0) {
      setPopping(true);
      const timer = setTimeout(() => setPopping(false), 150);
      prevCountRef.current = criticalCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = criticalCount;
  }, [criticalCount]);

  return (
    <button
      onClick={onClick}
      className="relative p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] transition-colors"
      title="Alerts"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
      {criticalCount > 0 && (
        <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${popping ? 'animate-badge-pop' : ''}`}>
          {criticalCount > 9 ? '9+' : criticalCount}
        </span>
      )}
    </button>
  );
}
