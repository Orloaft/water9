Status: PASS

Preflight:
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`: `8a04ef5`
- `pwd`: `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`

Changed files:
- `src/scene-worldgen.ts`
- `src/scene-rendering.ts`
- `tools/test_flora_scannability_audit.mjs`
- `tools/test_interactable_brush_flora_smoke.mjs`
- `runs/water9-interactable-visual-life-followup-2026-07-08/worker-report.md`
- `runs/water9-interactable-visual-life-followup-2026-07-08/visual-life-audit.json`
- `runs/water9-interactable-visual-life-followup-2026-07-08/interactable-brush-flora-smoke.json`
- `runs/water9-interactable-visual-life-followup-2026-07-08/brush-flora-proof.json`
- `runs/water9-interactable-visual-life-followup-2026-07-08/*.png`
- `runs/water9-interactable-visual-life-followup-2026-07-08/stamp-smoke/*`

Implementation summary:
- Built on the existing dirty-baseline brush conversion and finished the remaining gaps.
- `terrain-brush-flora-0..7` now all have player-facing Flora species names: Glass Thread Fern, Ribbon Mat Frond, Wall Lace Anemone, Brine Feather Fan, Lumen Cup Moss, Copper Vein Lichen, Needle Mat Fan, and Abyss Thread Fan.
- Aligned brush generation variants in worldgen and rendering so all eight brush-flora asset keys can become stable Flora targets.
- Preserved stable `source: 'brush'` / `propId` gameplay identity, scanner/sampler lifecycle, sample cargo, snapshot metadata, and duplicate passive-brush suppression.
- Added a focused brush visual-life smoke that stages brush Flora, scans it, samples/destroys it, checks cargo, and drills support until the target reanchors or is killed.
- Replaced the scannability audit with an explicit visual-life inventory that fails on unaccounted flora/fauna-looking keys.

Visual-life audit summary:
- Audit artifact: `runs/water9-interactable-visual-life-followup-2026-07-08/visual-life-audit.json`
- `needs_fix`: 0
- Brush flora: `interactable_flora`, deterministic capped/thinned worldgen Flora targets with passive brush duplicate suppression.
- Stamp plants: `interactable_flora`, previous accepted `terrain-stamp-plant-*` behavior remains intact.
- Terrain edge/env/special-room flora: `interactable_flora` through authored biome/special-room Flora systems.
- Fauna assets: `interactable_fauna` through small-fish or articulated runtime systems.
- `terrain-stamp-fringe-*`: `passive_nonlife_texture`; evidence is the low-alpha edge-mat/fringe path in `terrainLookForBiome`, `edgeFloraProp` `isMat`, and `drawTerrainEcologyFringe`, with no discrete sprite identity, scan radius, or stable life object.
- Loaded-only `terrain-edge-flora-abyss-sacs` / `terrain-edge-flora-lumen-stalks`: no runtime placement path found in source/rendering audit.

Proof artifact paths:
- Brush smoke JSON: `runs/water9-interactable-visual-life-followup-2026-07-08/interactable-brush-flora-smoke.json`
- Brush proof index: `runs/water9-interactable-visual-life-followup-2026-07-08/brush-flora-proof.json`
- Brush normal-play `#game canvas` screenshots and grayscale companions:
  - `surface-brush-flora-scan-target(.png|-grayscale.png)`
  - `surface-brush-flora-sample-harvest(.png|-grayscale.png)`
  - `mid-brush-flora-scan-target(.png|-grayscale.png)`
  - `mid-brush-flora-sample-harvest(.png|-grayscale.png)`
  - `deep-brush-flora-scan-target(.png|-grayscale.png)`
  - `deep-brush-flora-sample-harvest(.png|-grayscale.png)`
  - `abyss-brush-flora-scan-target(.png|-grayscale.png)`
  - `abyss-brush-flora-sample-harvest(.png|-grayscale.png)`
  - `brush-support-removal-before(.png|-grayscale.png)`
  - `brush-support-removal-after(.png|-grayscale.png)`
- Stamp regression proof: `runs/water9-interactable-visual-life-followup-2026-07-08/stamp-smoke/`

Verification commands and results:
- `node tools/test_flora_scannability_audit.mjs --report runs/water9-interactable-visual-life-followup-2026-07-08/visual-life-audit.json`: PASS
- `npm run build`: PASS
- `WATER9_BRUSH_FLORA_OUT_DIR=runs/water9-interactable-visual-life-followup-2026-07-08 WATER9_BRUSH_FLORA_PORT=5180 node tools/test_interactable_brush_flora_smoke.mjs`: PASS
- `WATER9_STAMP_FLORA_OUT_DIR=runs/water9-interactable-visual-life-followup-2026-07-08/stamp-smoke WATER9_STAMP_FLORA_PORT=5180 node tools/test_interactable_flora_stamps_smoke.mjs`: PASS
- `node tools/test_consumable_tools_sampler_quests_smoke.mjs`: PASS
- `node tools/test_flora_sampler_smoke.mjs`: PASS
- `node tools/test_save_load_smoke.mjs`: PASS on isolated rerun. The first concurrent run timed out during world-load wait while other browser smokes were running.

Caveats/blockers:
- Save/load is recorded as PASS from the isolated rerun; the earlier concurrent failure appears to be test/server load contention, not a gameplay failure.
- The repo has broad pre-existing dirty and untracked state across many source, asset, tool, and run paths. I preserved it and did not stage or commit.

Commit:
- Not committed. Commit-safety reason: `git status --short` shows broad pre-existing dirty state, including many files unrelated to this assignment and files already dirty before this work. I cannot prove a safe exclusive staged set without risking unrelated user/worker changes.
