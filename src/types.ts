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
  precision: number;
  range: GlobalRange;
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
  value: number;
  float: number;
  zScore?: number;
}

// ─── Health record (deep-link URL database) ───────────────────────────────

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Visit {
  year: number;
  quarter: Quarter;
  sex: BiologicalSex;
  ageBracket: AgeBracket;
  /** Only markers that were actually tested; untested markers are omitted */
  values: Record<string, number>;
}

export interface HealthRecord {
  version: 1;
  visits: Visit[];
}

// ─── Ephemeral UI state (not persisted in URL) ────────────────────────────

export interface UiState {
  selectedVisitIndex: number;
  lens: 'raw' | 'zscore';
  activeMarkerIds: string[];
  activeMarker?: string;
  selectedCategory: string;
}

// ─── URL / App state (legacy — kept temporarily during migration) ──────────

export interface UrlState {
  date: string;
  sex: BiologicalSex;
  ageBracket: AgeBracket;
  activeMarkerIds: string[];
  lens: 'raw' | 'zscore';
  activeMarker?: string;
}
