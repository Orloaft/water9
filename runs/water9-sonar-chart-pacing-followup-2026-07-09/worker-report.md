# Water9 Sonar Chart Pacing Follow-Up - Worker Report

## Start

- Starting HEAD: `935c472`
- Branch: `ux-work`
- Initial dirty status:

```text
?? runs/water9-deeper-performance-implementation-2026-07-09.md
?? runs/water9-deeper-performance-implementation-2026-07-09.prompt.md
?? runs/water9-sonar-chart-pacing-followup-2026-07-09.prompt.md
```

## Investigation

- Root cause: the full sonar chart was cheap after `935c472`, but opening it also set `state.paused=true`, left the pause menu rendered underneath the chart, kept the full-screen sonar overlay using the shared `backdrop-filter: blur(10px)`, and continued running the normal paused `this.draw()` path every tick. The browser was compositing a large blurred DOM overlay over an actively redrawn Phaser canvas, so rAF pacing was bad even though `draw.bigSonarMap` was no longer the bottleneck.
- Fix: treat the sonar chart as a retained pause surface. While `state.paused && state.sonarMapOpen`, the scene now keeps audio/perf telemetry alive but skips the full Phaser redraw; chart pan/zoom still redraws the chart canvas when input changes. The pause menu is not rendered under the chart, and the chart overlay opts out of the shared full-screen backdrop blur.

## Files Changed

- `src/scene.ts` - skip full scene redraw while the paused sonar chart is open; keep audio/perf updates when chart navigation consumes a frame.
- `src/hud.ts` - suppress the pause menu while the sonar chart overlay is open.
- `src/styles.css` - disable backdrop blur on the full-screen sonar chart overlay.
- `runs/water9-sonar-chart-pacing-followup-2026-07-09/*` - follow-up report, smoke JSON, and visual proof artifacts.

## Verification

- PASS: `npm run build`
  - Existing Vite warnings about unresolved runtime `/assets/generated/...` CSS URLs and large chunk size only.
- PASS: `WATER9_SONAR_TOOL_PORT=5181 WATER9_SONAR_TOOL_OUT_DIR=runs/water9-sonar-chart-pacing-followup-2026-07-09 WATER9_SONAR_TOOL_REPORT=runs/water9-sonar-chart-pacing-followup-2026-07-09/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs`
- Baseline reproduction command:
  - PASS: `WATER9_SONAR_TOOL_PORT=5180 WATER9_SONAR_TOOL_OUT_DIR=runs/water9-sonar-chart-pacing-followup-2026-07-09/baseline WATER9_SONAR_TOOL_REPORT=runs/water9-sonar-chart-pacing-followup-2026-07-09/baseline/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs`
- Mining/deep-swim smokes were not rerun because the production change is gated to `state.paused && state.sonarMapOpen`, pause-menu overlay rendering, and sonar overlay CSS; it does not touch active swim/mining update or rendering paths. The required sonar smoke rechecked ordinary swimming.

## Metrics

- Baseline chart open/use from prior run: `draw.bigSonarMap avgMs=0.59`, `maxMs=5.16`, `avgFrameMs=54.25`, `p95FrameMs=66.7`, `framesOver50=36`.
- Local baseline reproduction before fix:
  - Normal swim: `draw.bigSonarMap=null`, `avgFrameMs=16.64`, `p95FrameMs=16.7`, `framesOver50=0`.
  - Sonar chart open/use: `draw.bigSonarMap avgMs=2.38`, `maxMs=8.96`, `avgFrameMs=92.98`, `p95FrameMs=133.4`, `framesOver50=47`.
- After fix:
  - Normal swim: `draw.bigSonarMap=null`, `avgFrameMs=16.64`, `p95FrameMs=16.8`, `framesOver50=0`.
  - Sonar chart open/use: `draw.bigSonarMap avgMs=0.31`, `maxMs=2.66`, `avgFrameMs=16.65`, `p95FrameMs=16.7`, `framesOver50=0`.

## Visual Proof

- Actual `#game canvas` capture with sonar chart open: `runs/water9-sonar-chart-pacing-followup-2026-07-09/sonar-tool-open-canvas.png`
- Grayscale readability proof: `runs/water9-sonar-chart-pacing-followup-2026-07-09/sonar-tool-open-canvas-gray.png`
- Full chart overlay proof: `runs/water9-sonar-chart-pacing-followup-2026-07-09/sonar-tool-open-overlay.png`

## Commit

- Pending.
