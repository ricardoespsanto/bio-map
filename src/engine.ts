/**
 * Bio-Map Deterministic Engine - SCHEMA_VERSION v2
 *
 * Architecture: local face descriptor -> canonical bytes -> HKDF seed
 *               HMAC-SHA256(masterKey, path) -> 256-bit hash
 *               BigInt top-53-bits -> float [0, 1)
 *               float -> marker value in [range.min, range.max]
 */

export const SCHEMA_VERSION = 'v2' as const;

const FACE_DESCRIPTOR_LENGTH = 128;
const HKDF_SALT_STRING = 'biomap_v2_face_salt';
const HKDF_INFO_STRING = 'biomap_v2_face_identity_hmac_key';
const QUANTIZATION_SCALE = 32767;

export type FaceDescriptor = Float32Array | number[];

export function averageFaceDescriptors(descriptors: FaceDescriptor[]): Float32Array {
  if (descriptors.length === 0) {
    throw new Error('At least one face descriptor is required');
  }

  const averaged = new Float32Array(FACE_DESCRIPTOR_LENGTH);

  for (const descriptor of descriptors) {
    assertDescriptorLength(descriptor);
    for (let i = 0; i < FACE_DESCRIPTOR_LENGTH; i++) {
      averaged[i] += descriptor[i] / descriptors.length;
    }
  }

  return averaged;
}

export function canonicalizeFaceDescriptor(descriptor: FaceDescriptor): Uint8Array {
  assertDescriptorLength(descriptor);

  let norm = 0;
  for (let i = 0; i < FACE_DESCRIPTOR_LENGTH; i++) {
    norm += descriptor[i] * descriptor[i];
  }
  norm = Math.sqrt(norm);

  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error('Face descriptor must have a non-zero finite magnitude');
  }

  const bytes = new Uint8Array(FACE_DESCRIPTOR_LENGTH * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < FACE_DESCRIPTOR_LENGTH; i++) {
    const normalized = descriptor[i] / norm;
    const clamped = Math.max(-1, Math.min(1, normalized));
    view.setInt16(i * 2, Math.round(clamped * QUANTIZATION_SCALE), false);
  }

  return bytes;
}

function assertDescriptorLength(descriptor: FaceDescriptor): void {
  if (descriptor.length !== FACE_DESCRIPTOR_LENGTH) {
    throw new Error(`Face descriptor must contain ${FACE_DESCRIPTOR_LENGTH} values`);
  }
}

export async function deriveMasterSeedFromIdentity(
  descriptor: FaceDescriptor,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const canonical = canonicalizeFaceDescriptor(descriptor);
  const ikm = await crypto.subtle.digest('SHA-256', toArrayBuffer(canonical));

  const keyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const masterBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: enc.encode(HKDF_SALT_STRING),
      info: enc.encode(HKDF_INFO_STRING),
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return crypto.subtle.importKey(
    'raw',
    masterBits,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function hashBufferToFloat(hashBuffer: ArrayBuffer): number {
  const bytes = new Uint8Array(hashBuffer);
  let bigInt = 0n;
  for (const byte of bytes) {
    bigInt = (bigInt << 8n) | BigInt(byte);
  }
  const top53 = bigInt >> 203n;
  return Number(top53) / 9007199254740992;
}

export async function deriveMarkerFloat(
  masterSeed: CryptoKey,
  markerIndex: number,
  year: number,
  month: number,
): Promise<number> {
  const path = `m/${year}/${month}/${markerIndex}`;
  const hashBuffer = await crypto.subtle.sign(
    'HMAC',
    masterSeed,
    new TextEncoder().encode(path),
  );

  return hashBufferToFloat(hashBuffer);
}

export function floatToMarkerValue(float: number, min: number, max: number): number {
  return min + float * (max - min);
}

export function computeZScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}

export interface MarkerSpec {
  id: string;
  rangeMin: number;
  rangeMax: number;
}

export interface DerivedMarker {
  id: string;
  float: number;
  value: number;
}

export async function generateAllMarkers(
  identityDescriptor: FaceDescriptor,
  markers: MarkerSpec[],
  year: number,
  month: number,
): Promise<DerivedMarker[]> {
  const masterSeed = await deriveMasterSeedFromIdentity(identityDescriptor);

  return Promise.all(
    markers.map(async (marker, index) => {
      const float = await deriveMarkerFloat(masterSeed, index, year, month);
      const value = floatToMarkerValue(float, marker.rangeMin, marker.rangeMax);
      return { id: marker.id, float, value };
    }),
  );
}
