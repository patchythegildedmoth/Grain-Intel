import type { HistoricalFetchProgress } from '../../types/historicalWeather';

interface FetchProgressBarProps { progress: HistoricalFetchProgress; }

export function FetchProgressBar({ progress }: FetchProgressBarProps) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const phaseLabels: Record<string, string> = { weather: 'Fetching weather history', prices: 'Fetching price history', correlating: 'Computing correlations', done: 'Complete' };

  return (
    <div className="w-full max-w-md mx-auto py-6 px-4">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{phaseLabels[progress.phase] ?? progress.phase}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{progress.message}</div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{percent}%</div>
    </div>
  );
}
