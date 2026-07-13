Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working in exactly this repo:
`/mnt/nxt-dev/water9`

Goal: finish the startup/save-load perf acceptance loop after commit `05b2c12`. The prior lane improved the big stalls and added enforcement, but it is NOT accepted yet.

Current baseline:
- HEAD should be `05b2c12` or a direct descendant on `ux-work`.
- Prior report: `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/worker-report.md`
- Manager verification:
  - Commit `05b2c12` is pushed to `origin/ux-work`.
  - Startup improved from `worldgen.total 5577ms` / rAF max `5599.8ms` to startup rAF max `966.7ms`; settled swim rAF is clean, but loading smoke still failed `draw.total trueMaxMs 11.6ms > 8ms`.
  - Save/load improved from restore rAF max `16882.7ms` to `1166.6ms`, but restore still fails strict transition threshold and Long Task max is still `1169ms`.
  - Save/load visual proof is flawed: `save-load-after-restore-canvas.png` and `save-load-after-settled-swim-canvas.png` in `save-load-perf-5/` show the title screen, not actual post-load gameplay. Fix the harness/proof so it proves the restored gameplay state.
  - B4 repeat 2 still fails under enforcement; repeat 3 fails `draw.total max 8.4ms > 8ms`.
  - Deep diagonal rAF passes per band but fails `draw.total max 10.3-11.2ms`.
  - Sonar rAF passes but sonar-use `draw.total` is missing on the current UI draw path.
  - Perf guardrails now correctly fail cadence, and the old submarine collision assertion passed; articulated contact still failed.

Scope:
1. Reduce the remaining startup/save-load restore transition stalls. Focus on splitting/caching the last large chunks, especially terrain mask/flora/room placement or any restore path still producing ~0.5-1.2s browser stalls. Do not remove content density.
2. Fix the save/load perf smoke so its after-restore and after-settled captures are actual live `#game canvas` gameplay after a restored save, not the title screen. The smoke must fail if it never reaches gameplay after load.
3. Fix UI-path `draw.total` coverage gaps where rAF is clean but the smoke reports missing draw metrics, especially save/load post-restore and sonar-use. If a scenario legitimately has no gameplay draw, the smoke should classify it separately rather than claiming settled gameplay.
4. Improve or clearly classify B4/deep `draw.total` max failures introduced by the stricter shared helper. If thresholds need a small scenario-specific carveout, justify it with rAF/Long Task evidence and avoid weakening the shared helper broadly.
5. Keep shared rAF/Long Task enforcement intact. Do not make failing evidence pass by deleting checks.

Acceptance target:
- `npm run build` passes.
- `npm run water9:loading-swim-perf-smoke` passes, with first settled gameplay rAF p95 <= 20ms, p99 <= 33.34ms, max <= 50ms, no unexplained Long Tasks, and `draw.total` within the accepted command-submit threshold.
- `npm run water9:save-load-smoke` passes.
- `npm run water9:save-load-perf-smoke` passes or reports a narrowly justified remaining fail; required proof must show real restored gameplay color and grayscale canvases.
- B4 canvas 3 repeats, deep diagonal, mining, sonar tool, and perf guardrails run and report enforced PASS/FAIL with key metrics.
- Visual proof: manager must be able to inspect actual `#game canvas` gameplay after startup and after save/load restore. Include grayscale.

Safety:
- You are not alone in the codebase. Preserve unrelated dirty state and accommodate existing edits. Do not revert user or other-worker changes.
- Current untracked bulk logs/screenshots under `runs/` are expected; do not stage them unless explicitly required. Commit only code and the report, plus any intentionally small run report artifact.
- No destructive git commands.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- Port range for dev servers/smokes: 5180-5199. If a port is busy, use another in range; never kill processes outside it. Vite must not watch `.desktop-build`.

Required artifact:
- Create `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/followup-report.md` early.
- Put any new logs/JSON/screenshots under `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/followup/`.

Return block:
- Status.
- Commit hash and whether pushed to `origin/ux-work`.
- Changed files.
- Verification commands with PASS/FAIL and key metrics.
- Startup/save-load before/after from this follow-up.
- Visual proof paths, especially restored gameplay after save/load.
- Remaining caveats/blockers and next target if still not accepted.
