Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working in exactly this repo:
`/mnt/nxt-dev/water9`

Goal: implement the next performance fixes after the thorough review: address startup/loading and save/load restore main-thread stalls first, then add shared rAF/Long Task threshold enforcement so perf smokes fail automatically when browser cadence rejects a 60fps claim.

Current baseline:
- Starting HEAD observed by manager: `44dc5c0`.
- Latest review report: `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/perf-matrix-report.md`
- Telemetry audit: `/mnt/nxt-dev/water9/runs/water9-thorough-performance-review-2026-07-09/telemetry-audit.md`
- Main failures to target:
  - Startup/loading: failed, huge main-thread stalls; supplemental rAF max `13332.9ms`, long task max `13333ms`; loading smoke did not reach ready state inside its transition loop.
  - Save/load restore: worst failure; rAF p95 `116.6ms`, p99/max `16882.7ms`, long task max `16888ms`; functional save/load passes but has inadequate perf coverage.
  - Existing perf scripts often record bad rAF/Long Task evidence but still pass.
  - B4 canvas is improved but still has intermittent p95 `33.4ms`; WebGL remains bad and must not become default.
  - Mining and deep traversal need threshold gates over their browser rAF evidence, not just internal metrics.

Scope:
1. Reproduce and profile the startup/loading and save/load restore stalls using the existing Playwright/tooling. Prefer small, high-signal telemetry additions if needed.
2. Implement root-cause fixes for the startup/loading and save/load restore stalls. Keep the changes targeted. Do not reduce content density or remove gameplay systems as a shortcut.
3. Add a shared perf assertion helper for steady-gameplay browser cadence and Long Tasks. Wire it into the relevant perf smokes:
   - `tools/test_b4_busy_deep_perf_smoke.mjs`
   - `tools/test_deep_diagonal_swim_perf_smoke.mjs`
   - `tools/test_mining_perf_smoke.mjs`
   - `tools/test_sonar_tool_overhaul_smoke.mjs`
   - `tools/test_loading_swim_perf_smoke.mjs` for settled gameplay after readiness, with startup judged separately
   - add or extend save/load perf coverage so restore has `?perf=1`, independent rAF, Long Tasks, before/load/after perf exports, and canvas proof
   - `tools/test_perf_guardrails.mjs` if there is a clear shared guardrail integration point
4. Keep startup/loading acceptance separate from steady gameplay. It is okay for initial worldgen/loading to be a transition, but it must not produce an unbounded blank/frozen state and the first settled gameplay interval must pass thresholds after readiness.
5. Do not switch renderer default to WebGL. If you run WebGL comparisons, classify them separately and report them as unsupported/bad unless they independently pass.

Shared steady-gameplay threshold target:
- independent rAF and/or exported `outer.rafDelta` must be present for each judged interval.
- Prefer 300+ frames or 5s+ per scenario where practical; minimum 180 frames.
- rAF p95 <= `20ms`.
- rAF p99 <= `33.34ms`.
- rAF max <= `50ms`.
- frames over `33.34ms` <= `1%`.
- frames over `50ms` = `0`.
- no repeated settled-gameplay Long Tasks >= `50ms`; any single outlier needs correlated explanation and should fail if unexplained.
- `outer.frameTotal` p95 should stay under `12ms`; investigate if max exceeds `20ms`.
- `draw.total` command-submit p95 <= `5ms`, max <= `8ms`.

Safety:
- You are not alone in the codebase. Preserve unrelated dirty state and accommodate existing edits. Do not revert user or other-worker changes.
- Current manager-observed dirt is untracked run artifacts under `/mnt/nxt-dev/water9/runs/`; classify dirty state yourself before editing.
- No destructive git commands.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- Port range for dev servers/smokes: 5180-5199. If a port is busy, use another in range; never kill processes outside it. Vite must not watch `.desktop-build`.

Required artifacts:
- Create an early report stub at `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/worker-report.md`.
- Store logs/JSON/screenshots under `/mnt/nxt-dev/water9/runs/water9-startup-save-perf-enforcement-2026-07-09/`.
- For visual proof, capture actual live `#game canvas`, not review harness stand-ins. Include color and grayscale for save/load after restore and the first settled startup gameplay. Include B4/deep/mining/sonar proof if those smokes are part of final verification.

Verification to run and report:
- `npm run build`
- startup/loading perf smoke
- save/load functional smoke
- new or extended save/load perf smoke
- B4 canvas perf smoke at least 3 repeats
- deep diagonal swim perf smoke
- mining perf smoke
- sonar tool perf smoke
- sonar controller smoke if sonar files are touched
- `npm run water9:perf-guardrails-smoke` and explicitly separate the known submarine mask-aware terrain assertion if it still fails

Return block:
- Status.
- Commit hash and whether pushed to `origin/ux-work`.
- Changed files.
- Verification commands with PASS/FAIL and key metrics.
- Startup and save/load before/after metrics.
- Whether shared rAF/Long Task enforcement now fails bad evidence automatically.
- Artifact/report path.
- Caveats/blockers and next recommended target if any.
