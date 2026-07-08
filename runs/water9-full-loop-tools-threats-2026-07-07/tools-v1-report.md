# Tools V1 Report

## Preflight

- HEAD: `8a04ef5`
- `pwd`: `/mnt/nxt-dev/water9`
- repo root: `/mnt/nxt-dev/water9`

## Dirty Start Summary

The repo was dirty before this slice began. Pre-existing modified files included `package.json`, generated fauna assets, `public/review/water9-progression-measurement.json`, multiple run artifacts, and source files including `src/fauna-behavior.ts`, `src/helpers.ts`, `src/hud.ts`, `src/save-load.ts`, `src/scene-audio.ts`, `src/scene-combat.ts`, `src/scene-economy.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene-sandbox.ts`, `src/scene-sonar.ts`, `src/scene-sub.ts`, `src/scene-worldgen.ts`, `src/scene.ts`, `src/state.ts`, `src/styles.css`, `src/terrain-mask.ts`, `src/types.ts`, and several tools. There were also many untracked run/artifact directories, including this slice's ledger directory.

## Implementation Summary

- Added explicit selected-tool state and unlock state: `state.selectedTool`, `state.unlockedTools`, a narrow `ToolId` union, and shared tool metadata/default helpers in `src/tools.ts`.
- Persisted selected/unlocked tools through save/load with old-save defaults.
- Routed normal diver primary action through `useSelectedToolPrimary()`:
  - `drill` keeps the existing cutter/mining path.
  - `scanner` channels the existing hold-scan path.
  - `sonar` fires the existing sonar ping path.
  - locked/future tools report status and consume no cargo.
- Preserved transition shortcuts: `E` / gamepad `X` scanner, `Q` / `LB` sonar, and `G` / `RB` cargo item use.
- Added number quick-select and HUD click selection for tools `1` through `7`.
- Added a compact in-dive HUD tool strip using the existing cargo-slot visual language.
- Extended playtest snapshots with `selectedTool`, `unlockedTools`, and `scannedSpecies`, plus deterministic staging for the selected-tool smoke.
- Kept mouse/pointer drilling on the existing drill path; selected-tool pointer targeting is left for the radial/tool follow-up.

## Tool IDs And Unlock Defaults

- Tool IDs: `drill`, `scanner`, `sonar`, `sampler`, `flare`, `stun`, `charge`.
- Default selected tool: `drill`.
- Unlocked by default: `drill`, `scanner`, `sonar`.
- Locked/coming later: `sampler`, `flare`, `stun`, `charge`.

## Input / Control Behavior

- Normal active diver primary: `Space` / gamepad `A` / right trigger dispatches through the selected tool.
- Quick-select:
  - `1`: drill
  - `2`: scanner
  - `3`: sonar
  - `4`: sampler locked
  - `5`: flare locked
  - `6`: stun locked
  - `7`: charge locked
- Legacy shortcuts remain:
  - `E` / gamepad `X`: direct scan
  - `Q` / `LB` / left trigger: direct sonar ping
  - `G` / `RB`: selected cargo item / sub action path
- Pointer/mouse drilling remains drill-only for this slice.

## Changed Files

- `src/types.ts`
- `src/tools.ts`
- `src/state.ts`
- `src/helpers.ts`
- `src/save-load.ts`
- `src/scene-combat.ts`
- `src/scene.ts`
- `src/hud.ts`
- `src/scene-playtest.ts`
- `src/styles.css`
- `tools/test_selected_tools_quickbar_smoke.mjs`
- `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-smoke.json`
- `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-hud.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-report.md`

## Runtime HUD Screenshot

- `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-hud.png`

## Verification

- `node tools/test_selected_tools_quickbar_smoke.mjs` - passed.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-smoke.json`
  - Screenshot: `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-hud.png`
  - Port used: `5186`
- `npm run build` - passed. Existing Vite warnings remain for unresolved generated asset URLs and large chunk size.
- `npm run water9:sonar-map-controller-smoke` - passed.
  - Report: `/home/orlovboros/projects/manager/runs/water9-sonar-map-controller-smoke-2026-06-28.json`
  - Screenshot: `/home/orlovboros/projects/manager/runs/water9-sonar-map-controller-smoke-2026-06-28.png`
- `git diff --check -- [slice paths]` - passed.

## Commit

No commit.

Reason: commit safety was not possible because several required slice files overlapped pre-existing dirty work from the dirty-start state (`src/types.ts`, `src/state.ts`, `src/save-load.ts`, `src/hud.ts`, `src/styles.css`, `src/scene.ts`, `src/scene-playtest.ts`, `src/scene-combat.ts`, and `src/helpers.ts`). Staging those paths would include unrelated pre-existing work from earlier lanes. I did not run `git add`.

## Follow-Up For Slice 4

- Implement real `sampler` behavior against eligible flora only.
- Decide whether sampler unlocks immediately after an early biology beat or stays locked until the pinned objective backbone exists.
- Keep sampler rewards separate from scan credits so "scan vs sample" becomes a meaningful choice.
