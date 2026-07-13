Continue the Water9 holistic framerate pass from commit `2aff019` as the same integration owner. Do not redo the completed telemetry, sonar, or retained-terrain work.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9` only. Read and update `runs/water9-holistic-framerate-pass-2026-07-10/worker-report.md`. Preserve all unrelated pre-existing dirt.

The first commit is verified PARTIAL. Remaining acceptance blockers are startup click-to-ready max 1183.3 ms; restore max 83.3 ms plus post-restore swim failure; settled loading swim regression; every dense-B4 repeat around 33.3 ms p95 despite low measured outer CPU spans; incomplete simultaneous stress fixture; and incomplete cutoff-adjacent proof.

First inspect timestamp-aligned raw samples and browser/runtime behavior. Then:

1. Split synchronous startup/world generation into deterministic bounded work units that genuinely yield across frames. Preserve seed determinism, loading progress truth, save compatibility, and world identity. Gate each named step and the first two seconds of gameplay.
2. Phase restore so saved state, terrain/cache invalidation, sonar reveal, entity rebuild, and first presentation do not pile into one frame. Define and instrument load-command-to-first-presented-gameplay. Preserve exact restored state and functional save/load behavior.
3. Diagnose B4 presentation pacing outside measured CPU spans. Use browser tracing or equivalent evidence to distinguish Canvas raster/compositor cost, capture/instrumentation effects, timer scheduling, GC, and harness pacing. Optimize the proven source without lowering density, hiding frames, shortening windows, relaxing thresholds, or changing B4 composition. If headless Chromium imposes an irreducible limitation, prove it with controlled minimal comparisons and still improve the real application path; do not call it pass without evidence.
4. Complete the deterministic simultaneous sonar-aggro + multi-hostile/articulated + mining/detonation + flare/effects + highest-part-sub fixture and enforce action/population/visible-part floors.
5. Add adjacent normal-play `#game canvas` captures immediately above/below relevant biome cutoffs plus grayscale variants. Keep HUD/runtime identity visible and inspect terrain seams/retained-window artifacts.

Acceptance remains the parent ledger's original rule. Run build, save/load functional and perf, loading, mining, deep, sonar, articulated budget, and at least three B4 repeats. Report raw p95/p99/max and >20/>33.34/>50 counts. Use only ports 5180–5199 and never kill processes outside them.

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Return: COMPLETE/PARTIAL/BLOCKED; commit; confirmed root causes; changed files; raw before/after cadence; verification; capture/manifest paths; remaining blockers and environment limits.
