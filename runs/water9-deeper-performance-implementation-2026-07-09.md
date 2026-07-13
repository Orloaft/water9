# Water9 Deeper Performance Implementation - 2026-07-09

Goal: implement the full deeper performance proposal from `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/deeper-performance-proposal.md`.

Starting commit: `f38f93e`

Checklist:
- [x] `codex-dev/water9-deeper-performance-implementation-2026-07-09` — run `3f50e868-bc63-4e29-8be2-b96346f0084b`, child `agent:mgr-water9:subagent:f0ad1f3e-cb18-475f-ac58-f436599b62ee` — implement Phase 1 sonar chart caching/compositing, Phase 2 mining/terrain dirty redraw reduction, Phase 3 deep diagonal-swim instrumentation and smoke — PARTIAL 2026-07-09: local commit `935c472`; normal swim, mining, deep swim passed; explicit chart static draw target passed, but chart-open rAF pacing still misses (`p95=66.7ms`, `framesOver50=36`) — expected artifacts:
  - `runs/water9-deeper-performance-implementation-2026-07-09/worker-report.md`
  - updated source/tests
  - final commit hash
- [x] `codex-dev/water9-sonar-chart-pacing-followup-2026-07-09` — run `d9459f0d-e67d-4cb0-99bf-26a856ab342a`, child `agent:mgr-water9:subagent:7da52c85-44da-4649-bab1-033f23f1ca20` — follow-up owner — VERIFIED 2026-07-09; fixed in commits `ee9b95d` and `815c551`, pushed to `origin/ux-work`; REPORTED 2026-07-09 — artifacts:
  - `runs/water9-sonar-chart-pacing-followup-2026-07-09/worker-report.md`
  - focused chart pacing evidence JSON/screenshots
  - local commit if the rAF acceptance miss is fixed

Acceptance rule:
- Normal swimming keeps `draw.bigSonarMap=null`, `framesOver50=0`, and `p95FrameMs<=20`.
- Full sonar chart pan/zoom cuts `framesOver50` by at least 70% from the 37-frame baseline, targets `draw.bigSonarMap avgMs<=2.0`, `maxMs<=8.0`, and `p95FrameMs<=35`.
- Mining perf smoke records bounded dirty chunk/tile counts, no stale terrain, and `draw.world maxMs<=4.0` during mutation bursts or reports the remaining blocker with evidence.
- Deep diagonal-swim smoke exports worst-frame windows with rAF/update/draw/camera/chunk/entity/dirty/long-task correlation.
- `npm run build` passes.
- Visual proof uses actual `#game canvas` captures from normal gameplay, includes normal swim, sonar-open, mining after mutation, representative depth/deep diagonal bands, and grayscale readability proof.
