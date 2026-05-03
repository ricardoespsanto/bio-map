# Bio-Map

> **"The Selfie Stays Local."**

Bio-Map is a zero-backend, deterministic medical dashboard that derives a
synthetic biomarker profile from a local selfie scan. Camera frames, face
descriptors, and derived identity material stay in browser memory only. No image,
template, seed, or biomarker calibration data is persisted.

```
f(local face descriptor, marker, year, month) -> value
```

Bio-Map is deterministic personalization, not medical advice and not strong
authentication. Same-face reproducibility is best effort under the pinned v2
model/schema and good capture conditions.

---

## How it works

```
Short local selfie scan
    |
    v  bundled face-api.js models loaded from /models/face-api
Face descriptors, one face only
    |
    v  average accepted frames -> L2 normalize -> int16 quantize
Canonical descriptor bytes
    |
    v  SHA-256 + HKDF(salt/info="biomap_v2_face...")
Master HMAC key
    |
    v  HMAC-SHA256(key, "m/{year}/{month}/{markerIndex}")
256-bit hash
    |
    v  BigInt top-53-bits / 2^53
Float [0, 1)
    |
    v  min + float * (max - min)
Biomarker value
```

Temporal pathing means different months and years naturally diverge, simulating
longitudinal history without storing a profile.

---

## Quick start

### Prerequisites

- Node.js >= 18
- npm / pnpm / bun
- A browser with camera support for the app experience

### Install & run

```bash
git clone https://github.com/<your-username>/bio-map.git
cd bio-map
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), start the local selfie scan,
and derive the deterministic dashboard.

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production bundle -> `dist/` |
| `npm run preview` | Serve the `dist/` folder locally |
| `npm test` | Run the Vitest suite |

---

## Testing

```bash
npm test
```

The snapshot tests capture canonical output for three synthetic face identity
descriptors across all 25 markers. If the v2 identity derivation logic changes,
the snapshot diff catches it.

To update snapshots intentionally after a schema change:

```bash
npm test -- --update
```

---

## URL fragment state

Bio-Map is stateless. The URL fragment stores only display state; biometric
material is never serialized.

| Parameter | Example | Meaning |
|---|---|---|
| `date` | `2026-03` | Active year-month for derivation |
| `sex` | `male` \| `female` | Demographic sex for Z-score / optimal ranges |
| `age` | `31-40` | Age bracket for demographic stats |
| `lens` | `raw` \| `zscore` | Display mode: raw units or Z-score |
| `active` | `glucose` | Expanded marker card |

Legacy v1 nonce parameters are ignored in v2.

---

## Schema versioning

The engine is keyed to `SCHEMA_VERSION = 'v2'`. Changes to the face model assets,
descriptor canonicalization, HKDF parameters, path format, or `hashBufferToFloat`
are schema-breaking and must update tests.

The v2 app is a replacement for the old passphrase flow. v1 profiles are not
supported by the runtime.

---

## Project structure

```
bio-map/
├── public/models/face-api/       # Local static face model assets
├── src/
│   ├── engine.ts                 # Core deterministic derivation logic
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── App.tsx                   # Root component + selfie identity gate
│   ├── biometrics/
│   │   └── faceIdentity.ts       # Local model loading, camera, scan helpers
│   ├── components/
│   │   ├── SelfieGate.tsx        # Local camera identity flow
│   │   ├── Dashboard.tsx         # Main layout + category filter
│   │   ├── MarkerCard.tsx        # Per-marker card with status coloring
│   │   ├── BellCurve.tsx         # SVG normal distribution overlay
│   │   ├── TrendChart.tsx        # SVG 6-month sparkline
│   │   └── DemographicsSelector.tsx
│   ├── hooks/
│   │   ├── useBioMap.ts          # Derivation orchestrator + trend data
│   │   └── useUrlState.ts        # URL fragment <-> React state bridge
│   └── data/
│       ├── markers.json          # 25 biomarker definitions
│       └── demographics.json     # Stats by age bracket and sex
└── tests/
    ├── engine.test.ts            # Determinism, identity, snapshot tests
    └── url-state.test.ts         # URL state privacy contract
```

---

## Privacy contract

| Guarantee | Implementation |
|---|---|
| Local inference only | Face models are loaded as static assets and run in the browser |
| No persisted biometric data | No localStorage, sessionStorage, cookies, IndexedDB, backend, or URL storage for face data |
| One face per scan | Multiple detected faces abort the scan |
| No calibration persistence | Per-marker nonce mining was removed in v2 |
| Deterministic outputs | Same canonical descriptor + month/year/marker path yields the same value |

---

## Adding a new biomarker

1. Add an entry to `src/data/markers.json` with a unique `id`, `range`,
   `optimalRange`, `precision`, and `category`.
2. Add demographic stats to `src/data/demographics.json` under the same `id`, for
   all 5 age brackets and both sexes.
3. Run `npm test -- --update` to re-baseline canonical snapshots.
4. Run `npm run build` to verify TypeScript and bundling.
