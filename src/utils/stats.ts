import type { Marker, Demographics, StatParams } from '../types';
import { isSexSplitRange } from '../types';
import rawDemographics from '../data/demographics.json';

type DemographicsData = typeof rawDemographics;

export function getDemographicStats(
  markerId: string,
  demo: Demographics,
): StatParams | null {
  const markerData = rawDemographics.markers[markerId as keyof DemographicsData['markers']];
  if (!markerData) return null;
  const bracket = markerData[demo.ageBracket as keyof typeof markerData];
  if (!bracket) return null;
  return (bracket as Record<string, StatParams>)[demo.sex] ?? null;
}

export function getOptimalRange(marker: Marker, sex: string): { min: number; max: number } {
  if (isSexSplitRange(marker.optimalRange)) {
    return sex === 'female' ? marker.optimalRange.female : marker.optimalRange.male;
  }
  return marker.optimalRange;
}

export function computeZScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}
