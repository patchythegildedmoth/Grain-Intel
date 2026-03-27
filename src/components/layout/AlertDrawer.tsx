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
        className={`fixed top-14 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 transition-transform duration-200 overflow-y-auto no-print
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Alerts ({alerts.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {alerts.length === 0 && (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{title}</h4>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <button
            key={i}
            onClick={() => onAlertClick(alert)}
            className="w-full text-left p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <AlertBadge level={alert.level}>{alert.module}</AlertBadge>
              <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                {alert.message}
              </span>
            </div>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
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

  return (
    <button
      onClick={onClick}
      className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title="Alerts"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
      {criticalCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {criticalCount > 9 ? '9+' : criticalCount}
        </span>
      )}
    </button>
  );
}
