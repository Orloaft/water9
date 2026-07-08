# Water9 Flora Slice + Scannability Followup Worker Report

Date: 2026-07-06  
Repo: `/mnt/nxt-dev/water9`  
Starting HEAD: `03b2dad`

## Status

Complete. No commit made because the repo started dirty and some touched files overlap pre-existing unrelated scan-reward/progression work.

## Implementation

- Added deterministic terrain-integrated replacement PNGs:
  - `public/assets/generated/terrain-edge-flora-moon-sponge.png`
  - `public/assets/generated/terrain-edge-flora-sting-anemone.png`
  - `public/assets/generated/terrain-edge-flora-vent-coral.png`
  - `public/assets/generated/terrain-edge-flora-ember-bloom.png`
- Routed only Moon Sponge, Sting Anemone, Vent Coral, and Ember Bloom through `floraGameplayAssetKey()` to those new assets.
- Added the new asset keys to `environmentTextureKeys()` so the live runtime loads them through the normal generated-asset path.
- Left Glass Kelp and Brine Grass unchanged as positive controls.
- Reclassified decorative edge stamp plant props from `EnvironmentPropKind` `flora` to `terrainFlora`, preserving rendering and the real-flora overlap cleanup while making the code distinction explicit.
- Added `tools/build_flora_slice_assets.py` for deterministic regeneration of the four slice assets.

## Scannability Audit

- Added `tools/test_flora_scannability_audit.mjs` and `npm run water9:flora-scannability-audit`.
- Audit result: pass. Runtime named gameplay flora remain `Flora` objects in `this.flora`; scanner target lists still include `this.flora`; special-room Oxygen Bloom, Lumen Fern, and Lumen Nodule still push into `this.flora`.
- Decorative/non-reward-spam classifications:
  - EnvironmentProp edge stamp plants/fringes: `terrainFlora`, terrain material decoration, not scanner targets.
  - Terrain brush `terrain-brush-flora-*`: terrain texture placements, not `Flora` objects.
  - Procedural ecology fringe: direct terrain paint, not an object.
- Audit JSON: `runs/water9-flora-slice-scannability-2026-07-06/flora-scannability-audit.json`
- Remaining caveats: none found for named/discrete gameplay flora in the audited runtime paths.

## Runtime Proof

- Live normal-play `#game canvas` proof captured via `?playtest=1&renderer=canvas` on port 5180. Dev server was shut down (`exitCode: 143`).
- Proof JSON: `runs/water9-flora-slice-scannability-2026-07-06/flora-slice-runtime-proof.json`
- Contact sheet:
  - `runs/water9-flora-slice-scannability-2026-07-06/flora-slice-runtime-contact-sheet.png`
  - `runs/water9-flora-slice-scannability-2026-07-06/flora-slice-runtime-contact-sheet.html`
- Required captures:
  - `canvas-b1-moon-sponge.png`, `canvas-b1-moon-sponge-grayscale.png`, `viewport-b1-moon-sponge.png`
  - `canvas-b1-sting-anemone.png`, `canvas-b1-sting-anemone-grayscale.png`, `viewport-b1-sting-anemone.png`
  - `canvas-b2-vent-coral.png`, `canvas-b2-vent-coral-grayscale.png`, `viewport-b2-vent-coral.png`
  - `canvas-b2-ember-bloom.png`, `canvas-b2-ember-bloom-grayscale.png`, `viewport-b2-ember-bloom.png`
  - `canvas-b1-decorative-terrain-flora-comparison.png`, `canvas-b1-decorative-terrain-flora-comparison-grayscale.png`, `viewport-b1-decorative-terrain-flora-comparison.png`
  - `canvas-b2-decorative-terrain-flora-comparison.png`, `canvas-b2-decorative-terrain-flora-comparison-grayscale.png`, `viewport-b2-decorative-terrain-flora-comparison.png`
- Scan-target evidence in `flora-slice-runtime-proof.json`:
  - Moon Sponge: `scanTargetDuringHold` and `scanTargetAfterHold` were `Moon Sponge`; `selectedScannedAfterHold: true`.
  - Sting Anemone: `scanTargetDuringHold` and `scanTargetAfterHold` were `Sting Anemone`; `selectedScannedAfterHold: true`.
  - Vent Coral: `scanTargetDuringHold` and `scanTargetAfterHold` were `Vent Coral`; `selectedScannedAfterHold: true`.
  - Ember Bloom: `scanTargetDuringHold` and `scanTargetAfterHold` were `Ember Bloom`; `selectedScannedAfterHold: true`.

## Verification

- `python3 tools/build_flora_slice_assets.py` - pass, wrote the four replacement PNGs.
- `npm run water9:flora-scannability-audit -- --report runs/water9-flora-slice-scannability-2026-07-06/flora-scannability-audit.json` - pass.
- `npm run build` - pass; Vite emitted the existing asset-resolution/chunk-size warnings.
- `node tools/test_edge_flora_playtest.mjs` - pass; reported supported terrain-surface flora and no unsupported visible flora anchors.
- `node runs/water9-flora-slice-scannability-2026-07-06/capture-flora-slice-proof.mjs` - pass; 6 captures, 0 errors, server port 5180 shut down.

## Git

- No commit made.
- This lane changed/added:
  - `package.json`
  - `src/helpers.ts` (note: file already had unrelated scan reward dirt before this lane)
  - `src/scene-worldgen.ts`
  - `src/types.ts`
  - `tools/build_flora_slice_assets.py`
  - `tools/test_flora_scannability_audit.mjs`
  - `public/assets/generated/terrain-edge-flora-moon-sponge.png`
  - `public/assets/generated/terrain-edge-flora-sting-anemone.png`
  - `public/assets/generated/terrain-edge-flora-vent-coral.png`
  - `public/assets/generated/terrain-edge-flora-ember-bloom.png`
  - `runs/water9-flora-slice-scannability-2026-07-06/`
