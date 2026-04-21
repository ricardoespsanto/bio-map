import { useState } from 'react';
import type { MarkerResult, Marker, HealthRecord, UiState, Visit } from '../types';
import { sortVisits, buildVisitLabel } from '../codec';
import { MarkerCard } from './MarkerCard';
import { TrendChart } from './TrendChart';
import { DemographicsSelector } from './DemographicsSelector';
import type { BiologicalSex, AgeBracket } from '../types';
import { getDemographicStats, computeZScore, getOptimalRange } from '../utils/stats';

interface Props {
  record: HealthRecord;
  markers: Marker[];
  uiState: UiState;
  onUiUpdate: (patch: Partial<UiState>) => void;
  onAddVisit: () => void;
  onEditVisit: (index: number) => void;
}

const CATEGORIES = ['Metabolic', 'Lipids', 'Hormones', 'Thyroid', 'Nutrients', 'CBC', 'Renal', 'Liver', 'Inflammation'];

export function Dashboard({ record, markers, uiState, onUiUpdate, onAddVisit, onEditVisit }: Props) {
  const [urlCopied, setUrlCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const sorted = sortVisits(record.visits);

  // Default to most recent visit
  const visitIndex = uiState.selectedVisitIndex >= 0 && uiState.selectedVisitIndex < sorted.length
    ? uiState.selectedVisitIndex
    : sorted.length - 1;

  const selectedVisit: Visit = sorted[visitIndex];
  const { sex, ageBracket } = selectedVisit;

  // Original (unsorted) index for edit/delete operations
  const originalIndex = record.visits.indexOf(selectedVisit);

  // Compute results from the selected visit's actual values
  const results: MarkerResult[] = markers
    .filter((m) => selectedVisit.values[m.id] !== undefined)
    .map((m) => {
      const value = selectedVisit.values[m.id];
      const stats = getDemographicStats(m.id, { sex, ageBracket });
      const zScore = stats ? computeZScore(value, stats.mean, stats.sd) : undefined;
      return { marker: m, value, float: 0, zScore };
    });

  // Build trend data from all visits for each marker
  const trendValues: Record<string, number[]> = {};
  const trendLabels: Record<string, string[]> = {};
  for (const m of markers) {
    const pts = sorted.filter((v) => v.values[m.id] !== undefined);
    trendValues[m.id] = pts.map((v) => v.values[m.id]);
    trendLabels[m.id] = pts.map(buildVisitLabel);
  }

  const { lens, activeMarker } = uiState;

  const visibleResults = results;
  const filteredResults = selectedCategory === 'All'
    ? visibleResults
    : visibleResults.filter((r) => r.marker.category === selectedCategory);

  const optimal = visibleResults.filter((r) => {
    const opt = getOptimalRange(r.marker, sex);
    return r.value >= opt.min && r.value <= opt.max;
  }).length;

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  function prevVisit() {
    if (visitIndex > 0) onUiUpdate({ selectedVisitIndex: visitIndex - 1 });
  }

  function nextVisit() {
    if (visitIndex < sorted.length - 1) onUiUpdate({ selectedVisitIndex: visitIndex + 1 });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">Bio-Map</span>
            <span className="text-xs text-slate-500 font-mono">{optimal}/{visibleResults.length} optimal</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Visit navigation */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 text-xs">
              <button onClick={prevVisit} disabled={visitIndex === 0} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9.78 12.78a.75.75 0 01-1.06 0L4.47 8.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L6.06 8l3.72 3.72a.75.75 0 010 1.06z" clipRule="evenodd" /></svg>
              </button>
              <span className="px-2 font-mono text-slate-300 min-w-[90px] text-center">
                {buildVisitLabel(selectedVisit)}
              </span>
              <button onClick={nextVisit} disabled={visitIndex === sorted.length - 1} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
              </button>
            </div>

            {/* Lens toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
              <button onClick={() => onUiUpdate({ lens: 'raw' })} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${lens === 'raw' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Raw</button>
              <button onClick={() => onUiUpdate({ lens: 'zscore' })} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${lens === 'zscore' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Z-Score</button>
            </div>

            {/* Edit this visit */}
            <button onClick={() => onEditVisit(originalIndex)} title="Edit this visit" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>

            {/* Add visit */}
            <button onClick={onAddVisit} title="Add new visit" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </button>

            {/* Copy URL */}
            <button onClick={copyUrl} title="Copy URL — share or bookmark to preserve your data" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors">
              {urlCopied ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                  <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-3">
          <DemographicsSelector
            sex={sex}
            ageBracket={ageBracket}
            onChange={(_sex: BiologicalSex, _age: AgeBracket) => {
              // Demographics are per-visit; editing them opens the visit editor
              onEditVisit(originalIndex);
            }}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
            <p className="text-sm">No markers recorded for {buildVisitLabel(selectedVisit)}.</p>
            <button onClick={() => onEditVisit(originalIndex)} className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors">
              Edit this visit
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredResults.map((result) => {
                const optRange = getOptimalRange(result.marker, sex);
                const trend = trendValues[result.marker.id] ?? [];
                const labels = trendLabels[result.marker.id] ?? [];
                return (
                  <div key={result.marker.id}>
                    <MarkerCard
                      result={result}
                      sex={sex}
                      ageBracket={ageBracket}
                      lens={lens}
                      isActive={activeMarker === result.marker.id}
                      trendValues={trend}
                      onActivate={() => onUiUpdate({ activeMarker: activeMarker === result.marker.id ? undefined : result.marker.id })}
                    />
                    {activeMarker === result.marker.id && trend.length >= 2 && (
                      <div className="mt-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Historical Trend</p>
                        <TrendChart
                          values={trend}
                          rangeMin={result.marker.range.min}
                          rangeMax={result.marker.range.max}
                          optimalMin={optRange.min}
                          optimalMax={optRange.max}
                          unit={result.marker.unit}
                          labels={labels}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
