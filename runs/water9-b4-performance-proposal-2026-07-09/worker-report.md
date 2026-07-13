# B4 Performance Proposal Worker Report

Status: complete

Repo pin verified first:

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `815c551`
- `pwd` -> `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel` -> `/mnt/nxt-dev/water9`

Artifacts written:

- Proposal: `/mnt/nxt-dev/water9/runs/water9-b4-performance-proposal-2026-07-09/b4-performance-proposal.md`
- Worker report: `/mnt/nxt-dev/water9/runs/water9-b4-performance-proposal-2026-07-09/worker-report.md`

## What I Reviewed

- Prior report: `/mnt/nxt-dev/water9/runs/water9-adversarial-60fps-postfix-review-2026-07-09/worker-report.md`
- Raw metrics: `/mnt/nxt-dev/water9/runs/water9-adversarial-60fps-postfix-review-2026-07-09/adversarial-60fps-appraisal.json`
- Source paths: `src/scene.ts`, `src/perf.ts`, `src/main.ts`, `src/scene-entities.ts`, `src/scene-articulated.ts`, `src/scene-worldgen.ts`, `src/scene-playtest.ts`, `src/content.ts`, `src/articulated.ts`, `src/terrain-mask.ts`, `src/scene-rendering.ts`, `src/hud.ts`.

## B4 Facts From Metrics

- Failing scenario: `visually-busy-high-entity-deep-area`.
- Input path: biome 4, `teleportToReachableDepth(1650)`, `teleportToArticulated`, hold `ArrowRight+ArrowDown`.
- rAF: samples `108`, avg `48.76ms`, p50 `50ms`, p95 `66.7ms`, p99 `83.3ms`, max `83.4ms`.
- Thresholds: `100%` over `16.67ms`, `99.07%` over `20ms`, `75%` over `33.34ms`, `29.63%` over `50ms`.
- Terrain redraw was not the culprit: dirty chunks `0`, dirty tiles `0`, `draw.world max=2.75ms`.
- Sonar chart was not the culprit: sonar closed, `draw.bigSonarMap=null`, contacts `0`.
- Largest measured gameplay slices: `update.fish count=156 avg=4.68ms max=6.34ms`; `update.articulated count=10 parts=94 avg=1.85ms max=7.74ms`.
- Long Task API saw `40` recent `self` tasks, max `73ms`.
- `frame.total` after the capture reported avg `10.36ms`, max `16.61ms`, so current telemetry misses most of the real stall.
- Terrain contact samples rose from `1,828,482` before to `5,425,614` after, about `3.6M` new samples in the repro.

## Main Findings

1. The highest-confidence next step is telemetry, not gameplay tuning. `frame.total` starts inside `DeepdiveScene.update()` and does not include Phaser's actual renderer after update returns.
2. The exact missing work is not proven yet, but the mismatch strongly points to post-update Phaser Canvas rendering, browser presentation/paint, GC, or other main-thread work outside `Scene.update`.
3. B4 entity simulation is a proven cost center and a likely contributor. Fish and articulated updates are the largest measured slices, and contact probing produces millions of samples.
4. Allocation churn is strongly suggested by hot code: terrain contact probes allocate arrays/objects; articulated part updates rebuild maps/sets/vectors; some scan paths allocate combined arrays.
5. Canvas renderer sensitivity should be tested because `src/main.ts` defaults to `Phaser.CANVAS` unless `?renderer=webgl` is passed, while the adversarial URL did not request WebGL.

## Commands/Smokes

Commands run:

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- `pwd`
- `git rev-parse --show-toplevel`
- `mkdir -p /mnt/nxt-dev/water9/runs/water9-b4-performance-proposal-2026-07-09`
- Read-only `sed`, `rg`, `nl`, and `jq` commands over the prior artifacts and source files.

No live smoke or build was run in this research pass. No gameplay/source files were edited, staged, or committed.

## Top 3 Recommended Next Actions

1. Dispatch the Phase 1 telemetry/smoke worker prompt from the proposal.
2. Use the new telemetry to classify the B4 long task gap as render-bound, GC/allocation-bound, update-bound, or mixed, including a default Canvas vs `renderer=webgl` comparison.
3. If telemetry confirms update/allocation pressure, optimize fish/contact probes first, then articulated allocation/tier costs; defer content reductions until after code-level budgets are proven insufficient.

## Caveats

- I did not run the game or reproduce the B4 scenario live; conclusions are based on the latest raw metrics plus source inspection.
- The proposal intentionally avoids prescribing a gameplay-content reduction as the first fix because the current evidence does not prove B4 density itself must be lowered.
- Phaser event names for pre/post render should be verified during implementation; if they are awkward in this version, a lightweight rAF outer-frame probe is the fallback.
