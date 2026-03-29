import { useEffect, useRef, useState } from 'react';
import { deriveMasterSeed, deriveMarkerFloat, floatToMarkerValue, computeZScore } from '../engine';
import type { Marker, MarkerResult, Demographics, StatParams } from '../types';
import { isSexSplitRange } from '../types';
import rawDemographics from '../data/demographics.json';

type DemographicsData = typeof rawDemographics;

function getDemographicStats(
  demographics: DemographicsData,
  markerId: string,
  demo: Demographics,
): StatParams | null {
  const markerData = demographics.markers[markerId as keyof typeof demographics.markers];
  if (!markerData) return null;
  const bracket = markerData[demo.ageBracket as keyof typeof markerData];
  if (!bracket) return null;
  return bracket[demo.sex] ?? null;
}

function getOptimalRange(marker: Marker, sex: string): { min: number; max: number } {
  if (isSexSplitRange(marker.optimalRange)) {
    return sex === 'female' ? marker.optimalRange.female : marker.optimalRange.male;
  }
  return marker.optimalRange;
}

export type LoadState = 'idle' | 'deriving' | 'ready' | 'error';

interface UseBioMapResult {
  loadState: LoadState;
  results: MarkerResult[];
  error?: string;
  trendData: Record<string, number[]>; // markerId → 6-month array
}

export function useBioMap(
  passphrase: string | null,
  markers: Marker[],
  year: number,
  month: number,
  nonces: Record<string, string>,
  demographics: Demographics,
): UseBioMapResult {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [results, setResults] = useState<MarkerResult[]>([]);
  const [error, setError] = useState<string>();
  const [trendData, setTrendData] = useState<Record<string, number[]>>({});

  // Abort controller for cancellation when inputs change
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    if (!passphrase) {
      setLoadState('idle');
      setResults([]);
      setTrendData({});
      return;
    }

    const abort = { cancelled: false };
    abortRef.current = abort;
    setLoadState('deriving');

    async function derive() {
      try {
        const masterSeed = await deriveMasterSeed(passphrase!);
        if (abort.cancelled) return;

        // Derive current month
        const derived = await Promise.all(
          markers.map(async (marker, index) => {
            const nonce = nonces[marker.id];
            const float = await deriveMarkerFloat(masterSeed, index, year, month, nonce);
            const value = floatToMarkerValue(float, marker.range.min, marker.range.max);
            const stats = getDemographicStats(
              rawDemographics as DemographicsData,
              marker.id,
              demographics,
            );
            const zScore = stats ? computeZScore(value, stats.mean, stats.sd) : undefined;
            return { marker, value, float, nonce, zScore } satisfies MarkerResult;
          }),
        );

        if (abort.cancelled) return;
        setResults(derived);

        // Derive 6-month trend history
        const trend: Record<string, number[]> = {};
        for (const [index, marker] of markers.entries()) {
          const values: number[] = [];
          for (let offset = 5; offset >= 0; offset--) {
            let tYear = year;
            let tMonth = month - offset;
            while (tMonth < 1) {
              tMonth += 12;
              tYear--;
            }
            const nonce = nonces[marker.id];
            const float = await deriveMarkerFloat(masterSeed, index, tYear, tMonth, nonce);
            values.push(floatToMarkerValue(float, marker.range.min, marker.range.max));
          }
          trend[marker.id] = values;
        }

        if (abort.cancelled) return;
        setTrendData(trend);
        setLoadState('ready');
      } catch (err) {
        if (abort.cancelled) return;
        setError(err instanceof Error ? err.message : 'Derivation failed');
        setLoadState('error');
      }
    }

    void derive();
    return () => {
      abort.cancelled = true;
    };
  }, [passphrase, markers, year, month, nonces, demographics]);

  return { loadState, results, error, trendData };
}

export { getOptimalRange };
export type { Demographics };
