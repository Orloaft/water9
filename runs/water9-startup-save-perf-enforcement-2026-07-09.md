# Water9 Startup/Save Perf Enforcement - 2026-07-09

Goal: fix the worst current performance failures by reducing startup/loading and save/load restore main-thread stalls, then make perf smokes fail on shared rAF/Long Task thresholds instead of only recording bad evidence.

Starting HEAD: `44dc5c0`

Checklist:
- [x] implementation lane — session `startup-save-perf-enforcement`, child `agent:mgr-water9:subagent:33bd06a4-a04d-40e3-8f21-b8d70abcf055`, run `89aaa011-e1fd-41f7-85b0-d579de0e2f59` — expected artifact `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/worker-report.md` — landed `05b2c12`, NOT performance-accepted, REPORTED 2026-07-09
- [x] follow-up lane — session `startup-save-perf-followup`, child `agent:mgr-water9:subagent:bb86e302-0aeb-4b76-a968-70b93c096fc3`, run `37e71c7e-4fb5-48cd-991f-f0715758db69` — expected artifact `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/followup-report.md` — landed `5b6cf4d`, NOT performance-accepted, REPORTED 2026-07-09

Acceptance rule:
- Build/typecheck passes.
- Startup/loading is judged separately from settled gameplay: no unbounded blank/frozen state; first settled gameplay interval passes rAF/Long Task thresholds after readiness.
- Save/load restore has perf coverage with `?perf=1`, independent rAF, Long Tasks, before/load/after frame-buffer exports, and live `#game canvas` proof.
- Shared steady-gameplay thresholds are enforced in perf smokes: independent rAF p95 <= 20ms, p99 <= 33.34ms, max <= 50ms, frames >33.34ms <= 1%, frames >50ms = 0, and no repeated settled-gameplay Long Tasks >= 50ms.
- B4 canvas, deep traversal, mining, sonar chart, and save/load perf smokes fail automatically when their own rAF/Long Task evidence fails thresholds.
- Visual proof includes actual `#game canvas` captures and grayscale readability for startup settled gameplay, save/load after restore, B4, deep traversal, mining, and sonar chart if touched by verification.
- WebGL remains unaccepted unless it independently passes the same thresholds; do not switch renderer default.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden.
