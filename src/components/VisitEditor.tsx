import { useState } from 'react';
import type { Marker, Visit, Quarter, AgeBracket, BiologicalSex } from '../types';
import { AGE_BRACKETS, QUARTERS } from '../codec';

interface Props {
  markers: Marker[];
  initial?: Visit;
  onSave: (visit: Visit) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'Metabolic', 'Lipids', 'Hormones', 'Thyroid', 'Nutrients', 'CBC', 'Renal', 'Liver', 'Inflammation',
] as const;

export function VisitEditor({ markers, initial, onSave, onCancel }: Props) {
  const now = new Date();
  const currentQuarter: Quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}` as Quarter;

  const [year, setYear] = useState(initial?.year ?? now.getFullYear());
  const [quarter, setQuarter] = useState<Quarter>(initial?.quarter ?? currentQuarter);
  const [sex, setSex] = useState<BiologicalSex>(initial?.sex ?? 'male');
  const [ageBracket, setAgeBracket] = useState<AgeBracket>(initial?.ageBracket ?? '31-40');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of markers) {
      const v = initial?.values[m.id];
      init[m.id] = v !== undefined ? v.toFixed(m.precision) : '';
    }
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, number> | null {
    const newErrors: Record<string, string> = {};
    const parsed: Record<string, number> = {};
    for (const m of markers) {
      const raw = fieldValues[m.id] ?? '';
      if (raw === '') continue;
      const n = Number(raw);
      if (isNaN(n) || n < m.range.min || n > m.range.max) {
        newErrors[m.id] = `${m.range.min}–${m.range.max} ${m.unit}`;
      } else {
        parsed[m.id] = n;
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return null;
    return parsed;
  }

  function handleSave() {
    const values = validate();
    if (!values) return;
    onSave({ year, quarter, sex, ageBracket, values });
  }

  const hasAnyValue = markers.some((m) => (fieldValues[m.id] ?? '') !== '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {initial ? 'Edit Visit' : 'Add Lab Visit'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter the values from your lab results. Leave fields blank for tests you didn't have.
            </p>
          </div>
          <button onClick={onCancel} className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Visit metadata */}
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Visit details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Year</label>
              <input
                type="number"
                min={2010}
                max={now.getFullYear()}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value as Quarter)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as BiologicalSex)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Age bracket</label>
              <select
                value={ageBracket}
                onChange={(e) => setAgeBracket(e.target.value as AgeBracket)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {AGE_BRACKETS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Marker inputs by category */}
        <div className="p-6 space-y-6">
          {CATEGORIES.map((cat) => {
            const catMarkers = markers.filter((m) => m.category === cat);
            if (catMarkers.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{cat}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {catMarkers.map((m) => (
                    <div key={m.id}>
                      <label className="block text-xs text-slate-400 mb-1">
                        {m.name} <span className="text-slate-600">{m.unit}</span>
                      </label>
                      <input
                        type="number"
                        step={Math.pow(10, -m.precision)}
                        min={m.range.min}
                        max={m.range.max}
                        value={fieldValues[m.id]}
                        onChange={(e) => {
                          setFieldValues((prev) => ({ ...prev, [m.id]: e.target.value }));
                          if (errors[m.id]) setErrors((prev) => { const n = { ...prev }; delete n[m.id]; return n; });
                        }}
                        placeholder={`${m.range.min}–${m.range.max}`}
                        className={`w-full bg-slate-800 border ${errors[m.id] ? 'border-red-600' : 'border-slate-700'} rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors`}
                      />
                      {errors[m.id] && <p className="text-xs text-red-500 mt-0.5">{errors[m.id]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasAnyValue}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {initial ? 'Save Changes' : 'Save Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}
