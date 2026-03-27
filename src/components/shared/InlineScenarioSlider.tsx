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
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-20 shrink-0">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-600"
      />
      <span className={`text-xs font-mono w-16 text-right ${isChanged ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
        {display}
      </span>
      {isChanged && (
        <button
          onClick={() => onChange(defaultValue)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
          title="Reset"
        >
          Reset
        </button>
      )}
    </div>
  );
}
