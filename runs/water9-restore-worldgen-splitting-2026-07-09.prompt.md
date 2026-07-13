# Worker Prompt: Water9 Restore Worldgen Splitting - 2026-07-09

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN - do not improvise alternate paths, do not write anywhere
else.

Repo pin: `/mnt/nxt-dev/water9`
Manager run ledger: `/mnt/nxt-dev/water9/runs/water9-restore-worldgen-splitting-2026-07-09.md`
Worker report path: `/mnt/nxt-dev/water9/runs/water9-restore-worldgen-splitting-2026-07-09/worker-report.md`
Port range: use 5180-5199 only. If a port is busy, choose another in range; do not kill processes outside it.

You are the single commit-capable implementation lane for this repo. You are not alone in the codebase: preserve unrelated dirty state, do not revert edits made by others, and adapt around any pre-existing run artifacts. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Goal:
Reduce the remaining startup/save-load restore main-thread stalls by splitting or avoiding synchronous restore/restart worldgen work, then isolate terrain redraw spikes without weakening shared perf thresholds.

Current evidence at HEAD `5b6cf4d`:
- Last accepted useful fix: `5b6cf4d Fix save-load perf proof and UI draw metrics`.
- Prior report: `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/followup-report.md`.
- Strict perf is not accepted yet.
- Loading startup failed: startup rAF samples 9, avg 204.18ms, p95/max 1000ms; world did not reach non-loading ready state within the smoke window. First settled swim rAF avg 18.98ms, p95 33.3ms, p99 33.4ms, max 49.9ms, over33 4.53%; `draw.total` avg 1.17ms, p95 6.5ms, p99 11.3ms, trueMax 16.6ms.
- Save/load restore failed: transition rAF avg 155.55ms, p50 33.3ms, p95 516.7ms, p99/max 2083.3ms; Long Task max 2086ms.
- Restore culprit metrics: `worldgen.total` 9164.1ms, `outer.frameTotal` 2059.6ms, `outer.step` 2058.8ms, `worldgen.floraSpecies` 1433.7ms, `worldgen.fishSpecies` 489.5ms, `worldgen.brushFlora` 314.3ms, `worldgen.stampFlora` 263.1ms, `worldgen.specialRooms` 149.1ms.
- After-restore settled swim rAF is clean enough, but draw still spikes: rAF avg 16.67ms, p95 16.8ms, p99 16.8ms, max 33.3ms; `draw.total` avg 1.01ms, p95 4ms, p99 11.4ms, trueMax 16.5ms.
- B4 repeats still fail enforcement in places with rAF p95 around 33.3-33.5ms and no Long Tasks.
- Deep diagonal rAF mostly passes but `draw.total` exceeds the shared 8ms max at checked depths: 360m 12.1ms, 780m 11.2ms, 1140m 16ms, 1500m 13.8ms.
- Mining rAF is clean and no Long Tasks, but `draw.total` trueMax 9.3ms after terrain invalidation.
- WebGL remains bad in headless Chromium; do not switch renderer default.

Scope:
1. Inspect the save/load restore path, scene restart path, and worldgen staging/caching introduced by `05b2c12`/`5b6cf4d`.
2. Implement the smallest safe slice that materially reduces restore/restart stalls. Prefer avoiding duplicate full worldgen on restore, carrying cached/generated data when the saved terrain is valid, or splitting the remaining heavy phases into smaller staged chunks. Focus first on `worldgen.floraSpecies`, `worldgen.fishSpecies`, `worldgen.brushFlora`, `worldgen.stampFlora`, `worldgen.specialRooms`, and any terrain-mask phase still running synchronously during restore.
3. Preserve correctness: save/load must restore real gameplay state, not a title screen, not a docked/boat-only false pass, and not a blank/frozen world.
4. Add or improve instrumentation only if needed to prove the next blocking phase. Do not weaken existing shared rAF, Long Task, or draw thresholds.
5. Isolate terrain redraw spikes enough to classify restored swim, B4/deep/mining spikes as terrain invalidation/redraw, entity/update, or harness/UI-path. Fix a narrow obvious redraw spike if low risk, but do not widen this into a renderer rewrite.

Required workflow:
- Create the report stub at `/mnt/nxt-dev/water9/runs/water9-restore-worldgen-splitting-2026-07-09/worker-report.md` before long test loops.
- Check dirty state at start. Preserve unrelated run artifacts and pre-existing untracked evidence.
- Use only ports 5180-5199 for dev servers/smokes.
- If you commit, commit only your assigned source/test/report paths and push the current branch. If strict perf still fails but the fix is real and safe, a commit is still acceptable; say clearly why it is not accepted.

Required verification:
- `npm run build`.
- Functional save/load smoke.
- Save/load perf smoke with output under `/mnt/nxt-dev/water9/runs/water9-restore-worldgen-splitting-2026-07-09/save-load-perf/`.
- Loading swim perf smoke with output under `/mnt/nxt-dev/water9/runs/water9-restore-worldgen-splitting-2026-07-09/loading/`.
- Enough B4/deep/mining perf reruns or focused probes to classify the terrain redraw spikes if you touched that area.
- Live `#game canvas` captures and grayscale proof for loading settled gameplay and save/load restored gameplay. Include B4/deep/mining captures if touched by verification.

Acceptance targets:
- Save/load restore: independent rAF p95 <= 20ms, p99 <= 33.34ms, max <= 50ms, frames >33.34ms <= 1%, frames >50ms = 0, no settled-gameplay Long Tasks >= 50ms.
- Startup/loading: no unbounded frozen startup; first settled gameplay meets the same rAF/Long Task thresholds and reaches normal gameplay.
- Draw spikes: do not weaken draw thresholds. If not fixed, report the exact remaining phase/path and best next small fix.

Return block in `worker-report.md` and final reply:
- Status: accepted / not accepted / blocked.
- Starting HEAD and final commit hash if any.
- Changed files.
- Verification commands with pass/fail and key metrics.
- Visual proof paths.
- Remaining blockers and the next narrow target.
