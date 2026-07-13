You are the single integration owner for Water9's holistic framerate pass.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9` only. Baseline is expected at or near `9c88409`. Read these first:

- `runs/water9-adversarial-performance-framerate-review-2026-07-10/telemetry-audit.md`
- `runs/water9-adversarial-performance-framerate-review-2026-07-10/runtime-matrix.md`
- relevant July 9 performance implementation/enforcement reports and current source/tests

Create `runs/water9-holistic-framerate-pass-2026-07-10/worker-report.md` immediately as an early report stub, then keep it current so work is recoverable.

Goal: implement one coherent pass that addresses the largest verified causes and false-confidence gaps together, rather than tuning one smoke in isolation. The measured baseline is not steady: focused B4/deep Canvas produced independent-rAF p95/p99 33.4 ms, max 66.6 ms, and 158 frames over 33.34 ms while internal `frame.total` p95 misleadingly read 4.1 ms.

Required work, in causal order:

1. Measurement truth. Make end-to-end frame pacing trustworthy and cheap enough not to materially perturb the next frame. Timestamp-align independent rAF with `outer.frameTotal`, `outer.render`, post-render/telemetry overhead, update/draw branches, renderer identity, terrain invalidation, and sonar cache events. Remove EMA/decaying-max fields as acceptance oracles in performance smokes; use raw window p95/p99/true max and counts over 20/33.34/50 ms. Correct the Perf HUD so it cannot present `frame.total` as full frame time.
2. Presentation/rendering. Use identical deterministic comparisons to confirm the renderer/terrain hypothesis, then optimize the default live path. Prefer WebGL/AUTO where supported if runtime evidence validates it, while retaining and testing an explicit Canvas fallback. Reduce repeated terrain/procedural Graphics clear-and-rebuild/raster pressure during camera tile crossings and mining invalidation using retained/chunked/incremental work as appropriate. Do not trade away terrain correctness, biome identity, seams, mining updates, or normal-play visual quality.
3. Sonar/UI cadence. Decouple ordinary HUD DOM refresh from sonar redraw, coalesce reveal/ping/status redraw requests to at most the necessary presentation cadence, and avoid rebuilding static map work on every exact player-tile/reveal revision when incremental/coarser caching is correct. Instrument HUD/full-chart cache hit/miss/build cost. Cover passive reveal, ping burst, first chart open, and repeated zoom bucket changes on a heavily revealed state.
4. Dense B4 budgets. Cull or spatially index before per-entity timer/distance/draw work where useful; make full simulation and terrain-correction budgets explicit; remove avoidable repeated lookup/allocation paths without changing encounter behavior. Add a deterministic maximum-density B4 fixture with entity/population/visible-part floors and budget ceilings. Exercise sonar aggro, multiple hostiles/articulated creatures, mining or detonation, flares/particles, and the highest-part sub.
5. Transition and regression gates. Add strict phase-specific cadence assertions for startup steps, first two seconds ready, load-to-first-presented-gameplay, first two seconds post-restore, ordinary swim/mining, deep traversal, sonar scenarios, and repeated dense B4. Expose the important scripts through package.json. Assertions must reject sustained doubled frames and severe stalls; document any narrowly justified one-time transition allowance rather than silently settling past it.

Implementation discretion: inspect and profile first, and change the smallest architecture that solves the measured causes. If evidence disproves a proposed mechanism, document it and redirect effort to the measured cause. Do not game the harness, lower density, shorten captures, hide startup/transition windows, or relax thresholds to manufacture a pass. Preserve gameplay and visual composition. No drive-by refactors.

Verification:

- Run build/typecheck plus focused functional smokes affected by the changes.
- Run identical before/after or baseline/current deterministic paths at 1280x800 DPR 1 for default runtime and Canvas fallback, with multiple B4 repeats and raw independent-rAF distributions. Use ports 5180–5199 only; if occupied choose another in range. Never kill processes outside that range.
- Produce actual `#game canvas` normal-play captures for surface, mid, deep, and B4, including adjacent depth captures straddling relevant biome cutoffs, and grayscale variants. Captures must show Water9 runtime identity/HUD at gameplay scale; contact sheets or harness-only frames are insufficient. Visually compare rendering correctness and readability against the accepted current biome benchmark. If bitmap/generated art is touched, prove the live runtime loads it rather than a procedural stand-in.
- Keep bulky browser/proof artifacts in the established ignored/archive location and leave a durable manifest/report path.

Repo safety: begin with `git status --short`, classify pre-existing dirt, and do not overwrite, stage, or clean unrelated changes. The existing `runs/` dirt is not permission to absorb it. Exactly one commit-capable owner exists: you.

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Commit only assigned source/test/package changes and the durable report/manifest if appropriate. Do not stage unrelated pre-existing run artifacts.

Return block:

- Status: COMPLETE / PARTIAL / BLOCKED
- Commit hash
- Root causes confirmed or falsified
- Changed files and architectural summary
- Before/after tables for every required cadence phase and renderer, with raw p95/p99/max and >20/>33.34/>50 counts
- Build, functional, and performance verification commands/results
- Runtime capture/manifest paths and visual caveats
- Remaining risks, unsupported environments, and blockers
