import { useState, useEffect, useCallback } from 'react';
import { useContractStore } from './store/useContractStore';
import { AppShell } from './components/layout/AppShell';
import { FileUpload } from './components/layout/FileUpload';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { MorningBrief } from './components/modules/MorningBrief';
import { NetPositionDashboard } from './components/modules/NetPositionDashboard';
import { UnpricedExposureReport } from './components/modules/UnpricedExposureReport';
import { DeliveryTimeline } from './components/modules/DeliveryTimeline';
import { BasisSpreadAnalysis } from './components/modules/BasisSpreadAnalysis';
import { CustomerConcentration } from './components/modules/CustomerConcentration';
import { ContractTypeRiskProfile } from './components/modules/ContractTypeRiskProfile';
import { ScenarioPanel } from './components/modules/ScenarioPanel';
import { DataHealth } from './components/modules/DataHealth';
import { DailyInputs } from './components/modules/DailyInputs';
import { PriceLaterExposure } from './components/modules/PriceLaterExposure';
import { MarkToMarket } from './components/modules/MarkToMarket';
import { FreightEfficiencyAnalysis } from './components/modules/FreightEfficiencyAnalysis';

function getHashModule(): string {
  const hash = window.location.hash.replace('#', '');
  return hash || 'upload';
}

export default function App() {
  const isLoaded = useContractStore((s) => s.isLoaded);
  const [activeModule, setActiveModule] = useState(getHashModule);

  // Sync hash to state
  useEffect(() => {
    const handler = () => setActiveModule(getHashModule());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // When data loads, navigate to morning brief
  useEffect(() => {
    if (isLoaded && activeModule === 'upload') {
      setActiveModule('morning-brief');
      window.location.hash = 'morning-brief';
    }
  }, [isLoaded, activeModule]);

  const handleModuleChange = useCallback((id: string) => {
    setActiveModule(id);
    window.location.hash = id;
  }, []);

  // Show guided welcome screen if no data
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center pt-12 pb-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Ag Source <span className="text-blue-600 dark:text-blue-400">Grain Intelligence</span>
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Daily trading intelligence from your iRely contract data
          </p>
        </div>

        <FileUpload />

        {/* Ghost preview — shows what the Morning Brief looks like once data loads */}
        <div className="max-w-4xl mx-auto px-8 pb-12">
          <p className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
            Preview — Morning Brief
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 pointer-events-none select-none">
            {[
              { label: 'Unpriced Exposure', icon: '⚠️' },
              { label: 'Book P&L', icon: '💰' },
              { label: 'Net Position', icon: '📊' },
              { label: 'Overdue Contracts', icon: '🔴' },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {card.icon} {card.label}
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-300 dark:text-gray-600">
                  —
                </div>
                <div className="mt-1 h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Upload your .xlsx export to populate these metrics
          </p>
        </div>
      </div>
    );
  }

  const moduleContent = () => {
    switch (activeModule) {
      case 'morning-brief':
        return <MorningBrief onNavigate={handleModuleChange} />;
      case 'net-position':
        return <NetPositionDashboard onNavigate={handleModuleChange} />;
      case 'unpriced-exposure':
        return <UnpricedExposureReport onNavigate={handleModuleChange} />;
      case 'delivery-timeline':
        return <DeliveryTimeline />;
      case 'basis-spread':
        return <BasisSpreadAnalysis />;
      case 'customer-concentration':
        return <CustomerConcentration />;
      case 'risk-profile':
        return <ContractTypeRiskProfile />;
      case 'scenario':
        return <ScenarioPanel />;
      case 'daily-inputs':
        return <DailyInputs />;
      case 'price-later':
        return <PriceLaterExposure />;
      case 'mark-to-market':
        return <MarkToMarket onNavigate={handleModuleChange} />;
      case 'freight-efficiency':
        return <FreightEfficiencyAnalysis />;
      case 'data-health':
        return <DataHealth />;
      default:
        return <MorningBrief onNavigate={handleModuleChange} />;
    }
  };

  return (
    <AppShell activeModule={activeModule} onModuleChange={handleModuleChange}>
      <ErrorBoundary fallbackMessage={`Error in module: ${activeModule}`}>
        {moduleContent()}
      </ErrorBoundary>
    </AppShell>
  );
}
