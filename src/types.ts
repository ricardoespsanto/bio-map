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
  /** Decimal places for display and nonce-tolerance calculation */
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
  /** Raw generated or nonce-adjusted value in marker's units */
  value: number;
  /** Underlying [0,1] float before range mapping */
  float: number;
  /** Applied adjustment nonce, if any */
  nonce?: string;
  /** Z-score relative to demographic stats */
  zScore?: number;
}

// ─── URL / App state ───────────────────────────────────────────────────────

export interface UrlState {
  /** YYYY-MM */
  date: string;
  sex: BiologicalSex;
  ageBracket: AgeBracket;
  /** Map of markerId → nonce string */
  nonces: Record<string, string>;
  /** 'raw' | 'zscore' */
  lens: 'raw' | 'zscore';
  /** Which marker is expanded for detail view */
  activeMarker?: string;
}

// ─── Nonce miner messages ──────────────────────────────────────────────────

export interface MinerRequest {
  passphrase: string;
  markerIndex: number;
  markerId: string;
  year: number;
  month: number;
  targetValue: number;
  rangeMin: number;
  rangeMax: number;
  precision: number;
}

export type MinerResponse =
  | { type: 'progress'; tried: number }
  | { type: 'found'; nonce: string; value: number; markerId: string }
  | { type: 'notFound'; markerId: string };
