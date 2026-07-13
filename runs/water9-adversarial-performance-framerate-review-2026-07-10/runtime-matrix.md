# Water9 adversarial performance/framerate runtime matrix

Pinned HEAD: `9c88409`  
Review date: 2026-07-10  
Status: COMPLETE

## Executive verdict

**Overall verdict: not steady.**

Ordinary swim, standalone mining, and correctly gated sonar can present at approximately 60 fps, but the result does not survive adversarial depth/density coverage. Every B4 canvas repeat missed the cadence guardrail, the 25-second B4 run degraded after its first five seconds to p95 33.4 ms, and three deeper diagonal bands had p95 around 33.3-33.4 ms. The guardrail mining sequence also produced a 1,216.7 ms rAF maximum and five exported long tasks (56, 104, 149, 108, and 1,227 ms).

The clearest telemetry blind spot is B4: in the focused run, browser rAF was p95/p99 33.4/33.4 ms with 158 frames over 33.34 ms, while internal `frame.total` was p95/p99 4.1/5.5 ms and `outer.frameTotal` was only 7.0/8.5 ms. Internal frame work therefore does not enclose the presentation stall.

The most likely next fix target is the **B4/deep presentation cadence path outside the measured update/draw enclosure**, followed by terrain/world-view refresh bursts. Evidence: (1) sustained 30-fps-like rAF quantization despite low internal costs, (2) focused B4 worsens only after moving for several seconds, (3) diagonal-band analysis repeatedly names `terrainDirtyRedraw`, and (4) B4 repeat 2 exposed a 90 ms long task with an articulated true maximum of 62.7 ms.

## Scenario matrix

Browser rAF is primary. Counts are strict `> threshold`. “LT” is exported long-task count/max; where the cadence observer saw more than the exported buffer, both are stated.

| Scenario | Verdict | rAF avg / p50 / p95 / p99 / max (ms) | >20 / >33.34 / >50 | Long tasks | Internal/cause evidence |
|---|---|---:|---:|---|---|
| Startup/loading transition | WARN | 373.42 / n/a / 1983.3 / n/a / 1983.3 | n/a / n/a / 2 >50 | Not retained separately | Only 6 samples across 5.5 s; loading work is extremely blocking but covered by the loading UI |
| First settled ordinary swim | WARN | 17.05 / 16.7 / 16.8 / 33.3 / 33.4 | 9 / 2 / 0 | None asserted | `frame.total` p95 4.2, max 18.9; `draw.total` p95 1.3, max 18.4; compact minimap p95 1.4, max 1.8; `draw.bigSonarMap` absent |
| Diagonal 360 m | WARN | 17.17 / 16.7 / 16.8 / 33.4 / 33.4 | 7 / 4 / 0 | 0 | `draw.world` p95 6.2, max 8.3; terrain dirty redraw dominant |
| Diagonal 780 m | FAIL | 19.86 / 16.7 / 33.4 / 33.4 / 50.0 | 37 / 20 / 0 | 0 | Worst diagonal band; `draw.world` max 14.1, `outer.frameTotal` max 22.3; terrain dirty redraw dominant |
| Diagonal 1140 m | FAIL | 18.04 / 16.7 / 33.3 / 33.4 / 50.0 | 17 / 5 / 0 | 0 | `outer.frameTotal` max 35.2 although p95 6.8; terrain dirty redraw dominant |
| Diagonal 1500 m | FAIL | 18.11 / 16.7 / 33.3 / 33.4 / 50.0 | 18 / 7 / 0 | 0 | `draw.world` p95 4.0, max 7.9; terrain dirty redraw dominant; big sonar absent |
| B4 busy/deep canvas, repeat 1 | FAIL | 22.16 / 16.7 / 33.4 / 33.4 / 33.4 | 61 / 21 / 0 | 0 | Internal `frame.total` p95 6.2, `outer.frameTotal` p95 7.5: does not explain rAF |
| B4 busy/deep canvas, repeat 2 | FAIL | 21.78 / 16.7 / 33.4 / 50.1 / 100.0 | 53 / 18 / 2 | Exported 1/90 ms; cadence assertion observed 2 | `update.articulated` true max 62.7, `outer.frameTotal` max 68.4 |
| B4 busy/deep canvas, repeat 3 | FAIL | 18.14 / 16.7 / 33.3 / 33.4 / 33.4 | 20 / 6 / 0 | 0 | Best repeat still fails: 2.65% over 33.34 ms |
| B4 focused 25 s canvas | FAIL | 22.72 / 16.7 / 33.4 / 33.4 / 66.6 | 393 / 158 / 2 | 1/57 ms, total 57 ms | `frame.total` p95/p99 4.1/5.5; `outer.frameTotal` 7.0/8.5; 150 late clusters, maximum two consecutive late frames |
| Standalone mining | PASS | 16.86 / 16.7 / 16.7 / 16.8 / 50.0 | 2 / 2 / 0 | 0 | 8 mining repeats; max dirty 6 chunks/25 tiles; `draw.world` p95 0, max 4.8 |
| Perf-guardrails mining sequence | FAIL | 27.35 / 16.7 / 33.3 / 150.0 / 1216.7 | 10 / 7 / 5 | Exported 5/max 1227 ms; cadence assertion counted 10 | Internal `frame.total` p95 3.3 vs `outer.frameTotal` p95 32.9, max 1221.9 |
| Normal swim + compact sonar | PASS | 16.62 / 16.7 / 16.7 / 16.8 / 16.8 | 0 / 0 / 0 | None asserted | Compact map p95/p99/max 1.3/1.7/1.7; `draw.bigSonarMap` absent |
| Full sonar chart open/use | PASS | 16.62 / 16.7 / 16.7 / 16.8 / 16.8 | 0 / 0 / 0 | None asserted | `draw.bigSonarMap` p95/p99/max 1.1/1.8/2.1; `outer.frameTotal` p95 3.8 |
| Sonar chart close/dismiss/controller | PASS | No separate cadence segment | n/a | n/a | Functional close/dismiss and controller smoke passed; normal-state DOM has no big map |
| Save/load restore | PASS | No rAF probe in functional smoke | n/a | n/a | Save, mutate, restore, and corrupt-load checks passed; performance confidence remains limited |
| Articulated simulation budget | PASS | No rAF probe in budget smoke | n/a | n/a | Budget smoke passed; B4 repeat 2 still shows an isolated articulated 62.7 ms true max |
| B4 WebGL comparison | FAIL (blocked comparison) | No samples | n/a | n/a | Headless Chromium reported `Framebuffer status: Framebuffer Unsupported`; startup timed out |

## First-five-seconds versus settled play

The focused B4 run is especially adversarial:

| Window | Samples | avg / p50 / p95 / p99 / max (ms) | >20 / >33.34 / >50 |
|---|---:|---:|---:|
| First ~5 s | 296 | 16.95 / 16.7 / 16.8 / 33.4 / 33.4 | 5 / 3 / 0 |
| Remaining ~20 s | 808 | 24.83 / 16.8 / 33.4 / 33.5 / 66.6 | 388 / 155 / 2 |

This is the reverse of a startup-only hitch: initial B4 movement is nearly steady, then sustained traversal collapses toward alternating 16.7/33.4 ms presentation. The ordinary first-settled-swim segment is materially better (p95 16.8 ms), though it still has isolated 33.3-33.4 ms frames and internal draw maxima.

## B4 repeat variance and density

| Run | Fish | Articulated / parts | Visible fish / articulated parts | rAF p95 / p99 / max | >33.34% | Terrain contact delta | Dirty chunks max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Canvas 1 | 156 | 10 / 94 | 2 / 5 | 33.4 / 33.4 / 33.4 | 11.35% | 494,696 | 4 |
| Canvas 2 | 156 | 10 / 94 | 5 / 10 | 33.4 / 50.1 / 100.0 | 9.52% | 548,537 | 8 |
| Canvas 3 | 156 | 10 / 90 | 3 / 0 | 33.3 / 33.4 / 33.4 | 2.65% | 355,989 | 0 |

Variance is large (2.65%-11.35% late frames; 33.4-100 ms max), but no repeat passes. Repeat 2 combines the most visible articulated parts, greatest terrain-contact activity, most dirty chunks, a 90 ms long task, and the worst maximum. Threat-visible is not separately exposed by this probe.

## Comparison with prior context

- B4 improved greatly from the old p95 66.7 ms / p99 83.3 ms / 75% over 33.34 ms, but current p95 remains 33.3-33.4 ms in all repeats and the best repeat still has 2.65% late frames. This is improvement, not steady 60 fps.
- The old 1500 m diagonal p95 38.33 ms / max 53.33 ms improved to p95 33.3 ms / max 50.0 ms, but still fails 60-fps confidence. The worst current depth was 780 m (p95 33.4 ms, 10.10% over 33.34 ms), showing non-monotonic depth behavior.
- Sonar chart meets the recent ~16.7 ms p95 target when gated correctly: measured p95 16.7 ms.
- Compact minimap cost matches or slightly improves the recent 1.1-1.7 ms p95 / 2.8 ms max context: measured p95 1.3-1.4 ms and max 1.7-1.8 ms. It never invoked `draw.bigSonarMap` during normal swim.

## Build and command results

- PASS — `npm run build` (Vite build completed; unresolved-at-build asset and large-chunk warnings recorded).
- FAIL cadence — `node tools/test_loading_swim_perf_smoke.mjs` (settled internal maxima, while rAF p95 passed).
- FAIL cadence — `node tools/test_deep_diagonal_swim_perf_smoke.mjs`.
- FAIL cadence — `node tools/test_b4_busy_deep_perf_smoke.mjs`, canvas repeats 1, 2, and 3.
- FAIL environment/comparison — same B4 smoke with `WATER9_B4_RENDERER=webgl` (unsupported framebuffer in headless Chromium).
- PASS — `node tools/test_mining_perf_smoke.mjs`.
- PASS — `node tools/test_sonar_tool_overhaul_smoke.mjs`.
- PASS — `node tools/test_sonar_map_controller_smoke.mjs`.
- PASS — `node tools/test_save_load_smoke.mjs`.
- PASS — `node tools/test_articulated_sim_budget_smoke.mjs`.
- FAIL mixed — `npm run water9:perf-guardrails-smoke`: two non-framerate contact assertions failed separately, and the mining cadence also genuinely failed with the long-task/rAF evidence above.
- COMPLETE — focused custom 25-second B4 canvas probe on port 5188.

All smoke outputs were redirected under the run directory. Only ports 5180-5199 were used. No tracked dirt outside the run directory was created.

## Artifact index

Report and focused raw data:

- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/runtime-matrix.md`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/focused-b4-25s/focused-b4-25s.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/logs/focused-b4-25s.log`

JSON reports:

- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/loading/loading-swim.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/deep-diagonal/deep-diagonal.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/b4-canvas-1/b4-canvas-1.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/b4-canvas-2/b4-canvas-2.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/b4-canvas-3/b4-canvas-3.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/b4-webgl/b4-webgl.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/mining/mining.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/sonar-tool/sonar-tool.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/sonar-controller/sonar-controller.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/save-load/save-load.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/articulated/articulated.json`
- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/perf-guardrails/perf-guardrails.json`

Representative live `#game canvas` color / grayscale pairs:

- Startup/ordinary: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/loading/loading-first-settled-gameplay-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/loading/loading-first-settled-gameplay-canvas-gray.png`.
- Mid/deep diagonal: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/deep-diagonal/deep-diagonal-depth-780-end-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/deep-diagonal/deep-diagonal-depth-780-end-canvas-gray.png`; equivalent pairs exist for 360, 1140, and 1500 m in the same absolute directory.
- B4 repeat: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/b4-canvas-2/b4-busy-deep-canvas-end-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/b4-canvas-2/b4-busy-deep-canvas-end-canvas-gray.png`.
- B4 focused worst: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/focused-b4-25s/focused-b4-end-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/focused-b4-25s/focused-b4-end-canvas-gray.png`.
- Mining: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/mining/mining-after-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/mining/mining-after-canvas-gray.png`.
- Normal compact sonar: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/sonar-tool/normal-swim-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/sonar-tool/normal-swim-canvas-gray.png`.
- Full sonar chart: `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/sonar-tool/sonar-tool-open-canvas.png` and `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/artifacts/sonar-tool/sonar-tool-open-canvas-gray.png`.

Command logs are in:

- `/mnt/nxt-dev/water9/runs/water9-adversarial-performance-framerate-review-2026-07-10/logs/`

## Caveats/blockers

- Headless WebGL could not initialize its framebuffer, so the WebGL comparison is an environment failure, not evidence that WebGL gameplay is slower or faster.
- Startup rAF contains only six samples because multi-second main-thread blocks prevent callbacks; its percentile shape is indicative but too sparse for a steady-state classification.
- The save/load and articulated-budget scripts are functional/budget checks and do not expose authoritative rAF arrays.
- The perf-guardrail smoke has separate mask-aware contact failures, but those do not explain away its independent 1,216.7 ms rAF stall and 1,227 ms long task.
- Long-task count can differ between the exported perf buffer and cadence observer (B4 repeat 2: 1 exported versus 2 asserted; guardrails: 5 exported versus 10 asserted), likely because observers/buffers cover different windows. Durations quoted above come from exported entries.
- Existing unrelated git dirt and prior run artifacts were preserved.
