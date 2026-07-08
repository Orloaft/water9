# Finale V1 Report

## Preflight

- HEAD: `8a04ef5`
- `pwd`: `/mnt/nxt-dev/water9`
- repo root: `/mnt/nxt-dev/water9`

## Dirty Start Summary

The repo was dirty before this slice began. Pre-existing modified files included `package.json`, multiple generated fauna assets, `public/review/water9-progression-measurement.json`, several run artifacts, and source files including `src/fauna-behavior.ts`, `src/helpers.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene-sandbox.ts`, `src/scene-sub.ts`, `src/scene-worldgen.ts`, `src/scene.ts`, `src/terrain-mask.ts`, and `src/types.ts`. There were also many untracked run/artifact directories, including this slice's ledger directory.

## Implementation Summary

- Added minimal durable finale progress on `state.finale`: `finalProofRecovered`, `endingSeen`, `heardRadio`, `finalProofSpecies`, and `finalProofDepth`.
- Persisted finale state in `save-load.ts`, with old-save defaults. Old non-won saves restore finale flags as false/empty; old won saves infer `finalProofRecovered`.
- Changed B4 Crownmaw final-depth proof recovery so it records final proof and updates status/objective copy instead of immediately setting `state.won`.
- Wired actual finale completion into the existing barge docking/return path. Returning to the barge with final proof calls `completeFinaleAtBarge()`, sets `won`, logs finale radio flags, and unlocks `The Drowned Architects`.
- Added a victory panel parallel to the existing game-over panel: title/copy, run summary, `Continue Survey`, and `New Expedition`.
- Made `won && !endingSeen` the modal/frozen state so `Continue Survey` can dismiss the panel while preserving a won save.
- Added focused Playwright smoke coverage plus runtime proof screenshot.

## Changed Files

- `src/types.ts`
- `src/state.ts`
- `src/helpers.ts`
- `src/save-load.ts`
- `src/scene-entities.ts`
- `src/scene.ts`
- `src/scene-sonar.ts`
- `src/scene-economy.ts`
- `src/scene-combat.ts`
- `src/scene-sub.ts`
- `src/scene-audio.ts`
- `src/scene-playtest.ts`
- `src/hud.ts`
- `src/styles.css`
- `tools/test_finale_victory_smoke.mjs`
- `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-smoke.json`
- `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-victory-panel.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-report.md`

## Verification

- `npm run build` - passed. Existing Vite warnings remain for unresolved generated asset URLs and large chunk size.
- `node tools/test_finale_victory_smoke.mjs` - passed.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-smoke.json`
  - Runtime screenshot: `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-victory-panel.png`
  - Port used: `5188`
- `npm run water9:progression-tuning-smoke` - passed.

## Commit

No commit.

Reason: commit safety was not possible because several required slice files were already dirty at start and overlap this implementation (`src/helpers.ts`, `src/types.ts`, `src/scene.ts`, `src/scene-entities.ts`, `src/scene-combat.ts`, and `src/scene-playtest.ts`). Staging those paths would include unrelated pre-existing work from other lanes. I did not run `git add`.

Current caveat: the repo remains broadly dirty with the pre-existing files/artifacts plus this slice's changes and generated proof artifacts.

## Follow-Up For Slice 2

- Slice 2 can build on `finaleLocksSurvey()` if it needs post-win behavior, but it should avoid expanding finale state unless new story milestones require it.
- Large-threat drill immunity should be implemented separately from the Crownmaw proof flow; this slice intentionally did not change large-threat damage or TNT rules.
