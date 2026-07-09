# Water9 Deeper Performance Proposal - 2026-07-09

Starting commit: `89121a1`

## Baseline From Sonar Tool Overhaul Smoke

- Command: `WATER9_SONAR_TOOL_PORT=5184 WATER9_SONAR_TOOL_OUT_DIR=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09 WATER9_SONAR_TOOL_REPORT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs`
- Normal swimming: `avgFrameMs=17.38`, `p95FrameMs=16.8`, `p99FrameMs=33.4`, `framesOver50=0`.
- Normal swimming sonar work: `draw.sonarMap avgMs=0.02`, `maxMs=0.24`, and `draw.bigSonarMap=null`.
- Full sonar chart open: `avgFrameMs=52.57`, `p95FrameMs=66.7`, `p99FrameMs=66.8`, `framesOver50=37`.
- Full sonar chart drawing: `draw.bigSonarMap samples=72`, `avgMs=4.5`, `maxMs=14.92`.

The overhaul correctly removes the full sonar map from ordinary HUD work. Remaining cost is now concentrated in explicit chart mode and in deeper terrain/world redraw paths.

## Phase 1 - Big Sonar Map Redraw And Compositing

Goal: make the full sonar chart responsive without returning heavy chart work to ordinary swimming.

Proposed work:
- Split the big sonar chart into stable layers: terrain/revealed cells, grid, static landmarks, dynamic contacts/player/camera viewport, and UI chrome.
- Cache terrain/revealed-cell raster output into an offscreen canvas or retained Phaser texture keyed by biome/world id, zoom bucket, and revealed-cell revision.
- Invalidate the cached raster only when sonar reveal state changes, terrain changes, biome changes, or the zoom bucket crosses a threshold.
- Draw dynamic markers and pan transforms every frame, but redraw static map pixels at a lower frequency or only on invalidation.
- Consider chunked/tile atlas caching for the chart if full-canvas raster reuse still spikes: one offscreen tile per map chunk, dirty only when its revealed cells or terrain change.
- Consider a Web Worker plus OffscreenCanvas for static raster generation if main-thread raster cost remains visible after cache/tile invalidation.
- Keep `draw.bigSonarMap` gated behind `state.sonarMapOpen`; normal HUD must keep using the cheap nav panel.

Acceptance metrics:
- Normal swimming remains at `draw.bigSonarMap=null`, `framesOver50=0`, and `p95FrameMs<=20`.
- Open chart pan/zoom smoke gets `draw.bigSonarMap avgMs<=2.0`, `maxMs<=8.0`, `p95FrameMs<=35`, and `framesOver50` cut by at least 70% from the current 37-frame baseline.
- Visual proof still shows the chart, player marker, barge/contacts when present, pan, zoom, and close affordances.

Smoke commands:
- `npm run build`
- `WATER9_SONAR_TOOL_PORT=5184 WATER9_SONAR_TOOL_OUT_DIR=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09 WATER9_SONAR_TOOL_REPORT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs`
- `WATER9_SONAR_CONTROLLER_PORT=5199 WATER9_SONAR_CONTROLLER_OUT_DIR=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09 WATER9_SONAR_CONTROLLER_REPORT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.json WATER9_SONAR_CONTROLLER_SCREENSHOT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.png node tools/test_sonar_map_controller_smoke.mjs`

## Phase 2 - Mining And Terrain Dirty World Redraw

Goal: reduce frame cost when mining or terrain mutation dirties world visuals.

Proposed work:
- Audit all calls that mark terrain/world visuals dirty and categorize them by single tile, tile radius, chunk, and full-world invalidation.
- Replace full redraw paths after mining with chunk or dirty-region invalidation where the visual output only depends on nearby terrain.
- Coalesce repeated tile mutations during a single mining action into one dirty-region update before drawing.
- Keep terrain mask/contact updates bounded to touched chunks, with neighbor chunk expansion only for edge tiles.
- Track dirty chunk count, dirty tile count, mutation reason, and elapsed redraw time in perf telemetry.
- Preserve correctness for special rooms, loose items, ores, props, nav collision, and sonar reveal interactions after mined terrain changes.

Acceptance metrics:
- A repeated mining smoke has `draw.world maxMs<=4.0` during mutation bursts and no visible stale terrain after each mined tile.
- Dirty chunk count during a single drill action stays within the touched chunk plus immediate neighbors unless the action truly changes a wider radius.
- No regression in ore pickup/floating text, mining cooldown, terrain collision, or sonar revealed-cell updates.

Smoke commands:
- `npm run build`
- Existing focused mining/controller coverage: `WATER9_SONAR_CONTROLLER_PORT=5199 WATER9_SONAR_CONTROLLER_OUT_DIR=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09 WATER9_SONAR_CONTROLLER_REPORT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.json WATER9_SONAR_CONTROLLER_SCREENSHOT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.png node tools/test_sonar_map_controller_smoke.mjs`
- Add or extend a mining perf smoke that drills a fixed tunnel, records `draw.world`, dirty chunk counts, terrain mutations, and screenshots before/after each burst.

## Phase 3 - Deep Diagonal-Swim Instrumentation

Goal: identify remaining deep-swim hitch causes with frame-level correlation instead of coarse averages.

Proposed work:
- Add a per-frame perf ring buffer in playtest/perf mode with rAF delta, update/draw totals, camera position, player velocity, world-view bounds, chunk counts, visible fish/articulated counts, terrain dirty state, and sonar map state.
- Add Long Task API sampling where available and include long-task duration/start time in the ring buffer export.
- Correlate rAF delta spikes with camera/world-view deltas, newly visible chunks, terrain dirty events, fish/articulated update counts, and background/parallax redraw cost.
- Create a deterministic deep diagonal-swim smoke that teleports to several depth bands, swims down-right/up-left for fixed windows, and exports screenshots plus the worst frame windows.
- Preserve perf overhead gating behind `?perf=1` or playtest-only flags so production mode does not pay for the ring buffer.

Acceptance metrics:
- Deep diagonal-swim smoke exports a compact JSON with worst 20 frames, nearby perf metrics, camera deltas, dirty reasons, and long-task entries.
- Normal perf mode overhead from instrumentation stays below `0.25ms` average per frame.
- The smoke identifies whether hitches are dominated by world-view changes, terrain dirty redraw, entity update volume, asset upload, or chart overlay work.

Smoke commands:
- `npm run build`
- Add `node tools/test_deep_diagonal_swim_perf_smoke.mjs` with configurable port in `5180-5199`.
- Optional comparison run: `npm run water9:loading-swim-perf-smoke` if the current dirty perf-smoke work is retained by its owner.
