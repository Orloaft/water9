# Story Milestones V1 Report

## Preflight

- HEAD: `8a04ef5`
- `pwd`: `/mnt/nxt-dev/water9`
- repo root: `/mnt/nxt-dev/water9`

## Dirty Start Summary

The repo was dirty before this slice began. Required source paths already had prior full-loop work in `src/types.ts`, `src/state.ts`, `src/helpers.ts`, `src/save-load.ts`, `src/hud.ts`, `src/scene-economy.ts`, and `src/scene-playtest.ts`. Existing dirty/untracked smoke scripts and run artifacts were also present from final-proof, large-threat, quickbar, and sampler slices. I preserved unrelated changes and did not commit because this slice necessarily overlaps pre-existing dirty files.

## Implementation Summary

- Added a durable pinned expedition story layer with four authored milestones:
  - `b1-first-signal`
  - `b2-vent-proof`
  - `b3-forward-pocket`
  - `b4-reliquary-proof`
- Added story helpers for default/migrated story state, active milestone selection, progress evaluation, completion, radio bookkeeping, and pinned objective copy.
- Wired the HUD objective panel to show the active expedition milestone above active contracts, or instead of generic charting copy when no contract is active.
- Persisted story state through save/load with safe old-save defaults and migration for saves already beyond earlier biomes.
- Connected travel/save/playtest/finale paths so story progress follows existing charting, scan/sample, forward outpost, large-threat proof, and final proof state without occupying the one active contract slot.
- Added `storyMilestoneSmokeStage` playtest command and `tools/test_story_milestones_smoke.mjs` for deterministic B1-B4 story coverage.

## Story State Fields

- `state.story.activeId`: current pinned milestone id, or empty when no milestone is active in the current biome.
- `state.story.completed`: completed milestone ids.
- `state.story.flags`: lightweight proof flags, currently including completion markers and `b3-gulper-wake-proof` for deterministic/story proof.
- `state.story.heardRadio`: durable story radio ids separate from finale radio.

## Objective And Milestone Rules

- B1 completes from Shallows survey proof: at least one sampled flora species, charting scans, hostile/threat proof, depth, sonar coverage, then return to barge.
- B2 completes from vent chemistry: scan+sample `Brine Grass`, scan+sample hazardous `Vent Coral` or `Ember Bloom`, scan `Gulper Eel`, finish sonar/depth/scans, then return.
- B3 completes from expedition midpoint proof: active `forwardOutpost`, Gulper Wake proof flag or completed/claimed Gulper Wake Survey, `Abyssal Serpent` proof, charting completion, then return for Marlin-prep route copy.
- B4 completes only when final proof reaches the barge and `state.won` is set. If Crownmaw proof is recovered before a ruins flora clue, the pinned objective advances to the return-with-proof extraction copy instead of blocking finale flow.
- Saves already in later biomes silently complete earlier incomplete milestones so old/progressed saves do not get pinned to stale B1/B2/B3 objectives.

## Changed Files

- `src/types.ts`
- `src/state.ts`
- `src/helpers.ts`
- `src/save-load.ts`
- `src/hud.ts`
- `src/scene-economy.ts`
- `src/scene-playtest.ts`
- `tools/test_story_milestones_smoke.mjs`
- `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-smoke.json`
- `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-pinned-objective.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-report.md`

## Runtime Proof

- HUD screenshot: `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-pinned-objective.png`
- Smoke report: `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-smoke.json`

## Verification

- `npm run build` - passed. Existing unresolved generated asset URL warnings and large chunk/plugin timing warnings remain.
- `node tools/test_story_milestones_smoke.mjs` - passed.
- `node tools/test_flora_sampler_smoke.mjs` - passed.
- `node tools/test_selected_tools_quickbar_smoke.mjs` - passed.
- `node tools/test_finale_victory_smoke.mjs` - passed.
- `git diff --check -- src/types.ts src/state.ts src/helpers.ts src/save-load.ts src/hud.ts src/scene-economy.ts src/scene-playtest.ts tools/test_story_milestones_smoke.mjs runs/water9-full-loop-tools-threats-2026-07-07/story-v1-report.md runs/water9-full-loop-tools-threats-2026-07-07/story-v1-smoke.json` - passed.

## Commit

No commit.

Reason: required files overlap pre-existing dirty work from prior full-loop slices. Staging `src/types.ts`, `src/state.ts`, `src/helpers.ts`, `src/save-load.ts`, `src/hud.ts`, `src/scene-economy.ts`, or `src/scene-playtest.ts` would include unrelated changes that were already present before this slice.

## Caveats

- The story layer is intentionally a small overlay, not a full quest/radio cutscene system.
- B3 Gulper Wake can be proven through the existing quest when present, or through the lightweight story flag used by deterministic playtest staging.
- Earlier milestones are auto-completed when loading or staging a later biome, which favors old-save tolerance over retroactively forcing prior-biome story tasks.
