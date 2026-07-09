# Water9 Performance Loading + Swim FPS Worker Report

Status: fixed

## Preflight
- Repo: `/mnt/nxt-dev/water9`
- Initial HEAD: `89121a1`
- Report created: 2026-07-09

## Dirty Files Before Editing
- Pre-existing blue-ring octopus generated/source asset work:
  `public/assets/generated/fauna-shallow-blue-ring-octopus-*.png`,
  `public/assets/generated/fauna-shallow-blue-ring-octopus.frames.json`,
  `public/assets/generated/fauna-shallow-blue-ring-octopus.png`,
  `public/assets/generated/small-life.manifest.json`,
  `public/assets/source/fauna-flora-source-art-slice-3-manifest.json`,
  `public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source*.png`,
  `tools/build_source_art_slice_3_assets.py`,
  `tools/test_blue_ring_octopus_animation_smoke.mjs`.
- Pre-existing code dirt that may be relevant and must be preserved if touched:
  `src/scene-playtest.ts`, `src/scene-rendering.ts`.
- Pre-existing run artifacts for blue-ring octopus work under `runs/water9-blue-ring-octopus-*`.
- This worker's new report directory:
  `runs/water9-performance-loading-swim-fps-2026-07-09/`.

## Findings
- Pre-fix capture attempt (`pre-fix-capture.json`) confirmed the main-menu loading overlay intercepted pointer start clicks while active; keyboard/DOM start can still open radio before world readiness. CSS also had `.radio-dialogue` at `z-index: 24` above `.biome-loading` at `z-index: 12`, so an early start could leave the radio visually above the loading transition during the synchronous worldgen stall.
- Swimming review found the passive sonar reveal path calls `drawSonarMap()` every 0.18s while swimming. `drawSonarMap()` always redrew the full-size big sonar canvas before drawing the HUD minimap, even when the sonar map overlay was closed. That hidden canvas work was outside the existing frame/draw perf breakdown.

## Changes
- Raised `.biome-loading` above modal radio UI so the loading transition covers early main-menu start/radio states until world readiness.
- Split `drawSonarMap()` into a measured body, records `draw.sonarMap`, and only redraws the big sonar map when `state.sonarMapOpen` is true. Closed-map swimming keeps the minimap update but skips hidden full-map canvas work.
- Added `water9:loading-swim-perf-smoke` focused on main-menu start sequencing and normal swimming perf.

Changed files:
- `package.json`
- `src/scene-rendering.ts`
- `src/styles.css`
- `tools/test_loading_swim_perf_smoke.mjs`
- `runs/water9-performance-loading-swim-fps-2026-07-09/worker-report.md`
- `runs/water9-performance-loading-swim-fps-2026-07-09/pre-fix-capture.json`
- `runs/water9-performance-loading-swim-fps-2026-07-09/loading-swim-perf-smoke.json`

## Verification
- PASS: `npm run build`
- PASS: `npm run water9:loading-debug-articulated-smoke`
- PASS: `npm run water9:perf-guardrails-smoke` on retry. First run failed on pre-existing/flaky `submarine mask-aware terrain collision did not register`; second run passed without code changes.
- PASS: `npm run water9:loading-swim-perf-smoke`

## Artifacts
- `runs/water9-performance-loading-swim-fps-2026-07-09/pre-fix-capture.json`
- `runs/water9-performance-loading-swim-fps-2026-07-09/loading-swim-perf-smoke.json`

## Acceptance Evidence
- Start-game loading root cause: `.radio-dialogue` (`z-index: 24`) sat above `.biome-loading` (`z-index: 12`), so early start/radio state could visually cover the loading transition while synchronous worldgen blocked the game loop. Fix raises `.biome-loading` to `z-index: 32`.
- Startup timing evidence from focused smoke: before start, overlay open, phase `staging`, progress `12`, top element `biome-loading`. During early start, `started: true`, `worldReady: false`, radio open, overlay open above radio (`overlayZIndex: 32`, `radioZIndex: 24`, top element `biome-loading`). Final loading state: inactive, phase `idle`, progress `1`.
- Startup stall is still synchronous worldgen (RAF probe saw one long frame, max `6116.5ms`), but the loading overlay now covers that unresponsive period instead of a radio-dialogue-only gap.
- Swimming hot path: passive sonar reveal calls `drawSonarMap()` repeatedly while swimming; it was always redrawing the hidden big sonar map canvas. Fix records `draw.sonarMap` and skips `draw.bigSonarMap` unless the sonar overlay is open.
- Swimming perf smoke: `6665ms` sample, movement path Down/Right/Up/Left for `1500ms` each, `392` RAF samples, avg `16.62ms`, p95 `16.8ms`, max `16.8ms`, long frames over 50ms: `0` (threshold <= 4).
- Perf metrics after swim: `frame.total` avg/max `4.33/11.37ms`; `update.total` `3.1/10.98ms`; `draw.total` `0.77/2.86ms`; `draw.sonarMap` `0.77/1.03ms` across `133` samples; `draw.bigSonarMap` no samples while closed; `update.fish` `2.76/10.68ms` with `217` fish.

## Caveats
- `src/scene-rendering.ts` was already dirty from blue-ring octopus animation work. I touched the same file only for the sonar-map perf fix and preserved the existing octopus frame-selection change.
- Worldgen remains synchronous; this fix ensures the transition is visually covered and test-guarded, but a later chunked worldgen pass would be the deeper responsiveness improvement.
