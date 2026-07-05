# Ore Cluster Root-Cause Report

## Summary verdict

Visible gameplay ore is generated as `world` tile data and redrawn as an embedded ore shape from the mutable terrain mask, not as an independently anchored resource sprite. Mining next to ore can subtract from that same mask without breaking the ore tile, so the renderer recomputes the ore deposit shape/root from a changed connected component and the cluster appears to slide, split, or redraw while no pickup is spawned. Some ore-looking visuals are also non-gameplay background/terrain art with no backing resource tile, while real pickups only appear when an actual value-bearing ore tile is broken.

## Reproduction/evidence

Runtime proof was captured with the dev Playwright API against `#game canvas` on Vite port 5180:

- Proof directory: `/mnt/nxt-dev/water9/runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/ore-proof/`
- Canvas screenshots: `01-before-adjacent-mining.png`, `02-after-mining-adjacent-rock.png`, `03-after-mining-visible-ore.png`
- Crops/diff: `ore-before-after-crops.png`, `ore-adjacent-mining-diff.png`
- Machine-readable proof: `ore-proof.json`

The proof used the built-in mining polish staging path in biome 2, Brine Vent Shelf. The staged target was copper tile `(56,19)` at world `(1356,468)`, with the player at `(1308,468)`. Before mining, `visibleOreCount` was `2` and `looseItems` was empty. After mining the adjacent rock tile, `visibleOreCount` was still `2` and `looseItems` was still empty. After mining the actual copper tile, status changed to `Copper broke loose. Swim near it to collect.`, `visibleOreCount` dropped to `1`, and one `copper` loose item appeared with `sourceTileX: 56`, `sourceTileY: 19`.

The reduced proof JSON does not retain the RNG seed; it does retain biome, depth/state, tile coordinates, screenshots, and the relevant runtime item/ore counts.

## Root cause

The root cause is a mismatch between visual ore anchoring and gameplay ore breaking:

- Gameplay resources are `Tile` values with `value > 0` in `tiles`; copper/quartz/ruby/etc. are solid resource tiles, while stone/sand are value `0` and anchorstone/bedrock are value `0` blockers (`src/content.ts:4`, `src/content.ts:8`, `src/content.ts:19`).
- Ore veins are written into `scene.world` by worldgen (`src/helpers.ts:39`, `src/helpers.ts:52`, `src/scene-worldgen.ts:300`, `src/scene-worldgen.ts:312`), and special biolume resource placement also writes ore tiles (`src/scene-worldgen.ts:281`). `canHostOre` only allows stone/sand hosts (`src/scene-worldgen.ts:650`).
- Rendering draws visible embedded ore for every visible `isOreTile(tile)` (`src/scene-rendering.ts:487`, `src/scene-rendering.ts:517`; `isOreTile` is `tiles[tile].value > 0` at `src/helpers.ts:2088`). The base tile texture for ore is host rock, so the colored ore is an overlay rather than a distinct tile texture (`src/helpers.ts:2105`, `src/helpers.ts:2112`).
- `drawEmbeddedOre` only draws if the tile's mask is still solid enough, then gets a connected same-tile component and draws only from that component root (`src/scene-rendering.ts:1559`, `src/scene-rendering.ts:1560`, `src/scene-rendering.ts:1561`, `src/scene-rendering.ts:1562`). The component excludes any same-tile cells whose `maskTileSolidRatio` dropped below `0.42` and chooses a top/left root from the remaining cells (`src/scene-rendering.ts:1601`, `src/scene-rendering.ts:1615`, `src/scene-rendering.ts:1628`).
- Mining always carves the terrain mask before damaging/breaking the chosen tile (`src/scene-combat.ts:56`, `src/scene-combat.ts:89`). The carve path subtracts several radius brushes from the shared terrain mask (`src/scene-combat.ts:146`, `src/scene-combat.ts:171`; brush mutation at `src/terrain-mask.ts:78`, `src/terrain-mask.ts:99`, `src/terrain-mask.ts:103`).
- Actual ore loot is spawned only when `breakTile` converts a tile to water and calls `spawnLoose` (`src/scene-combat.ts:353`, `src/scene-combat.ts:375`, `src/scene-combat.ts:384`). `spawnLoose` emits one valuable item for `def.value > 0` and records source tile coordinates (`src/scene-combat.ts:468`, `src/scene-combat.ts:477`, `src/scene-combat.ts:493`).

## Why "moving clusters" happens

The gameplay ore overlay is anchored to the current mask-derived deposit component, not to a stable worldgen deposit ID or immutable tile center. Adjacent terrain mining can overlap the ore cell's terrain mask, because `subtractTerrainMaskBrush` is spatial and tile-agnostic. The ore tile can remain in `scene.world`, but some mask samples fall below the renderer's `0.42` solid-ratio threshold. On the next `drawWorld`, `oreDepositComponent` rebuilds bounds/root from the surviving solid same-tile cells, and `drawEmbeddedOre` recomputes `cx`, `cy`, radii, angle, and draw eligibility from the changed component (`src/scene-rendering.ts:1571`, `src/scene-rendering.ts:1574`, `src/scene-rendering.ts:1601`).

This is not primarily parallax, camera transform, or sprite pooling for current gameplay ore. The main active path is shape-first drawing because `isShapeFirstSliceOreTile(tile)` returns `isOreTile(tile)` for every ore tile (`src/scene-rendering.ts:1854`), so the GPT-stamp sprite branch is bypassed for all ore. If that branch is re-enabled, it has the same unstable anchor risk because its sprite key and stamp jitter use `deposit.rootX/rootY` (`src/scene-rendering.ts:1873`, `src/scene-rendering.ts:1908`).

## Why some visible ore is aesthetic or unmineable

There are two separate reasons the player can see ore-like things that do not become pickups:

1. Real gameplay ore only becomes collectible when the actual ore tile breaks. `mineTargets` currently selects at most one solid tile near the beam impact (`src/scene-combat.ts:333`, `src/scene-combat.ts:334`, `src/scene-combat.ts:348`). Adjacent tunnel carving can visibly expose/reshape the ore overlay without selecting that ore tile for damage, so no `breakTile`/`spawnLoose` call happens.
2. Some visible ore-like art is not resource data at all. Background anchors are painterly/parallax scenery (`src/scene-rendering.ts:427`, `src/scene-rendering.ts:432`, `src/helpers.ts:698`, `src/helpers.ts:1363`). Terrain look data contains ore-like material accent stamp pools such as `terrain-stamp-ore-copper` and `terrain-stamp-ore-quartz` (`src/helpers.ts:2019`, `src/helpers.ts:2033`, `src/helpers.ts:2047`, `src/helpers.ts:2061`), but current environment prop generation explicitly skips actual ore tiles and only emits flora props from stable edge anchors (`src/scene-worldgen.ts:718`, `src/scene-worldgen.ts:730`, `src/scene-worldgen.ts:733`). The old `drawOreBrush` path exists but is not called in current `drawWorld` (`src/scene-rendering.ts:3007`).

Collection itself is also radius-gated after a pickup exists: valuable loose items require `item.value > 0`, available cargo capacity, pickup delay elapsed, and player/sub distance inside the pickup radius (`src/scene-entities.ts:482`, `src/scene-entities.ts:496`, `src/scene-entities.ts:506`). That is not the primary cause of visible-but-unmineable ore in the proof, because the adjacent-mining case produced no loose item at all.

## Confidence

High. Static code tracing and a runtime canvas proof both point to the same mechanism: visual ore is tile-backed but mask-anchored, while loot is tile-break-backed. Caveats: the runtime proof used the built-in staged mining polish review instead of a naturally discovered random vein, and the proof JSON does not include the seed. It still exercised the normal `mineAt`, terrain mask, renderer, `breakTile`, `spawnLoose`, and pickup data paths on the real canvas.

## Narrow next-fix recommendation

Make visible gameplay ore use a stable anchor that survives nearby terrain mask carving until the backing ore tile actually breaks. The narrow implementation target is to decouple embedded ore visual placement from the mutable connected-component root/bounds: key it by ore tile or generated deposit ID, clamp/hide only when the backing ore tile is broken, and avoid changing the visual center just because adjacent mask samples changed. Also make ore-like decorative/background stamps visually distinguishable from resource ore, or suppress ore-looking decorative stamps near mineable terrain, so players can tell what has gameplay backing.

If the intended feel is that adjacent mining should expose ore without collecting it, the targeting path should still preferentially select/damage the visible ore tile when the beam hits the ore visual bounds. Otherwise, the tunnel carve should avoid eroding ore visuals unless the ore tile is part of `mineTargets`.

## Verification performed

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `7776913`
- `git -C /mnt/nxt-dev/water9 status --short` at start:

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

- Static tracing with `rg` and `nl -ba` across `src/content.ts`, `src/helpers.ts`, `src/scene-worldgen.ts`, `src/scene-rendering.ts`, `src/scene-combat.ts`, `src/terrain-mask.ts`, `src/scene-entities.ts`, `src/main.ts`, `src/scene-playtest.ts`, and `vite.config.ts`.
- Vite dev server on `http://127.0.0.1:5180/` with `./node_modules/.bin/vite --host 127.0.0.1 --port 5180 --strictPort`; `.desktop-build` is ignored by Vite watch config (`vite.config.ts:9`, `vite.config.ts:110`). Starting Vite reoptimized the ignored dependency cache under `node_modules/.vite`; no source/assets/config/package/test file was edited by this investigation.
- Playwright canvas smoke via `ore-proof/capture-ore-mining-proof.mjs` against `http://127.0.0.1:5180/?playtest=1&biome=2&renderer=canvas`.
- Proof written under `ore-proof/`: `01-before-adjacent-mining.png`, `02-after-mining-adjacent-rock.png`, `03-after-mining-visible-ore.png`, `ore-before-after-crops.png`, `ore-adjacent-mining-diff.png`, `ore-proof.json`, and `vite-5180.log`.

## Git state after investigation

`git -C /mnt/nxt-dev/water9 status --short` after investigation:

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
?? runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/
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
?? tools/review_painterly_landmark_visual_recovery.mjs
?? tools/review_phase10_authored_landmark.mjs
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

Investigation report/proof files were created or updated under `/mnt/nxt-dev/water9/runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/`. Starting the allowed Vite smoke server also regenerated ignored dependency-cache files under `node_modules/.vite`; no source/assets/config/package/test file was edited by this investigation.
