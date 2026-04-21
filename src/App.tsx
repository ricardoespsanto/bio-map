import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { LandingScreen } from './components/LandingScreen';
import { VisitEditor } from './components/VisitEditor';
import { useHealthRecord } from './hooks/useHealthRecord';
import markersRaw from './data/markers.json';
import type { Marker, UiState, Visit } from './types';

const MARKERS = markersRaw as Marker[];

const DEFAULT_UI: UiState = {
  selectedVisitIndex: -1,
  lens: 'raw',
  activeMarkerIds: [],
  selectedCategory: 'All',
};

export function App() {
  const { record, loading, error, addVisit, updateVisit } = useHealthRecord();
  const [uiState, setUiState] = useState<UiState>(DEFAULT_UI);
  const [showEditor, setShowEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateUi(patch: Partial<UiState>) {
    setUiState((prev) => ({ ...prev, ...patch }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <svg className="w-8 h-8 animate-spin text-cyan-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 font-semibold mb-2">Could not load health record</p>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => { history.replaceState(null, '', window.location.pathname); window.location.reload(); }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-lg transition-colors"
          >
            Start fresh
          </button>
        </div>
      </div>
    );
  }

  const hasVisits = record && record.visits.length > 0;

  async function handleSaveVisit(visit: Visit) {
    if (editingIndex !== null) {
      await updateVisit(editingIndex, visit);
    } else {
      await addVisit(visit);
      // Auto-select the newly added visit (it will be last after sorting)
      setUiState((prev) => ({ ...prev, selectedVisitIndex: (record?.visits.length ?? 0) }));
    }
    setShowEditor(false);
    setEditingIndex(null);
  }

  return (
    <>
      {!hasVisits ? (
        <LandingScreen onAddFirstVisit={() => setShowEditor(true)} />
      ) : (
        <Dashboard
          record={record}
          markers={MARKERS}
          uiState={uiState}
          onUiUpdate={updateUi}
          onAddVisit={() => { setEditingIndex(null); setShowEditor(true); }}
          onEditVisit={(i) => { setEditingIndex(i); setShowEditor(true); }}
        />
      )}

      {showEditor && (
        <VisitEditor
          markers={MARKERS}
          initial={editingIndex !== null ? record?.visits[editingIndex] : undefined}
          onSave={handleSaveVisit}
          onCancel={() => { setShowEditor(false); setEditingIndex(null); }}
        />
      )}
    </>
  );
}
