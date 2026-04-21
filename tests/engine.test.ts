/**
 * Bio-Map Codec — Round-trip & Correctness Tests
 */

import { describe, it, expect } from 'vitest';
import {
  encodeHealthRecord,
  decodeHealthRecord,
  buildVisitLabel,
  sortVisits,
  BASE_YEAR,
  CODEC_VERSION,
} from '../src/codec';
import type { HealthRecord, Visit } from '../src/types';

const SAMPLE_VISIT: Visit = {
  year: 2026,
  quarter: 'Q1',
  sex: 'male',
  ageBracket: '31-40',
  values: {
    glucose: 95,
    hba1c: 5.4,
    ldl: 110,
    hdl: 52,
    tsh: 1.8,
  },
};

const SAMPLE_RECORD: HealthRecord = {
  version: 1,
  visits: [SAMPLE_VISIT],
};

// ─── Constants ────────────────────────────────────────────────────────────────

it('BASE_YEAR is 2010', () => expect(BASE_YEAR).toBe(2010));
it('CODEC_VERSION is 1', () => expect(CODEC_VERSION).toBe(1));

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('encode → decode round-trip', () => {
  it('single visit with 5 markers', async () => {
    const encoded = await encodeHealthRecord(SAMPLE_RECORD);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = await decodeHealthRecord(encoded);
    expect(decoded.version).toBe(1);
    expect(decoded.visits.length).toBe(1);

    const v = decoded.visits[0];
    expect(v.year).toBe(2026);
    expect(v.quarter).toBe('Q1');
    expect(v.sex).toBe('male');
    expect(v.ageBracket).toBe('31-40');
    expect(v.values.glucose).toBeCloseTo(95, 0);
    expect(v.values.hba1c).toBeCloseTo(5.4, 1);
    expect(v.values.ldl).toBeCloseTo(110, 0);
  });

  it('empty visits array', async () => {
    const record: HealthRecord = { version: 1, visits: [] };
    const encoded = await encodeHealthRecord(record);
    const decoded = await decodeHealthRecord(encoded);
    expect(decoded.visits.length).toBe(0);
  });

  it('all 25 markers present', async () => {
    const { default: markersRaw } = await import('../src/data/markers.json', { assert: { type: 'json' } });
    const values: Record<string, number> = {};
    for (const m of markersRaw) {
      values[m.id] = (m.range.min + m.range.max) / 2;
    }
    const record: HealthRecord = {
      version: 1,
      visits: [{ year: 2025, quarter: 'Q3', sex: 'female', ageBracket: '41-50', values }],
    };
    const decoded = await decodeHealthRecord(await encodeHealthRecord(record));
    for (const m of markersRaw) {
      // Codec uses Math.round at marker precision; allow ±1 step of rounding error
      const step = Math.pow(10, -m.precision);
      const diff = Math.abs(decoded.visits[0].values[m.id] - values[m.id]);
      expect(diff).toBeLessThanOrEqual(step * 0.5 + Number.EPSILON * 10);
    }
  });

  it('40 visits round-trips correctly', async () => {
    const visits: Visit[] = [];
    for (let y = 2016; y < 2026; y++) {
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
        visits.push({ year: y, quarter: q, sex: 'male', ageBracket: '31-40', values: { glucose: 95, ldl: 110 } });
      }
    }
    const record: HealthRecord = { version: 1, visits };
    const decoded = await decodeHealthRecord(await encodeHealthRecord(record));
    expect(decoded.visits.length).toBe(40);
  });

  it('encoded string is URL-safe base64url (no +, /, =)', async () => {
    const encoded = await encodeHealthRecord(SAMPLE_RECORD);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('deterministic: same record encodes to same string', async () => {
    const a = await encodeHealthRecord(SAMPLE_RECORD);
    const b = await encodeHealthRecord(SAMPLE_RECORD);
    expect(a).toBe(b);
  });
});

// ─── Demographics round-trip ──────────────────────────────────────────────────

describe('demographics preservation', () => {
  for (const sex of ['male', 'female'] as const) {
    for (const ageBracket of ['20-30', '31-40', '41-50', '51-60', '61+'] as const) {
      it(`${sex} / ${ageBracket}`, async () => {
        const record: HealthRecord = {
          version: 1,
          visits: [{ year: 2024, quarter: 'Q2', sex, ageBracket, values: { glucose: 90 } }],
        };
        const decoded = await decodeHealthRecord(await encodeHealthRecord(record));
        expect(decoded.visits[0].sex).toBe(sex);
        expect(decoded.visits[0].ageBracket).toBe(ageBracket);
      });
    }
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

describe('buildVisitLabel', () => {
  it('formats Q1 2024', () => expect(buildVisitLabel({ year: 2024, quarter: 'Q1', sex: 'male', ageBracket: '31-40', values: {} })).toBe('Q1 2024'));
  it('formats Q4 2019', () => expect(buildVisitLabel({ year: 2019, quarter: 'Q4', sex: 'female', ageBracket: '61+', values: {} })).toBe('Q4 2019'));
});

describe('sortVisits', () => {
  it('sorts chronologically', () => {
    const visits: Visit[] = [
      { year: 2024, quarter: 'Q3', sex: 'male', ageBracket: '31-40', values: {} },
      { year: 2024, quarter: 'Q1', sex: 'male', ageBracket: '31-40', values: {} },
      { year: 2023, quarter: 'Q4', sex: 'male', ageBracket: '31-40', values: {} },
    ];
    const sorted = sortVisits(visits);
    expect(sorted[0].year).toBe(2023);
    expect(sorted[1].quarter).toBe('Q1');
    expect(sorted[2].quarter).toBe('Q3');
  });

  it('does not mutate original array', () => {
    const visits: Visit[] = [
      { year: 2024, quarter: 'Q2', sex: 'male', ageBracket: '31-40', values: {} },
      { year: 2024, quarter: 'Q1', sex: 'male', ageBracket: '31-40', values: {} },
    ];
    sortVisits(visits);
    expect(visits[0].quarter).toBe('Q2');
  });
});
