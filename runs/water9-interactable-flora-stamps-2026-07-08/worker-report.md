# Worker Report: interactable flora stamps

Status: PASS

Preflight output:

```text
8a04ef5
```

Changed files for this task:

- `src/types.ts`
- `src/scene-worldgen.ts`
- `src/scene.ts`
- `src/scene-playtest.ts`
- `tools/test_interactable_flora_stamps_smoke.mjs`
- `runs/water9-interactable-flora-stamps-2026-07-08/*`

Implementation:

- Converted the active `terrain-stamp-plant-*` EnvironmentProp path into capped gameplay `Flora` targets after normal biome flora generation.
- Added stamp-derived species families so repeated clones count as one species per family:
  - `terrain-stamp-plant-glass` -> `Glass Mat Sprout`
  - `terrain-stamp-plant-brine` -> `Brine Mat Sprout`
  - `terrain-stamp-plant-lumen` -> `Lumen Mat Stalk`
  - `terrain-stamp-plant-purple` -> `Purple Mat Tendril`
- Stamp flora reuse the existing `Flora` lifecycle: scan state, sample state, hp/dead, assetKey, radius, hazard/rare fields, sprite, and terrain-mask surface anchors.
- Converted stamp props are filtered from passive `environmentProps` to avoid visual duplicates.
- Terrain support refresh now revalidates/reanchors converted stamp flora through the same `refreshFloraAnchorsAround` path as existing gameplay flora, and filters matching passive props after refresh.
- Added playtest snapshot metadata (`source`, `propId`) and a `stampFloraSmokeStage` command for proof capture of actual generated stamp flora.

Converted / deferred families:

- Converted in this pass:
  - `terrain-stamp-plant-glass`
  - `terrain-stamp-plant-brine`
  - `terrain-stamp-plant-lumen`
  - `terrain-stamp-plant-purple`
- Audited but left passive:
  - `terrain-stamp-fringe-teal`
  - `terrain-stamp-fringe-brine`
  - `terrain-stamp-fringe-purple`
  - `terrain-stamp-fringe-cyan`
  - These read as edge mats/fringe/lichen in runtime and are high-repeat ambient ground cover. I left them passive to avoid turning broad terrain texture into target spam.
- Deferred:
  - `terrain-brush-flora-0` through `terrain-brush-flora-7`
  - Reason: these are generated inside cached `TerrainVisualChunk` brush placement drawing, not worldgen entities or refreshable props. A clean conversion needs a second slice that extracts placement generation into a stable worldgen/source-of-truth list, caps/thins it as Flora, and filters the cached brush placements by generated Flora IDs while preserving chunk invalidation. Doing that inside the render chunk cache in this pass would be brittle.

Proof:

- Proof JSON: `runs/water9-interactable-flora-stamps-2026-07-08/proof.json`
- Focused smoke JSON: `runs/water9-interactable-flora-stamps-2026-07-08/interactable-flora-stamps-smoke.json`
- Scannability audit JSON: `runs/water9-interactable-flora-stamps-2026-07-08/flora-scannability-audit.json`

Representative canvas captures and grayscale variants:

- B1/surface band glass stamp scan target:
  - `runs/water9-interactable-flora-stamps-2026-07-08/surface-b1-glass-scan-target.png`
  - `runs/water9-interactable-flora-stamps-2026-07-08/surface-b1-glass-scan-target-grayscale.png`
  - HUD/context: `runs/water9-interactable-flora-stamps-2026-07-08/surface-b1-glass-viewport.png`
- B2/mid brine stamp scan target:
  - `runs/water9-interactable-flora-stamps-2026-07-08/mid-b2-brine-scan-target.png`
  - `runs/water9-interactable-flora-stamps-2026-07-08/mid-b2-brine-scan-target-grayscale.png`
  - HUD/context: `runs/water9-interactable-flora-stamps-2026-07-08/mid-b2-brine-viewport.png`
- B3/deep lumen/purple stamp scan target:
  - `runs/water9-interactable-flora-stamps-2026-07-08/deep-b3-lumen-purple-scan-target.png`
  - `runs/water9-interactable-flora-stamps-2026-07-08/deep-b3-lumen-purple-scan-target-grayscale.png`
  - HUD/context: `runs/water9-interactable-flora-stamps-2026-07-08/deep-b3-lumen-purple-viewport.png`
- B4/abyss lumen/purple stamp scan target:
  - `runs/water9-interactable-flora-stamps-2026-07-08/abyss-b4-lumen-purple-scan-target.png`
  - `runs/water9-interactable-flora-stamps-2026-07-08/abyss-b4-lumen-purple-scan-target-grayscale.png`
  - HUD/context: `runs/water9-interactable-flora-stamps-2026-07-08/abyss-b4-lumen-purple-viewport.png`

Additional proof captures:

- Scan completion:
  - `surface-b1-glass-scan-complete.png` / `-grayscale.png`
  - `mid-b2-brine-scan-complete.png` / `-grayscale.png`
  - `deep-b3-lumen-purple-scan-complete.png` / `-grayscale.png`
  - `abyss-b4-lumen-purple-scan-complete.png` / `-grayscale.png`
- Sample harvest:
  - `surface-b1-glass-sample-harvest.png` / `-grayscale.png`
  - `mid-b2-brine-sample-harvest.png` / `-grayscale.png`
  - `deep-b3-lumen-purple-sample-harvest.png` / `-grayscale.png`
  - `abyss-b4-lumen-purple-sample-harvest.png` / `-grayscale.png`
- Drill-support removal:
  - `support-removal-before.png` / `-grayscale.png`
  - `support-removal-after.png` / `-grayscale.png`
  - Result in proof JSON: support removal reanchored a `Glass Mat Sprout` from tile `(88, 47)` to `(87, 47)`, moved it 22.17 px, and kept `supported: true`; no floating orphan remained.

Proof JSON summary:

```json
[
  { "label": "surface-b1-glass", "species": "Glass Mat Sprout", "assetKey": "terrain-stamp-plant-glass", "scanRecorded": true, "sampleRecorded": true },
  { "label": "mid-b2-brine", "species": "Brine Mat Sprout", "assetKey": "terrain-stamp-plant-brine", "scanRecorded": true, "sampleRecorded": true },
  { "label": "deep-b3-lumen-purple", "species": "Lumen Mat Stalk", "assetKey": "terrain-stamp-plant-lumen", "scanRecorded": true, "sampleRecorded": true },
  { "label": "abyss-b4-lumen-purple", "species": "Lumen Mat Stalk", "assetKey": "terrain-stamp-plant-lumen", "scanRecorded": true, "sampleRecorded": true },
  { "label": "support-removal", "species": "Glass Mat Sprout", "assetKey": "terrain-stamp-plant-glass", "invalidated": true, "reanchored": true }
]
```

Verification:

- `npm run build` - PASS
- `node tools/test_interactable_flora_stamps_smoke.mjs` - PASS
- `node tools/test_flora_scannability_audit.mjs --report runs/water9-interactable-flora-stamps-2026-07-08/flora-scannability-audit.json` - PASS
- `node tools/test_consumable_tools_sampler_quests_smoke.mjs` - PASS
- `node tools/test_flora_sampler_smoke.mjs` - PASS on rerun. First run timed out waiting for an existing save/load completion check after sampler assertions; rerun passed.
- `node tools/test_save_load_smoke.mjs` - PASS

Commit safety:

- No commit made due to pre-existing dirty state.
- The repo was broadly dirty before this task, including files touched here (`src/types.ts`, `src/scene-worldgen.ts`, `src/scene.ts`, `src/scene-playtest.ts`) and many unrelated files/run artifacts.
- Nothing was staged.

Caveats:

- New stamp species are runtime/sample species families, not entries in `biomeFlora`; this avoids spawning duplicate regular patches and keeps repeated stamp clones from creating dozens of quest species.
- Stamp flora sample value currently falls through the existing unknown-flora sample value path, producing 30c unscanned sample cargo in proof. This preserves sample cargo behavior without changing broader reward tuning.
- Brush flora conversion remains the main second-slice work.
