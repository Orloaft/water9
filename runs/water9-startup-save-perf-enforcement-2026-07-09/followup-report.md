# Water9 startup/save perf enforcement follow-up report

- Start: 2026-07-09
- Starting HEAD: 05b2c12
- Status: not accepted; proof/coverage fixes landed, but strict startup/save-load and band draw thresholds still fail.

## Notes

- Preflight passed: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `05b2c12`.
- Follow-up artifacts go under `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/`.
- Changed code:
  - `tools/test_save_load_perf_smoke.mjs`: fail if restore does not reach live gameplay, clear blocking radio/title UI, capture restored gameplay without a post-load teleport.
  - `src/scene.ts`: route early UI draw paths through `draw.total` instrumentation so sonar/map/dialogue/paused paths are covered.
  - `src/scene-worldgen.ts`: batch terrain-flora environment prop cleanup per patch instead of filtering per individual flora.

## Verification

- PASS `npm run build`.
- FAIL `LOADING_SWIM_PERF_OUT_DIR=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/loading-final LOADING_SWIM_PERF_REPORT=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/loading-final/loading-swim-perf-smoke.json LOADING_SWIM_PERF_PORT=5183 npm run water9:loading-swim-perf-smoke`
  - startup rAF samples 9, avg 204.18ms, p95/max 1000ms; world did not reach non-loading ready state within the smoke window.
  - first settled swim rAF avg 18.98ms, p95 33.3ms, p99 33.4ms, max 49.9ms, over33 4.53%.
  - `draw.total` avg 1.17ms, p95 6.5ms, p99 11.3ms, trueMax 16.6ms.
- PASS `WATER9_SAVE_LOAD_OUT_DIR=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-functional WATER9_SAVE_LOAD_REPORT=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-functional/save-load-smoke.json WATER9_SAVE_LOAD_PORT=5192 npm run water9:save-load-smoke`.
- FAIL `WATER9_SAVE_LOAD_PERF_OUT_DIR=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final WATER9_SAVE_LOAD_PERF_REPORT=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-perf-smoke.json WATER9_SAVE_LOAD_PERF_PORT=5193 npm run water9:save-load-perf-smoke`
  - restore transition rAF avg 155.55ms, p50 33.3ms, p95 516.7ms, p99/max 2083.3ms.
  - Long Task max 2086ms.
  - restore top trueMax metrics: `worldgen.total` 9164.1ms, `outer.frameTotal` 2059.6ms, `outer.step` 2058.8ms, `worldgen.floraSpecies` 1433.7ms, `worldgen.fishSpecies` 489.5ms, `worldgen.brushFlora` 314.3ms, `worldgen.stampFlora` 263.1ms, `worldgen.specialRooms` 149.1ms.
  - after-restore settled swim rAF is clean enough, but draw still fails: rAF avg 16.67ms, p95 16.8ms, p99 16.8ms, max 33.3ms; `draw.total` avg 1.01ms, p95 4ms, p99 11.4ms, trueMax 16.5ms.
- PASS direct sonar tool smoke: `WATER9_SONAR_TOOL_OUT_DIR=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/sonar-tool WATER9_SONAR_TOOL_REPORT=runs/water9-startup-save-perf-enforcement-2026-07-09/followup/sonar-tool/sonar-tool-overhaul-smoke.json WATER9_SONAR_TOOL_PORT=5195 node tools/test_sonar_tool_overhaul_smoke.mjs`.
- FAIL B4 repeats under enforcement:
  - repeat 1: rAF p95 33.3ms, p99 33.4ms, max 49.9ms, over33 1.3%; `draw.total` trueMax 12.9ms; classified `update-bound-or-entity-bound`, no Long Tasks.
  - repeat 2: rAF p95 33.4ms, p99 33.4ms, max 33.4ms, over33 14.29%; `draw.total` p95 6.5ms, trueMax 7.9ms; no Long Tasks.
  - repeat 3: samples 145 below 180, rAF p95 33.5ms, p99 50ms, max 50.1ms, over33 31.03%; `draw.total` p95 5.9ms, trueMax 8.3ms; no Long Tasks.
- FAIL deep diagonal: rAF mostly passes, but `draw.total` still exceeds the shared 8ms max at every checked depth: 360m trueMax 12.1ms, 780m 11.2ms, 1140m 16ms, 1500m 13.8ms.
- FAIL mining: rAF clean and no Long Tasks, but `draw.total` trueMax 9.3ms exceeds 8ms after terrain invalidation.
- FAIL perf guardrails: cadence guard still fails as intended, but articulated and submarine mask-aware terrain contacts did not register; the guardrail script ignored the requested report env and wrote its default path.

## Before/After

- Prior accepted-baseline candidate after `05b2c12`: startup improved to rAF max 966.7ms but loading smoke still failed `draw.total` trueMax 11.6ms; save/load restore improved to rAF max 1166.6ms and Long Task max 1169ms, but visual proof showed the title screen.
- This follow-up: save/load visual proof now shows live restored gameplay and fails if it does not; UI-path draw instrumentation covers sonar/map/dialogue/paused paths. Performance is not accepted: loading startup regressed/varied to rAF max 1000ms and `draw.total` trueMax 16.6ms; save/load restore rAF max 2083.3ms and Long Task max 2086ms.

## Visual proof

- Loading:
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/loading-final/loading-first-settled-gameplay-canvas.png`
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/loading-final/loading-first-settled-gameplay-canvas-gray.png`
- Save/load restored gameplay:
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-before-save-canvas.png`
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-before-save-canvas-gray.png`
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-after-restore-canvas.png`
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-after-restore-canvas-gray.png`
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-after-settled-swim-canvas.png`
  - `runs/water9-startup-save-perf-enforcement-2026-07-09/followup/save-load-perf-final/save-load-after-settled-swim-canvas-gray.png`
- Save/load report confirms `gameplayProof: true`, `started: true`, `atBoat: false`, `docked: false` for after-restore and after-settled captures.

## Caveats

- Remaining restore stall is dominated by synchronous scene/world regeneration during load/restart. The next target should avoid or split the restore-time full scene restart path and further chunk/carry cached work for `worldgen.floraSpecies`, fish placement, brush/stamp flora, and special rooms.
- Settled gameplay rAF can be clean while `draw.total` trueMax still fails. The next target should isolate the terrain redraw/invalidation spikes in B4, deep diagonal, mining, and restored swim rather than weakening the shared helper.
- Perf guardrail terrain contact failures remain separate from the startup/save-load work and should be fixed before accepting the guardrail suite as healthy.
