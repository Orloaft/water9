Status: OK

Preflight HEAD: `7776913`

This scout inspected the current worktree and wrote only this report.

## Current pipeline summary

- Asset loading starts in `src/scene.ts:115` through `loadGeneratedAssets(this)`. `loadGeneratedAssets` loads base parallax textures plus every `painterlyBackgroundManifest` entry whose source status is `ready` (`src/helpers.ts:362-411`).
- `painterlyBackgroundManifest` is derived from `public/assets/generated/background-phase3/background-phase3.manifest.json` at `src/helpers.ts:669-689`. The manifest currently has 49 assets: 7 `bandPlate`, 37 `landmark`, and 5 `textureMask` entries. The texture masks are `sediment-flecks`, `broad-fog-mottle`, `soft-caustic-ribbons`, `plankton-speckle`, and `lamp-scattering-bloom` with `repeatMode: worldSpaceNoise` (`background-phase3.manifest.json:620-740`).
- The scene creates five parallax tile sprites at depths `-12..-8`, an unused `parallaxBackdrop` graphics layer at `-7.5`, terrain at `0`, actors near `3`, darkness at `5`, lamp gloom at `6`, and overlay at `7` (`src/scene.ts:131-169`).
- Frame rendering clears `darkness`, `lampGloom`, `overlay`, and `parallaxBackdrop`, sets camera background color from `depthColor(state.depth)`, then renders parallax/background anchors before terrain, props, actors, darkness, and game-over overlay (`src/scene-rendering.ts:24-56`).
- Environment visual state is centralized in `environmentVisualProfileFor` (`src/helpers.ts:1388-1497`). It composes `parallaxProfileFor`, `darknessForDepth`, the active depth band from `shallowsBandForDepth`, five scenic band layers, background anchors, overlay metadata, and darkness metadata.
- Depth bands are defined as `surface`, `upper`, `mid`, `lower`, and `transitionDeep` with colors plus `hazeAlpha`, `sedimentAlpha`, `causticAlpha`, `silhouetteAlpha`, and `anchorDensity` (`src/helpers.ts:919-990`). Band blending happens in `shallowsBandForDepth` (`src/helpers.ts:1021-1043`).
- `drawParallax` consumes `profile.background.layers`: it selects the live texture, covers the camera, applies alpha/tint/scale, clamps Y for band plates, and scrolls X by parallax speed (`src/scene-rendering.ts:86-129`).
- `drawBackgroundAnchors` consumes `environmentAnchorSilhouettesFor`, rendering bitmap landmark sprites behind terrain at about depth `-7.3` (`src/scene-rendering.ts:131-165`). The landmark placement path is large and shared with distant-landmark work (`src/helpers.ts:1045-1360`), but it is not the best first attachment point for water texture.
- Foreground terrain opacity is adjusted for transition-deep and brine-mid landmark review states in `updateForegroundTerrainPresentation` (`src/scene-rendering.ts:58-65`).
- Darkness is active and gameplay-facing: `darknessForDepth` varies by biome (`src/helpers.ts:2344-2348`), opacity helpers are at `src/helpers.ts:2351-2356`, and `drawDarkness` renders the ambient mask plus lamp/flare/biolume cutouts (`src/scene-rendering.ts:3373-3423`).
- `drawBiomeVisibilityCues` is currently empty (`src/scene-rendering.ts:3425-3427`). `parallaxBackdrop` is cleared every frame but not used after that (`src/scene-rendering.ts:31`).
- Playtest/proof access exists through the dev-only `window.__AQUA_PLAYTEST__` API (`src/main.ts:9-17`) and the `backgroundReview` command (`src/types.ts:64`). `stageBackgroundReview` can stage a depth, review X, zoom, and optional cleared water window, then returns `backgroundReviewSnapshot` metadata (`src/scene-playtest.ts:148-459`).
- `backgroundReviewSnapshot` already reports active band colors/alphas, repeat modes, world-space noise metadata, anchors, rendered bitmap anchors, manifest entries, and layer repeat risks (`src/scene-playtest.ts:148-343`).
- `tools/review_background_phase1.mjs` starts Vite, drives `#game canvas`, runs `backgroundReview`, captures color and grayscale screenshots, and emits a JSON report (`tools/review_background_phase1.mjs:1-120`, `180-268`, `376-405`). `tools/build_phase3_background_proof_sheets.py` can turn those captures into contact sheets (`tools/build_phase3_background_proof_sheets.py:108-220`, `389-425`).

## Existing knobs that can be tuned safely

- Active backdrop layer knobs: `parallaxBaseProfiles` biome tints, alphas, speeds, and drift (`src/helpers.ts:868-917`); `layerAlphaScale`, `biomeLayerAlphaScale`, `bandLayerVisibility`, layer tint, scale, and `safeOpacity` multiplication in `environmentVisualProfileFor` (`src/helpers.ts:1393-1458`).
- Active anchor knobs: `anchorDensity` by band, landmark pools, anchor spacing, size/width/alpha multipliers, biome alpha caps, and parallax ranges (`src/helpers.ts:919-990`, `1045-1360`). This is powerful but risky because it shares the distant-landmark path.
- Active lighting/darkness knobs: `darknessForDepth`, `ambientDarknessOpacity`, `darknessOpacity`, and lamp radius/beam helpers (`src/helpers.ts:2328-2356`). These directly affect gameplay readability.
- Active camera clear color: `depthColor` by biome/depth (`src/helpers.ts:2399-2418`).
- Active foreground readability knobs: transition-deep and brine-mid terrain/ore alpha constants (`src/scene-rendering.ts:15-22`, `58-65`).
- Currently metadata-only or mostly inert knobs: band `hazeAlpha`, `sedimentAlpha`, `causticAlpha`, profile `overlay`, profile `surface.stripeAlphas`, and `background.worldSpaceNoise`. They are reported in playtest metadata, but there is no renderer pass consuming them today.
- Existing generated mask assets are safe raw material. They are in the manifest and loaded when `status === ready`, but they are not wired into a visible water pass.

## Gaps making the water feel visually weak

- The water column does not have its own visible pass. `worldSpaceNoise` is configured as `repeatMode: worldSpaceNoise`, but `alpha` is `0` and `assets` is `[]` (`src/helpers.ts:1460-1466`).
- The manifest contains five ready atmospheric masks, including caustics and plankton, but `generatedAssetNotes` says texture-mask entries are retained for provenance only and runtime scenery is bitmap-only (`src/helpers.ts:663-667`). So the art exists, loads, and is reviewable, but is not used for water texture.
- `hazeAlpha`, `sedimentAlpha`, and `causticAlpha` are depth-band values only. They blend in metadata (`src/helpers.ts:1006-1018`) but do not currently create haze, particles, or caustic strokes on screen.
- `parallaxBackdrop` is the natural layer for broad water/haze behind gameplay, but it is unused after being cleared. `drawBiomeVisibilityCues` is also a no-op, so there is no second chance for biome-specific water cues.
- The live view can therefore read as camera clear color plus scenic plates/landmarks, with terrain and actors on top. That can look like decorated background rather than water volume.
- There is no surface-water treatment apart from barge-local ripples in `drawBoat` (`src/scene-rendering.ts:2791-2822`). The profile has surface waterline and stripe values, but no global surface renderer consumes them.
- The current background review tool mainly targets biome 1 descent bands and transition-deep parallax/swim-by captures. A water pass needs proof across all biomes, especially biome 2 brine and biome 3/4 darker water, not only the phase3/landmark acceptance path.

## Suggested first implementation slice

Implement a small live water-column texture pass, not a landmark repaint.

Likely files:

- `src/helpers.ts`: expose ready `textureMask` manifest entries through `profile.background.worldSpaceNoise.assets` instead of `[]`, and set conservative per-band alpha values derived from `activeBand.hazeAlpha`, `sedimentAlpha`, and `causticAlpha`. Keep the first pass low alpha and biome-scaled.
- `src/scene.ts`: add a tiny sprite pool, for example `waterColumnLayers: Phaser.GameObjects.TileSprite[]`, initialized near the existing parallax layers. Place it between scenic background and terrain/actors, probably around depths `-7.8..-6.8`, so it adds water volume without covering gameplay silhouettes.
- `src/scene-rendering.ts`: add `drawWaterColumn(camera, profile)` and call it after `drawParallax(camera)` and before `drawWorld(camera)`. Start with two or three manifest masks: broad fog, plankton/sediment, and soft caustic ribbons. Scroll them in world space with different parallax factors, tint by `activeBand.hazeColor`, and clamp alpha by darkness/depth.
- `src/scene-playtest.ts`: extend `backgroundReviewSnapshot` to report visible water-column layers, texture keys, alphas, tile positions, and whether masks are loaded. This is important because loaded-but-invisible assets have been a recurring visual acceptance trap.
- `tools/review_background_phase1.mjs` or a small sibling proof script: add normal-terrain captures with `clearWaterWindow: false` across representative depths and biomes. Keep color plus grayscale `#game canvas` output.

Risk:

- Low to medium if the pass stays behind terrain/actors and only uses low alphas. The largest risk is readability loss in dark biomes or confusing caustics with ore/scan cues.
- Higher risk if the slice changes anchor placement or distant landmark alpha. Avoid that in the first pass.
- Higher risk if the water texture is only visible in staged water-window captures. Acceptance should require normal gameplay captures too.

Recommended first visual target:

- Make open water read as layered volume at gameplay scale: faint suspended particulate, subtle broad haze, and shallow-only caustic motion. Do not chase big landmark composition, new source generation, or foreground terrain restyling in this slice.

## Suggested proof captures and commands

Build/typecheck:

```bash
git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
cd /mnt/nxt-dev/water9
npx tsc --noEmit --pretty false
npm run build
```

Runtime background review using the allowed port range:

```bash
cd /mnt/nxt-dev/water9
BACKGROUND_REVIEW_PORT=5180 \
BACKGROUND_REVIEW_PHASE=phase3 \
BACKGROUND_REVIEW_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/proof \
BACKGROUND_REVIEW_REPORT=/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/proof/water-column-background-review.json \
npm run water9:background-review:phase3
```

Useful smoke commands after an implementation:

```bash
npm run playtest
npm run water9:lighting-visibility-smoke
npm run water9:sonar-map-controller-smoke
npm run water9:save-load-smoke
npm run water9:perf-guardrails-smoke
```

Suggested visual proof set:

- Real `#game canvas` captures, not review-only contact sheets, at surface, upper, mid, lower, and transition-deep bands.
- Adjacent cutoff captures around the band transitions: about 110/130 m, 510/530 m, 1030/1050 m, and 1430/1450 m.
- Biome coverage: at least biome 1 shallow, biome 2 brine mid/deep, biome 3 dark lower, and biome 4 ruin lower/transition-deep.
- For each capture: color and grayscale versions, plus metadata showing active band, mask texture keys, mask alpha, darkness opacity, camera zoom, and loaded texture status.
- Include both `clearWaterWindow: true` isolation captures and `clearWaterWindow: false` normal gameplay captures with terrain, player/sub, HUD, and lighting. Acceptance should be based on manager visual inspection of normal gameplay captures.
