# Sampler V1 Report

## Preflight

- HEAD: `8a04ef5`
- `pwd`: `/mnt/nxt-dev/water9`
- repo root: `/mnt/nxt-dev/water9`

## Dirty Start Summary

The repo was dirty before this slice began. Pre-existing changes included `package.json`, generated/public review assets, many run artifacts, and source files across the progression/tooling lanes including `src/types.ts`, `src/tools.ts`, `src/state.ts`, `src/helpers.ts`, `src/save-load.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene.ts`, `src/hud.ts`, `src/scene-playtest.ts`, and `src/styles.css`. There were also untracked run directories and smoke scripts from prior slices. This slice preserves unrelated dirty work and will not commit if required paths overlap pre-existing changes.

## Implementation Summary

- Promoted `sampler` from locked/coming-soon to an unlocked selected tool for normal play while keeping `flare`, `stun`, and `charge` locked.
- Added sampler primary behavior through the existing selected-tool dispatch. `Space` / gamepad primary now samples nearby gameplay flora when sampler is selected; legacy `E` scan, `Q` sonar, `G` cargo, drill, scanner, and sonar selected-tool paths remain intact.
- Added flora-only sampling target logic that searches `this.flora` only, so it cannot target fish, articulated fauna, decorative terrain flora, ore, nests, or terrain.
- Added sampler feedback distinct from scan/drill: cyan sample channel arc and pulse on flora, sampler-specific status copy, and sample floating text.
- Added logbook visibility for sampled flora species and objective copy that names sampling as a real early action.
- Extended playtest snapshot/commands and added a deterministic sampler smoke covering unlocks, target gating, duplicate prevention, scan separation, scanner/drill no-regression, save/load, and a runtime screenshot.

## Sample State Fields And Unlock Defaults

- `state.sampledSpecies: Set<string>` stores durable species-level sample progress.
- Save payload adds optional `state.sampledSpecies?: string[]`; old saves default to an empty set.
- `Flora` runtime instances now track transient `sample`, `sampling`, `samplePulse`, and `sampleCooldown` for channel/cooldown/visual feedback. These are intentionally not world-persisted.
- Default unlocked tools are now `drill`, `scanner`, `sonar`, and `sampler`.
- `flare`, `stun`, and `charge` remain locked/coming-soon.
- `sampledSpeciesCount()` provides a small story/objective hook for Slice 5.

## Sample Targeting And Reward Rules

- Range is close-only at about `scaledEntity(42)` from the diver to the gameplay flora center.
- Sampling channels steadily at `0.72 + scannerUpgradeBonus` progress per second and does not damage or kill flora.
- First sample per species pays a conservative research reward separate from scan credits. In the smoke, unscanned `Glass Kelp` paid `30c`.
- Scanning first is encouraged: sampled but unscanned flora receives reduced-confidence copy and a lower reward multiplier.
- Duplicate same-species samples do not add `sampledSpecies`, do not pay credits, and do not advance objective hooks.
- Hazardous flora still uses existing close-contact sting behavior; this slice does not add a new sampler damage system.
- Sampler failure copy explicitly rejects non-flora targets: decorative growth, fauna, ore, and terrain cannot be sampled.

## Changed Files

- `src/types.ts`
- `src/tools.ts`
- `src/state.ts`
- `src/helpers.ts`
- `src/save-load.ts`
- `src/scene-combat.ts`
- `src/scene-entities.ts`
- `src/scene-rendering.ts`
- `src/scene-worldgen.ts`
- `src/scene.ts`
- `src/hud.ts`
- `src/scene-playtest.ts`
- `src/styles.css`
- `tools/test_flora_sampler_smoke.mjs`
- `tools/test_selected_tools_quickbar_smoke.mjs`
- `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-smoke.json`
- `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-hud.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-report.md`

## Runtime Screenshot

- `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-hud.png`
- Captured by `node tools/test_flora_sampler_smoke.mjs` on dev server port `5187`.

## Verification

- `node tools/test_flora_sampler_smoke.mjs` - passed.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-smoke.json`
  - Screenshot: `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-hud.png`
- `npm run build` - passed. Existing Vite unresolved generated asset URL warnings and large chunk warning remain.
- `npm run water9:flora-scannability-audit` - passed.
- `node tools/test_selected_tools_quickbar_smoke.mjs` - passed after updating expectations for sampler being unlocked.
- `git diff --check -- [sampler paths]` - passed.

## Commit

No commit.

Reason: commit safety is not possible because required sampler files overlap pre-existing dirty work from prior lanes, including `src/types.ts`, `src/state.ts`, `src/helpers.ts`, `src/save-load.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene-rendering.ts`, `src/scene.ts`, `src/hud.ts`, `src/scene-playtest.ts`, and `src/styles.css`. Staging those paths would include unrelated pre-existing work. I did not stage or commit.

## Follow-Up For Slice 5

- Wire `state.sampledSpecies` / `sampledSpeciesCount()` into pinned B1-B4 expedition milestones.
- Add authored milestone copy for safe/hazardous flora sampling by biome.
- Decide whether story travel should keep all sampled species globally or scope some sample objectives by biome/species list.
