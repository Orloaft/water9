# Water9 Sonar Tool Overhaul + Perf Proposal - 2026-07-09

Starting commit: `89121a1`

Status: completed

## Changed Files

Implementation/proof files verified in the dirty tree:

- `src/helpers.ts`
- `src/hud.ts`
- `src/scene-rendering.ts`
- `src/scene-sonar.ts`
- `src/scene-sub.ts`
- `src/scene.ts`
- `src/styles.css`
- `tools/test_sonar_map_controller_smoke.mjs`
- `tools/test_sonar_tool_overhaul_smoke.mjs`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-overhaul-smoke.json`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.json`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/*.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/deeper-performance-proposal.md`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/worker-report.md`

No source fixups were needed during recovery.

## Behavior Summary

- Ordinary swimming no longer renders the full sonar map or the old HUD minimap canvas. The HUD shows a compact navigation panel with heading, dock offset, charted-cell count, and sonar-tool hint.
- The full chart is gated behind the sonar tool flow. Keyboard/controller sonar use equips sonar and opens the chart; `M`/View only opens the chart when sonar is selected.
- The sonar ping still reveals cells and captures contacts, but `draw.bigSonarMap` is measured only while `state.sonarMapOpen` is true.
- Dismiss/close followed by unequip to drill hides the full map again; the proof run ends with `selectedTool=drill`, `sonarMapOpen=false`, and no overlay/big-map DOM.
- Pause-menu copy now distinguishes "Sonar tool" from "Sonar chart" and labels the chart button as "Equip Sonar First" unless sonar is selected.

## Performance Summary

From `sonar-tool-overhaul-smoke.json` after rerun:

- Normal swimming: `avgFrameMs=17.38`, `p95FrameMs=16.8`, `p99FrameMs=33.4`, `maxFrameMs=33.4`, `framesOver50=0`.
- Normal swimming sonar work: `draw.sonarMap avgMs=0.02`, `maxMs=0.24`; `draw.bigSonarMap=null`.
- Full sonar chart open: `avgFrameMs=52.57`, `p95FrameMs=66.7`, `p99FrameMs=66.8`, `maxFrameMs=66.8`, `framesOver50=37`.
- Full sonar chart drawing: `draw.sonarMap avgMs=3.13`, `maxMs=14.92`; `draw.bigSonarMap avgMs=4.5`, `maxMs=14.92`.

Conclusion: the overhaul removes the expensive full-chart path from ordinary swimming, but explicit chart mode still needs redraw/compositing work. The deeper proposal covers that as Phase 1.

## Runtime Proof Artifacts

- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-overhaul-smoke.json`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/normal-swim-canvas.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/normal-swim-canvas-gray.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-open-canvas.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-open-canvas-gray.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-open-overlay.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/dismissed-unequipped-canvas.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/dismissed-unequipped-canvas-gray.png`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.json`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.png`

Visual inspection notes:

- `normal-swim-canvas.png` shows the diver swimming with the compact navigation panel and no full chart/minimap.
- `sonar-tool-open-overlay.png` shows the full "Sonar Tool Chart" overlay after sonar-tool open.
- `dismissed-unequipped-canvas.png` shows the chart dismissed, drill selected, and only the compact navigation panel visible.
- `sonar-map-controller-smoke.png` shows the controller/keyboard chart path opening the same sonar-tool chart overlay.

## Verification Commands And Results

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `89121a1`
- `pwd` -> `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel` -> `/mnt/nxt-dev/water9`
- `npm run build` -> passed. Vite emitted existing generated-asset runtime-resolution warnings plus the large chunk/plugin timing warnings.
- `WATER9_SONAR_TOOL_PORT=5184 WATER9_SONAR_TOOL_OUT_DIR=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09 WATER9_SONAR_TOOL_REPORT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs` -> passed.
- `WATER9_SONAR_CONTROLLER_PORT=5199 WATER9_SONAR_CONTROLLER_OUT_DIR=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09 WATER9_SONAR_CONTROLLER_REPORT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.json WATER9_SONAR_CONTROLLER_SCREENSHOT=runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/sonar-map-controller-smoke.png node tools/test_sonar_map_controller_smoke.mjs` -> passed.

## Caveats / Blockers

- No blocker found.
- The working tree contains unrelated dirty octopus/perf assets and scripts from other tasks, including `package.json`, octopus generated/source assets, source-art tools, loading-swim perf smoke, and related run directories. They were preserved and not cleaned up.
- Full sonar chart mode remains visibly expensive in the smoke (`framesOver50=37` over the chart-open sample). That is not a blocker for this task because the overhaul intentionally removes that cost from ordinary swimming, and the dedicated deeper-performance proposal now scopes follow-up work.
