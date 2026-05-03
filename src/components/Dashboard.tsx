import { useState } from 'react';
import type { MarkerResult } from '../types';
import type { UrlState } from '../types';
import { MarkerCard } from './MarkerCard';
import { TrendChart, buildMonthLabels } from './TrendChart';
import { DemographicsSelector } from './DemographicsSelector';
import type { BiologicalSex, AgeBracket } from '../types';
import { isSexSplitRange } from '../types';
import type { LoadState } from '../hooks/useBioMap';

interface Props {
  results: MarkerResult[];
  trendData: Record<string, number[]>;
  loadState: LoadState;
  urlState: UrlState;
  onUrlUpdate: (patch: Partial<UrlState>) => void;
  onLock: () => void;
}

const CATEGORIES = ['Metabolic', 'Lipids', 'Hormones', 'Thyroid', 'Nutrients', 'CBC', 'Renal', 'Liver', 'Inflammation'];

export function Dashboard({
  results,
  trendData,
  loadState,
  urlState,
  onUrlUpdate,
  onLock,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { date, sex, ageBracket, lens, activeMarker } = urlState;
  const [year, month] = date.split('-').map(Number);
  const monthLabels = buildMonthLabels(month);
  const currentMonth = month == new Date().getMonth() + 1;

  const filteredResults =
    selectedCategory === 'All'
      ? results
      : results.filter((r) => r.marker.category === selectedCategory);

  function prevMonth() {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y--; }
    onUrlUpdate({ date: `${y}-${String(m).padStart(2, '0')}` });
  }

  function nextMonth() {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y++; }
    onUrlUpdate({ date: `${y}-${String(m).padStart(2, '0')}` });
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Summary stats
  const optimal = results.filter((r) => {
    const opt = isSexSplitRange(r.marker.optimalRange)
      ? sex === 'female' ? r.marker.optimalRange.female : r.marker.optimalRange.male
      : r.marker.optimalRange;
    return r.value >= opt.min && r.value <= opt.max;
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">Bio-Map</span>
            {loadState === 'ready' && (
              <span className="text-xs text-slate-500 font-mono">
                face seed · {optimal}/{results.length} optimal
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month nav */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 text-xs">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9.78 12.78a.75.75 0 01-1.06 0L4.47 8.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L6.06 8l3.72 3.72a.75.75 0 010 1.06z" clipRule="evenodd" /></svg>
              </button>
              <span className="px-2 font-mono text-slate-300 min-w-[80px] text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button disabled={currentMonth} onClick={nextMonth} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
              </button>
            </div>

            {/* Lens toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => onUrlUpdate({ lens: 'raw' })}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${lens === 'raw' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Raw
              </button>
              <button
                onClick={() => onUrlUpdate({ lens: 'zscore' })}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${lens === 'zscore' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Z-Score
              </button>
            </div>

            {/* Lock */}
            <button
              onClick={onLock}
              title="Clear face identity from memory"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Demographics bar */}
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <DemographicsSelector
            sex={sex}
            ageBracket={ageBracket}
            onChange={(s: BiologicalSex, a: AgeBracket) =>
              onUrlUpdate({ sex: s, ageBracket: a })
            }
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Loading state */}
        {(loadState === 'idle' || loadState === 'deriving') && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
            <svg className="w-8 h-8 animate-spin text-cyan-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm">Deriving biomarkers from local face identity...</p>
          </div>
        )}

        {loadState === 'ready' && (
          <>
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Marker grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredResults.map((result) => {
                const optRange = isSexSplitRange(result.marker.optimalRange)
                  ? sex === 'female' ? result.marker.optimalRange.female : result.marker.optimalRange.male
                  : result.marker.optimalRange;
                return (
                  <div key={result.marker.id}>
                    <MarkerCard
                      result={result}
                      sex={sex}
                      ageBracket={ageBracket}
                      lens={lens}
                      isActive={activeMarker === result.marker.id}
                      onActivate={() =>
                        onUrlUpdate({
                          activeMarker: activeMarker === result.marker.id ? undefined : result.marker.id,
                        })
                      }
                    />
                    {/* Inline trend chart when active */}
                    {activeMarker === result.marker.id && trendData[result.marker.id]?.length >= 2 && (
                      <div className="mt-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">6-Month Trend</p>
                        <TrendChart
                          values={trendData[result.marker.id]}
                          rangeMin={result.marker.range.min}
                          rangeMax={result.marker.range.max}
                          optimalMin={optRange.min}
                          optimalMax={optRange.max}
                          unit={result.marker.unit}
                          monthLabels={monthLabels}
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
