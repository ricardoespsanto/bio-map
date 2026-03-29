/**
 * Bio-Map Deterministic Engine — SCHEMA_VERSION v1
 *
 * Architecture: PBKDF2(passphrase, salt) → master CryptoKey
 *               HMAC-SHA256(masterKey, path) → 256-bit hash
 *               BigInt top-53-bits → float [0, 1)
 *               float → marker value in [range.min, range.max]
 *
 * All arithmetic uses integer BigInt operations before the final
 * IEEE-754 division so results are bit-identical across platforms.
 */

export const SCHEMA_VERSION = 'v1' as const;

const STATIC_SALT_STRING = 'biomap_v1_salt';
const PBKDF2_ITERATIONS = 100_000;
const NONCE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// ─── Master seed derivation ────────────────────────────────────────────────

export async function deriveMasterSeed(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const masterBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(STATIC_SALT_STRING),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
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

// ─── Hash → float conversion (cross-platform determinism) ─────────────────

/**
 * Convert a 256-bit HMAC output to a float in [0, 1) using BigInt arithmetic.
 * We take the top 53 bits so the result maps exactly into a 64-bit double
 * with no rounding ambiguity, ensuring identical values on all platforms.
 */
export function hashBufferToFloat(hashBuffer: ArrayBuffer): number {
  const bytes = new Uint8Array(hashBuffer);
  let bigInt = 0n;
  for (const byte of bytes) {
    bigInt = (bigInt << 8n) | BigInt(byte);
  }
  // Shift right 203 bits to isolate the top 53 bits of the 256-bit value
  const top53 = bigInt >> 203n;
  // Divide by 2^53 — exact in IEEE-754 double since top53 < 2^53
  return Number(top53) / 9007199254740992; // 2**53
}

// ─── Per-marker derivation ─────────────────────────────────────────────────

/**
 * Derive the raw [0,1) float for a single marker at a given temporal path.
 * Path template: m/{year}/{month}/{markerIndex}[/{nonce}]
 */
export async function deriveMarkerFloat(
  masterSeed: CryptoKey,
  markerIndex: number,
  year: number,
  month: number,
  nonce?: string,
): Promise<number> {
  const path = nonce
    ? `m/${year}/${month}/${markerIndex}/${nonce}`
    : `m/${year}/${month}/${markerIndex}`;

  const hashBuffer = await crypto.subtle.sign(
    'HMAC',
    masterSeed,
    new TextEncoder().encode(path),
  );

  return hashBufferToFloat(hashBuffer);
}

/**
 * Map a [0,1) float onto a concrete biological range.
 */
export function floatToMarkerValue(float: number, min: number, max: number): number {
  return min + float * (max - min);
}

/**
 * Compute the Z-score of a value relative to demographic statistics.
 */
export function computeZScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}

// ─── Batch generation ─────────────────────────────────────────────────────

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
  passphrase: string,
  markers: MarkerSpec[],
  year: number,
  month: number,
  nonces: Record<string, string> = {},
): Promise<DerivedMarker[]> {
  const masterSeed = await deriveMasterSeed(passphrase);

  return Promise.all(
    markers.map(async (marker, index) => {
      const nonce = nonces[marker.id];
      const float = await deriveMarkerFloat(masterSeed, index, year, month, nonce);
      const value = floatToMarkerValue(float, marker.rangeMin, marker.rangeMax);
      return { id: marker.id, float, value };
    }),
  );
}

// ─── Nonce finder (async generator) ───────────────────────────────────────

export type NonceSearchUpdate =
  | { found: false; tried: number }
  | { found: true; nonce: string; value: number };

/**
 * Brute-force an Adjustment Nonce such that the derived marker value
 * lands within `tolerance` of `targetValue`.
 *
 * Yields periodic progress updates and a final found/not-found result.
 * Tolerance defaults to 0.5 × the unit step (10^-precision).
 */
export async function* findNonce(
  masterSeed: CryptoKey,
  markerIndex: number,
  year: number,
  month: number,
  targetValue: number,
  rangeMin: number,
  rangeMax: number,
  precision: number,
  maxLen = 6,
): AsyncGenerator<NonceSearchUpdate> {
  const tolerance = 0.5 * Math.pow(10, -precision);
  let tried = 0;

  for (let len = 1; len <= maxLen; len++) {
    for (const nonce of generateNonceStrings(len)) {
      const float = await deriveMarkerFloat(masterSeed, markerIndex, year, month, nonce);
      const value = floatToMarkerValue(float, rangeMin, rangeMax);
      tried++;

      if (Math.abs(value - targetValue) <= tolerance) {
        yield { found: true, nonce, value };
        return;
      }

      if (tried % 500 === 0) {
        yield { found: false, tried };
      }
    }
  }

  // Exhausted search space without a match
  yield { found: false, tried };
}

// ─── Nonce string generator ────────────────────────────────────────────────

function* generateNonceStrings(length: number): Generator<string> {
  const base = NONCE_ALPHABET.length;
  const indices = new Array<number>(length).fill(0);

  while (true) {
    yield indices.map((i) => NONCE_ALPHABET[i]).join('');

    // Increment with carry
    let pos = length - 1;
    while (pos >= 0) {
      indices[pos]++;
      if (indices[pos] < base) break;
      indices[pos] = 0;
      pos--;
    }
    if (pos < 0) return;
  }
}
