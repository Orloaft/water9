Status: PARTIAL

Preflight HEAD: 03b2dad

Dirty-start `git status --short` from prior attempt:

```text
 M package.json
 M public/review/water9-progression-measurement.json
 M runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json
 M src/fauna-behavior.ts
 M src/helpers.ts
 M src/scene-combat.ts
 M src/scene-entities.ts
 M src/scene-playtest.ts
 M src/scene-rendering.ts
 M src/scene-sub.ts
 M src/scene-worldgen.ts
 M src/terrain-mask.ts
 M src/types.ts
 M tools/check_fauna_rarity_balance.mjs
 M tools/measure_progression.mjs
 M tools/test_progression_tuning_smoke.mjs
?? public/assets/generated/terrain-edge-flora-ember-bloom.png
?? public/assets/generated/terrain-edge-flora-moon-sponge.png
?? public/assets/generated/terrain-edge-flora-sting-anemone.png
?? public/assets/generated/terrain-edge-flora-vent-coral.png
?? runs/water9-flora-slice-scannability-2026-07-06.md
?? runs/water9-flora-slice-scannability-2026-07-06.prompt.md
?? runs/water9-flora-slice-scannability-2026-07-06/
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-inventory.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-runtime-proof.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.flora-style-appraisal.prompt.md
?? runs/water9-flora-style-guide-audit-2026-07-06.md
?? runs/water9-flora-style-guide-audit-2026-07-06/
?? runs/water9-interaction-edge-fixes-2026-07-06.prompt.md
?? runs/water9-interaction-edge-fixes-2026-07-06/
?? runs/water9-scan-reward-balance-audit-2026-07-06.formula-code-audit.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.progression-proposal.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06.roster-payout-audit.prompt.md
?? runs/water9-scan-reward-balance-audit-2026-07-06/
?? runs/water9-scan-reward-rebalance-2026-07-06.md
?? runs/water9-scan-reward-rebalance-2026-07-06.prompt.md
?? tools/build_flora_slice_assets.py
?? tools/test_flora_scannability_audit.mjs
```

## Recovery checkpoint

- Recovery preflight HEAD: 03b2dad
- Recovery started from the prior `Status: IN PROGRESS` report and the existing generated-source goblin shark files in this run folder.
- Recovery dirty-start state includes the prior dirty files above plus modified goblin shark runtime assets:

```text
 M public/assets/generated/fauna-abyss-goblin-shark-0.png
 M public/assets/generated/fauna-abyss-goblin-shark-1.png
 M public/assets/generated/fauna-abyss-goblin-shark-2.png
 M public/assets/generated/fauna-abyss-goblin-shark.frames.json
 M public/assets/generated/fauna-abyss-goblin-shark.png
?? runs/water9-asset-behavior-recovery-2026-07-06/
```

- Recovery objective: preserve usable partial goblin shark asset work, isolate this lane from other dirty Water9 work, implement smallest safe behavior/control/transition fixes, capture actual runtime proof where feasible, and mark any larger generated-asset/flora work as PARTIAL or BLOCKED_ASSET_QUEUE with exact next assets.

## Dirty-start and recovery classification

Recovery-owned or recovery-extended:
- `public/assets/generated/fauna-abyss-goblin-shark*.png`
- `public/assets/generated/fauna-abyss-goblin-shark.frames.json`
- `src/scene.ts`
- `src/scene-entities.ts`
- `src/scene-playtest.ts`
- `src/types.ts` additions for mantis surface-hop interpolation/proof harness support
- `runs/water9-asset-behavior-recovery-2026-07-06/`

Pre-existing dirty work preserved and not reverted:
- Flora slice work in `package.json`, `src/helpers.ts`, `src/scene-worldgen.ts`, `src/types.ts`, `tools/build_flora_slice_assets.py`, `tools/test_flora_scannability_audit.mjs`, and `public/assets/generated/terrain-edge-flora-*.png`
- Interaction-edge/fauna work in `src/fauna-behavior.ts`, `src/scene-combat.ts`, `src/scene-rendering.ts`, `src/terrain-mask.ts`, and `runs/water9-interaction-edge-fixes-2026-07-06/`
- Progression/fauna audit work in `public/review/water9-progression-measurement.json`, `runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json`, `src/scene-sub.ts`, and related tools.

## Root causes addressed

- Mantis shrimp visible snap: prior surface-advance logic could change the terrain anchor/root in one update. Recovery added a short visible hop interpolation for Mantis Shrimp when it advances to a nearby surface anchor, with actual frame-by-frame canvas proof.
- Accidental `R` restart: normal play still had `JustDown(this.keys.R) restart(this)`. Recovery removed that normal-play shortcut and changed the death hint to Enter.
- B2 lower transition snap: existing lower-to-transition-deep blend logic is present and now proven at B2 depths 1380/1440/1500 with outgoing/incoming landmark alpha roles. Playtest staging now closes overlays so the `R` proof is normal play, not radio-blocked.
- Flora scannability: prior flora-slice work promoted Moon Sponge/Sting Anemone/Vent Coral/Ember Bloom mappings. Recovery proved Moon Sponge is a true `Flora` scan target using `terrain-edge-flora-moon-sponge`.
- Goblin shark placeholder: partial generated goblin shark output is kept because runtime proof shows `Goblin Shark` using `fauna-abyss-goblin-shark`, the frame manifest is served, and gameplay canvas captures exist.

## Changed files

Recovery direct changes:
- `src/scene.ts`
- `src/scene-entities.ts`
- `src/scene-playtest.ts`
- `src/types.ts`
- `public/assets/generated/fauna-abyss-goblin-shark.png`
- `public/assets/generated/fauna-abyss-goblin-shark-0.png`
- `public/assets/generated/fauna-abyss-goblin-shark-1.png`
- `public/assets/generated/fauna-abyss-goblin-shark-2.png`
- `public/assets/generated/fauna-abyss-goblin-shark.frames.json`
- `runs/water9-asset-behavior-recovery-2026-07-06/`

Overlapping pre-existing dirty files in the worktree were not committed or reverted.

## Proof paths

- Aggregate: `runs/water9-asset-behavior-recovery-2026-07-06/recovery-proof.json`
- Mantis: `mantis-movement-proof.json`, `mantis-movement-frame-00..07.png`, `mantis-movement-frame-00..07-grayscale.png`
- R key and B2 metadata: `control-transition-proof.json`
- B2 canvas: `b2-lower-transition-1320.png`, `1320-grayscale.png`, `1380.png`, `1380-grayscale.png`, `1440.png`, `1440-grayscale.png`, `1500.png`, `1500-grayscale.png`, `1560.png`, `1560-grayscale.png`
- Flora/goblin: `flora-goblin-proof.json`, `flora-moon-sponge-scan-proof.png`, `flora-moon-sponge-scan-proof-grayscale.png`, `goblin-shark-gameplay-proof.png`, `goblin-shark-gameplay-proof-grayscale.png`, `goblin-shark-generated-asset-residency.json`
- Flora audit: `flora-scannability-audit.json`

## Verification commands/results

- PASS: `npx tsc --noEmit --pretty false`
- PASS: `npm run build` (existing Vite generated-asset resolution warnings and chunk-size warning)
- PASS: `npm run water9:flora-scannability-audit -- --report runs/water9-asset-behavior-recovery-2026-07-06/flora-scannability-audit.json`
- PASS: `node runs/water9-asset-behavior-recovery-2026-07-06/capture-mantis-proof.mjs`
- PASS: `node runs/water9-asset-behavior-recovery-2026-07-06/capture-control-transition-proof.mjs`
- PASS: `node runs/water9-asset-behavior-recovery-2026-07-06/capture-flora-goblin-proof.mjs`
- PASS: `ss -ltnp sport ge :5180 and sport le :5199` showed no listeners after proof runs.

## Commit

No commit made. Commit blocker: repo started with substantial overlapping dirty work from other lanes in shared source files and generated assets, so isolated staging is not safe without manager/integration-owner review.

## Caveats and BLOCKED_ASSET_QUEUE

Status is PARTIAL because only one representative elevated flora class and the partial goblin shark were proven. The full flora/fauna generated-art replacement queue is larger than this recovery and should not be faked with procedural stand-ins.

Next asset queue:
- `public/assets/generated/terrain-edge-flora-glass-kelp.png`, runtime id `terrain-edge-flora-glass-kelp`, 96x128 transparent PNG: generated bitmap terrain-attached glass kelp, readable silhouette, no text, no baked background, match existing terrain-edge flora quality.
- `public/assets/generated/terrain-edge-flora-brine-grass.png`, runtime id `terrain-edge-flora-brine-grass`, 96x128 transparent PNG: generated brine grass cluster, amber/green blades, terrain-rooted, clean alpha.
- `public/assets/generated/terrain-edge-flora-black-fan.png`, runtime id `terrain-edge-flora-black-fan`, 112x128 transparent PNG: abyssal fan coral, dark readable fan branches, terrain-rooted, clean alpha.
- `public/assets/generated/terrain-edge-flora-needle-garden.png`, runtime id `terrain-edge-flora-needle-garden`, 112x128 transparent PNG: hazardous needle garden, sharp pink/red spines, terrain-rooted, clean alpha.
- `public/assets/generated/terrain-edge-flora-crown-polyps.png`, runtime id `terrain-edge-flora-crown-polyps`, 128x128 transparent PNG: rare crown polyp cluster, gold biolume cups, terrain-rooted, clean alpha.
- Additional fauna still needing generated runtime proof: audit all fish species still falling back to `fish-*` generic assets, then generate per-species sprite sheets with `.frames.json` manifests. Do not substitute procedural stand-ins.

## Asset revision

Status: PRIMARY_FIXED / SECONDARY_NOT_ADVANCED

Preflight HEAD: 03b2dad

Root cause:
- The Goblin Shark PNG and alpha source were clean, but normal gameplay was drawing Phaser's missing-texture marker for `fauna-abyss-goblin-shark`, producing the manager-rejected bright green box.
- Recovery preloads `fauna-abyss-goblin-shark` from its checked-in `.frames.json` manifest before the dynamic manifest loop and skips that key in the later loop, so the actual spritesheet texture exists when `drawFish` calls `setTexture(...).setFrame(...)`.

Revision changes:
- `src/helpers.ts`: imported `fauna-abyss-goblin-shark.frames.json`, registered a narrow `PRELOADED_SPRITESHEET_MANIFESTS` entry, and preloaded only the Goblin Shark spritesheet from that manifest.
- Added focused proof script and artifacts under `runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/`.
- Did not change the generated Goblin Shark PNGs in this revision; source/spritesheet inspection shows the served sheet is 180x34, has 0 saturated green pixels, and has alpha transparency.
- Did not advance the flora queue in this revision. The next flora assets still need generation/integration/proof as listed above.

Asset revision proof:
- `runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/goblin-shark-gameplay-proof-clean.png`
- `runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/goblin-shark-gameplay-proof-clean-grayscale.png`
- `runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/goblin-shark-runtime-metadata.json`
- `runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/goblin-shark-source-spritesheet-inspection.json`
- `runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/capture-goblin-shark-asset-proof.mjs`

Runtime proof result:
- PASS: actual `#game canvas` capture shows the pink generated Goblin Shark in normal gameplay context with no chroma-key rectangle, no green missing-texture marker, and no procedural stand-in.
- PASS: metadata shows `assetKey: fauna-abyss-goblin-shark`, manifest served by HTTP 200, screen position `screenX: 535.466`, `screenY: 148.639`, and `screenVisible: true`.
- PASS: proof pixel guard reports `screenInspection.saturatedGreenPixels: 0`, `largestGreenRun: 0`; sheet inspection reports `textureInspection.saturatedGreenPixels: 0`.

Verification:
- PASS: `node runs/water9-asset-behavior-recovery-2026-07-06/asset-revision/capture-goblin-shark-asset-proof.mjs`
- PASS: `npx tsc --noEmit --pretty false`
- PASS: `npm run build` (existing Vite generated-asset resolution warnings and chunk-size warning)
- PASS: `ss -ltnp 'sport ge :5180 and sport le :5199'` showed no listeners after proof runs.

Commit:
- No commit made. Commit blocker remains: repo started with substantial overlapping dirty work in shared source files and generated assets; `src/helpers.ts` already contained unrelated dirty changes, so isolated commit safety is not unquestionable.

Caveats:
- Vite console still reports missing texture/frame warnings for other assets during proof runs. The Goblin Shark proof itself is clean, but the broader dynamic spritesheet loader likely still needs an integration-owner pass before accepting the rest of the generated fauna queue.
