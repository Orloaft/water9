# Save/load entity sprite corruption — 2026-07-13

Status: **FIXED**

Implementation commit: `2d49df7` (`Fix save-load entity lifecycle`)

Starting HEAD: `0a8c44f`

## Player sequence and reproduction

The focused browser regression executes the normal persisted-save lifecycle:

1. Enter Biome 1 with generated fauna/flora visible.
2. Save the active dive.
3. Reopen the page and request the saved dive while initial world generation/preload is still staging (the normal fast “Continue” path).
4. Wait for the saved biome to settle.
5. Complete the Biome 1 charting state and use the real barge travel button/confirmation to enter Biome 2.
6. Wait for Biome 2 to settle.

Before the fix, the focused run recorded:

- before save: 217 fish (3 visible), 77 flora (1 visible), 2 articulated creatures;
- after load: 0 fish, 0 flora, 0 articulated creatures;
- 31 Phaser `Texture key already in use` console errors caused by the load-time scene restart interrupting/requeuing preload;
- next biome: populations happened to regenerate in this run (197 fish, 75 flora), so the exact green/black-square raster did not reproduce deterministically, but the interrupted texture lifecycle and duplicate-key errors establish the timing-dependent resource-corruption path behind that symptom.

Pre-fix evidence is in `artifacts/pre-fix-final/diagnostics.json` and its three canvas PNGs. This distinguishes the first symptom as arrays not repopulated (not merely hidden or detached sprites). The next-biome visible sprites that did survive this particular run had valid frames; the resource fault was captured as loader/texture-manager errors rather than a deterministic square frame.

## Root cause

Two coupled lifecycle defects existed:

1. `loadGame()` restarted the Phaser scene whenever load was requested before `worldReady`. A quick persisted load can occur during preload/create, so this restart interrupted and requeued a partially loaded generated-asset set. Phaser logged duplicate texture-key errors, leaving a timing-dependent path to missing-texture green/black squares on later restarts.
2. The saved-world optimization restored terrain, player state, and environment props but did not generate fauna, gameplay flora, articulated creatures, or related entity GameObjects. After a cold/restarted scene, those arrays were empty by construction.

The old same-scene smoke did not expose either issue because it waited for a complete world and reused already-populated live arrays.

## Fix

- Save loading no longer restarts the scene or its loader. If `create()` is not complete, the request remains pending and the normal initialized generation transition consumes it.
- Biome generation transitions carry a monotonically increasing request ID. Stale delayed callbacks and stale completion-hide callbacks cannot race a newer load/transition.
- The scene records which biome its current entity population actually represents.
- Saved terrain restoration now has two explicit paths:
  - reuse verified nonempty live entities only when `generatedBiome` matches the saved biome (preserves the intended fast in-session load);
  - on cold/partial/mismatched scenes, clear stale lifecycle state, restore saved terrain, then stage normal fauna/flora/articulated creation before applying the saved player/state.
- The new browser regression fails on zero populations, zero visible representative fauna/flora, missing/default textures, missing texture-manager residency, invalid source/frame/crop dimensions, inactive/detached GameObjects, relevant console/page/HTTP failures, or a failed next-biome UI transition.

No content density, bitmap asset path, or sprite fallback was changed.

## Changed files

- `src/save-load.ts` — removes load-time scene restart and defers pre-create loads safely.
- `src/scene.ts` — cancellable generation lifecycle, initialized/generated-biome invariants, and cold entity repopulation for saved terrain.
- `src/scene-playtest.ts` — focused entity/GameObject/texture diagnostics.
- `src/types.ts` — diagnostics command type.
- `tools/test_save_load_entity_lifecycle.mjs` — persisted save → load → actual barge next-biome browser regression and canvas proof capture.
- `package.json` — `water9:save-load-entity-lifecycle-smoke` script.
- This report and the listed evidence artifacts are committed separately from the implementation so this report can name the exact implementation hash.

## Post-fix evidence

Final focused diagnostics: `artifacts/diagnostics.json`

- before save: 217 fish (5 visible), 86 flora (2 visible), 2 articulated creatures;
- after settled load: 216 fish (3 visible), 68 flora (2 visible), 2 articulated creatures;
- after settled Biome 2 transition: 197 fish (3 visible), 78 flora (1 visible), 8 articulated creatures, 18 hazards;
- invalid visible fauna/flora/articulated sprite records after load: 0;
- invalid visible sprite records after next-biome transition: 0;
- relevant console errors, page errors, Phaser asset warnings, and failed HTTP responses: 0.

Every visible diagnostic includes active/visible state, texture key and manager residency, source dimensions, frame/cut/crop dimensions, tint, alpha, display dimensions, active-scene attachment, and display-list attachment.

### Live `#game canvas` proof

Color:

- `artifacts/before-save-color.png`
- `artifacts/after-load-same-biome-color.png`
- `artifacts/next-biome-color.png`

Grayscale:

- `artifacts/before-save-grayscale.png`
- `artifacts/after-load-same-biome-grayscale.png`
- `artifacts/next-biome-grayscale.png`

These are Playwright captures of the actual runtime `#game canvas` bounds, with representative generated bitmap fauna/flora at gameplay scale and the Water9 HUD/project identity visible. They are not a review harness or DOM-only mock.

## Verification

- `npm run water9:save-load-entity-lifecycle-smoke` — PASS (cold server, persisted reload, actual barge travel UI).
- `npm run water9:save-load-smoke` — PASS; state round-trip and corrupt-save assertions remain intact. Final report: `artifacts/existing-save-load-smoke-final/report.json`.
- `npm run water9:biome-creature-balance-smoke` — PASS.
- `npm run build` — PASS; only existing asset-resolution/chunk-size/plugin-timing warnings.
- `git diff --check` — PASS before implementation commit.
- `npx tsc --noEmit --pretty false` — FAILS on the same existing baseline set observed before the behavioral fix: story/finale literal-state typing in `helpers.ts`/`save-load.ts`/`scene-playtest.ts`, `savedWorld` narrowing in `save-load.ts`, articulated stats indexing, missing `resetOxygenWarnings` in `scene-combat.ts`, the existing `Fish.reviewFrozen` error, nullable `roundMetric`, and missing perf command union members. The new diagnostics/lifecycle code adds no TypeScript errors.
- `npm run water9:presentation-smoke` — unrelated existing failure: desktop and narrow checks report the sonar panel not visible; no HUD/CSS/presentation code changed here.
- `npm run water9:save-load-perf-smoke` — strict cadence gate remains red on this host. The final implementation removed the earlier severe 2.37 s regeneration gap; the final attempt had no severe gap but reported three >50 ms handoff frames (one allowed), 20% doubled transition frames, and one 23.9 ms settled frame/19.8 ms draw spike. Functional state restoration completed correctly. Thresholds were not weakened.

## Dirty-state classification

The starting worktree already contained two modified tracked reports and extensive unrelated untracked work under `runs/`, including diver, performance, terrain, sonar, and prompt artifacts. None was edited, staged, or committed by this task. Implementation staging used explicit paths only; `git add -A`, `git add .`, and `git commit -a` were not used.

## Caveats and remaining risk

- OpenClaw’s shared browser gateway was unavailable because its local device requested an unapproved scope upgrade. The repository’s installed Playwright Chromium was used instead; it exercised the real Vite/Phaser runtime and actual canvas.
- Cold saved-world restoration intentionally reconstructs fauna/flora/articulated populations rather than serializing per-entity simulation coordinates. Save data still restores terrain mutations, player/state progression, and deterministic biome content, matching the existing save schema.
- The strict performance smoke remains a follow-up risk as described above, but the functional regression, asset errors, and missing-texture path are fixed.
