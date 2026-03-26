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
    ? 'rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 inline-flex gap-0.5 no-print'
    : 'rounded-lg bg-gray-100 dark:bg-gray-800 p-1 inline-flex gap-1 no-print';

  const segmentClass = (isActive: boolean) => {
    const base = size === 'sm'
      ? 'px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none'
      : 'px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer select-none';

    if (isActive) {
      return `${base} bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100`;
    }
    return `${base} text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300`;
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
