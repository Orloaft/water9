# Water9 Restore Worldgen Splitting - 2026-07-09

Goal: reduce the remaining startup/save-load restore main-thread stalls by splitting or avoiding synchronous restore/restart worldgen work, then isolate terrain redraw spikes without weakening shared perf thresholds.

Starting HEAD: `5b6cf4d`

Checklist:
- [x] implementation lane - session `restore-worldgen-splitting`, child `agent:mgr-water9:subagent:ad14c2a7-85ba-45c9-83a8-196264fd2fb1`, run `710238ac-3938-4d50-87d5-c3483aaebe66` - expected artifact `/mnt/nxt-dev/water9/runs/water9-restore-worldgen-splitting-2026-07-09/worker-report.md` - landed `4a8e0ec`, NOT performance-accepted, REPORTED 2026-07-09

Acceptance rule:
- Build/typecheck passes.
- Save/load restore reaches real live gameplay and keeps the proof strict: no title screen or docked/boat-only false pass.
- Restore transition rAF and Long Task evidence improves materially versus `5b6cf4d`; accepted target is independent rAF p95 <= 20ms, p99 <= 33.34ms, max <= 50ms, frames >33.34ms <= 1%, frames >50ms = 0, and no settled-gameplay Long Tasks >= 50ms. If this cannot be reached in one slice, the report must show the next blocking timed phase.
- Startup/loading no longer has unbounded frozen startup; first settled gameplay still passes rAF/Long Task thresholds and produces live `#game canvas` proof.
- Terrain redraw spike isolation covers restored swim plus B4/deep/mining enough to say whether spikes are invalidation/redraw, entity/update, or harness/UI-path related. Do not weaken the shared rAF/Long Task/draw thresholds.
- Visual proof includes actual `#game canvas` captures and grayscale readability for loading settled gameplay and save/load after restore; include B4/deep/mining proof if those paths are touched.
- WebGL remains unaccepted unless it independently passes the same thresholds; do not switch renderer default.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden.
