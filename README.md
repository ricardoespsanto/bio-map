# Bio-Map

> **"The Passphrase IS the Data."**

A zero-knowledge, deterministic medical dashboard that derives your health profile
entirely from a passphrase — no database, no server, no PII storage. Every value is
reproducible from the same passphrase on any device, forever.

```
f(passphrase, marker, year, month) → value
```

---

## How it works

```
Passphrase
    │
    ▼  PBKDF2(salt="biomap_v1_salt", 100k iterations, SHA-256)
Master Seed (256-bit)
    │
    ▼  HMAC-SHA256(seed, "m/{year}/{month}/{markerIndex}[/{nonce}]")
256-bit Hash
    │
    ▼  BigInt top-53-bits ÷ 2⁵³   ← integer-only math, cross-platform exact
Float [0, 1)
    │
    ▼  min + float × (max − min)
Biomarker Value
```

**Temporal pathing** means August and September naturally diverge, simulating
longitudinal history without storing a single byte.

**Calibration / "Reverse Mining"**: if your real lab result differs from what the
passphrase generates, the app brute-forces a short **Adjustment Nonce** (2–6 chars)
in a Web Worker. The nonce is appended to the derivation path. Your
**Life Key** = `passphrase + nonces` — both halves live only in your head and the
URL fragment.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18 (for native `crypto.subtle`)
- npm / pnpm / bun

### Install & run

```bash
git clone https://github.com/<your-username>/bio-map.git
cd bio-map
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), type any passphrase (≥ 6 chars),
and your deterministic health profile appears instantly.

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production bundle → `dist/` |
| `npm run preview` | Serve the `dist/` folder locally |
| `npm test` | Run the Vitest suite (snapshot + determinism tests) |

---

## Testing

```bash
npm test
```

The first run generates `tests/__snapshots__/engine.test.ts.snap` containing the
canonical output for three specific passphrases × 25 markers. Every subsequent run
is a regression guard — if any derivation logic changes, the snapshot diff will
catch it immediately.

To update snapshots intentionally (e.g. after a schema version bump):

```bash
npm test -- --update-snapshots
```

To run a single test file in watch mode:

```bash
npm test -- --watch tests/engine.test.ts
```

---

## Hosting (static, zero server)

The build output is a plain `dist/` folder. Deploy it anywhere that serves static
files:

### Vercel

```bash
npm run build
npx vercel dist
```

Or connect the repo in the Vercel dashboard — it will auto-detect Vite and run
`npm run build`.

### Netlify

```bash
npm run build
npx netlify deploy --prod --dir dist
```

### AWS S3 + CloudFront

```bash
npm run build
aws s3 sync dist/ s3://<your-bucket> --delete
# Enable static website hosting on the bucket and point CloudFront at it
```

### GitHub Pages

```bash
npm run build
# gh-pages package deploys the dist folder to the gh-pages branch
npx gh-pages -d dist
```

---

## URL fragment state

Bio-Map is fully stateless. Everything except the passphrase (which you type and is
never stored anywhere) lives in the URL fragment (`#`). Fragments are **never sent
to any server**.

| Parameter | Example | Meaning |
|---|---|---|
| `date` | `2026-03` | Active year-month for derivation |
| `sex` | `male` \| `female` | Demographic sex for Z-score / optimal ranges |
| `age` | `31-40` | Age bracket for demographic stats |
| `lens` | `raw` \| `zscore` | Display mode: raw units or Z-score |
| `nonces` | `glucose:c9,hba1c:ab` | Calibration nonces per marker |
| `active` | `glucose` | Expanded marker card |

**Bookmark** your calibrated profile URL and you can return to exactly the same
view from any device — just re-enter your passphrase.

---

## Schema versioning

The engine is keyed to `SCHEMA_VERSION = 'v1'` via the static salt string
`biomap_v1_salt`. If medical reference ranges or derivation logic change in a future
version, the salt changes (e.g. `biomap_v2_salt`), producing a wholly independent
set of values. Old URLs remain valid by pinning the version in the fragment.

---

## Project structure

```
bio-map/
├── src/
│   ├── engine.ts                 # Core deterministic derivation logic
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── App.tsx                   # Root component + passphrase gate
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Tailwind directives
│   ├── data/
│   │   ├── markers.json          # 25 biomarker definitions (range, unit, precision)
│   │   └── demographics.json     # μ/σ stats by age bracket × sex
│   ├── components/
│   │   ├── PassphraseGate.tsx    # Entry screen
│   │   ├── Dashboard.tsx         # Main layout + category filter
│   │   ├── MarkerCard.tsx        # Per-marker card with status coloring
│   │   ├── BellCurve.tsx         # SVG normal distribution overlay
│   │   ├── TrendChart.tsx        # SVG 6-month sparkline
│   │   ├── DemographicsSelector.tsx
│   │   └── NonceMiner.tsx        # Lab-result calibration modal
│   ├── hooks/
│   │   ├── useBioMap.ts          # Derivation orchestrator + trend data
│   │   └── useUrlState.ts        # URL fragment ↔ React state bridge
│   └── workers/
│       └── nonce-miner.worker.ts # Off-thread brute-force nonce search
└── tests/
    └── engine.test.ts            # Determinism, isolation, snapshot NFR tests
```

---

## Contributing

Contributions are welcome. Please follow these conventions:

### Branches

```
main          — stable, always deployable
feat/<name>   — new features
fix/<name>    — bug fixes
schema/v<n>   — engine version bumps (require NFR test update)
```

### Workflow

```bash
# Fork + clone
git clone https://github.com/<your-fork>/bio-map.git
cd bio-map
npm install

# Create a branch
git checkout -b feat/my-feature

# Make changes, then run tests
npm test

# Build to verify no type errors
npm run build

# Commit (conventional commits preferred)
git commit -m "feat: add magnesium biomarker"

# Push and open a PR against main
git push origin feat/my-feature
```

### Adding a new biomarker

1. Add an entry to `src/data/markers.json` — give it a unique `id`, set `range`,
   `optimalRange`, `precision`, and `category`.
2. Add its demographic stats to `src/data/demographics.json` under the same `id`
   key, for all 5 age brackets × 2 sexes.
3. Run `npm test -- --update-snapshots` to re-baseline the canonical snapshots
   (this intentionally records the new derivation output).
4. Open a PR with the snapshot diff attached so reviewers can audit the new values.

### Engine / schema changes

Any change to `SCHEMA_VERSION`, the static salt, PBKDF2 parameters, or the
`hashBufferToFloat` function **must** bump the schema version and update tests.
This preserves reproducibility of existing Life Keys.

### Code style

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`)
- No external runtime dependencies beyond React — keep it auditable
- No `localStorage`, `sessionStorage`, or cookies — the stateless contract is a
  security guarantee, not just a design preference

---

## Security model

| Property | Guarantee |
|---|---|
| **Zero server communication** | No network requests ever leave the browser |
| **No persistent storage** | Nothing written to disk, cookies, or local storage |
| **Passphrase never in URL** | Only nonces and display settings appear in the fragment |
| **Client-side crypto only** | All operations use the browser's native `WebCrypto` API |
| **Deterministic reproducibility** | Same passphrase + nonces → same values, always, everywhere |

**Threat model**: Bio-Map protects against server-side data breaches because there
is no server. It does **not** protect against physical device compromise, keyloggers,
or browser extensions with page-script access.

---

## License

MIT
