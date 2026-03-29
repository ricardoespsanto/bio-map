import { useEffect, useRef, useState } from 'react';
import type { Marker } from '../types';
import type { MinerRequest, MinerResponse } from '../types';

interface Props {
  passphrase: string;
  marker: Marker;
  markerIndex: number;
  year: number;
  month: number;
  currentNonce?: string;
  onFound: (markerId: string, nonce: string) => void;
  onClose: () => void;
}

type MinerState = 'idle' | 'mining' | 'found' | 'notFound';

export function NonceMiner({
  passphrase,
  marker,
  markerIndex,
  year,
  month,
  currentNonce,
  onFound,
  onClose,
}: Props) {
  const [targetInput, setTargetInput] = useState('');
  const [state, setState] = useState<MinerState>('idle');
  const [tried, setTried] = useState(0);
  const [foundNonce, setFoundNonce] = useState<string>();
  const [foundValue, setFoundValue] = useState<number>();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  function startMining() {
    const target = parseFloat(targetInput);
    if (isNaN(target)) return;
    if (target < marker.range.min || target > marker.range.max) return;

    workerRef.current?.terminate();
    setState('mining');
    setTried(0);
    setFoundNonce(undefined);

    const worker = new Worker(
      new URL('../workers/nonce-miner.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    const request: MinerRequest = {
      passphrase,
      markerIndex,
      markerId: marker.id,
      year,
      month,
      targetValue: target,
      rangeMin: marker.range.min,
      rangeMax: marker.range.max,
      precision: marker.precision,
    };

    worker.postMessage(request);

    worker.onmessage = (e: MessageEvent<MinerResponse>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setTried(msg.tried);
      } else if (msg.type === 'found') {
        setState('found');
        setFoundNonce(msg.nonce);
        setFoundValue(msg.value);
        worker.terminate();
      } else if (msg.type === 'notFound') {
        setState('notFound');
        worker.terminate();
      }
    };
  }

  function stopMining() {
    workerRef.current?.terminate();
    setState('idle');
  }

  function applyNonce() {
    if (foundNonce) {
      onFound(marker.id, foundNonce);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold">{marker.name} Calibration</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Mine a nonce to match your real lab result.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors ml-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Range info */}
        <div className="bg-slate-900 rounded-lg p-3 mb-4 text-xs text-slate-400 font-mono">
          Global range: {marker.range.min} – {marker.range.max} {marker.unit}
          {currentNonce && (
            <div className="text-amber-400 mt-1">Current nonce: <span className="text-white">{currentNonce}</span></div>
          )}
        </div>

        {/* Target input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Your lab result ({marker.unit})
          </label>
          <input
            type="number"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder={`e.g. ${((marker.range.min + marker.range.max) / 2).toFixed(marker.precision)}`}
            step={Math.pow(10, -marker.precision)}
            min={marker.range.min}
            max={marker.range.max}
            disabled={state === 'mining'}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />
        </div>

        {/* Status */}
        {state === 'mining' && (
          <div className="bg-slate-900 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Mining… {tried.toLocaleString()} candidates tried</span>
            </div>
            <div className="mt-2 bg-slate-800 rounded-full h-1">
              <div className="bg-cyan-500 h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (tried / 50000) * 100)}%` }} />
            </div>
          </div>
        )}

        {state === 'found' && foundNonce && foundValue !== undefined && (
          <div className="bg-green-950 border border-green-800 rounded-lg p-3 mb-4">
            <div className="text-green-400 text-xs font-medium mb-1">Nonce found!</div>
            <div className="font-mono text-white text-sm">
              Nonce: <span className="text-cyan-300">{foundNonce}</span>
            </div>
            <div className="text-slate-400 text-xs mt-1">
              Derived value: {foundValue.toFixed(marker.precision)} {marker.unit}
            </div>
          </div>
        )}

        {state === 'notFound' && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-xs">
              No nonce found within 6-character search space. Try a nearby value.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {state === 'idle' || state === 'notFound' ? (
            <button
              onClick={startMining}
              disabled={!targetInput || isNaN(parseFloat(targetInput))}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Start Mining
            </button>
          ) : state === 'mining' ? (
            <button
              onClick={stopMining}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={applyNonce}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Apply to Profile
            </button>
          )}
          {state === 'found' && (
            <button
              onClick={startMining}
              className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Re-mine
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
