interface CrossModuleLinkProps {
  label: string;
  moduleId: string;
  onNavigate: (moduleId: string) => void;
}

export function CrossModuleLink({ label, moduleId, onNavigate }: CrossModuleLinkProps) {
  return (
    <button
      onClick={() => onNavigate(moduleId)}
      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors no-print"
    >
      {label}
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </button>
  );
}
