# Biome 2 Overlay Root Cause Report

## Summary Verdict

The grey/semi-transparent Biome 2 band is not a screenshot artifact, CSS filter, sonar/mining overlay, or Biome 3 leak. The concrete trigger is the foreground terrain presentation hook in `src/scene-rendering.ts`: whenever `environmentVisualProfileFor()` reports Biome 2 + `depthBand === 'mid'`, it sets the whole terrain graphics layer to `0.08` alpha, terrain edges to `0.025`, and ore overburden to `0.08`.

That intended "brine mid landmark" reveal is applied to the entire Biome 2 mid band instead of being local/limited around the landmark. With terrain nearly removed, the active mid-band background plate/tint plus darkness pass reads as a low-chroma grey-green overlay.

## Depth Band

Best numeric range: `state.depth` 522m through 1038m inclusive in Biome 2 normal runtime state.

How measured:
- Runtime depth is quantized in 6m steps by `state.depth = floor((player.y - SURFACE_Y) / TILE) * 6` in `src/scene.ts:1023-1025`.
- `shallowsBandForDepth()` switches to `mid` at `depth >= 520` and to `lower` at `depth >= 1040` in `src/helpers.ts:1062-1071`.
- Therefore the first runtime `state.depth` in the bad branch is 522m, and the last is 1038m. The first lower-band state after it is 1044m.
- A separate all-biome `transitionDeep` fade exists at 1440m+ (`terrainAlpha = 0.48`), but the first severe Biome 2 report band is the mid-band `0.08` alpha branch.

## Visual Evidence

Proof directory: `runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/b2-overlay-proof/`

Key proof files:
- `near-surface-normal-depth-180.png`: reachable normal-play Biome 2 upper band; terrain/edges/ore alpha all `1`.
- `landmark-good-before-band-depth-504.png`: reachable normal-play upper band just before the bad branch; terrain/edges/ore alpha all `1`.
- `first-bad-mid-band-depth-522.png`: reachable normal-play first bad band; terrain alpha `0.08`, edges `0.025`, ore overburden `0.08`.
- `deep-in-bad-mid-band-depth-636.png`: reachable normal-play deeper in the same bad band; terrain alpha remains `0.08`.
- `exact-transition-deep-control-depth-1440.png`: diagnostic exact-depth control for the separate transition-deep fade; terrain alpha `0.48`, not the severe `0.08` mid-band fade.
- `b2-overlay-proof-summary.json`: runtime metrics and screenshot paths.
- `b2-overlay-depth-thresholds.json`: code-derived threshold table.

The generated world used for reachable screenshots had reachable water only to about 636m after the first bad band, so the lower-band exit at 1044m is code-derived rather than normally reached in that seed.

## Root Cause

`src/scene-rendering.ts:15-22` defines the damaging alpha constants:
- `BRINE_MID_TERRAIN_ALPHA = 0.08`
- `BRINE_MID_TERRAIN_EDGE_ALPHA = 0.025`
- `BRINE_MID_ORE_OVERBURDEN_ALPHA = 0.08`

`src/scene-rendering.ts:60-65` applies them whenever `profile.biome === 2 && profile.depthBand === 'mid'`:

```ts
const brineMidLandmark = profile.biome === 2 && profile.depthBand === 'mid';
this.terrain.setAlpha(transitionDeep ? TRANSITION_DEEP_TERRAIN_ALPHA : brineMidLandmark ? BRINE_MID_TERRAIN_ALPHA : 1);
this.terrainEdges.setAlpha(transitionDeep ? TRANSITION_DEEP_TERRAIN_EDGE_ALPHA : brineMidLandmark ? BRINE_MID_TERRAIN_EDGE_ALPHA : 1);
this.oreOverburden.setAlpha(transitionDeep ? TRANSITION_DEEP_ORE_OVERBURDEN_ALPHA : brineMidLandmark ? BRINE_MID_ORE_OVERBURDEN_ALPHA : 1);
```

Those are whole-scene graphics objects created at `src/scene.ts:146-148` (`terrain`, `terrainEdges`, `oreOverburden`). `draw()` calls `updateForegroundTerrainPresentation()` before `drawWorld()` at `src/scene-rendering.ts:24-37`, so the layer alpha affects the terrain rendering for that frame. The terrain fill itself is drawn opaque (`fillStyle(runColor, 1)`) at `src/scene-rendering.ts:620-629`; the transparency comes from the parent graphics object alpha, not tile colors or source asset opacity.

## Why Grey/Desaturation Happens

There is no discovered grayscale shader or CSS filter. `src/styles.css:75-84` only sizes `#game canvas`; it does not apply grayscale/filter styling.

The grey look is the composite produced after the terrain is faded away:
- Biome 2 mid-band terrain drops to alpha `0.08`, so dark/colored rock no longer dominates the frame.
- The active mid background layer is `water9-phase3-band-mid`, tinted `#6fa6aa` and visible around alpha `0.11` in runtime proof; this comes through `environmentVisualProfileFor()` layer construction at `src/helpers.ts:1750-1779` and `drawParallax()` at `src/scene-rendering.ts:87-125`.
- The darkness pass then draws black/blue-black overlays after world rendering (`src/scene-rendering.ts:3696-3724`). At the first bad proof frame, runtime darkness was `value=0.474`, `ambientOpacity=0.178`, `maskOpacity=0.389`.
- Biome 2 mid `postDarknessVeil` is explicitly disabled at `src/helpers.ts:1302-1317`, and runtime proof showed `worldSpaceNoise.alpha = 0.003`, so the water-column veil is not the primary grey overlay.

## Why Terrain Becomes Semi-Transparent

The terrain becomes semi-transparent because the whole `Phaser.GameObjects.Graphics` layers are alpha-faded:
- `scene.terrain.alpha = 0.08`
- `scene.terrainEdges.alpha = 0.025`
- `scene.oreOverburden.alpha = 0.08`

Runtime proof at 522m and 636m captured those exact values from the live scene. Since the graphics layers are at depths `0`, `0.82`, and `0.84` (`src/scene.ts:146-148`) and are drawn before actors/darkness (`src/scene-rendering.ts:24-57`), background/landmark art shows through the terrain and the later darkness pass mutes it further.

## Classification

This is an intended foreground-terrain/landmark reveal effect applied at the wrong scope and intensity. It is not a Biome 3 leak, not an accumulation/order bug from repeated overlays, not a texture alpha mistake in the terrain body, and not a Playwright/screenshot artifact.

## Confidence

High for the semi-transparent terrain cause: source lines and runtime metrics match exactly at the first bad depth.

Medium-high for the grey/desaturation explanation: there is no single "grayscale" operation; it is an emergent composite from the severe terrain fade, mid-band background tint, and darkness. The visual proof and runtime metrics support this, but "grey" is perceptual rather than a named filter.

## Narrow Next-Fix Recommendation

Change `updateForegroundTerrainPresentation()` so the Biome 2 mid-band landmark readability adjustment no longer fades the entire terrain layer to `0.08` across the whole 522m-1038m band. The safest implementation target is to remove the `brineMidLandmark` terrain alpha branch or raise it near normal terrain opacity, then handle landmark readability with a local/background-only treatment instead of whole-terrain transparency. Keep the separate `transitionDeep` alpha branch under review, but it is not the severe first bad band.

## Verification Performed

Commands run:
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- `git -C /mnt/nxt-dev/water9 status --short`
- targeted `rg` and `nl -ba ... | sed ...` source inspections
- `node runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/capture-b2-overlay-proof.mjs`

The proof script used Vite on port `5181` (inside the allowed 5180-5199 range). `vite.config.ts:112-115` already ignores `**/.desktop-build/**`, so the dev server was not configured to watch `.desktop-build`.

## Git State After Investigation

`git -C /mnt/nxt-dev/water9 status --short` after investigation showed the same pre-existing modified source/config/assets status as the starting capture, plus this new untracked run directory:

```text
?? runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/
```

No source, asset, config, package, or test files were edited by this investigation.

## Starting Revision

`7776913`

## Starting Git State

```text
 M package.json
 M src/helpers.ts
 M src/hud.ts
 M src/main.ts
 M src/perf.ts
 M src/scene-combat.ts
 M src/scene-entities.ts
 M src/scene-playtest.ts
 M src/scene-rendering.ts
 M src/scene.ts
 M src/styles.css
 M src/types.ts
?? public/assets/generated/background-phase3/
?? public/assets/generated/exploration-life-2026-07-04/
?? public/review/exploration-life-2026-07-04/
?? runs/fauna-flora-asset-audit-2026-07-04/
?? runs/water9-biome-2-3-landmark-redo-2026-07-03-correction/
?? runs/water9-biome-2-3-landmark-redo-2026-07-03/
?? runs/water9-biome-background-screenshot-assessment-2026-07-03/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter2/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-local1/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-local2/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-local3/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-local4/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-local5/
?? runs/water9-biome-landmark-acceptance-loop-2026-07-03-local6/
?? runs/water9-biome-landmark-implementation-2026-07-03/
?? runs/water9-biome1-organic-landmark-replacement-2026-07-04/
?? runs/water9-biome1-procedural-landmark-removal-2026-07-04/
?? runs/water9-biome2-brine-shelf-acceptance-loop-2026-07-04/
?? runs/water9-biome2-brine-shelf-acceptance-loop-final-2026-07-04/
?? runs/water9-biome2-brine-shelf-composition-redesign-2026-07-03-codex-current/
?? runs/water9-biome2-brine-shelf-composition-redesign-2026-07-03-final/
?? runs/water9-biome2-brine-shelf-composition-redesign-2026-07-03-iter2/
?? runs/water9-biome2-brine-shelf-composition-redesign-2026-07-03-iter3/
?? runs/water9-biome2-brine-shelf-composition-redesign-2026-07-03-rerun/
?? runs/water9-biome2-brine-shelf-composition-redesign-2026-07-03/
?? runs/water9-biome2-brine-shelf-kill-shelf-2026-07-03/
?? runs/water9-biome2-brine-shelf-remove-shelf-asset-2026-07-03/
?? runs/water9-biome2-brine-shelf-rethink-2026-07-03/
?? runs/water9-biome2-brine-shelf-rethink-followup-2026-07-03/
?? runs/water9-biome2-brine-shelf-silhouette-2026-07-03/
?? runs/water9-biome2-fogged-landmark-recovery-2026-07-04/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-codex-final/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-codex-final2/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-codex-final3/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-codex-pass/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-codex-pass2/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-local-proof/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-local-proof2/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-local-proof3/
?? runs/water9-biome2-fogged-landmark-reintegration-2026-07-04-local-proof4/
?? runs/water9-biome2-gpt-integration-2026-07-04/
?? runs/water9-biome2-imagen-asset-reset-2026-07-03.direct-asset-on-black.png
?? runs/water9-biome2-visibility-fix-2026-07-04-add/
?? runs/water9-biome2-visibility-fix-2026-07-04-crop/
?? runs/water9-biome2-visibility-fix-2026-07-04-final/
?? runs/water9-biome2-visibility-fix-2026-07-04/
?? runs/water9-distant-landmark-audit-2026-07-04/
?? runs/water9-distant-landmark-damage-control-2026-07-04.audit.prompt.md
?? runs/water9-distant-landmark-damage-control-2026-07-04.correction.prompt.md
?? runs/water9-distant-landmark-damage-control-2026-07-04.md
?? runs/water9-distant-landmark-damage-control-2026-07-04.restore.prompt.md
?? runs/water9-distant-landmark-damage-control-2026-07-04/
?? runs/water9-distant-landmark-known-fix-2026-07-04.asset-runtime-restore-relaunch.prompt.md
?? runs/water9-distant-landmark-known-fix-2026-07-04.asset-runtime-restore.prompt.md
?? runs/water9-distant-landmark-known-fix-2026-07-04.md
?? runs/water9-distant-landmark-known-fix-2026-07-04.mechanic-correction.prompt.md
?? runs/water9-distant-landmark-known-fix-2026-07-04.micro-mechanic.prompt.md
?? runs/water9-distant-landmark-known-fix-2026-07-04.prompt.md
?? runs/water9-distant-landmark-known-fix-2026-07-04.recovery.prompt.md
?? runs/water9-distant-landmark-known-fix-2026-07-04/
?? runs/water9-immediate-biome-landmark-proof-2026-07-04/
?? runs/water9-landmark-debug-ui-test-menu-2026-07-04/
?? runs/water9-mining-fps-b2-followup-2026-07-04/
?? runs/water9-mining-polish-landmark-fps-2026-07-04/
?? runs/water9-painterly-bitmap-landmark-final-proof-2026-07-04/
?? runs/water9-painterly-bitmap-landmark-final-proof2-2026-07-04/
?? runs/water9-painterly-bitmap-landmark-final-proof3-2026-07-04/
?? runs/water9-painterly-bitmap-landmark-final-proof4-2026-07-04/
?? runs/water9-painterly-bitmap-landmark-restoration-2026-07-04-final/
?? runs/water9-painterly-bitmap-landmark-restoration-2026-07-04-pass2/
?? runs/water9-painterly-bitmap-landmark-restoration-2026-07-04-pass3/
?? runs/water9-painterly-bitmap-landmark-restoration-2026-07-04/
?? runs/water9-painterly-landmark-restoration-2026-07-04-final/
?? runs/water9-painterly-landmark-restoration-2026-07-04-recovery/
?? runs/water9-painterly-landmark-restoration-2026-07-04-recovery2/
?? runs/water9-painterly-landmark-visual-recovery-2026-07-04/
?? runs/water9-painterly-restoration-after-2026-07-04/
?? runs/water9-painterly-restoration-before-2026-07-04/
?? runs/water9-painterly-restoration-final-2026-07-04/
?? runs/water9-painterly-restoration-final2-2026-07-04/
?? runs/water9-painterly-restoration-final3-2026-07-04/
?? runs/water9-painterly-restoration-final4-2026-07-04/
?? runs/water9-painterly-runtime-restoration-2026-07-04-depth10-diagnostic/
?? runs/water9-painterly-runtime-restoration-2026-07-04-final/
?? runs/water9-painterly-runtime-restoration-2026-07-04-final2/
?? runs/water9-painterly-runtime-restoration-2026-07-04-final3/
?? runs/water9-painterly-runtime-restoration-2026-07-04-pass2/
?? runs/water9-painterly-runtime-restoration-2026-07-04-pass3/
?? runs/water9-painterly-runtime-restoration-2026-07-04-pass4/
?? runs/water9-painterly-runtime-restoration-2026-07-04-pass5/
?? runs/water9-painterly-runtime-restoration-2026-07-04-pass6/
?? runs/water9-painterly-runtime-restoration-2026-07-04/
?? runs/water9-phase11-normal-entry-patch-2026-07-03/
?? runs/water9-water-column-atmosphere-v1-2026-07-04.md
?? runs/water9-water-column-atmosphere-v1-2026-07-04.prompt.md
?? runs/water9-water-column-atmosphere-v1-2026-07-04.revision1.prompt.md
?? runs/water9-water-column-atmosphere-v1-2026-07-04.revision2.prompt.md
?? runs/water9-water-column-atmosphere-v1-2026-07-04/
?? runs/water9-water-visuals-research-2026-07-04.acceptance-plan-scout.prompt.md
?? runs/water9-water-visuals-research-2026-07-04.current-render-scout.prompt.md
?? runs/water9-water-visuals-research-2026-07-04.effects-feasibility-scout.prompt.md
?? runs/water9-water-visuals-research-2026-07-04.md
?? runs/water9-water-visuals-research-2026-07-04.reference-scout.prompt.md
?? runs/water9-water-visuals-research-2026-07-04/
?? tools/build_biome1_organic_shallow_background.py
?? tools/build_biome2_brine_shelf_gpt_asset.py
?? tools/build_biome_landmark_assets.py
?? tools/build_distant_landmark_runtime_restore_assets.py
?? tools/build_ore_reference_board.mjs
?? tools/build_phase10_authored_distant_landmark.py
?? tools/build_phase11_gpt_background_assets.py
?? tools/build_phase3_background_assets.py
?? tools/build_phase3_background_proof_sheets.py
?? tools/build_phase5_deep_background_assets.py
?? tools/build_phase7_authored_depth_planes.py
?? tools/build_phase8_painterly_landmarks.py
?? tools/build_phase9_organic_softened_landmarks.py
?? tools/extract_actual_gpt_ore_assets.py
?? tools/review_background_phase1.mjs
?? tools/review_biome_landmark_implementation.mjs
?? tools/review_immediate_biome_landmark_proof.mjs
?? tools/review_normal_biome12_background_slice.mjs
?? tools/review_ore_fossil_proof.mjs
?? tools/review_ore_gameplay_rectification.mjs
?? tools/review_ore_gpt_stamp_integration.mjs
?? tools/review_ore_shape_first_slice.mjs
?? tools/review_ore_strata_pockets.mjs
?? tools/review_phase10_authored_landmark.mjs
?? tools/review_phase11_authored_landmark.mjs
?? tools/review_phase11_gpt_background_assets.mjs
?? tools/review_phase12_background_readability.mjs
?? tools/review_phase14_foreground_terrain_presentation.mjs
?? tools/review_phase15_shallow_deep_screenshot_proof.mjs
?? tools/source-inbox/water9-biome2-brine-shelf-gpt-source.png
?? tools/source-inbox/water9-biome2-brine-vertical-chimney-gpt-source.png
?? tools/source-inbox/water9-phase11-band-transition-deep-gpt-source.png
?? tools/source-inbox/water9-phase11-transition-far-drowned-signal-station-gpt-source.png
?? tools/source-inbox/water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt-source.png
?? tools/source-inbox/water9-phase11-transition-near-pipe-cable-cathedral-gpt-source.png
?? tools/source-inbox/water9-phase3-atmospheric-mask-atlas---609c96d6-5a01-4e47-ae46-45a1452ff190.png
?? tools/source-inbox/water9-phase3-atmospheric-mask-atlas.png
?? tools/source-inbox/water9-phase3-band-plate-atlas.png
?? tools/source-inbox/water9-phase3-landmark-cutout-atlas-chromakey---40a0eb72-7348-4635-86e4-bc2d2d41b31c.png
?? tools/source-inbox/water9-phase3-landmark-cutout-atlas-chromakey.png
```
