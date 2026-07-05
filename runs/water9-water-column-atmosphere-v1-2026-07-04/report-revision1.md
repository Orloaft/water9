# Water Column Atmosphere V1 Revision 1 Report

Status: READY_FOR_MANAGER_VISUAL_REVIEW

Session key: water-column-atmosphere-v1-revision1

Started from HEAD: 7776913

## Revision Changes

- `src/helpers.ts`: retuned the water-column layer recipes and per-biome/per-band scales so B1 gets stronger broad mottle/particulate/ribbons, B2 mid gets a dedicated post-darkness brine veil profile, and B4 lower gets cold ruin veil metadata without enabling deep caustics.
- `src/scene-rendering.ts`: switched broad haze/sediment masks to normal blending, added broad line/particle volume graphics behind gameplay actors, added low-alpha post-darkness horizontal brine/sediment ribbons that skip the player guard area, and added a targeted runtime soft-edge/alpha veil for the B4 ruin landmark texture.
- `src/scene-playtest.ts`: added blend-mode, tile-scale, and post-darkness veil fields to `backgroundReviewSnapshot` provenance.
- `runs/water9-water-column-atmosphere-v1-2026-07-04/capture-water-column-proof.mjs`: added `WATER_COLUMN_PROOF_DIR` so revision proof can write to `proof-revision1/`.

## Verification

- `npm run build`: passed. Vite repeated the existing unresolved `/assets/generated/...` runtime asset warnings and chunk-size warning.
- Proof server used port `5180`; no process was left listening on ports `5180-5199`.
- Proof captures are actual Water9 `#game canvas` PNGs at `1280x800` with `?playtest=1&biome=N` and `backgroundReview(clearWaterWindow:false)`.

## Proof Artifacts

- Proof directory: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/`
- Provenance: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/provenance.json`
- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/contact-sheet.png`
- Required before/after color and grayscale PNGs:
  - `baseline-b1-surface-119-*`, `after-b1-surface-119-*`
  - `baseline-b1-upper-180-*`, `after-b1-upper-180-*`
  - `baseline-b2-mid-760-*`, `after-b2-mid-760-*`
  - `baseline-b3-lower-1260-*`, `after-b3-lower-1260-*`
  - `baseline-b4-lower-1260-*`, `after-b4-lower-1260-*`
- Drift stills included for B1 119 m and B2 760 m:
  - `after-b1-surface-119-drift2-*`
  - `after-b2-mid-760-drift2-*`

## Visual Notes

- B1 now has visible broad mottle, soft horizontal/diagonal water bands, and sparse particulate while the player remains readable in color and grayscale.
- B2 now has wide horizontal brine/sediment bands visible outside and through the lamp cone; the player guard keeps the suit silhouette crisp.
- B3 remains readable and does not receive the post-darkness veil.
- B4 uses cold veil bands plus a targeted renderer-side soft-edge/alpha veil for the ruin landmark to reduce hard bitmap-bound reads. The ruin remains visible and should be inspected closely by the manager.

## Git State

- Before: repo was already heavily dirty, including `package.json`, `src/helpers.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/styles.css`, `src/types.ts`, generated background assets, many run directories, and tools.
- After: same dirty tree plus `proof-revision1/`, this revision report, and the revised files above. No files were staged or committed.

## Caveats

- The B4 rectangle was treated with renderer-side veiling and softening only; no landmark asset was generated or replaced and no landmark selection/framing/pool logic was changed.
- The same-runtime baseline still disables the water-column pass through `window.__WATER_COLUMN_DISABLED__`; the B4 runtime soft-edge treatment remains active in both baseline and after because it is a targeted renderer-side artifact repair.

Do not accept yet; manager visual inspection required.
