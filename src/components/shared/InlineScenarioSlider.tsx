interface InlineScenarioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  defaultValue: number;
}

export function InlineScenarioSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  defaultValue,
}: InlineScenarioSliderProps) {
  const display = formatValue ? formatValue(value) : value.toFixed(2);
  const isChanged = Math.abs(value - defaultValue) > step / 2;

  return (
    <div className="flex items-center gap-3 no-print">
      <span className="text-xs font-medium text-[var(--text-secondary)] w-20 shrink-0">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 bg-[var(--bg-inset)] dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
      />
      <span className={`text-xs font-data w-16 text-right ${isChanged ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)]'}`}>
        {display}
      </span>
      {isChanged && (
        <button
          onClick={() => onChange(defaultValue)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] px-1"
          title="Reset"
        >
          Reset
        </button>
      )}
    </div>
  );
}
