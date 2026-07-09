# Water9 Deeper Performance Implementation - 2026-07-09

Starting commit: `f38f93e`

Status: implemented and verified, with one remaining chart-frame caveat.

## Initial Worktree

- `?? runs/water9-deeper-performance-implementation-2026-07-09.md`
- `?? runs/water9-deeper-performance-implementation-2026-07-09.prompt.md`

These pre-existing untracked prompt files were present before edits and were preserved.

## Implementation Summary

- Big sonar chart now keeps full-map work gated behind the explicit chart/tool state.
- Static chart terrain/grid/revealed-cell pixels are cached in a retained offscreen canvas keyed by biome, seed, sonar reveal revision, terrain revision, canvas size, and zoom bucket.
- Dynamic chart player/contact/barge markers are composited every draw over the cached static raster.
- Sonar reveal revision now increments on reveal changes, world generation, biome changes, reset, story smoke setup, and load.
- Terrain mutations now carry a terrain revision and dirty tile/chunk telemetry.
- Mining and dynamite mutations are coalesced through terrain mutation batches before visual dirty chunks are flushed.
- Terrain mask brush/tile sync paths mark bounded dirty regions instead of leaving only an opaque full redraw reason.
- Perf mode now records a per-frame ring buffer with rAF delta, update/draw last times, camera/world view, player velocity, cached/dirty chunk counts, visible fish/articulated counts, terrain dirty state, sonar state, and Long Task API samples when available.
- Added focused mining and deep diagonal-swim smokes.

## Dirty Invalidation Audit

- Single tile: `setTile`, `breakTile`, `clearTerrainMaskTile`; now marks the changed tile and neighbor visual chunks.
- Radius: `syncTerrainMaskTile` and `subtractTerrainMaskBrush`; now mark bounded tile regions around the synced tile or brush bounds.
- Chunk: `markTerrainVisualDirty` expands tile dirt to nearby terrain visual chunks and batches repeated calls.
- Full world: world generation, terrain mask rebuild, reset/start/load, and biome transition still clear or invalidate whole terrain visuals because the backing world/mask changes globally.

## Key Metrics

- Normal swim: `p95FrameMs=16.7`, `framesOver50=0`, `draw.bigSonarMap=null`.
- Sonar chart: `draw.bigSonarMap avgMs=0.59`, `maxMs=5.16` after caching, down from the 4.5 avg / 14.92 max baseline.
- Sonar chart frame pacing in the existing smoke is still `p95FrameMs=66.7`, `framesOver50=36`; the remaining hitch is no longer dominated by `draw.bigSonarMap`.
- Mining: `draw.world avgMs=0.01`, `maxMs=3.17`; max dirty chunks `6`, max dirty tiles `24`.
- Deep diagonal swim: worst sampled frame `18.33ms`, `framesOver50=0`; dominant measured cause was world-view changes across the sampled depth bands.

## Verification Commands

- `npm run build` -> passed. Existing asset runtime-resolution and large-chunk warnings only.
- `WATER9_SONAR_TOOL_PORT=5184 WATER9_SONAR_TOOL_OUT_DIR=runs/water9-deeper-performance-implementation-2026-07-09 WATER9_SONAR_TOOL_REPORT=runs/water9-deeper-performance-implementation-2026-07-09/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs` -> passed.
- `WATER9_SONAR_CONTROLLER_PORT=5199 WATER9_SONAR_CONTROLLER_OUT_DIR=runs/water9-deeper-performance-implementation-2026-07-09 WATER9_SONAR_CONTROLLER_REPORT=runs/water9-deeper-performance-implementation-2026-07-09/sonar-map-controller-smoke.json WATER9_SONAR_CONTROLLER_SCREENSHOT=runs/water9-deeper-performance-implementation-2026-07-09/sonar-map-controller-smoke.png node tools/test_sonar_map_controller_smoke.mjs` -> passed.
- `WATER9_MINING_PERF_PORT=5186 WATER9_MINING_PERF_OUT_DIR=runs/water9-deeper-performance-implementation-2026-07-09 WATER9_MINING_PERF_REPORT=runs/water9-deeper-performance-implementation-2026-07-09/mining-perf-smoke.json node tools/test_mining_perf_smoke.mjs` -> passed.
- `WATER9_DEEP_SWIM_PORT=5187 WATER9_DEEP_SWIM_OUT_DIR=runs/water9-deeper-performance-implementation-2026-07-09 WATER9_DEEP_SWIM_REPORT=runs/water9-deeper-performance-implementation-2026-07-09/deep-diagonal-swim-perf-smoke.json node tools/test_deep_diagonal_swim_perf_smoke.mjs` -> passed.
- `PERF_GUARDRAIL_PORT=5191 PERF_GUARDRAIL_OUT_DIR=runs/water9-deeper-performance-implementation-2026-07-09 PERF_GUARDRAIL_REPORT=runs/water9-deeper-performance-implementation-2026-07-09/perf-guardrails-smoke.json node tools/test_perf_guardrails.mjs` -> failed on existing assertion: `submarine mask-aware terrain collision did not register`.

## Evidence

- `runs/water9-deeper-performance-implementation-2026-07-09/sonar-tool-overhaul-smoke.json`
- `runs/water9-deeper-performance-implementation-2026-07-09/sonar-map-controller-smoke.json`
- `runs/water9-deeper-performance-implementation-2026-07-09/mining-perf-smoke.json`
- `runs/water9-deeper-performance-implementation-2026-07-09/deep-diagonal-swim-perf-smoke.json`
- `runs/water9-deeper-performance-implementation-2026-07-09/perf-guardrails-smoke.json`

## Visual Proof

- `normal-swim-canvas.png` / `normal-swim-canvas-gray.png`
- `sonar-tool-open-canvas.png` / `sonar-tool-open-canvas-gray.png`
- `sonar-tool-open-overlay.png`
- `mining-before-canvas.png` / `mining-before-canvas-gray.png`
- `mining-after-canvas.png` / `mining-after-canvas-gray.png`
- `deep-diagonal-depth-360-start-canvas.png` / `deep-diagonal-depth-360-end-canvas.png`
- `deep-diagonal-depth-780-start-canvas.png` / `deep-diagonal-depth-780-end-canvas.png`
- `deep-diagonal-depth-1140-start-canvas.png` / `deep-diagonal-depth-1140-end-canvas.png`
- `deep-diagonal-depth-1500-start-canvas.png` / `deep-diagonal-depth-1500-end-canvas.png`

Grayscale pairs were written for all canvas captures above.

## Caveats

- The explicit chart smoke still reports high rAF frame deltas even though `draw.bigSonarMap` now meets the requested avg/max targets. The next likely step is measuring browser compositing/layout around the full DOM overlay, or moving the chart surface into the Phaser/WebGL scene so the smoke can separate canvas compositing from chart raster work.
- The broader perf guardrail smoke is blocked by `submarine mask-aware terrain collision did not register`; focused mining, sonar, and deep swim smokes passed.
