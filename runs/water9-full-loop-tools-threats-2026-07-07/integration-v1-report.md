# Integration V1 Report

## Preflight

- Command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- HEAD: `8a04ef5`
- Expected HEAD: `8a04ef5`
- Repo root: `/mnt/nxt-dev/water9`

## Dirty Start Summary

The repo was intentionally dirty before this integration lane began. Dirty paths included prior full-loop source changes in `src/types.ts`, `src/state.ts`, `src/helpers.ts`, `src/save-load.ts`, `src/hud.ts`, `src/scene.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene-economy.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene-sonar.ts`, `src/scene-sub.ts`, `src/scene-worldgen.ts`, `src/styles.css`, `src/tools.ts`, and related smoke scripts/artifacts. There were also unrelated generated fauna/progression assets and many existing untracked run directories. This lane will preserve that dirty state and only edit source if verification exposes a real combined-slice integration failure.

## Slice Reports Read

- `finale-v1-report.md`
- `threats-v1-report.md`
- `tools-v1-report.md`
- `sampler-v1-report.md`
- `story-v1-report.md`

## Integration Result

Status: complete.

No source integration fixes were needed. The combined finale, large-threat, quickbar/tool, sampler, story milestone, save/load, sonar/controller, and progression checks all passed.

## Verification Commands

- `npm run build` - PASS. Existing Vite warnings remain for unresolved generated asset URLs, large chunk size, and plugin timing.
- `node tools/test_finale_victory_smoke.mjs` - PASS.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-smoke.json`
  - Final proof sets `finalProofRecovered` without setting `won`; docking with proof sets `won` and opens the victory panel.
- `node tools/test_large_threat_drill_immunity_smoke.mjs` - PASS.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-smoke.json`
  - Crownmaw cutter HP/part HP stayed `490 -> 490` and `539 -> 539`; stun timer became positive; dynamite reduced HP; normal Anglerfish still took cutter damage.
- `node tools/test_selected_tools_quickbar_smoke.mjs` - PASS.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-smoke.json`
  - Selected-tool defaults/unlocks include drill/scanner/sonar/sampler, with flare/stun/charge locked.
- `node tools/test_flora_sampler_smoke.mjs` - PASS.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-smoke.json`
  - Glass Kelp sample added one sampled species, did not add scanned species, paid `30c`, and did not kill the flora.
- `node tools/test_story_milestones_smoke.mjs` - PASS.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-smoke.json`
  - B1 pinned objective appears and completes at the barge; B4 waits for final proof return and then completes with victory.
- `npm run water9:save-load-smoke` - PASS.
  - Report: `/home/orlovboros/projects/manager/runs/water9-save-load-smoke-2026-06-28.json`
- `npm run water9:sonar-map-controller-smoke` - PASS.
  - Report: `/home/orlovboros/projects/manager/runs/water9-sonar-map-controller-smoke-2026-06-28.json`
  - Screenshot: `/home/orlovboros/projects/manager/runs/water9-sonar-map-controller-smoke-2026-06-28.png`
- `npm run water9:progression-tuning-smoke` - PASS.
- `node runs/water9-full-loop-tools-threats-2026-07-07/capture-integration-proof.mjs` - PASS.
  - Summary: `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-proof.json`
- `git diff --check -- [integration proof/report paths]` - PASS.

## Runtime Proof Package

Summary JSON:

- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-proof.json`

Viewport captures:

- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-surface-b1-quickbar.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-mid-b2-sampler-story.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-deep-b4-proof-return.png`

Grayscale companions:

- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-surface-b1-quickbar-grayscale.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-mid-b2-sampler-story-grayscale.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-deep-b4-proof-return-grayscale.png`

Visual inspection notes:

- Surface/B1 capture shows the Water9 runtime HUD, sonar map, B1 pinned objective, sampler selected in the quickbar, and locked future tools.
- Mid/B2 capture shows the darker B2 runtime environment, B2 expedition objective, sampler selected, sonar HUD, and sampled/story state in the proof JSON.
- Deep/B4 capture shows the B4 runtime, sonar selected, critical oxygen pressure, and the pinned objective copy: Crownmaw proof is sealed and must be returned to the barge.
- Grayscale companions remain readable for HUD, objective copy, quickbar selection, sonar panel, and diver silhouette.

## Integration Acceptance Notes

- Selected-tool primary actions did not break drill/scanner/sonar/sampler paths.
- Sampler progress feeds the B1/B2 story objectives through durable `sampledSpecies` without occupying the active contract slot.
- Large articulated fauna cannot be damaged by drill/cutter HP damage, while stun and dynamite routes remain available.
- Final proof must return to the barge before victory; B4 story copy does not block finale completion.
- Save/load compatibility smoke passed for the expanded state surface, including old-save defaults.

## Changed Files

Generated or refreshed run artifacts only:

- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-report.md`
- `runs/water9-full-loop-tools-threats-2026-07-07/capture-integration-proof.mjs`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-proof.json`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-surface-b1-quickbar.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-surface-b1-quickbar-grayscale.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-mid-b2-sampler-story.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-mid-b2-sampler-story-grayscale.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-deep-b4-proof-return.png`
- `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-deep-b4-proof-return-grayscale.png`
- Focused smoke JSON/screenshots in this run directory were refreshed by their required smoke commands.

No source files were edited by this integration lane.

## Commit

No commit.

Reason: the repo remains broadly dirty from prior full-loop slices and other Water9 work, including overlapping uncommitted source changes and an untracked run directory containing earlier slice artifacts. Committing only this integration package would not represent a coherent source state, so I left everything unstaged.

## Caveats

- The proof capture script is run-local evidence tooling, not game source.
- An initial proof harness attempt produced an extra `integration-v1-finale-victory-panel.png`; the accepted proof package is the three-capture set listed in `integration-v1-proof.json`.
