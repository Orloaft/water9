You are the sole commit-capable implementation owner for Water9 Slice 1: readability and cutoff continuity.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`
Required branch: `swimming-backgrounds`
Expected starting HEAD: `04f9e4d` (allow only manager-authored run-ledger/prompt dirt and the prior appraisal ledger's REPORTED tick; classify all dirt before editing).

Read first:
- `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md`
- `runs/swimming-backgrounds-full-implementation-2026-07-13.md`
- relevant rendering/movement helpers and existing visual/performance smoke infrastructure

Goal: implement only Slice 1 of the approved proposal as a narrow art-neutral vertical slice. Improve depth-band continuity and deep play-field readability without adding new art or stacking unbounded full-screen effects.

Required implementation:
1. Replace special-case depth transition behavior with one generalized continuous band-blend descriptor spanning every ordinary boundary. Feed the same coherent blend state into clear color, painterly/scenic alpha, water-volume effects, darkness/ambient, veil, and landmark/anchor slots. Transitions must cover at least 120 m; outgoing/incoming alpha must not jump by more than 0.20 in one frame, and landmark position must not visibly pop more than 4 screen pixels.
2. Replace the stepped strip-built lamp edge with a smooth, bounded falloff suitable for Canvas rendering and the current 3.7x play scale. Keep it performant and preserve the current one-visible-sprite water-column budget.
3. Add a small soft local separation field around the diver, independent of the directional beam. Preserve dark/horror atmosphere; do not globally raise exposure.
4. Add protected-player-corridor attenuation for background/scenic/landmark/veil contributions so immediate navigation space stays readable. Do not hide actionable threats or foreground terrain, and do not add a new full-screen multipass effect.
5. Add focused deterministic regression/measurement coverage for blend continuity and lighting invariants where practical.

Visual acceptance evidence (mandatory, not optional):
- Capture the actual normal-play `#game canvas`, with live HUD and Water9 runtime identity, in color and grayscale at 110/130, 510/530, 1030/1050, and 1430/1450 m. Capture adjacent cutoff pairs close enough to prove the boundary behavior. Do not use a review-only renderer or substitute scene.
- Compute HUD-excluded play-field metrics. Required targets: no required deep frame above 80% pixels below luma 24; adjacent pairs differ by at most 8 mean-luma points and 10 percentage points below-luma-24; diver/actionable threat edge contrast at least 25 luma points in 95% sampled frames; interaction text 4.5:1 where present.
- Run the settled 25-second B4 Canvas performance gate: rAF p95 <=17.5 ms, p99 <=25 ms, <1% frames over 33.34 ms, no post-warmup long task over 50 ms; outer.frameTotal p95 <=8 ms; combined background/water/landmark/darkness <=1 ms p95.
- If any target is not honestly achievable in this slice, diagnose and document the exact miss. Do not falsify PASS and do not expand into later slices or speculative unrelated optimization.

Verification:
- Run `npm run build` and relevant existing visual/save/playtest/performance smokes.
- Preserve inherited TypeScript failures unless your changes cause new ones; report baseline versus after clearly.
- Use only ports 5180-5199. If a port is busy, choose another in range. Never kill processes outside that range, and terminate only a server you started.
- Write bulky screenshots/traces under `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice1/`; commit a durable manifest with paths, byte counts, hashes, roles, and capture metadata. Keep an early report stub at `runs/swimming-backgrounds-full-implementation-2026-07-13/slice1-report.md` before long capture loops.

Safety and ownership:
- One commit-capable lane only; do not spawn other agents.
- Preserve the pre-existing modified `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13.md` unless explicitly staging its already-present REPORTED tick is necessary and proven safe. Do not rewrite history, force push, reset, or delete evidence.
- Do not implement Slice 2/3/4, commission assets, switch the default diver, or make drive-by refactors.
- Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.
- Commit the scoped product changes, focused tests, Slice 1 report/manifest, and the manager-authored full-implementation ledger/prompt files if unchanged except for accurate status/proof updates. Do not push unless the repo's normal workflow and branch state are safe; report whether push occurred.

Return:
- status and commit hash
- root cause/design summary and exact changed files
- verification commands/results, numeric visual metrics, and B4 performance metrics
- report and artifact-manifest paths
- remaining target misses, inherited caveats, and recommendation for Slice 2
- final `git status --short --branch`
