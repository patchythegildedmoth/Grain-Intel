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

  // Show upload screen if no data
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center pt-12 pb-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Ag Source <span className="text-blue-600 dark:text-blue-400">Grain Intelligence</span>
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Upload your iRely contract export to get started
          </p>
        </div>
        <FileUpload />
      </div>
    );
  }

  const moduleContent = () => {
    switch (activeModule) {
      case 'morning-brief':
        return <MorningBrief />;
      case 'net-position':
        return <NetPositionDashboard />;
      case 'unpriced-exposure':
        return <UnpricedExposureReport />;
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
      case 'data-health':
        return <DataHealth />;
      default:
        return <MorningBrief />;
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
