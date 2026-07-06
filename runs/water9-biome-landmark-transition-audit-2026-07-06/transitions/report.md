Status: COMPLETE

Preflight HEAD: 2c4ff8d

## Shared Transition System Map

- Runtime entry: `draw()` calls `environmentVisualProfileFor(state.biome, state.depth)`, then renders parallax band plates, water-column layers, world/props, background anchors, terrain, entities, darkness, and HUD overlays.
- Shared background profile source: `src/helpers.ts` uses one `shallowsBands` table for every biome. Biome affects palette, base parallax set, landmark pools, water-column scaling, and special caps, but the depth cutoffs are shared from B1 through B4.
- Active band selection: `shallowsBandForDepth(depth)` switches at fixed meter thresholds: 120, 520, 1040, 1440. It computes `activeBandBlend`, but most downstream landmark/layer identity decisions key off only `activeBand.id`.
- Band plates: `environmentVisualProfileFor()` creates five scenic layers for `surface`, `upper`, `mid`, `lower`, and `transitionDeep`. It uses `bandLayerVisibility(activeBand.id, layerBand)` hard weights instead of a continuous outgoing/incoming band crossfade.
- Landmark pools: `biomeLandmarkPools` maps biome + active band to runtime assets. B1 reuses one organic landmark across normal bands; B2/B3/B4 use one normal biome landmark in normal bands, then switch to larger transition/deep/shared pools in `transitionDeep`.
- Landmark selection: `environmentAnchorSilhouettesFor()` computes slots from camera view and spacing, then hashes `slot`, band depths, and `rng.seed` to choose assets, position, size, and alpha. There is no sticky selection cache or outgoing-anchor fade.
- Runtime rendering: `drawBackgroundAnchors()` asks for anchors every frame, applies parallax, culls by vertical viewport, reuses sprite indexes, and sets texture/position/alpha immediately. No temporal interpolation exists at identity changes.
- Biome travel: `travelToNextBiome()` hard-switches `state.biome`, resets depth/progression fields, randomizes `rng.seed`, then restarts the scene. This regenerates world, anchor hashes, and biome-specific pools as one loading transition.
- Asset timing: generated background manifest assets are part of preload/loadGeneratedAssets flow and the proof captured after world ready with zero runtime 4xx/page errors. Asset load timing was not the likely jarring cause in these captures.

## Biome Cutoff / Blend Table

These background depth bands are shared by B1 The Shallows, B2 Brine Vent Shelf, B3 Midnight Trench, and B4 Ancient Ruins.

| Active band | Runtime active depth | Band definition | `blendPx` | Blend window in meters (`blendPx / 6`) | Blend state at active switch |
| --- | ---: | ---: | ---: | ---: | --- |
| surface | `< 120m` | `0-140m` | 190px | 31.7m | active immediately |
| upper | `120-519m` | `90-520m` | 220px | 36.7m | progress is already ~0.82 at 120m |
| mid | `520-1039m` | `430-980m` | 250px | 41.7m | progress is already clamped to 1 at 520m |
| lower | `1040-1439m` | `880-1380m` | 270px | 45.0m | progress is already clamped to 1 at 1040m |
| transitionDeep | `>= 1440m` | `1260-1720m` | 300px | 50.0m | progress is already clamped to 1 at 1440m |

Important implication: the nominal overlap ranges exist in the band definitions, but active-band identity changes happen after most blend windows have already completed. Lower-to-transitionDeep is therefore a step from fully lower to fully transitionDeep at 1440m.

## Manifest / Count Summary

Single manifest source: `public/assets/generated/background-phase3/background-phase3.manifest.json`.

- Total background manifest assets: 49.
- Roles: 7 band plates, 37 landmarks, 5 texture masks.
- Runtime-ready landmarks: 37.
- Landmark pool summary by id convention: B1 2, B2 1, B3 1, B4 1, shared/transition 27, other implicit early-phase 5.
- Landmark bands from manifest/runtime mapping: upper 2, mid 1, lower 4, transitionDeep 25, implicit 5.

## Boundary Proof Paths And Observations

Proof JSON: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/transitions/transition-canvas-proof.json`

Capture script: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/transitions/capture-transitions.mjs`

Screenshots: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/transitions/*-b*-*m.png`

Observed from 18 staged `#game canvas` captures at 1240m, 1280m, and 1500m for B1->B2, B2->B3, and B3->B4:

- B1 lower and transitionDeep keep `biome-shallows-organic-reef-shelf`, but transitionDeep band-plate alpha jumps from ~0.013 to ~0.304 and silhouette/fog tuning changes sharply.
- B2 lower shows one `biome-brine-vent-sulfide-shelf` anchor. B2 transitionDeep shows 7 visible anchors drawn from `phase11`, `phase9`, and `phase8` transition pools.
- B3 lower shows one `biome-midnight-black-coral-ribs` anchor. B3 transitionDeep shows 7 visible anchors from shared/transition pools such as `phase11-transition-far-drowned-signal-station`, `phase8-transition-rib-field`, and `phase5-transition-pressure-ribs-wide`.
- B4 lower shows one `biome-ruins-vault-causeway-lattice` anchor, further multiplied down in the renderer. B4 transitionDeep shows 7 visible anchors including `phase10-transition-drowned-signal-station`, `phase8-transition-collapsed-sub-elevator`, and the B4 vault.
- Across biome handoffs at the same depth, the identity set changes wholesale: e.g. B2 lower shelf -> B3 lower black coral -> B4 lower vault, and all seeds/hash slots are regenerated on actual travel.

## Top Jarring Causes, Ranked

1. **Hard active-band thresholds defeat the blend windows.** The cutoffs at 520m, 1040m, and 1440m activate after blend progress has already clamped to 1, so landmark pools and band plate weights change as a step.
2. **Landmark identity is tied to active band and biome, not a transition state.** Normal bands often render one authored biome landmark, while transitionDeep can render 7 visible anchors from a different shared pool.
3. **Biome travel resets seed and restarts the scene.** Barge travel sets a new biome, randomizes `rng.seed`, resets depth, and restarts, so previous anchor choices cannot persist across B1->B2, B2->B3, or B3->B4.
4. **No sticky anchor persistence.** Landmark choice and position are recomputed from camera slot + active band + seed every frame. Sprite reuse by index does not preserve identity through band or biome changes.
5. **Fog, terrain, and darkness tuning also step at transitionDeep.** `layerAlphaScale` jumps from lower `0.43` to transitionDeep `1.18`; terrain alpha drops in transitionDeep; darkness opacity is reduced; silhouette alpha more than doubles.
6. **Shared transition assets dominate late bands.** B2/B3 transitionDeep use phase transition assets that do not necessarily bridge from their normal biome landmarks, making the visual grammar change feel abrupt even when assets are loaded.

## Recommended Smallest First Slice

1. Fix `shallowsBandForDepth()` so active band and `activeBandBlend.progress` actually cover the overlap around each cutoff. Start with lower->transitionDeep around 1260-1440m or a symmetric 100-150m window around 1440m.
2. Render both outgoing and incoming anchor sets during the blend window, with depth-based opacity ramps. Keep outgoing normal biome landmark anchors fading out while transitionDeep anchors fade in.
3. Add sticky landmark selection per `{biome, band, slot}` and hysteresis, so an anchor does not change identity until the player has moved clearly into the next band.
4. Smooth the alpha ramps that currently step at transitionDeep: band plate visibility, `layerAlphaScale`, terrain alpha, darkness alpha, and B4 vault special multiplier.
5. For biome travel, preserve a handoff seed or previous-anchor snapshot for the first post-retrofit dive, and preload/announce next-biome background assets during barge loading rather than presenting a totally new route all at once.

## Verification Commands

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `2c4ff8d`
- `npm run dev -- --port 5180 --strictPort`
- `node runs/water9-biome-landmark-transition-audit-2026-07-06/transitions/capture-transitions.mjs`
- `npm run build`

Build passed. Vite emitted existing unresolved runtime asset URL warnings and a large chunk warning; no build failure.

## Caveats / Blockers

- Visual proof is from the real runtime `#game canvas` through the dev-only `backgroundReview` playtest command. It stages depth and camera positions rather than fully earning and clicking through the barge retrofit flow.
- The captures intentionally compare equivalent depths across biome pairs and the lower->transitionDeep region. Full manual progression capture could add user-flow evidence but should not change the system-level findings.
- I used port 5180, inside the allowed 5180-5199 range, and stopped only that dev server after capture. Other existing dev servers on nearby allowed ports were left untouched.
