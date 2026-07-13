# B4 Performance Implementation Report

Status: PASS

Commit: `44dc5c0` (`Optimize B4 busy deep performance`)

## Preflight

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`: `815c551`
- `pwd`: `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`
- Pre-existing dirty/untracked state before edits:
  - `runs/water9-adversarial-60fps-postfix-review-2026-07-09/` (untracked input evidence)
  - `runs/water9-b4-performance-proposal-2026-07-09/` (untracked input evidence)
  - `runs/water9-deeper-performance-implementation-2026-07-09.md` (untracked, unrelated)
  - `runs/water9-deeper-performance-implementation-2026-07-09.prompt.md` (untracked, unrelated)
  - `runs/water9-sonar-chart-pacing-followup-2026-07-09.prompt.md` (untracked, unrelated)

## Implementation

- Added perf-mode-only outer Phaser frame telemetry in `src/perf.ts` and `src/main.ts`: rAF delta, outer step, render, post-step-to-render gap, true max/p50/p95/p99 windows, long tasks since previous frame, memory when available, entity counts, visible counts, fish/articulated tiers, terrain contact deltas, dirty terrain, and sonar/cache state.
- Added repeatable B4 busy/deep smoke: `tools/test_b4_busy_deep_perf_smoke.mjs`.
- Optimized B4 entity pressure without reducing spawned density:
  - Fish now full-simulate when visible, near the player, hostile/in detection, aggroed, stunned, hurt, or scanning; distant inactive fish use cheap throttled updates.
  - Scanner no-op returns before nearest-life work.
  - Terrain contact helpers no longer allocate per-call point arrays/filter copies.
  - Articulated update reports tier budgets, caches stable lookup maps/spine manifests, avoids hot `Vector2` allocations, and keeps non-visible/non-aggro creatures just outside combat range on the existing near/offscreen budget tiers.

## Canvas vs WebGL

Default Canvas is the accepted path. The corrected steady-state Canvas smoke meets the B4 targets and has no Long Task API entries.

`renderer=webgl` is worse in this headless Chromium run: rAF p95 `83.4ms`, `61.43%` frames over `50ms`, and `40` long tasks over `50ms`, while measured outer frame work remains small. I did not change the renderer default.

Root-cause classification:
- Before: mixed entity/contact/allocation pressure plus missing outer-frame coverage.
- After Canvas: steady; the previous entity/contact pressure is removed.
- After WebGL: renderer/browser scheduling or GPU path issue in this environment; not solved by making WebGL default.

## Before / After

| Metric | Before evidence | After Canvas/default | After WebGL |
| --- | ---: | ---: | ---: |
| rAF p95 / p99 / max | `66.7 / 83.3 / 83.4ms` | `16.8 / 16.8 / 33.3ms` | `83.4 / 100 / 100ms` |
| Frames `>33.34ms` / `>50ms` | `75% / 29.63%` | `0% / 0%` | `100% / 61.43%` |
| Long Tasks `>50ms` | repeated `53-73ms` | `0` | `40`, max `73ms` |
| `update.total` p95 / max | max `14.2ms` | `1.5 / 2.0ms` | `3.0 / 3.2ms` |
| `draw.total` p95 / max | max `4.67ms` | `1.1 / 1.3ms` | `5.3 / 10.3ms` |
| outer frame p95 / max | not measured | `3.5 / 4.0ms` | `10.9 / 16.8ms` |
| render p95 / max | not measured | `0.6 / 0.8ms` | `2.8 / 3.2ms` |
| post-step gap p95 / max | not measured | `0.1 / 0.2ms` | `0.1 / 0.2ms` |
| `update.fish` avg / max | `4.68 / 6.34ms` | `0.14 / 0.7ms` | `0.27 / 1.6ms` |
| `update.articulated` avg / max | `1.85 / 7.74ms` | `0.57 / 1.6ms` | `1.21 / 2.6ms` |
| Contact samples total | about `3,597,132` in repro | `198,297` | `160,344` |
| Contact sample drop | baseline | about `94.5%` | about `95.5%` |
| Dirty terrain | `0` chunks / `0` tiles | max `4` chunks / `0` tiles, no dirty redraw stall | max `4` chunks / `0` tiles |
| Sonar | closed | closed | closed |
| Entity context | `156` fish, `10` articulated / about `94` parts | `156` fish, `10` articulated / about `90-94` parts during capture | `156` fish, `10` articulated / `94` parts |

Canvas final tiers in the capture: fish `full=0`, `throttled=3`, `skipped=153`; articulated `full=1`, `offscreen=8`, `fullSteps=1`, `terrainPasses=3`. The start proof screenshot still shows the large B4 articulated threat in-frame before the held-input run.

## Artifacts

- Report: `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/worker-report.md`
- Canvas metrics: `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-canvas-perf-smoke.json`
- WebGL metrics: `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-webgl-perf-smoke.json`
- Canvas proof:
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-canvas-start-canvas.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-canvas-start-canvas-gray.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-canvas-end-canvas.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-canvas-end-canvas-gray.png`
- WebGL proof:
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-webgl-start-canvas.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-webgl-start-canvas-gray.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-webgl-end-canvas.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/b4-busy-deep-webgl-end-canvas-gray.png`
- Focused smoke artifacts:
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/mining-perf-smoke.json`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/sonar-map-controller-smoke.json`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/sonar-map-controller-smoke.png`
  - `/mnt/nxt-dev/water9/runs/water9-b4-performance-implementation-2026-07-09/articulated-sim-budget-smoke.json`

## Verification

- `npm run build`: passed. Existing Vite unresolved generated asset URL warnings and chunk-size warning only.
- `WATER9_B4_RENDERER=canvas ... node tools/test_b4_busy_deep_perf_smoke.mjs`: passed, classification `steady`.
- `WATER9_B4_RENDERER=webgl ... node tools/test_b4_busy_deep_perf_smoke.mjs`: completed and wrote metrics/proofs; not accepted as default due repeated WebGL long tasks.
- `WATER9_MINING_PERF_PORT=5186 ... node tools/test_mining_perf_smoke.mjs`: passed.
- `WATER9_SONAR_CONTROLLER_PORT=5199 ... node tools/test_sonar_map_controller_smoke.mjs`: passed.
- `WATER9_ARTICULATED_BUDGET_PORT=5195 ... node tools/test_articulated_sim_budget_smoke.mjs`: passed.
- `node tools/test_articulated_terrain_collision_constraints.mjs`: passed.

## Caveats

- WebGL remains a bad path in this environment and should not become the default from this evidence.
- The final Canvas end frame has moved past the giant articulated threat, but the start proof shows it in-frame and the capture retains the B4 roster; the optimization changes simulation tiering, not spawn/content density.
- Run artifacts are intentionally left untracked under `runs/water9-b4-performance-implementation-2026-07-09/`; committed implementation is `44dc5c0`.
