# Worker Prompt: Water9 Sonar Chart Pacing Follow-Up - 2026-07-09

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`
Branch: `ux-work`
Expected starting HEAD: `935c472` (`Implement deeper performance instrumentation`)

You are the only commit-capable lane in this repo. Do not push. Preserve
unrelated dirty/untracked files. At start, run `git status --short` and report
it in your worker report. The manager knows these untracked files may already
exist and should be preserved unless you intentionally update them:

- `runs/water9-deeper-performance-implementation-2026-07-09.md`
- `runs/water9-deeper-performance-implementation-2026-07-09.prompt.md`
- `runs/water9-sonar-chart-pacing-followup-2026-07-09.prompt.md`

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

## Goal

Finish the unmet Phase 1 acceptance target from the deeper performance proposal:
the explicit sonar chart open/use smoke still has bad browser frame pacing even
though `draw.bigSonarMap` is now cheap.

Current verified baseline from
`runs/water9-deeper-performance-implementation-2026-07-09/sonar-tool-overhaul-smoke.json`:

- Normal swim: `draw.bigSonarMap=null`, `p95FrameMs=16.7`, `framesOver50=0`.
- Sonar chart open/use: `draw.bigSonarMap avgMs=0.59`, `maxMs=5.16`.
- Still failing chart frame pacing: `avgFrameMs=54.25`, `p95FrameMs=66.7`,
  `framesOver50=36`.

Keep the successful work from `935c472`: sonar tool gating, static chart cache,
bounded mining dirty redraws, mining/deep-swim smokes, and perf ring buffer.

## Scope

Focus only on the explicit sonar chart/open overlay path and its smoke evidence:

- Investigate whether the remaining chart-open rAF issue is caused by DOM overlay
  compositing/layout, canvas sizing/layout reads, forced style recalculation,
  key repeat/pan handling, redundant Phaser updates while the chart is open, or
  the smoke measurement itself.
- Prefer a small production fix over weakening the smoke. If the smoke is
  measuring an artificial Playwright/input artifact, prove it with an additional
  focused measurement and keep the normal user path honest.
- Reasonable implementation options include moving chart drawing/sizing away
  from per-frame DOM layout reads, freezing the underlying game update/draw while
  the chart overlay is open, throttling panning/zoom repaint to actual input
  changes, moving the full chart into the Phaser/WebGL scene, or replacing the
  full-screen DOM canvas overlay with a cheaper retained surface.
- Do not regress normal HUD behavior: ordinary swimming must still have no full
  chart/minimap DOM and `draw.bigSonarMap=null`.
- Do not touch unrelated gameplay, Telegram/OpenClaw config, systemd/cron, or
  any repo outside `/mnt/nxt-dev/water9`.

## Required Verification

Run at least:

- `npm run build`
- `WATER9_SONAR_TOOL_PORT=<5180-5199> WATER9_SONAR_TOOL_OUT_DIR=runs/water9-sonar-chart-pacing-followup-2026-07-09 WATER9_SONAR_TOOL_REPORT=runs/water9-sonar-chart-pacing-followup-2026-07-09/sonar-tool-overhaul-smoke.json node tools/test_sonar_tool_overhaul_smoke.mjs`
- If you add a focused chart-pacing smoke, run it on a port in `5180-5199` and
  write its JSON/screenshots under `runs/water9-sonar-chart-pacing-followup-2026-07-09/`.
- Re-run mining/deep-swim smokes only if your code touches shared perf/rendering
  paths that could plausibly affect them; otherwise explain why the previous
  focused passes remain valid.

Acceptance target for this follow-up:

- Normal swim: `draw.bigSonarMap=null`, `framesOver50=0`, `p95FrameMs<=20`.
- Sonar chart open/use: `draw.bigSonarMap avgMs<=2.0`, `maxMs<=8.0`,
  `p95FrameMs<=35`, and `framesOver50<=11` (at least 70% below the 37-frame
  baseline).
- Visual proof: actual `#game canvas` capture with sonar chart open plus
  grayscale readability proof under the follow-up run directory.

## Report

Create `runs/water9-sonar-chart-pacing-followup-2026-07-09/worker-report.md`
early, then update it before finishing. Include:

- Starting HEAD and dirty status.
- Root cause of remaining chart rAF pacing issue.
- Files changed.
- Exact verification commands and pass/fail results.
- Metrics before/after, especially normal swim rAF, chart rAF, and
  `draw.bigSonarMap`.
- Visual proof paths.
- Commit hash if committed, or a clear blocker/caveat if not committed.

Return status in your final message:

- `completed` with commit hash and metrics if accepted.
- `blocked` with root cause and next step if you cannot meet the rAF acceptance
  target without a larger design change.
