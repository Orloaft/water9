# Water9 Sonar Minimap Performance Restore

Status: accepted for focused sonar/minimap slice

## Summary
- Restored the ordinary-play compact `#sonar-map` HUD canvas inside the navigation panel.
- Kept the full `#big-sonar-map` chart behind the sonar tool/use flow.
- Added a cached/dirty-keyed static raster path for the HUD minimap keyed by biome, seed, reveal revision, terrain revision, player tile, radius, and size. Dynamic pings/contacts render over that cached base.
- Updated the sonar tool overhaul smoke so ordinary swim requires the compact minimap and still fails if the full chart or `draw.bigSonarMap` appears.
- Added `tools/test_sonar_minimap_performance_restore_smoke.mjs` for surface/mid/deep live `#game canvas` captures, grayscale proof, minimap readability checks, ordinary-swim `draw.bigSonarMap` absence, and sonar-tool full chart cost.

## Verification
- `npm run build`: passed.
- `WATER9_SONAR_CONTROLLER_OUT_DIR=... WATER9_SONAR_CONTROLLER_PORT=5180 node tools/test_sonar_map_controller_smoke.mjs`: passed.
- `WATER9_SONAR_TOOL_OUT_DIR=... WATER9_SONAR_TOOL_PORT=5181 node tools/test_sonar_tool_overhaul_smoke.mjs`: passed.
- `WATER9_SONAR_MINIMAP_OUT_DIR=... WATER9_SONAR_MINIMAP_PORT=5182 node tools/test_sonar_minimap_performance_restore_smoke.mjs`: passed.
- `LOADING_SWIM_PERF_OUT_DIR=... LOADING_SWIM_PERF_PORT=5183 node tools/test_loading_swim_perf_smoke.mjs`: failed on existing first-settled-swim frame pacing thresholds; JSON still showed no `draw.bigSonarMap` metric.

## Key Metrics
- Tool-overhaul ordinary swim: compact minimap present, full overlay absent, `draw.bigSonarMap` null, `draw.sonarMap` p95 1.7 ms / true max 2.8 ms.
- Tool-overhaul sonar use: full chart open, `draw.bigSonarMap` 223 samples, p95 1.2 ms / true max 2.3 ms.
- Minimap proof ordinary swim:
  - Surface 48 m: `draw.bigSonarMap` null, `draw.sonarMap` p95 1.4 ms / true max 1.6 ms.
  - Mid 426 m: `draw.bigSonarMap` null, `draw.sonarMap` p95 1.1 ms / true max 1.3 ms.
  - Deep 960 m: `draw.bigSonarMap` null, `draw.sonarMap` p95 1.3 ms / true max 1.8 ms.
- Minimap proof sonar use: `draw.bigSonarMap` 71 samples, p95 0.4 ms / true max 1.0 ms.

## Artifacts
- Main proof JSON: `runs/water9-sonar-minimap-performance-restore-2026-07-09/sonar-minimap-performance-restore-smoke.json`
- Surface/mid/deep `#game canvas` and grayscale captures: `normal-{surface,mid,deep}-game-canvas*.png`
- Surface/mid/deep minimap and grayscale captures: `normal-{surface,mid,deep}-minimap*.png`
- Full chart proof: `sonar-tool-full-chart*.png`
- Updated tool-overhaul proof: `runs/water9-sonar-minimap-performance-restore-2026-07-09/sonar-tool-overhaul/sonar-tool-overhaul-smoke.json`
- Broader perf failure JSON: `runs/water9-sonar-minimap-performance-restore-2026-07-09/loading-swim-perf/loading-swim-perf-smoke.json`
