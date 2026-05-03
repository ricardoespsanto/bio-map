/**
 * Bio-Map Engine — Determinism & Correctness Tests
 *
 * NFR: 3 specific face identities must always yield the exact same 25 marker values.
 * Snapshot tests capture the canonical output on first run; subsequent runs
 * verify nothing has drifted.
 */

import { describe, it, expect } from 'vitest';
import {
  averageFaceDescriptors,
  canonicalizeFaceDescriptor,
  deriveMasterSeedFromIdentity,
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

const CANONICAL_IDENTITIES = [
  Float32Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.25),
  Float32Array.from({ length: 128 }, (_, i) => Math.cos((i + 1) * 0.5) * 0.25),
  Float32Array.from({ length: 128 }, (_, i) => ((i % 17) - 8) / 32),
] as const;

const TEST_YEAR = 2026;
const TEST_MONTH = 3;

it('SCHEMA_VERSION is v2', () => {
  expect(SCHEMA_VERSION).toBe('v2');
});

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

describe('floatToMarkerValue', () => {
  it('maps 0 -> min', () => expect(floatToMarkerValue(0, 50, 400)).toBe(50));
  it('maps 1 -> max', () => expect(floatToMarkerValue(1, 50, 400)).toBe(400));
  it('maps 0.5 -> midpoint', () => expect(floatToMarkerValue(0.5, 50, 400)).toBe(225));
  it('preserves linearity', () => {
    const min = 70;
    const max = 200;
    for (const f of [0.1, 0.25, 0.75, 0.9]) {
      expect(floatToMarkerValue(f, min, max)).toBeCloseTo(min + f * (max - min), 10);
    }
  });
});

describe('computeZScore', () => {
  it('returns 0 at the mean', () => expect(computeZScore(100, 100, 10)).toBe(0));
  it('returns +1 at mean + 1sd', () => expect(computeZScore(110, 100, 10)).toBe(1));
  it('returns -2 at mean - 2sd', () => expect(computeZScore(80, 100, 10)).toBe(-2));
  it('returns 0 when sd is 0', () => expect(computeZScore(100, 100, 0)).toBe(0));
});

describe('averageFaceDescriptors', () => {
  it('averages descriptors without mutating inputs', () => {
    const a = new Float32Array(128).fill(0.25);
    const b = new Float32Array(128).fill(0.75);
    const originalA = Array.from(a);
    const originalB = Array.from(b);

    const averaged = averageFaceDescriptors([a, b]);

    expect(Array.from(a)).toEqual(originalA);
    expect(Array.from(b)).toEqual(originalB);
    expect(averaged).toHaveLength(128);
    expect(averaged[0]).toBeCloseTo(0.5, 6);
  });

  it('rejects empty descriptor sets', () => {
    expect(() => averageFaceDescriptors([])).toThrow(/at least one/i);
  });

  it('rejects descriptors that are not 128 dimensions', () => {
    expect(() => averageFaceDescriptors([new Float32Array(64)])).toThrow(/128/);
  });
});

describe('canonicalizeFaceDescriptor', () => {
  it('returns stable canonical bytes for the same descriptor values', () => {
    const descriptor = Float32Array.from({ length: 128 }, (_, i) => (i - 64) / 128);

    const first = canonicalizeFaceDescriptor(descriptor);
    const second = canonicalizeFaceDescriptor(Float32Array.from(descriptor));

    expect(first).toEqual(second);
    expect(first.byteLength).toBe(256);
  });

  it('normalizes descriptor magnitude before quantization', () => {
    const descriptor = Float32Array.from({ length: 128 }, (_, i) => (i % 5) + 1);
    const scaled = Float32Array.from(descriptor, (value) => value * 10);

    expect(canonicalizeFaceDescriptor(scaled)).toEqual(canonicalizeFaceDescriptor(descriptor));
  });
});

describe('deriveMarkerFloat — determinism', () => {
  it('returns identical value on repeat calls with same inputs', async () => {
    const seed = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[0]);
    const a = await deriveMarkerFloat(seed, 0, 2026, 3);
    const b = await deriveMarkerFloat(seed, 0, 2026, 3);
    expect(a).toBe(b);
  });

  it('all 25 markers are deterministic', async () => {
    const seed = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[1]);
    const run1 = await Promise.all(MARKERS.map((m) => deriveMarkerFloat(seed, m.index, 2026, 3)));
    const run2 = await Promise.all(MARKERS.map((m) => deriveMarkerFloat(seed, m.index, 2026, 3)));
    expect(run1).toEqual(run2);
  });
});

describe('deriveMarkerFloat — isolation', () => {
  it('different face identities produce different floats', async () => {
    const s1 = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[0]);
    const s2 = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[1]);
    const f1 = await deriveMarkerFloat(s1, 0, 2026, 3);
    const f2 = await deriveMarkerFloat(s2, 0, 2026, 3);
    expect(f1).not.toBe(f2);
  });

  it('different markers produce different floats', async () => {
    const seed = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[0]);
    const floats = await Promise.all(MARKERS.map((m) => deriveMarkerFloat(seed, m.index, 2026, 3)));
    const unique = new Set(floats);
    expect(unique.size).toBe(MARKERS.length);
  });

  it('different months produce different floats', async () => {
    const seed = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[0]);
    const march = await deriveMarkerFloat(seed, 0, 2026, 3);
    const april = await deriveMarkerFloat(seed, 0, 2026, 4);
    expect(march).not.toBe(april);
  });

  it('different years produce different floats', async () => {
    const seed = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[0]);
    const y2026 = await deriveMarkerFloat(seed, 0, 2026, 3);
    const y2025 = await deriveMarkerFloat(seed, 0, 2025, 3);
    expect(y2026).not.toBe(y2025);
  });
});

describe('value bounds', () => {
  it('all generated values are within [min, max] for each marker', async () => {
    const seed = await deriveMasterSeedFromIdentity(CANONICAL_IDENTITIES[2]);
    for (const m of MARKERS) {
      const float = await deriveMarkerFloat(seed, m.index, 2026, 3);
      const value = floatToMarkerValue(float, m.rangeMin, m.rangeMax);
      expect(value).toBeGreaterThanOrEqual(m.rangeMin);
      expect(value).toBeLessThanOrEqual(m.rangeMax);
    }
  });
});

describe('canonical face identity snapshots (NFR)', () => {
  CANONICAL_IDENTITIES.forEach((identity, identityIndex) => {
    it(`identity ${identityIndex + 1} yields consistent 25 marker values`, async () => {
      const derived = await generateAllMarkers(identity, MARKERS, TEST_YEAR, TEST_MONTH);
      const snapshot = derived.map((d) => ({
        id: d.id,
        float: Math.round(d.float * 1e8) / 1e8,
        value: Math.round(d.value * 1e4) / 1e4,
      }));
      expect(snapshot).toMatchSnapshot();
    });
  });
});
