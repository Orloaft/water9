# Water9 adversarial 60fps postfix review

Starting commit: `815c551`

Verdict: **not steady overall**. Ordinary shallow/mid/deep swim, mining, and sonar-open use are mostly at 60fps after the fixes, but adversarial gameplay still exposes hidden slowdowns: B4 busy/deep entity gameplay ran at rAF p95 `66.7ms`, focused 1500m diagonal swim still hit p95 `38.33ms`/max `53.33ms`, and one broad sonar-closed swim sample showed an intermittent p95 `33.4ms`.

## Verification

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `815c551`
- `npm run build` -> passed. Existing Vite warnings only: unresolved generated asset URLs at build time and a >500 kB chunk warning.
- Broad adversarial harness: `WATER9_ADVERSARIAL_PORT=5185 node runs/water9-adversarial-60fps-postfix-review-2026-07-09/adversarial-60fps-appraisal.mjs` -> passed, wrote `adversarial-60fps-appraisal.json`.
- `WATER9_SONAR_TOOL_PORT=5184 ... node tools/test_sonar_tool_overhaul_smoke.mjs` -> passed.
- `WATER9_MINING_PERF_PORT=5186 ... node tools/test_mining_perf_smoke.mjs` -> passed.
- `WATER9_DEEP_SWIM_PORT=5187 ... node tools/test_deep_diagonal_swim_perf_smoke.mjs` -> passed assertions, but recorded a 1500m hitch.
- `PERF_GUARDRAIL_PORT=5189 ... npm run water9:perf-guardrails-smoke` -> first run timed out waiting for playtest readiness; rerun reached the known caveat and failed `submarine mask-aware terrain collision did not register`. The useful rerun is stored as `perf-guardrails-smoke.json`; the first timeout is preserved as `perf-guardrails-smoke-first-timeout.json`.

## Broad Scenario Numbers

Viewport was `1280x800`, live Vite URL was `http://127.0.0.1:5185`, and all captures are from `#game canvas`.

| Scenario | Duration/input | rAF samples | avg | p50 | p95 | p99 | max | >16.67ms | >20ms | >33.34ms | >50ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| loading/start transition | click Start, wait ready, dismiss radio, dive | 61 | `262.42` | `33.4` | `50.1` | `13832.8` | `13832.8` | `56 (91.8%)` | `51 (83.61%)` | `31 (50.82%)` | `6 (9.84%)` |
| settled shallow baseline | 180m, no keys | 253 | `16.6` | `16.7` | `16.8` | `16.8` | `16.8` | `148 (58.5%)` | `0 (0%)` | `0 (0%)` | `0 (0%)` |
| shallow continuous swim | 180m, hold ArrowRight | 277 | `16.63` | `16.7` | `16.8` | `16.8` | `16.8` | `170 (61.37%)` | `0 (0%)` | `0 (0%)` | `0 (0%)` |
| mid-depth continuous swim | 780m, hold ArrowRight | 277 | `16.61` | `16.7` | `16.8` | `16.8` | `16.8` | `171 (61.73%)` | `0 (0%)` | `0 (0%)` | `0 (0%)` |
| deep continuous swim | 1500m, hold ArrowRight | 277 | `16.62` | `16.7` | `16.8` | `16.8` | `16.8` | `166 (59.93%)` | `0 (0%)` | `0 (0%)` | `0 (0%)` |
| deep diagonal multikey swim | 1500m, hold ArrowRight+ArrowDown | 313 | `16.62` | `16.7` | `16.8` | `16.8` | `16.8` | `191 (61.02%)` | `0 (0%)` | `0 (0%)` | `0 (0%)` |
| sonar/minimap closed normal swim | 420m, drill, chart closed, hold ArrowRight | 232 | `19.9` | `16.7` | `33.4` | `33.4` | `33.5` | `160 (68.97%)` | `45 (19.4%)` | `15 (6.47%)` | `0 (0%)` |
| sonar chart open after movement | 420m, move, select sonar, open chart, pan/use | 337 | `16.64` | `16.7` | `16.7` | `16.8` | `16.8` | `211 (62.61%)` | `0 (0%)` | `0 (0%)` | `0 (0%)` |
| mining/terrain-dirty movement | staged terrain, mine repeats=10, hold ArrowRight | 300 | `16.69` | `16.7` | `16.8` | `16.8` | `33.3` | `188 (62.67%)` | `1 (0.33%)` | `0 (0%)` | `0 (0%)` |
| B4 busy/high-entity deep area | biome=4, deep/articulated area, hold ArrowRight+ArrowDown | 108 | `48.76` | `50` | `66.7` | `83.3` | `83.4` | `108 (100%)` | `107 (99.07%)` | `81 (75%)` | `32 (29.63%)` |

Full avg/p50 and raw per-frame deltas are in `adversarial-60fps-appraisal.json`.

## Focused Smoke Cross-Checks

- Sonar tool smoke: normal swim p95 `16.7ms`, p99 `16.8ms`, max `16.8ms`; sonar-use p95 `16.7ms`, p99 `16.8ms`, max `16.8ms`; `draw.bigSonarMap` absent during normal swim and max `2.58ms` while chart was open. This is much better than the previous `89121a1` sonar chart p95 `100ms`.
- Mining perf smoke: passed; `draw.world` max `3.34ms`, max dirty chunks `6`, max dirty tiles `25`. The broad mining scenario was p95 `16.8ms`, max `33.3ms`, much better than previous mining p95 `50ms`.
- Deep diagonal focused smoke: passed assertions, but depth band `1500m` still showed avg `21.56ms`, p95 `38.33ms`, max `53.33ms`, one frame over 50ms, dominant cause score `terrainDirtyRedraw`, `draw.world.maxMs=8.3`, `update.total.maxMs=5.15`. This is not a clean improvement over the previous p95 `33.2ms`; the broad harness did not reproduce it in its own 1500m diagonal pass.
- Perf guardrail rerun: local refreshes processed `8`, full scans `0`; failed only the known submarine mask-aware terrain collision assertion. Guardrail telemetry had `draw.world.maxMs=15.23ms`, `frame.total.maxMs=16.43ms`.

## Culprit Analysis

The strongest remaining gameplay failure is the B4 busy/deep entity scene. Its rAF p95 was `66.7ms` and Water9 perf-frame p95 was `63.34ms`, so this is not only an external sampler artifact. Terrain was not dirty (`0` dirty chunks/tiles), sonar was closed, and `draw.world.maxMs` was only `2.75ms`. The frame buffer saw up to `2` visible articulated creatures / `17` visible articulated parts, while measured global simulation context was `update.fish count=156 max=6.34ms` and `update.articulated count=10 parts=94 max=7.74ms`. The Long Task API reported repeated `self` long tasks in the `53-73ms` range, but `frame.total.maxMs` was only `16.61ms`, so either non-instrumented main-thread work is happening outside `frame.total` or the current frame timing instrumentation is not enclosing the real stalled work.

Likely culprits to investigate next:

- B4 global entity simulation and/or articulated simulation load: largest measured slices in the busy scene are `update.fish` and `update.articulated`.
- Non-instrumented main-thread work in the busy scene: repeated Long Task API `self` tasks exceed the measured `frame.total`, so add telemetry around the Phaser step boundary, timers/events, camera/sonar reveal work, and any per-frame allocations/GC-sensitive work outside `measurePerf('frame.total')`.
- Deep 1500m diagonal terrain/cache path: focused smoke still reports p95 `38.33ms`, max `53.33ms`, with `draw.world.maxMs=8.3` and terrain-dirty cause scoring. This is a named residual outlier even though the broader diagonal run was steady.
- Sonar closed normal swim needs a repeatable repro: broad harness saw p95 `33.4ms`, but the focused sonar smoke saw p95 `16.7ms` and no `draw.bigSonarMap` while closed. Treat this as intermittent/headless scheduling or test-order sensitive until reproduced.

Startup/worldgen is separate from gameplay: the start transition had one `13832.8ms` rAF gap and p95 `50.1ms`, but that includes load/start/world readiness and should not be mixed into steady gameplay verdicts.

## Artifacts

- `runs/water9-adversarial-60fps-postfix-review-2026-07-09/adversarial-60fps-appraisal.json`
- `runs/water9-adversarial-60fps-postfix-review-2026-07-09/sonar-tool-overhaul-smoke.json`
- `runs/water9-adversarial-60fps-postfix-review-2026-07-09/mining-perf-smoke.json`
- `runs/water9-adversarial-60fps-postfix-review-2026-07-09/deep-diagonal-swim-perf-smoke.json`
- `runs/water9-adversarial-60fps-postfix-review-2026-07-09/perf-guardrails-smoke.json`
- `runs/water9-adversarial-60fps-postfix-review-2026-07-09/perf-guardrails-smoke-first-timeout.json`
- Representative color/grayscale canvas captures: `settled-shallow-baseline-canvas(.png/-gray.png)`, `mid-depth-continuous-swim-canvas(.png/-gray.png)`, `deep-diagonal-multikey-swim-canvas(.png/-gray.png)`, `sonar-chart-open-after-movement-canvas(.png/-gray.png)`, `mining-terrain-dirty-movement-canvas(.png/-gray.png)`, `busy-high-entity-deep-area-canvas(.png/-gray.png)`, plus focused smoke screenshots.

## Worktree Safety

No gameplay/source files were edited. Created measurement-only files under `runs/water9-adversarial-60fps-postfix-review-2026-07-09/`.
