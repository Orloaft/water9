# Water9 restore worldgen splitting worker report

- Start: 2026-07-09
- Starting HEAD: 5b6cf4d
- Status: not accepted
- Final commit: committed after this report update; see final reply for hash.

## Changed files

- `src/save-load.ts`
- `src/scene.ts`
- `src/scene-worldgen.ts`
- `src/terrain-mask.ts`
- `runs/water9-restore-worldgen-splitting-2026-07-09/worker-report.md`

## Summary

- Save/load with a valid saved terrain payload now restores in the live scene instead of restarting the Phaser scene and rerunning full fish/flora/special-room/articulated worldgen.
- Restore path now only applies saved terrain and saved player/state; existing generated life remains live, avoiding the prior duplicate restore-time worldgen stall.
- Terrain surface anchor sampling now caches candidate scans per terrain revision, and fish/flora placement reuses per-species anchor samples. Stamp/brush flora nearest-anchor matching now buckets anchors by tile.
- This materially reduces restore work, but strict perf is still not accepted because startup still has a synchronous `worldgen.terrainMask` stall and settled draw spikes remain in `draw.world`.

## Verification

- PASS `npm run build`.
- PASS `WATER9_SAVE_LOAD_OUT_DIR=runs/water9-restore-worldgen-splitting-2026-07-09/save-load-functional-final WATER9_SAVE_LOAD_REPORT=runs/water9-restore-worldgen-splitting-2026-07-09/save-load-functional-final/save-load-smoke.json WATER9_SAVE_LOAD_PORT=5184 npm run water9:save-load-smoke`.
- FAIL `WATER9_SAVE_LOAD_PERF_OUT_DIR=runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf-final2 WATER9_SAVE_LOAD_PERF_REPORT=runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf-final2/save-load-perf-smoke.json WATER9_SAVE_LOAD_PERF_PORT=5186 npm run water9:save-load-perf-smoke`.
  - Restore no longer has >=1000ms Long Tasks; max restore Long Task was 69ms.
  - Restore `worldgen.total` trueMax improved to 75.1ms; `saveLoad.restoreWorld` 24.2ms; no `worldgen.floraSpecies`/`fishSpecies`/`brushFlora`/`stampFlora` rerun on restore.
  - Restore rAF still misses strict target in this run: samples 15, avg 52.22ms, p95/p99/max 133.3ms, over33 66.67%.
  - Settled restored swim fails draw only: `draw.total` p95 8.6ms, trueMax 15.7ms; `draw.world` trueMax 15.2ms.
- FAIL `LOADING_SWIM_PERF_OUT_DIR=runs/water9-restore-worldgen-splitting-2026-07-09/loading LOADING_SWIM_PERF_REPORT=runs/water9-restore-worldgen-splitting-2026-07-09/loading/loading-swim-perf-smoke.json LOADING_SWIM_PERF_PORT=5187 npm run water9:loading-swim-perf-smoke`.
  - Startup still has synchronous generation stalls: startup rAF samples 10, avg 183.32ms, p95/max 1200ms.
  - Top startup metrics: `worldgen.total` 4410.2ms, `worldgen.terrainMask` 1196.7ms, `worldgen.terrainBase` 202.9ms, `worldgen.brushFlora` 181.1ms, `worldgen.stampFlora` 147.8ms.
  - First settled swim rAF avg 19.03ms, p95/p99/max 33.4ms, over33 5.68%; `draw.total` p95 7.1ms, trueMax 20.2ms.
- PASS `WATER9_MINING_PERF_OUT_DIR=runs/water9-restore-worldgen-splitting-2026-07-09/mining WATER9_MINING_PERF_REPORT=runs/water9-restore-worldgen-splitting-2026-07-09/mining/mining-perf-smoke.json WATER9_MINING_PERF_PORT=5188 node tools/test_mining_perf_smoke.mjs`.
  - `draw.world` trueMax 4.8ms; max dirty chunks 6, max dirty tiles 24.
- FAIL `WATER9_DEEP_SWIM_OUT_DIR=runs/water9-restore-worldgen-splitting-2026-07-09/deep-diagonal WATER9_DEEP_SWIM_REPORT=runs/water9-restore-worldgen-splitting-2026-07-09/deep-diagonal/deep-diagonal-swim-perf-smoke.json WATER9_DEEP_SWIM_PORT=5189 node tools/test_deep_diagonal_swim_perf_smoke.mjs`.
  - Classification is `terrainDirtyRedraw` across checked bands.
  - Draw improved at most depths but 780m still fails: `draw.total` trueMax 10.9ms. Other checked trueMax values: 360m 6.6ms, 1140m 1.5ms, 1500m 2.3ms.
- PASS `WATER9_B4_PERF_OUT_DIR=runs/water9-restore-worldgen-splitting-2026-07-09/b4 WATER9_B4_PERF_REPORT=runs/water9-restore-worldgen-splitting-2026-07-09/b4/b4-busy-deep-canvas-perf-smoke.json WATER9_B4_PERF_PORT=5190 node tools/test_b4_busy_deep_perf_smoke.mjs`.
  - Classification `steady`; rAF p95 16.7ms, p99 16.8ms, max 33.4ms, over33 0.82%.

## Visual proof

- Loading settled gameplay:
  - `runs/water9-restore-worldgen-splitting-2026-07-09/loading/loading-first-settled-gameplay-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/loading/loading-first-settled-gameplay-canvas-gray.png`
- Save/load restored gameplay:
  - `runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf-final2/save-load-after-restore-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf-final2/save-load-after-restore-canvas-gray.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf-final2/save-load-after-settled-swim-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf-final2/save-load-after-settled-swim-canvas-gray.png`
- Mining:
  - `runs/water9-restore-worldgen-splitting-2026-07-09/mining/mining-before-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/mining/mining-after-canvas.png`
- Deep diagonal captures:
  - `runs/water9-restore-worldgen-splitting-2026-07-09/deep-diagonal/deep-diagonal-depth-360-end-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/deep-diagonal/deep-diagonal-depth-780-end-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/deep-diagonal/deep-diagonal-depth-1140-end-canvas.png`
  - `runs/water9-restore-worldgen-splitting-2026-07-09/deep-diagonal/deep-diagonal-depth-1500-end-canvas.png`

## Remaining blockers

- Startup still needs `worldgen.terrainMask` split or moved out of one synchronous `rebuildTerrainMask` pass; that is now the largest startup blocker.
- Restore is no longer rerunning full worldgen, but restore rAF still has short-window cadence misses and one 69ms Long Task. Next narrow restore target is `applySavedWorld`/terrain visual invalidation around the restored saved terrain, not fauna/flora generation.
- Settled draw failures are `draw.world`/terrain redraw. Deep and mining probes classify the remaining spikes as terrain invalidation/redraw, not entity volume or UI/harness paths.
