# Water9 Fauna Behavior First Slice - 2026-07-06

## Goal

Implement the first small-fauna behavior classes so non-swimming creatures no longer use generic fish steering:

- `sessileAttached`
- `verticalAnchored`
- `benthicWalker`

Primary bug to fix: biome 1 `Glimmer Spine Urchin` must be an attached defensive contact hazard, not a fast hostile chaser.

## Context

- Repo: `/mnt/nxt-dev/water9`
- Manager preflight HEAD: `539c6b8`
- Planning artifacts:
  - `runs/water9-fauna-behavior-audit-2026-07-06/manager-synthesis.md`
  - `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md`
  - `runs/water9-fauna-behavior-audit-2026-07-06/roster-audit.md`
  - `runs/water9-fauna-behavior-audit-2026-07-06/code-audit.md`
- Current repo has pre-existing unrelated dirty fauna assets, `src/content.ts`, `src/helpers.ts`, run ledgers, and proof JSON. Worker must classify and preserve unrelated dirt.

## Checklist

- [x] Implementation and proof - session key: `agent:mgr-water9:subagent:0729254d-06fd-4dd7-9530-c0f10af82b13`, run id: `990c844a-b7cb-4c0f-9214-8e837e5e1b0a`, label: `water9-fauna-behavior-first-slice-v1` - expected artifacts: commit hash, `runs/water9-fauna-behavior-first-slice-2026-07-06/report.md`, JSON metrics, normal-play `#game canvas` screenshots - commit `6b1e986`, proof refreshed in `fauna-behavior-slice-metrics.json`, REPORTED 2026-07-06
- [x] Manager verification and visual acceptance - session key: manager - expected artifacts: inspected screenshots, ledger tick, Alex report - manager reran focused proof after extending biome-restart wait, inspected refreshed screenshots, REPORTED 2026-07-06

## Acceptance Rule

Accept only after disk verification shows:

- The three first-slice classes are implemented without moving unrelated fauna off legacy fish movement.
- `Glimmer Spine Urchin` no longer enters generic pursuit/chase steering while the player is nearby.
- First-slice fauna spawn/update/render with terrain-surface support and do not float unsupported after terrain changes.
- Proof includes normal-play `#game canvas` screenshots and JSON metrics for Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish, Shellback Garden Eel, Tripodfish, Silver Hinge Crab, Mantis Shrimp, Sea Spider, and Tin Plate Searobin.
- Manager visually inspects the proof before reporting accepted.
- Required checks pass: `npx tsc --noEmit --pretty false`, `npm run build`, `node tools/build_small_life_manifest.mjs --check`, `node tools/test_fish_visual_facing_smoke.mjs`, `node tools/test_aggro_cue_regression.mjs`, `node tools/test_fauna_behavior_slice.mjs`.
