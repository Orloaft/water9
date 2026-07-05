# Water Column Atmosphere V1 Report

Status: READY_FOR_MANAGER_VISUAL_REVIEW

Session key: water-column-atmosphere-v1-impl

Started from HEAD: 7776913

## Implementation

- `src/helpers.ts`: exposed ready Phase 3 `textureMask` manifest assets through `profile.background.worldSpaceNoise.assets`, added explicit biome/depth water-column layer tuning, and derives low layer alpha from `hazeAlpha`, `sedimentAlpha`, and `causticAlpha`.
- `src/scene.ts`: added a retained four-sprite water-column `TileSprite` pool between background scenery and terrain/actors.
- `src/scene-rendering.ts`: added `drawWaterColumn`, runtime alpha-derived mask textures to avoid opaque grayscale rectangles, world-space drift/parallax offsets, active-band tinting, shallow-biased caustics, and a proof-only disable toggle.
- `src/scene-playtest.ts`: extended `backgroundReviewSnapshot` with visible water-column layers, texture keys, loaded status, alpha, drift, parallax, and tile offsets.
- `runs/water9-water-column-atmosphere-v1-2026-07-04/capture-water-column-proof.mjs`: added a focused proof helper for paired effect-off/effect-on `#game canvas` captures.

## Verification

- `npm run build`: passed. Vite emitted the existing unresolved `/assets/generated/...` runtime asset warnings and chunk-size warning.
- Proof server used port `5180`; no process was left listening on ports `5180-5199`.
- Proof captures are actual Water9 `#game canvas` PNGs at `1280x800` with `?playtest=1&biome=N` and `backgroundReview(clearWaterWindow:false)`.

## Proof Artifacts

- Proof directory: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/`
- Provenance: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/provenance.json`
- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/contact-sheet.png`
- Required before/after color and grayscale PNGs:
  - `baseline-b1-surface-119-*`, `after-b1-surface-119-*`
  - `baseline-b1-upper-180-*`, `after-b1-upper-180-*`
  - `baseline-b2-mid-760-*`, `after-b2-mid-760-*`
  - `baseline-b3-lower-1260-*`, `after-b3-lower-1260-*`
  - `baseline-b4-lower-1260-*`, `after-b4-lower-1260-*`
- Drift stills included for B1 119 m and B2 760 m:
  - `after-b1-surface-119-drift2-*`
  - `after-b2-mid-760-drift2-*`

## Git State

- Before: repo was already heavily dirty, including `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`, generated background assets, many run directories, and tools.
- After: same dirty tree plus this run directory and proof artifacts. No files were staged or committed.

## Caveats

- The final contact sheet/provenance use a same-runtime `window.__WATER_COLUMN_DISABLED__` baseline for exact scene parity, after an initial pre-source-edit baseline capture was made. This keeps the normal-terrain camera/depth/biome fixed while comparing the water-column pass.
- Existing landmark/background dirt is intentionally preserved; this slice does not alter distant-landmark selection, framing, or pools.

Do not accept yet; manager visual inspection required.
