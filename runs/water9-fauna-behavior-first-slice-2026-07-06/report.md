# Water9 Fauna Behavior First Slice

Started from `539c6b8`.

Initial dirty state before edits:

- Modified generated abyss viperfish assets and frames JSON.
- Modified prior run reports/proof artifacts.
- Modified `src/content.ts` and `src/helpers.ts`.
- Untracked fauna/content/helper/run artifacts from prior work.

Implementation/proof notes will be filled in after verification.

## Implementation

- Added `FishBehaviorClass` / `TerrainAffinity` runtime fields and a first-slice resolver in `src/fauna-behavior.ts`.
- Spawn now routes first-slice fauna onto terrain surface anchors while all other fauna keep legacy open-water school movement.
- Added anchored update paths:
  - `sessileAttached`: fixed to terrain support; hostile urchin uses defensive contact/cue only.
  - `verticalAnchored`: fixed root with body sway/retract.
  - `benthicWalker`: terrain-near tangent walking, pauses, and short local hostile lunge/recovery.
- Mining refresh now revalidates fauna anchors alongside flora anchors.
- Rendering, sonar/combat impulses, HUD field notes, and playtest snapshots/commands are behavior-aware while preserving `kind: 'fish'`.

## Verification

- `npx tsc --noEmit --pretty false` - passed.
- `npm run build` - passed with existing Vite asset-resolution/chunk-size warnings.
- `node tools/build_small_life_manifest.mjs --check` - passed, manifest up to date.
- `node tools/test_fish_visual_facing_smoke.mjs` - passed.
- `node tools/test_aggro_cue_regression.mjs` - passed.
- `node tools/test_fauna_behavior_slice.mjs` - passed.

Manager verification reran the focused fauna proof after extending its scene-restart readiness wait to cover slower biome generation. The refreshed proof passed and the screenshots were visually inspected.

## Proof Artifacts

- `fauna-behavior-slice-metrics.json`
- `nacre-thorn-clam-canvas.png`
- `glimmer-spine-urchin-canvas.png`
- `cinder-vent-clingfish-canvas.png`
- `shellback-garden-eel-canvas.png`
- `tripodfish-canvas.png`
- `silver-hinge-crab-canvas.png`
- `mantis-shrimp-canvas.png`
- `sea-spider-canvas.png`
- `tin-plate-searobin-canvas.png`

The Glimmer Spine Urchin proximity proof held for 3100 ms with 0 px displacement, 0 velocity, and 0 pursuit aggro.
