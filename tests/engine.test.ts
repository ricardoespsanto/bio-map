/**
 * Bio-Map Engine — Determinism & Correctness Tests
 *
 * NFR: 3 specific passphrases must always yield the exact same 25 marker values.
 * Snapshot tests capture the canonical output on first run; subsequent runs
 * verify nothing has drifted.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveMasterSeed,
  deriveMarkerFloat,
  floatToMarkerValue,
  hashBufferToFloat,
  generateAllMarkers,
  computeZScore,
  SCHEMA_VERSION,
} from '../src/engine';
import markersRaw from '../src/data/markers.json';

const MARKERS = markersRaw.map((m, i) => ({
  id: m.id,
  rangeMin: m.range.min,
  rangeMax: m.range.max,
  index: i,
}));

// ─── The 3 canonical passphrases from the NFR ─────────────────────────────
const CANONICAL_PASSPHRASES = [
  'healthy-sparrow-42',
  'mountain-river-flow',
  'xK9mP2qRvT8z',
] as const;

const TEST_YEAR = 2026;
const TEST_MONTH = 3;

// ─── Schema version ────────────────────────────────────────────────────────

it('SCHEMA_VERSION is v1', () => {
  expect(SCHEMA_VERSION).toBe('v1');
});

// ─── hashBufferToFloat contract ────────────────────────────────────────────

describe('hashBufferToFloat', () => {
  it('returns a value in [0, 1)', () => {
    const buf = new Uint8Array(32).fill(0).buffer;
    expect(hashBufferToFloat(buf)).toBeGreaterThanOrEqual(0);
    expect(hashBufferToFloat(buf)).toBeLessThan(1);
  });

  it('max byte value approaches but does not reach 1', () => {
    const buf = new Uint8Array(32).fill(0xff).buffer;
    const f = hashBufferToFloat(buf);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThan(1);
  });

  it('all-zeros and all-ones are different', () => {
    const zeros = new Uint8Array(32).fill(0x00).buffer;
    const ones = new Uint8Array(32).fill(0xff).buffer;
    expect(hashBufferToFloat(zeros)).not.toBe(hashBufferToFloat(ones));
  });
});

// ─── floatToMarkerValue ────────────────────────────────────────────────────

describe('floatToMarkerValue', () => {
  it('maps 0 → min', () => expect(floatToMarkerValue(0, 50, 400)).toBe(50));
  it('maps 1 → max', () => expect(floatToMarkerValue(1, 50, 400)).toBe(400));
  it('maps 0.5 → midpoint', () => expect(floatToMarkerValue(0.5, 50, 400)).toBe(225));
  it('preserves linearity', () => {
    const min = 70; const max = 200;
    for (const f of [0.1, 0.25, 0.75, 0.9]) {
      expect(floatToMarkerValue(f, min, max)).toBeCloseTo(min + f * (max - min), 10);
    }
  });
});

// ─── computeZScore ─────────────────────────────────────────────────────────

describe('computeZScore', () => {
  it('returns 0 at the mean', () => expect(computeZScore(100, 100, 10)).toBe(0));
  it('returns +1 at mean + 1σ', () => expect(computeZScore(110, 100, 10)).toBe(1));
  it('returns −2 at mean − 2σ', () => expect(computeZScore(80, 100, 10)).toBe(-2));
  it('returns 0 when sd is 0', () => expect(computeZScore(100, 100, 0)).toBe(0));
});

// ─── Determinism: same input → same output ─────────────────────────────────

describe('deriveMarkerFloat — determinism', () => {
  it('returns identical value on repeat calls with same inputs', async () => {
    const seed = await deriveMasterSeed('test-passphrase-abc');
    const a = await deriveMarkerFloat(seed, 0, 2026, 3);
    const b = await deriveMarkerFloat(seed, 0, 2026, 3);
    expect(a).toBe(b);
  });

  it('all 25 markers are deterministic', async () => {
    const seed = await deriveMasterSeed('determinism-check');
    const run1 = await Promise.all(MARKERS.map((m) => deriveMarkerFloat(seed, m.index, 2026, 3)));
    const run2 = await Promise.all(MARKERS.map((m) => deriveMarkerFloat(seed, m.index, 2026, 3)));
    expect(run1).toEqual(run2);
  });
});

// ─── Isolation: different inputs → different outputs ──────────────────────

describe('deriveMarkerFloat — isolation', () => {
  it('different passphrases produce different floats', async () => {
    const s1 = await deriveMasterSeed('passphrase-alpha');
    const s2 = await deriveMasterSeed('passphrase-beta');
    const f1 = await deriveMarkerFloat(s1, 0, 2026, 3);
    const f2 = await deriveMarkerFloat(s2, 0, 2026, 3);
    expect(f1).not.toBe(f2);
  });

  it('different markers produce different floats', async () => {
    const seed = await deriveMasterSeed('isolation-test');
    const floats = await Promise.all(MARKERS.map((m) => deriveMarkerFloat(seed, m.index, 2026, 3)));
    const unique = new Set(floats);
    expect(unique.size).toBe(MARKERS.length);
  });

  it('different months produce different floats', async () => {
    const seed = await deriveMasterSeed('monthly-test');
    const march = await deriveMarkerFloat(seed, 0, 2026, 3);
    const april = await deriveMarkerFloat(seed, 0, 2026, 4);
    expect(march).not.toBe(april);
  });

  it('different years produce different floats', async () => {
    const seed = await deriveMasterSeed('yearly-test');
    const y2026 = await deriveMarkerFloat(seed, 0, 2026, 3);
    const y2025 = await deriveMarkerFloat(seed, 0, 2025, 3);
    expect(y2026).not.toBe(y2025);
  });

  it('nonce changes the derived value', async () => {
    const seed = await deriveMasterSeed('nonce-test');
    const base = await deriveMarkerFloat(seed, 0, 2026, 3);
    const with_nonce = await deriveMarkerFloat(seed, 0, 2026, 3, 'abc');
    expect(base).not.toBe(with_nonce);
  });

  it('different nonces produce different floats', async () => {
    const seed = await deriveMasterSeed('nonce-isolation');
    const a = await deriveMarkerFloat(seed, 0, 2026, 3, 'abc');
    const b = await deriveMarkerFloat(seed, 0, 2026, 3, 'xyz');
    expect(a).not.toBe(b);
  });
});

// ─── Range bounds: generated values stay within marker bounds ─────────────

describe('value bounds', () => {
  it('all generated values are within [min, max] for each marker', async () => {
    const seed = await deriveMasterSeed('bounds-test');
    for (const m of MARKERS) {
      const float = await deriveMarkerFloat(seed, m.index, 2026, 3);
      const value = floatToMarkerValue(float, m.rangeMin, m.rangeMax);
      expect(value).toBeGreaterThanOrEqual(m.rangeMin);
      expect(value).toBeLessThanOrEqual(m.rangeMax);
    }
  });
});

// ─── NFR: 3 canonical passphrases — snapshot regression tests ─────────────
// On first run `vitest` creates __snapshots__/engine.test.ts.snap.
// Subsequent runs verify nothing has changed in the derivation logic.

describe('canonical passphrase snapshots (NFR)', () => {
  for (const phrase of CANONICAL_PASSPHRASES) {
    it(`"${phrase}" yields consistent 25 marker values`, async () => {
      const derived = await generateAllMarkers(phrase, MARKERS, TEST_YEAR, TEST_MONTH);
      const snapshot = derived.map((d) => ({
        id: d.id,
        // Round to 8 decimal places to avoid floating-point noise in snapshots
        float: Math.round(d.float * 1e8) / 1e8,
        value: Math.round(d.value * 1e4) / 1e4,
      }));
      expect(snapshot).toMatchSnapshot();
    });
  }
});

// ─── generateAllMarkers with nonces ───────────────────────────────────────

describe('generateAllMarkers with nonces', () => {
  it('applies nonces and changes affected marker values', async () => {
    const baseResults = await generateAllMarkers('nonce-batch-test', MARKERS, 2026, 3);
    const noncedResults = await generateAllMarkers('nonce-batch-test', MARKERS, 2026, 3, {
      glucose: 'aaa',
    });

    const glucoseIdx = MARKERS.findIndex((m) => m.id === 'glucose');
    expect(noncedResults[glucoseIdx].value).not.toBe(baseResults[glucoseIdx].value);

    // Non-nonce markers are unchanged
    const hba1cIdx = MARKERS.findIndex((m) => m.id === 'hba1c');
    expect(noncedResults[hba1cIdx].value).toBe(baseResults[hba1cIdx].value);
  });
});
