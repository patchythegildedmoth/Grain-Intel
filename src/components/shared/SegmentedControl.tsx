interface Segment {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  activeKey: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md';
}

export function SegmentedControl({ segments, activeKey, onChange, size = 'md' }: SegmentedControlProps) {
  const containerClass = size === 'sm'
    ? 'rounded-lg bg-[var(--bg-inset)] p-0.5 inline-flex gap-0.5 no-print'
    : 'rounded-lg bg-[var(--bg-inset)] p-1 inline-flex gap-1 no-print';

  const segmentClass = (isActive: boolean) => {
    const base = size === 'sm'
      ? 'px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none'
      : 'px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer select-none';

    if (isActive) {
      return `${base} bg-[var(--bg-surface)] dark:bg-gray-700 shadow-sm text-[var(--text-primary)]`;
    }
    return `${base} text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]`;
  };

  return (
    <div className={containerClass} role="tablist">
      {segments.map((segment) => (
        <button
          key={segment.key}
          role="tab"
          aria-selected={segment.key === activeKey}
          onClick={() => onChange(segment.key)}
          className={segmentClass(segment.key === activeKey)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
