import type { MarkerResult } from '../types';
import { isSexSplitRange } from '../types';
import type { BiologicalSex } from '../types';
import { BellCurve } from './BellCurve';
import rawDemographics from '../data/demographics.json';
import type { AgeBracket } from '../types';

type DemographicsData = typeof rawDemographics;

interface Props {
  result: MarkerResult;
  sex: BiologicalSex;
  ageBracket: AgeBracket;
  lens: 'raw' | 'zscore';
  isActive: boolean;
  trendValues?: number[];
  onActivate: () => void;
  onCalibrate: () => void;
}

function statusColor(zScore: number | undefined, value: number, optMin: number, optMax: number) {
  if (zScore !== undefined) {
    const abs = Math.abs(zScore);
    if (abs <= 1) return 'green';
    if (abs <= 2) return 'yellow';
    return 'red';
  }
  if (value >= optMin && value <= optMax) return 'green';
  const range = optMax - optMin;
  const diff = value < optMin ? optMin - value : value - optMax;
  if (diff <= range * 0.5) return 'yellow';
  return 'red';
}

const colorClasses = {
  green: {
    border: 'border-green-800/60',
    badge: 'bg-green-900/50 text-green-400',
    glow: 'glow-green',
    value: 'text-green-400',
  },
  yellow: {
    border: 'border-yellow-800/60',
    badge: 'bg-yellow-900/50 text-yellow-400',
    glow: 'glow-yellow',
    value: 'text-yellow-400',
  },
  red: {
    border: 'border-red-800/60',
    badge: 'bg-red-900/50 text-red-400',
    glow: 'glow-red',
    value: 'text-red-400',
  },
};

export function MarkerCard({
  result,
  sex,
  ageBracket,
  lens,
  isActive,
  onActivate,
  onCalibrate,
}: Props) {
  const { marker, value, zScore, nonce } = result;

  const optimalRange = isSexSplitRange(marker.optimalRange)
    ? sex === 'female' ? marker.optimalRange.female : marker.optimalRange.male
    : marker.optimalRange;

  const color = statusColor(zScore, value, optimalRange.min, optimalRange.max);
  const cls = colorClasses[color];

  const displayValue =
    lens === 'zscore' && zScore !== undefined
      ? `${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}σ`
      : value.toFixed(marker.precision);

  const demData = rawDemographics.markers[marker.id as keyof typeof rawDemographics.markers];
  const stats = demData
    ? demData[ageBracket as keyof typeof demData]?.[sex]
    : null;

  return (
    <div
      className={`bg-slate-900 border rounded-xl transition-all cursor-pointer ${cls.border} ${isActive ? cls.glow + ' ring-1 ring-offset-1 ring-offset-slate-950 ring-cyan-600' : 'hover:border-slate-600'}`}
      onClick={onActivate}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{marker.category}</p>
            <p className="text-slate-200 font-medium text-sm mt-0.5">{marker.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {nonce && (
              <span className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono" title="Calibrated with nonce">
                ⚙ {nonce}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.badge}`}>
              {color === 'green' ? 'Optimal' : color === 'yellow' ? 'Borderline' : 'Review'}
            </span>
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className={`text-2xl font-bold font-mono tracking-tight ${cls.value}`}>
            {displayValue}
          </span>
          <span className="text-slate-500 text-xs">{lens === 'zscore' ? 'z-score' : marker.unit}</span>
        </div>

        {/* Optimal range hint */}
        <p className="text-xs text-slate-600 mb-3">
          Optimal: {optimalRange.min}–{optimalRange.max} {marker.unit}
        </p>

        {/* Bell Curve */}
        {stats && (
          <BellCurve
            mean={stats.mean}
            sd={stats.sd}
            value={value}
            optimalMin={optimalRange.min}
            optimalMax={optimalRange.max}
            unit={marker.unit}
          />
        )}
      </div>

      {/* Footer */}
      {isActive && (
        <div
          className="border-t border-slate-800 px-4 py-2.5 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          {stats && (
            <span className="text-xs text-slate-600 font-mono">
              μ {stats.mean} · σ {stats.sd}
            </span>
          )}
          <button
            onClick={onCalibrate}
            className="text-xs text-cyan-500 hover:text-cyan-300 font-medium transition-colors ml-auto"
          >
            Calibrate with lab result →
          </button>
        </div>
      )}
    </div>
  );
}
