# Water9 Thorough Performance Review - Perf Matrix

Date: 2026-07-09
Repo: `/mnt/nxt-dev/water9`
HEAD: `44dc5c0`

## Executive Verdict

Overall verdict: **not steady**.

Water9 is much better than the last known bad B4 metrics, but the browser rAF evidence does not support "consistently 60fps." Ordinary swim and sonar chart use are steady. B4 canvas no longer looks like the old 75% over 33.34ms failure, but 2 of 3 B4 repeats still hit rAF p95 33.4ms with occasional 66.5-83.4ms browser-frame gaps. Deep traversal also drops at 780m/1140m in the independent rAF supplemental pass. Startup and save/load restoration are hard failures because they produce multi-second main-thread stalls.

Most likely next fix target: **main-thread loading/state restore and the B4 browser-rAF gap outside `frame.total`**. Evidence: save/load restore produced rAF max 16882.7ms with a 16888ms long task, startup produced rAF max 13332.9ms with a 13333ms long task, while B4 canvas hitches had low internal `frame.total`/`outer.frameTotal` and no long tasks, meaning internal frame timers alone are missing browser/compositor or post-step pacing stalls.

Visual proof: I inspected live `#game canvas` color and grayscale captures for ordinary swim, deep traversal, B4 busy/deep, mining, sonar chart, and save/load. HUD/runtime identity is visible in the color gameplay captures; grayscale captures stayed readable. The title/startup `#game canvas` capture is blank, so startup proof is represented by rAF/long-task telemetry plus post-load gameplay canvas.

## Scenario Matrix

| Scenario | Verdict | Browser rAF p95 / p99 / max | Frames over thresholds | Long tasks | Key internal/evidence |
|---|---:|---:|---:|---:|---|
| Build/type gate | PASS | n/a | n/a | n/a | `npm run build` passed in 3.88s; Vite asset/chunk-size warnings only. |
| Startup/loading | FAIL | loading smoke: p95 7883.1ms / max 7883.1ms; supplemental: p95 50.1ms / p99 13332.9ms / max 13332.9ms | supplemental: >20ms 55, >33.34ms 41, >50ms 9 | 2, max 13333ms | `tools/test_loading_swim_perf_smoke.mjs` failed: world did not reach non-loading ready state in its 8s transition loop. |
| Ordinary swim | PASS | p95 16.8ms / p99 16.8ms / max 16.8ms supplemental; loading-smoke swim max 33.4ms | supplemental: >20ms 0, >33.34ms 0, >50ms 0 | 0 | `frame.total` avg 1.91ms, p95 4.8ms; `draw.total` p95 2.3ms; hidden `draw.bigSonarMap` did not sample. |
| Deep diagonal 360m | WARN | supplemental p95 33.2ms / p99 33.4ms / max 83.3ms | >20ms 9, >33.34ms 3, >50ms 1 | 0 | Existing smoke internal summary was cleaner: p95 18.33ms, max 20.01ms. Browser rAF is worse than internal buffer. |
| Deep diagonal 780m | WARN | supplemental p95 33.4ms / p99 50.1ms / max 83.3ms | >20ms 43, >33.34ms 20, >50ms 2 | 0 | Existing smoke internal summary: p95 16.67ms, max 16.68ms. |
| Deep diagonal 1140m | WARN | supplemental p95 33.4ms / p99 50.0ms / max 50.1ms | >20ms 49, >33.34ms 20, >50ms 1 | 1, max 51ms | Existing smoke internal summary: p95 18.33ms, max 18.34ms. |
| Deep diagonal 1500m | WARN | supplemental p95 16.8ms / p99 33.4ms / max 50.0ms | >20ms 6, >33.34ms 4, >50ms 0 | 0 | Improved over old 1500m p95 38.33ms/max 53.33ms, but still has isolated dropped frames. |
| B4 busy/deep canvas repeat 1 | WARN | p95 33.4ms / p99 33.4ms / max 66.5ms | >20ms 43, >33.34ms 11, >50ms 1 | 0 | `frame.total` p95 8.8ms/p99 11.7ms; `outer.frameTotal` p95 11.3ms/p99 14.3ms; entities 156 fish, 10 articulated, 94 parts. |
| B4 busy/deep canvas repeat 2 | WARN | p95 33.4ms / p99 33.4ms / max 83.4ms | >20ms 82, >33.34ms 27, >50ms 1 | 0 | `frame.total` p95 5.7ms/p99 6.7ms; `update.articulated` p95 2.0ms; visible 1 articulated/9 parts. |
| B4 busy/deep canvas repeat 3 | PASS | p95 16.7ms / p99 16.8ms / max 33.4ms | >20ms 2, >33.34ms 2, >50ms 0 | 0 | `frame.total` p95 4.0ms/p99 5.4ms; `outer.frameTotal` p95 5.1ms/p99 6.6ms. |
| B4 busy/deep WebGL comparison | FAIL | p95 150.1ms / p99 183.3ms / max 183.3ms | >20ms 39, >33.34ms 39, >50ms 39 | 40, max 182ms | Do not switch to WebGL in this environment. It is clearly worse than canvas. |
| Mining | WARN | internal rAF p95 33.34ms / p99 35.0ms / max 35.0ms | >20ms 22, >33.34ms 2, >50ms 0 | none reported | Smoke failed its own guardrail: `draw.world maxMs too high: 5.82`; `draw.world` true max 8.1ms, dirty chunks 6, dirty tiles 28. |
| Sonar tool open/use | PASS | normal p95 16.8ms / p99 16.8ms / max 16.8ms; sonar-use p95 16.7ms / p99 16.8ms / max 16.8ms | >50ms 0 | none reported | Sonar chart remains fixed around p95 16.7ms; `draw.bigSonarMap` p95 1.2ms/p99 2.1ms only while open. |
| Sonar map/controller | PASS | not a perf probe | n/a | n/a | Functional smoke passed. Big sonar map rendered 1218x650, lit sample count 239. |
| Save/load functional | PASS | not measured by stock smoke | n/a | n/a | Save/load smoke passed; round-trip state restored. |
| Save/load supplemental perf | FAIL | p95 116.6ms / p99 16882.7ms / max 16882.7ms | >20ms 5, >33.34ms 5, >50ms 3 | 1, max 16888ms | Save/load can expose state-restore stalls; this is the worst measured frame gap. |
| Articulated sim budget | PASS | not a continuous rAF probe | n/a | n/a | Visible creature 60 full steps/0 skipped; offscreen creature 8 full/52 skipped. |
| Perf guardrails | WARN, functional assertion separate | rAF p95 21.66ms / p99 25.0ms / max 25.0ms | >20ms 13, >33.34ms 0, >50ms 0 | includes startup/load long tasks: 146ms, 102ms, 11845ms, 7270ms | Failed only the known `submarine mask-aware terrain collision did not register`; frame-rate evidence itself was not the failure. |

## Comparison To Last Known Bad Metrics

- B4 old: p95 66.7ms, p99 83.3ms, 75% over 33.34ms.
- B4 current canvas repeats: p95 33.4 / 33.4 / 16.7ms, p99 33.4 / 33.4 / 16.8ms, over 33.34ms 5.29% / 15.88% / 0.8%.
- Interpretation: B4 canvas is substantially improved, but not consistently 60fps.
- 1500m diagonal old: p95 38.33ms, max 53.33ms.
- 1500m current supplemental browser rAF: p95 16.8ms, p99 33.4ms, max 50.0ms.
- Interpretation: 1500m improved, but mid-depth traversal now shows worse browser-rAF hitches than the stock internal report captures.
- Sonar chart expected fixed around p95 16.7ms.
- Current sonar-use rAF: p95 16.7ms, p99 16.8ms, max 16.8ms.
- Interpretation: sonar chart pacing remains fixed.

## Artifact Index

Reports and logs:
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/logs/npm-run-build.log`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/loading-swim-perf-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/deep-diagonal-swim-perf-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/deep-diagonal-independent-raf.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/b4-busy-deep-canvas-perf-smoke-1.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/b4-busy-deep-canvas-perf-smoke-2.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/b4-busy-deep-canvas-perf-smoke-3.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/b4-busy-deep-webgl-perf-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/mining-perf-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/sonar-tool-overhaul-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/sonar-map-controller-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/save-load-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/supplemental-canvas-save-raf.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/articulated-sim-budget-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/json/perf-guardrails-smoke.json`

Screenshot directories:
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/supplemental/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/deep-diagonal/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/b4-canvas-1/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/b4-canvas-2/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/b4-canvas-3/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/b4-webgl/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/mining/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/sonar-tool/`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/sonar-controller/`

Representative inspected captures:
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/supplemental/ordinary-swim-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/supplemental/ordinary-swim-canvas-gray.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/deep-diagonal/deep-diagonal-depth-1500-end-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/b4-canvas-2/b4-busy-deep-canvas-end-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/mining/mining-after-canvas-gray.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/sonar-tool/sonar-tool-open-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/sonar-tool/sonar-tool-open-canvas-gray.png`
- `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/screenshots/supplemental/save-load-after-load-canvas-gray.png`

## Commands Run

- PASS: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- PASS: `npm run build`
- FAIL: `node tools/test_loading_swim_perf_smoke.mjs`
- PASS: `node tools/test_deep_diagonal_swim_perf_smoke.mjs`
- PASS: `node tools/test_b4_busy_deep_perf_smoke.mjs` canvas repeat 1
- PASS: `node tools/test_b4_busy_deep_perf_smoke.mjs` canvas repeat 2
- PASS: `node tools/test_b4_busy_deep_perf_smoke.mjs` canvas repeat 3
- PASS command, FAIL perf comparison: `WATER9_B4_RENDERER=webgl node tools/test_b4_busy_deep_perf_smoke.mjs`
- FAIL: `node tools/test_mining_perf_smoke.mjs`
- PASS: `node tools/test_sonar_tool_overhaul_smoke.mjs`
- PASS: `node tools/test_sonar_map_controller_smoke.mjs`
- PASS: `node tools/test_save_load_smoke.mjs`
- PASS: `node tools/test_articulated_sim_budget_smoke.mjs`
- FAIL known assertion only: `npm run water9:perf-guardrails-smoke`
- PASS: supplemental independent rAF/canvas/save-load probe
- PASS: supplemental independent deep diagonal rAF probe

## Caveats / Blockers

- Stock deep-diagonal metrics looked better than the independent browser rAF supplemental pass. Because the task explicitly treats browser rAF as primary truth, I used the supplemental rAF as the verdict input.
- Some stock smokes do not capture independent browser rAF or long tasks for every action, so I added supplemental read-only probes and wrote their JSON under this run directory.
- The startup title `#game canvas` capture was blank; useful visual proof starts once normal gameplay is loaded.
- `npm run water9:perf-guardrails-smoke` failed on the known submarine mask-aware terrain assertion. I classified it separately so it does not obscure frame-rate evidence.
- Git status after the run shows only pre-existing unrelated untracked run artifacts plus this new run directory; no tracked source dirt was created.
