# Water9 Adversarial 60fps Appraisal - 2026-07-09

Starting commit: `89121a1`

Status: completed

## Verdict

Water9 is not steady 60fps under adversarial normal-play coverage: straight shallow/mid/deep swim was mostly steady, but sustained deep diagonal swim hit 33ms p95 frames, sonar-map pan/open gameplay collapsed to 100ms p95 / 116.6ms p99, and terrain-dirty mining hit 50ms p95 / 66.8ms p99.

## Raw Artifacts

- `adversarial_60fps_appraisal.mjs` - one-off Playwright appraisal harness.
- `adversarial-60fps-results.json` - raw rAF deltas, scenario metadata, before/after snapshots, and metric deltas.
- `perf-guardrails-smoke.json` - existing guardrail smoke output.
- `worker-report.md` - this report.

## Method

- Dev server: Vite on `127.0.0.1:5180`, within the requested 5180-5199 range.
- Browser: headless Chromium through Playwright.
- Viewport: `1280x800`, device scale factor `1`.
- Renderer path: normal app `#game canvas` gameplay; the harness verified canvas presence per scenario.
- Setup: fresh page per scenario at `?playtest=1&biome=N&perf=1&perfHud=0`; used `window.__AQUA_PLAYTEST__` for start/dive/refill/teleport/staging and keyboard events for movement.
- Measurements: browser rAF frame deltas during scenario action plus Water9 perf snapshots before/after. Water9 perf metrics are cumulative per fresh page; the report uses after-values plus sample deltas.

Note: the `>16.67ms` bucket is sensitive to Chromium timer quantization because many healthy 60Hz frames report around `16.7ms`. The stronger signal is p95/p99 plus `>20ms`, `>33.34ms`, and `>50ms`.

## Scenario Results

Metric format in the final column is `avg/max ms` unless otherwise noted.

| Scenario | URL / viewport / duration | Movement | rAF samples | avg | p50 | p95 | p99 | max | >16.67 | >20 | >33.34 | >50 | Key telemetry after |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| shallow-settled-baseline | `:5180`, `1280x800`, `9000ms` | idle after start, dive, reachable shallow teleport, overlays closed | 535 | 16.82 | 16.7 | 16.8 | 16.8 | 33.4 | 336 (62.8%) | 6 (1.12%) | 2 (0.37%) | 0 (0%) | frame 4.65/11.42; update 3.72/11.16; draw 0.45/0.82; world 0/0.08; update.fish 3.34/11.06; draw.bigSonarMap none; terrainMut 40; props 0 processed / 1 full scan; entities f217/art2p16 |
| shallow-continuous-swim | `:5180`, `1280x800`, `10000ms` | ArrowRight, ArrowDown, ArrowLeft, ArrowUp loop | 600 | 16.67 | 16.7 | 16.8 | 16.8 | 33.4 | 366 (61%) | 1 (0.17%) | 1 (0.17%) | 0 (0%) | frame 4.17/5.34; update 3.15/4.77; draw 0.58/0.98; world 0.21/0.86; update.fish 2.81/4.57; draw.bigSonarMap none; terrainMut 267; props 0/1; entities f217/art2p16 |
| mid-depth-continuous-swim | `:5180`, `1280x800`, `10000ms` | ArrowRight/Down/Left/Up at biome 2 mid-depth | 596 | 16.79 | 16.7 | 16.8 | 16.8 | 33.4 | 370 (62.08%) | 6 (1.01%) | 3 (0.5%) | 0 (0%) | frame 4.31/8.41; update 3.16/6.14; draw 0.69/4.3; world 0.28/4.07; update.fish 2.54/5.53; draw.bigSonarMap none; terrainMut 8; props 0/1; entities f197/art8p52 |
| deep-continuous-swim | `:5180`, `1280x800`, `10000ms` | ArrowRight/Down/Left/Up at biome 3 deep water | 598 | 16.75 | 16.7 | 16.7 | 16.8 | 33.4 | 373 (62.37%) | 4 (0.67%) | 1 (0.17%) | 0 (0%) | frame 4.42/7.78; update 3.05/3.48; draw 0.88/5.38; world 0.46/5.19; update.fish 2.38/2.94; draw.bigSonarMap none; terrainMut 20; props 0/1; entities f157/art9p77 |
| deep-diagonal-multikey-swim | `:5180`, `1280x800`, `10000ms` | sustained diagonal combinations | 568 | 17.61 | 16.7 | 33.2 | 33.4 | 50 | 365 (64.26%) | 31 (5.46%) | 12 (2.11%) | 0 (0%) | frame 5.59/9.75; update 3.21/3.81; draw 1.91/6.62; world 1.42/6.34; update.fish 2.52/2.99; draw.bigSonarMap none; terrainMut 2; props 0/1; entities f157/art9p77 |
| sonar-closed-normal-swim | `:5180`, `1280x800`, `9000ms` | sonar map closed; ArrowRight/Left swim | 531 | 16.98 | 16.7 | 16.8 | 33.3 | 33.4 | 325 (61.21%) | 11 (2.07%) | 2 (0.38%) | 0 (0%) | frame 4.01/12.36; update 3.02/10.22; draw 0.53/2.96; world 0.13/2.83; update.fish 2.46/9.84; draw.bigSonarMap none; terrainMut 4; props 0/1; entities f197/art8p52 |
| sonar-map-open-pan-after-movement | `:5180`, `1280x800`, `9000ms` | move briefly, press `M`, hold pan/zoom keys | 187 | 48.27 | 50 | 100 | 116.6 | 116.7 | 163 (87.17%) | 125 (66.84%) | 121 (64.71%) | 74 (39.57%) | frame 5.89/18.12; update 3.18/4.98; draw 1.21/11.13; world 0.57/10.13; update.fish 2.55/2.92; draw.sonarMap 5.91/18.4 n209; draw.bigSonarMap 6.18/17.29 n126; terrainMut 0; props 0/1; entities f197/art8p52 |
| mining-terrain-dirty-movement | `:5180`, `1280x800`, `9000ms` | `terrainMiningReview`, repeated `terrainMineAt` while holding ArrowRight | 408 | 22.07 | 16.7 | 50 | 66.8 | 100 | 296 (72.55%) | 88 (21.57%) | 45 (11.03%) | 12 (2.94%) | frame 3.76/28.23; update 0.32/2; draw 2.63/25.41; world 1.96/24.73; update.fish 0.01/0.79; draw.bigSonarMap none; terrainMut 1652; props 9/2; entities f0/art0p0 |
| busy-high-entity-deep-area | `:5180`, `1280x800`, `10000ms` | biome 3 natural deep area with diagonal swim | 588 | 17.02 | 16.7 | 16.8 | 33.4 | 33.4 | 359 (61.05%) | 14 (2.38%) | 8 (1.36%) | 0 (0%) | frame 4.54/5.52; update 3.08/3.75; draw 0.98/3.54; world 0.52/3.2; update.fish 2.41/3.11; draw.bigSonarMap none; terrainMut 24; props 0/1; entities f157/art9p77 |

## Culprit Analysis

1. Big sonar map redraws are the strongest concrete culprit.
   - Closed-map scenarios recorded `draw.bigSonarMap none`, including `sonar-closed-normal-swim`, so the previous hidden-map skip appears effective.
   - Open sonar-map pan after movement recorded `draw.bigSonarMap` 126 samples at `6.18ms avg / 17.29ms max` and `draw.sonarMap` `5.91ms avg / 18.4ms max`.
   - Browser rAF collapsed at the same time: 187 samples over 9s, `p50 50ms`, `p95 100ms`, `p99 116.6ms`, `74` frames over 50ms (`39.57%`).
   - Water9 `frame.total` only reached `18.12ms max`, so the largest rAF gaps likely include browser canvas/DOM compositing and the synchronous 2D canvas sonar-map work, not just Phaser update time.

2. Terrain-dirty mining redraw is the second concrete culprit.
   - Mining/terrain-dirty movement had no fish/articulated load, but rAF still degraded to `p95 50ms`, `p99 66.8ms`, `max 100ms`, with `45` frames over 33.34ms and `12` over 50ms.
   - Water9 telemetry points at drawing, not update: `draw.total 2.63ms avg / 25.41ms max`, `draw.world 1.96ms avg / 24.73ms max`, while `update.total` was only `0.32ms avg / 2ms max`.
   - The scenario caused `terrainMaskMutations 1652` and local prop refresh activity (`processed 9`, `fullScans 2` after the staged world). The existing guardrails smoke confirmed repeated local refreshes did not full-scan during its mining loop (`fullScansDuringRepeatedMining 0`, `processedLocalRefreshes 8`), but it still showed `draw.world 15.52ms max` with `chunks: 324` in that smoke.

3. Sustained deep diagonal swim has real but less-attributed hitches.
   - Deep diagonal swim had `p95 33.2ms`, `p99 33.4ms`, `12` frames over 33.34ms, and `31` over 20ms.
   - Water9 telemetry was not individually over budget: `frame.total 5.59ms avg / 9.75ms max`, `update.total 3.21/3.81`, `draw.total 1.91/6.62`, `draw.world 1.42/6.34`.
   - That makes the culprit less certain. The best evidence is mild draw/world increase versus deep straight swim (`draw.world 1.42/6.34` vs `0.46/5.19`) and normal entity update costs. Extra instrumentation around camera movement, browser canvas presentation, and per-frame long-task timing would be needed to pin this down.

4. Fish/articulated density is not the observed bottleneck in these runs.
   - Mid/deep/busy cases had hundreds of fish and up to `9` articulated creatures / `77` parts.
   - `update.fish` stayed roughly `2.38-2.54ms avg` in deep scenarios and `update.articulated` stayed `0.28-0.36ms avg`.
   - The busy high-entity deep area was mostly steady (`p95 16.8ms`, `p99 33.4ms`, no >50ms frames), so entity count alone did not reproduce Alex's reported drops.

## Startup / Worldgen Separation

World generation was intentionally excluded from the scenario rAF windows by waiting for `world.ready !== false` and inactive biome loading before measurement. Raw perf snapshots still contain `worldgen.total` from page setup, with multi-second single samples; those are startup/worldgen costs and not part of the gameplay verdict.

## Checks

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`: passed, `89121a1`.
- `npm run build`: passed. Vite emitted existing warnings about unresolved `/assets/generated/...` CSS URLs and chunk size over 500KB.
- `node runs/water9-adversarial-60fps-appraisal-2026-07-09/adversarial_60fps_appraisal.mjs`: completed 9 scenarios; 4 were not steady by p95/p99/long-frame threshold.
- `PERF_GUARDRAIL_OUT_DIR=... PERF_GUARDRAIL_REPORT=... PERF_GUARDRAIL_PORT=5189 npm run water9:perf-guardrails-smoke`: failed on `submarine mask-aware terrain collision did not register`; JSON saved and used as a caveat. Other relevant guardrail facts: `processedLocalRefreshes 8`, `fullScansDuringRepeatedMining 0`, `articulatedContact.count 8`, `draw.world max 15.52ms`.

## Caveats / Needed Instrumentation

- Headless Chromium rAF timing can show quantized `16.7/33.4/50ms` buckets. The severe sonar and mining cases are large enough to be actionable despite this; the diagonal-swim case needs confirmation in headed/local gameplay.
- Existing Water9 perf telemetry records aggregate `avg/max/last`, not per-frame correlated spans. To assign every rAF long frame to a Water9 subsystem, add a perf ring buffer with frame index, rAF delta, `frame.total`, `update.total`, `draw.total`, and child spans for that same frame.
- For the diagonal-swim outlier, add browser Long Task API capture and a per-frame camera/world-view delta to determine whether canvas presentation, camera scroll invalidation, or unmeasured DOM/HUD work is causing the 33ms rAF buckets.
- The existing perf guardrails smoke has a known submarine terrain-collision assertion failure in this checkout; this appraisal did not fix or mask it.

## Changed Files

- Added `runs/water9-adversarial-60fps-appraisal-2026-07-09/adversarial_60fps_appraisal.mjs`.
- Added `runs/water9-adversarial-60fps-appraisal-2026-07-09/adversarial-60fps-results.json`.
- Added `runs/water9-adversarial-60fps-appraisal-2026-07-09/perf-guardrails-smoke.json`.
- Added/updated `runs/water9-adversarial-60fps-appraisal-2026-07-09/worker-report.md`.

No source gameplay fixes were made, nothing was staged, and unrelated dirty state was preserved.
