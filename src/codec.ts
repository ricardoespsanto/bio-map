import type { HealthRecord, Visit, Quarter, AgeBracket, BiologicalSex } from './types';
import markersRaw from './data/markers.json';

export const BASE_YEAR = 2010;
export const CODEC_VERSION = 1;

export const AGE_BRACKETS: AgeBracket[] = ['20-30', '31-40', '41-50', '51-60', '61+'];
export const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

// Stable canonical order — must never be reordered without bumping CODEC_VERSION
const MARKER_ORDER = markersRaw.map((m) => ({
  id: m.id,
  rangeMin: m.range.min,
  rangeMax: m.range.max,
  precision: m.precision,
}));

// ─── Sync binary packing ──────────────────────────────────────────────────

function packBinary(record: HealthRecord): Uint8Array {
  const parts: Uint8Array[] = [];

  // Format version byte
  parts.push(new Uint8Array([CODEC_VERSION]));

  for (const visit of record.visits) {
    const yearOffset = visit.year - BASE_YEAR;
    const quarterIndex = QUARTERS.indexOf(visit.quarter);
    const sexBit = visit.sex === 'female' ? 1 : 0;
    const ageBracketIndex = AGE_BRACKETS.indexOf(visit.ageBracket);

    // Byte 0: bits[7:6]=quarter, bits[5:0]=year_offset
    const byte0 = ((quarterIndex & 0x3) << 6) | (yearOffset & 0x3f);
    // Byte 1: bit[7]=sex, bits[6:4]=ageBracket, bits[3:0]=0
    const byte1 = ((sexBit & 0x1) << 7) | ((ageBracketIndex & 0x7) << 4);

    // Bytes 2-5: 32-bit little-endian marker presence bitmap
    let bitmap = 0;
    for (let i = 0; i < MARKER_ORDER.length; i++) {
      if (visit.values[MARKER_ORDER[i].id] !== undefined) {
        bitmap |= (1 << i);
      }
    }

    // Count present markers for value array sizing
    const presentMarkers = MARKER_ORDER.filter((m) => visit.values[m.id] !== undefined);
    const visitBytes = new Uint8Array(6 + presentMarkers.length * 2);
    const view = new DataView(visitBytes.buffer);

    view.setUint8(0, byte0);
    view.setUint8(1, byte1);
    view.setUint32(2, bitmap, true); // little-endian

    let offset = 6;
    for (const m of presentMarkers) {
      const raw = visit.values[m.id];
      const encoded = Math.round((raw - m.rangeMin) * Math.pow(10, m.precision));
      view.setUint16(offset, Math.max(0, Math.min(65535, encoded)), true);
      offset += 2;
    }

    parts.push(visitBytes);
  }

  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

function unpackBinary(buf: Uint8Array): HealthRecord {
  if (buf.length < 1) throw new Error('Empty buffer');
  const version = buf[0];
  if (version !== CODEC_VERSION) throw new Error(`Unsupported codec version: ${version}`);

  const visits: Visit[] = [];
  let pos = 1;

  while (pos < buf.length) {
    if (pos + 6 > buf.length) throw new Error('Truncated visit header');
    const view = new DataView(buf.buffer, buf.byteOffset + pos);

    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const bitmap = view.getUint32(2, true);

    const quarterIndex = (byte0 >> 6) & 0x3;
    const yearOffset = byte0 & 0x3f;
    const sexBit = (byte1 >> 7) & 0x1;
    const ageBracketIndex = (byte1 >> 4) & 0x7;

    const year = BASE_YEAR + yearOffset;
    const quarter = QUARTERS[quarterIndex];
    const sex: BiologicalSex = sexBit === 1 ? 'female' : 'male';
    const ageBracket = AGE_BRACKETS[ageBracketIndex];

    const presentMarkers = MARKER_ORDER.filter((_, i) => (bitmap >> i) & 1);
    const valuesByteCount = presentMarkers.length * 2;

    if (pos + 6 + valuesByteCount > buf.length) throw new Error('Truncated visit values');

    const values: Record<string, number> = {};
    let vOffset = 6;
    for (const m of presentMarkers) {
      const encoded = view.getUint16(vOffset, true);
      values[m.id] = encoded / Math.pow(10, m.precision) + m.rangeMin;
      vOffset += 2;
    }

    visits.push({ year, quarter, sex, ageBracket, values });
    pos += 6 + valuesByteCount;
  }

  return { version: 1, visits };
}

// ─── Async compression ────────────────────────────────────────────────────

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(data as Uint8Array<ArrayBuffer>);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(data as Uint8Array<ArrayBuffer>);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

// ─── Base64url ────────────────────────────────────────────────────────────

function toBase64Url(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function encodeHealthRecord(record: HealthRecord): Promise<string> {
  const raw = packBinary(record);
  const compressed = await compress(raw);
  return toBase64Url(compressed);
}

export async function decodeHealthRecord(encoded: string): Promise<HealthRecord> {
  const compressed = fromBase64Url(encoded);
  const raw = await decompress(compressed);
  return unpackBinary(raw);
}

export function buildVisitLabel(visit: Visit): string {
  return `${visit.quarter} ${visit.year}`;
}

export function sortVisits(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return QUARTERS.indexOf(a.quarter) - QUARTERS.indexOf(b.quarter);
  });
}
