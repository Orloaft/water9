# Worker Report: brush flora interaction slice

Status: PASS

Preflight output:

```text
/home/orlovboros/projects/managers/water9
/mnt/nxt-dev/water9
8a04ef5
 M package.json
 M public/assets/generated/fauna-abyss-goblin-shark-0.png
 M public/assets/generated/fauna-abyss-goblin-shark-1.png
 M public/assets/generated/fauna-abyss-goblin-shark-2.png
 M public/assets/generated/fauna-abyss-goblin-shark.frames.json
 M public/assets/generated/fauna-abyss-goblin-shark.png
 M public/review/water9-progression-measurement.json
 M runs/water9-distant-landmark-damage-control-2026-07-04.md
 M runs/water9-distant-landmark-known-fix-2026-07-04.md
 M runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/procedural-quality-inventory.json
 M runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-1-report.md
 M runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-2-report.md
 M runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/source-art-slice-3-report.md
 M runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json
 M src/fauna-behavior.ts
 M src/helpers.ts
 M src/hud.ts
 M src/save-load.ts
 M src/scene-articulated.ts
 M src/scene-audio.ts
 M src/scene-combat.ts
 M src/scene-economy.ts
 M src/scene-entities.ts
 M src/scene-playtest.ts
 M src/scene-rendering.ts
 M src/scene-sandbox.ts
 M src/scene-sonar.ts
 M src/scene-sub.ts
 M src/scene-worldgen.ts
 M src/scene.ts
 M src/state.ts
 M src/styles.css
 M src/terrain-mask.ts
 M src/types.ts
 M tools/check_fauna_rarity_balance.mjs
 M tools/measure_progression.mjs
 M tools/test_progression_tuning_smoke.mjs
?? runs/water9-asset-behavior-recovery-2026-07-06/
?? runs/water9-consumable-tools-sampler-quests-2026-07-08/
?? runs/water9-curated-fauna-flora-assets-2026-07-06/
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-ember-bloom-grayscale.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-ember-bloom.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-vent-coral-grayscale.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-vent-coral.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-moon-sponge-grayscale.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-moon-sponge.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-sting-anemone-grayscale.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-sting-anemone.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-repaired-flora-proof.mjs
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/normal-play-repaired-flora-proof.json
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/telegram-review-pack/
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-mid-flora-ember-bloom.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-mid-flora-vent-coral.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-surface-flora-moon-sponge.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-surface-flora-sting-anemone.png
?? runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/worker-report.md
?? runs/water9-flora-slice-scannability-2026-07-06.md
?? runs/water9-flora-slice-scannability-2026-07-06.prompt.md
?? runs/water9-flora-slice-scannability-2026-07-06/
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-inventory.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-runtime-proof.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-style-appraisal.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.md
?? runs/water9-flora-style-guide-audit-2026-07-06/
?? runs/water9-full-loop-tools-threats-2026-07-07.md
?? runs/water9-full-loop-tools-threats-2026-07-07/
?? runs/water9-game-loop-closure-analysis-2026-07-07/
?? runs/water9-interactable-flora-stamps-2026-07-08/
?? runs/water9-interaction-edge-fixes-2026-07-06.prompt.md
?? runs/water9-interaction-edge-fixes-2026-07-06/
?? runs/water9-progression-tools-threat-tightening-2026-07-07/
?? runs/water9-scan-reward-balance-audit-2026-07-06.formula-code-audit.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.progression-proposal.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.roster-payout-audit.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06/
?? runs/water9-scan-reward-rebalance-2026-07-06.md
?? runs/water9-scan-reward-rebalance-2026-07-06.prompt.md
?? runs/water9-small-gulper-readability-facing-fix-2026-07-07.md
?? runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/
?? runs/water9-weak-fauna-flora-visual-audit-2026-07-07.md
?? runs/water9-weak-fauna-flora-visual-audit-2026-07-07.prompt.md
?? runs/water9-weak-fauna-flora-visual-audit-2026-07-07/
?? src/tools.ts
?? tools/build_curated_fauna_pass_assets.py
?? tools/build_flora_slice_assets.py
?? tools/test_consumable_tools_sampler_quests_smoke.mjs
?? tools/test_finale_victory_smoke.mjs
?? tools/test_flora_sampler_smoke.mjs
?? tools/test_flora_scannability_audit.mjs
?? tools/test_interactable_flora_stamps_smoke.mjs
?? tools/test_large_threat_drill_immunity_smoke.mjs
?? tools/test_selected_tools_quickbar_smoke.mjs
?? tools/test_story_milestones_smoke.mjs
```

Notes so far:

- Repo root preflight passed exactly at `/mnt/nxt-dev/water9`.
- The tree was already broadly dirty, including files likely touched by this slice. I will preserve unrelated work and avoid staging.

## Final summary

Changed files for this task:

- `src/types.ts`
- `src/scene.ts`
- `src/scene-worldgen.ts`
- `src/scene-rendering.ts`
- `src/scene-playtest.ts`
- `tools/test_flora_scannability_audit.mjs`
- `tools/test_brush_flora_interaction_smoke.mjs`
- `runs/water9-interactable-flora-stamps-2026-07-08/brush-flora-v1-report.md`

Implementation:

- Identified the cached brush source: `src/scene-rendering.ts` builds `TerrainVisualChunk` entries in `buildTerrainVisualChunk`, calls `appendFloraPlacements` per tile, and caches `TerrainBrushPlacement` objects keyed like `terrain:flora:<tileX>:<tileY>:<top|west|east>`. Terrain mining calls `markTerrainVisualDirty`, invalidating nearby 12x12 visual chunks.
- Added worldgen source-of-truth brush flora generation in `makeBrushFloraTargets`, using the same tile/clearance/hash rules as the cached brush renderer, then thinning/capping stable targets.
- Added brush-derived `Flora.source = 'brush'` entries with `propId` equal to the brush placement key, terrain-mask anchors, sprites, HP, scan/sample state, hazard/rare metadata, and species families for `terrain-brush-flora-0..7`.
- Suppressed duplicate cached visuals by skipping a brush placement in `appendFloraPlacements` when matching brush `Flora` exists, including after sampler destruction so sampled plants do not passively reappear.
- Reused existing scanner, sampler, cargo, sampled species progress, sonar contacts, and terrain support refresh. Drilling support calls the existing `refreshFloraAnchorsAround`, which revalidates/reanchors or kills brush flora just like authored/stamp flora.
- Preserved the accepted `terrain-stamp-plant-*` path and reran its proof smoke.

Brush species mapping:

- `terrain-brush-flora-0` -> `Glass Thread Fern`
- `terrain-brush-flora-1` -> `Ribbon Mat Frond`
- `terrain-brush-flora-2` -> `Wall Lace Anemone`
- `terrain-brush-flora-3` -> `Brine Feather Fan`
- `terrain-brush-flora-4` -> `Lumen Cup Moss`
- `terrain-brush-flora-5` -> `Copper Vein Lichen`
- `terrain-brush-flora-6` -> `Needle Mat Fan`
- `terrain-brush-flora-7` -> `Abyss Thread Fan`

Proof artifacts:

- Brush runtime proof JSON: `runs/water9-interactable-flora-stamps-2026-07-08/brush-flora-proof.json`
- Brush smoke report: `runs/water9-interactable-flora-stamps-2026-07-08/brush-flora-smoke.json`
- Brush scannability audit: `runs/water9-interactable-flora-stamps-2026-07-08/brush-flora-scannability-audit.json`
- Stamp regression report: `runs/water9-interactable-flora-stamps-2026-07-08/interactable-flora-stamps-smoke.json`

Representative brush canvas captures with grayscale companions:

- Surface before/scan/after scan/after sample:
  - `surface-brush-before-interaction.png` / `surface-brush-before-interaction-grayscale.png`
  - `surface-brush-scan-target.png` / `surface-brush-scan-target-grayscale.png`
  - `surface-brush-after-scan.png` / `surface-brush-after-scan-grayscale.png`
  - `surface-brush-after-sample.png` / `surface-brush-after-sample-grayscale.png`
- Mid before/scan/after scan/after sample:
  - `mid-brush-before-interaction.png` / `mid-brush-before-interaction-grayscale.png`
  - `mid-brush-scan-target.png` / `mid-brush-scan-target-grayscale.png`
  - `mid-brush-after-scan.png` / `mid-brush-after-scan-grayscale.png`
  - `mid-brush-after-sample.png` / `mid-brush-after-sample-grayscale.png`
- Deep before/scan/after scan/after sample:
  - `deep-brush-before-interaction.png` / `deep-brush-before-interaction-grayscale.png`
  - `deep-brush-scan-target.png` / `deep-brush-scan-target-grayscale.png`
  - `deep-brush-after-scan.png` / `deep-brush-after-scan-grayscale.png`
  - `deep-brush-after-sample.png` / `deep-brush-after-sample-grayscale.png`
- Support removal:
  - `brush-support-removal-before.png` / `brush-support-removal-before-grayscale.png`
  - `brush-support-removal-after.png` / `brush-support-removal-after-grayscale.png`

Verification:

- `npm run build` - PASS
- `node tools/test_brush_flora_interaction_smoke.mjs` - PASS
  - Used port `5181`.
  - Surface/mid/deep brush flora scanned, sampled into cargo, produced flora sonar contacts, and support removal reanchored/invalidated the target.
  - Cleanup proof: `ss -ltnp '( sport = :5181 )'` showed no listener after the run.
- `node tools/test_flora_scannability_audit.mjs --report runs/water9-interactable-flora-stamps-2026-07-08/brush-flora-scannability-audit.json` - PASS
- `node tools/test_consumable_tools_sampler_quests_smoke.mjs` - PASS
- `node tools/test_flora_sampler_smoke.mjs` - PASS
- `node tools/test_save_load_smoke.mjs` - PASS
- `node tools/test_interactable_flora_stamps_smoke.mjs` - PASS

Visual inspection:

- Inspected live `#game canvas` captures for surface, deep scan, sample harvest, and support removal before/after. Brush flora remained terrain-rooted and readable; scan/sample overlays targeted the plant; after support drilling the target reanchored to nearby valid terrain with no floating orphan.

Caveats:

- The current cached renderer only emits variants `terrain-brush-flora-1`, `4`, `6`, and `7`; species specs are present for `0..7` so future renderer variant changes remain covered.
- Brush flora targets are generated from the initial/generated or loaded world and suppress matching cached brush visuals. Brand-new brush placements exposed later by mining can still appear as passive cached terrain decoration until a broader dynamic-promotion pass exists.
- Individual flora death is not serialized, matching the existing authored/stamp flora save/load pattern; scanned/sample progress and cargo persist through existing state.
- No commit or staging was performed because the repo was already broadly dirty.
