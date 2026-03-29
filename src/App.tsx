import { useMemo, useState } from 'react';
import { PassphraseGate } from './components/PassphraseGate';
import { Dashboard } from './components/Dashboard';
import { useBioMap } from './hooks/useBioMap';
import { useUrlState } from './hooks/useUrlState';
import markersRaw from './data/markers.json';
import type { Marker, Demographics } from './types';

const MARKERS = markersRaw as Marker[];

export function App() {
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [urlState, updateUrlState] = useUrlState();

  const { date, sex, ageBracket, nonces } = urlState;
  const [year, month] = date.split('-').map(Number);

  const demographics = useMemo<Demographics>(() => ({ sex, ageBracket }), [sex, ageBracket]);

  const { loadState, results, trendData } = useBioMap(
    passphrase,
    MARKERS,
    year,
    month,
    nonces,
    demographics,
  );

  if (!passphrase) {
    return <PassphraseGate onSubmit={setPassphrase} />;
  }

  return (
    <Dashboard
      passphrase={passphrase}
      markers={MARKERS}
      results={results}
      trendData={trendData}
      loadState={loadState}
      urlState={urlState}
      onUrlUpdate={updateUrlState}
      onLock={() => setPassphrase(null)}
    />
  );
}
