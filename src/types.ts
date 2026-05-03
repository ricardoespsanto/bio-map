// ─── Marker definitions ────────────────────────────────────────────────────

export interface GlobalRange {
  min: number;
  max: number;
}

export interface SexSplitRange {
  male: GlobalRange;
  female: GlobalRange;
}

export interface Marker {
  id: string;
  name: string;
  unit: string;
  /** Decimal places for display */
  precision: number;
  /** Absolute biological bounds used for deterministic mapping */
  range: GlobalRange;
  /** Clinically optimal range; may be sex-split */
  optimalRange: GlobalRange | SexSplitRange;
  category: string;
}

export function isSexSplitRange(r: GlobalRange | SexSplitRange): r is SexSplitRange {
  return 'male' in r && 'female' in r;
}

// ─── Demographics ──────────────────────────────────────────────────────────

export type AgeBracket = '20-30' | '31-40' | '41-50' | '51-60' | '61+';
export type BiologicalSex = 'male' | 'female';

export interface StatParams {
  mean: number;
  sd: number;
}

export interface Demographics {
  sex: BiologicalSex;
  ageBracket: AgeBracket;
}

// ─── Engine outputs ────────────────────────────────────────────────────────

export interface MarkerResult {
  marker: Marker;
  /** Raw generated value in marker's units */
  value: number;
  /** Underlying [0,1] float before range mapping */
  float: number;
  /** Z-score relative to demographic stats */
  zScore?: number;
}

// ─── URL / App state ───────────────────────────────────────────────────────

export interface UrlState {
  /** YYYY-MM */
  date: string;
  sex: BiologicalSex;
  ageBracket: AgeBracket;
  /** 'raw' | 'zscore' */
  lens: 'raw' | 'zscore';
  /** Which marker is expanded for detail view */
  activeMarker?: string;
}

// ─── Biometric identity ───────────────────────────────────────────────────

export type IdentityDescriptor = Float32Array;
