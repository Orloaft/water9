# Worker Prompt: Water9 Deeper Performance Implementation

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working in the pinned repo `/mnt/nxt-dev/water9`.

Starting baseline should be clean commit `f38f93e` on `ux-work`, which already
contains the sonar-tool overhaul and the deeper performance proposal. If the
worktree is dirty at start, classify the dirt before edits and preserve
unrelated work.

Read these files first:
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/deeper-performance-proposal.md`
- `runs/water9-sonar-tool-overhaul-perf-proposal-2026-07-09/worker-report.md`
- existing sonar/perf smoke scripts under `tools/`
- relevant sonar, world rendering, terrain/mining, playtest/perf code under `src/`

Goal: implement the entire deeper performance proposal, end to end:

1. Phase 1 - Big sonar map redraw and compositing
   - Keep ordinary swimming cheap: `draw.bigSonarMap` must stay gated behind
     the explicit sonar chart/tool state.
   - Split full sonar chart work into stable/static and dynamic layers where
     the codebase shape allows.
   - Cache static terrain/revealed-cell raster output using an offscreen canvas
     or retained runtime texture keyed by the correct world/biome/zoom/reveal
     revision state.
   - Invalidate only on sonar reveal changes, terrain changes, biome/world
     changes, or meaningful zoom bucket changes.
   - Draw dynamic player/contact/viewport/UI markers every frame without
     forcing full static raster redraw.
   - If whole-map caching still spikes, use chunk/tile caching or document the
     next needed worker/OffscreenCanvas step with evidence.

2. Phase 2 - Mining and terrain-dirty world redraw
   - Audit dirty terrain/world redraw paths and categorize single tile, radius,
     chunk, and full-world invalidations in the report.
   - Replace mining-triggered full redraws with bounded chunk/dirty-region
     invalidation where visually correct.
   - Coalesce repeated tile mutations during a single drill/mining action into
     one dirty-region update before drawing.
   - Add perf telemetry for dirty chunk count, dirty tile count, mutation
     reason, and elapsed redraw time.
   - Preserve correctness for special rooms, loose items, ores, props,
     navigation collision, and sonar revealed-cell interactions.

3. Phase 3 - Deep diagonal-swim instrumentation
   - Add a playtest/perf-only per-frame ring buffer with rAF delta,
     update/draw totals, camera position, player velocity, world-view bounds,
     chunk counts, visible fish/articulated counts, terrain dirty state, sonar
     map state, and Long Task API samples when available.
   - Keep production overhead out of normal mode; gate behind existing perf or
     playtest-only flags.
   - Add a deterministic deep diagonal-swim perf smoke that teleports to
     representative depth bands, swims diagonally for fixed windows, exports
     screenshots, and writes compact JSON with worst frame windows and
     correlated perf context.

Required run artifacts:
- Create `runs/water9-deeper-performance-implementation-2026-07-09/worker-report.md`
  as an early report stub before long test/screenshot loops.
- Put new smoke outputs and screenshots under
  `runs/water9-deeper-performance-implementation-2026-07-09/`.
- Capture actual `#game canvas` screenshots during normal gameplay for normal
  swim, sonar-open/chart interaction, mining after terrain mutation, and deep
  diagonal swim at representative depth bands. Include grayscale readability
  versions where visual readability is claimed.

Acceptance targets:
- Normal swimming: `draw.bigSonarMap=null`, `framesOver50=0`,
  `p95FrameMs<=20`.
- Open chart pan/zoom: `draw.bigSonarMap avgMs<=2.0`, `maxMs<=8.0`,
  `p95FrameMs<=35`, and `framesOver50` cut by at least 70% from the current
  37-frame baseline.
- Mining: repeated mining smoke has `draw.world maxMs<=4.0` during mutation
  bursts, bounded dirty chunk counts, and no visible stale terrain after mined
  tiles.
- Deep diagonal swim: smoke identifies whether hitches are dominated by
  world-view changes, terrain dirty redraw, entity update volume, asset upload,
  chart overlay work, or another measured factor.

Required verification:
- `npm run build`
- Existing sonar tool overhaul smoke, using a port in `5180-5199`
- Existing sonar map/controller smoke, using a port in `5180-5199`
- Add or extend a mining perf smoke and run it
- Add `node tools/test_deep_diagonal_swim_perf_smoke.mjs` or equivalent and run it
- Run any broader existing perf/adversarial smoke that is practical after the
  focused smokes pass, and report if an existing unrelated assertion blocks it

Port rule: use only ports `5180-5199` for Vite/dev servers/smokes. If a port is
busy, choose another in that range. Do not kill processes outside this range.

Safety:
- Stage files by explicit path only. `git add -A`, `git add .`, and
  `git commit -a` are forbidden. Before committing, run `git status --short`
  and confirm every staged path belongs to your assigned stage.
- No destructive git or filesystem commands.
- Do not touch Telegram bindings, gateway config, systemd units, cron jobs, or
  public/external integrations.
- Do not push. Commit locally only when implementation and verification are
  ready for manager review.

Return block:
- Status
- Commit hash if committed
- Changed files
- Verification commands and key metrics
- Evidence artifact paths
- Visual proof paths
- Caveats/blockers and any remaining performance culprits
