You are performing the manager-rejected visual recovery for Slice 4 of the approved Water9 swimming-backgrounds implementation.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repository contract:
- Work only in `/mnt/nxt-dev/water9` on branch `swimming-backgrounds`.
- Expected starting HEAD is `84378bee12a009ce96e942d2a4efc6029b2b2252`, already pushed to `origin/swimming-backgrounds`. The only permitted pre-existing dirt is the manager-authored recovery prompt and PREPARED/rejection ledger edits. Inspect and preserve exactly that scoped dirt; stop if anything else is dirty.
- This is the only commit-capable lane. Ports are restricted to 5180–5199; choose a free port and never kill a process you did not start.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Read first:
- `runs/swimming-backgrounds-full-implementation-2026-07-13.md`
- `runs/swimming-backgrounds-full-implementation-2026-07-13/slice4-report.md`
- the Slice 4 capture/performance scripts and rendering/readability code changed in `84378be`
- the manager-rejected captures under `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice4/`

Manager rejection — all three issues are blocking:
1. Pale outline ellipses around the diver and threats are visibly shipped in actual `#game canvas` frames, including controlled cutoff, adversarial, and performance captures. They read as measurement/debug rings and are unacceptable. Remove them from normal runtime presentation entirely. Preserve accessibility through bounded local compositing/dimming and truthful off-canvas ROI measurement; do not replace them with another outline, halo stroke, target reticle, or debug ornament. If a diagnostic overlay is needed for tests, it must be explicitly test-only, default off, absent from every acceptance capture, and impossible to enable through normal play.
2. Deep B4 still shows the gulper consuming roughly a third to over half of the viewport, including `continuity-final/b4-1450m-cutoff-after-color.png`, adversarial 1650 m frames, and performance captures. Make this old screen-swallowing read visibly gone in ordinary traversal, cutoff pairs, and adversarial interaction. Preserve giant-threat drama and authoritative collision/reach, but bound render occupancy/crop and stage it to one side with clear player-route negative space. Do not pass by hiding the threat or falsifying hit geometry.
3. The purported strict 25-second B4 performance proof ends in a helmet-breach/death overlay. That is not sustained normal-play evidence and contaminates presentation timings. Fix deterministic staging so the diver remains alive and in settled deep B4 for the full warmup plus 25-second measured interval without terrain mutation, pause/menu/death overlays, or biome/depth fallback. Record requested and actual biome/depth and prove the measured interval stayed gameplay-active.

Required recovery work:
- Reproduce and remove the visible rings while retaining bounded local backdrop/dimming behavior.
- Re-tune giant B4 threat presentation with a focused test proving render bounds/viewport occupancy, side staging, negative-space corridor, authoritative hit geometry, aggro, turning, and reach remain coherent.
- Rebuild normal-play color/grayscale evidence for representative B1 surface, B2 mid, B3 deep, B4 deep, and all cutoff pairs from actual `#game canvas`, with no debug/measurement overlays. Rebuild B3/B4 adversarial interaction frames similarly.
- Rerun diver/threat edge-contrast and prompt-contrast measurement using off-canvas ROI coordinates/pixel sampling. Do not draw measurement ROIs into captured pixels.
- Repair the performance harness and rerun the unweakened strict gate. Use trace evidence for product optimization; do not guess. Keep any remaining cadence miss explicitly FAIL. Targets remain rAF p95 <=17.5 ms, p99 <=25 ms, under 1% frames over 33.34 ms, no post-warmup long task >50 ms, outer-frame p95 <=8 ms, and combined background/water/landmark/darkness p95 <=1 ms.
- Inspect all regenerated color/grayscale captures yourself, but do not claim manager acceptance.
- Rerun build and relevant focused regressions. Recheck the two sonar/controller assertions; if still failing, determine whether `84378be` introduced them or they are inherited, with evidence. Do not broaden into unrelated fixture repair.
- Update `slice4-report.md`, durable manifest, and main ledger honestly. Preserve rejected evidence with explicit rejected status rather than rewriting history. Archive new bulky evidence outside git under a new `slice4-recovery/` artifact subtree and manifest it.
- Commit scoped recovery, report, prompt, ledger, tests, and manifest by explicit paths; push `swimming-backgrounds`; finish clean with local HEAD equal to the remote tracking ref.

Acceptance:
- No visible diagnostic ellipse/ring or equivalent outline in any normal-play or adversarial acceptance capture.
- The B4 gulper no longer dominates the viewport; diver, actionable threat, route, and negative space read immediately in color and grayscale.
- The strict performance interval is provably alive, overlay-free, settled deep-B4 normal play for the full measurement window.
- Build and focused regressions pass except explicitly proven inherited failures; metrics remain honest.

Return:
- Status and commit hash.
- Root causes and exact changes.
- Changed paths.
- Verification results and honest misses.
- Artifact/report/manifest paths.
- Push/clean-state proof and blockers.
