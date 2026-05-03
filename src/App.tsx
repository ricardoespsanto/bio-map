import { useMemo, useState } from 'react';
import { SelfieGate } from './components/SelfieGate';
import { Dashboard } from './components/Dashboard';
import { useBioMap } from './hooks/useBioMap';
import { useUrlState } from './hooks/useUrlState';
import markersRaw from './data/markers.json';
import type { Marker, Demographics, IdentityDescriptor } from './types';

const MARKERS = markersRaw as Marker[];

export function App() {
  const [identityDescriptor, setIdentityDescriptor] = useState<IdentityDescriptor | null>(null);
  const [urlState, updateUrlState] = useUrlState();

  const { date, sex, ageBracket } = urlState;
  const [year, month] = date.split('-').map(Number);

  const demographics = useMemo<Demographics>(() => ({ sex, ageBracket }), [sex, ageBracket]);

  const { loadState, results, trendData } = useBioMap(
    identityDescriptor,
    MARKERS,
    year,
    month,
    demographics,
  );

  if (!identityDescriptor) {
    return <SelfieGate onIdentity={setIdentityDescriptor} />;
  }

  return (
    <Dashboard
      results={results}
      trendData={trendData}
      loadState={loadState}
      urlState={urlState}
      onUrlUpdate={updateUrlState}
      onLock={() => setIdentityDescriptor(null)}
    />
  );
}
