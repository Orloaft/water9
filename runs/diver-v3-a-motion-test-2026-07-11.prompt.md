You are producing the approved Diver V3 Concept A game-ready motion-test vertical slice for Water9.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`
Expected starting HEAD: `72f2bae` (record actual value; do not assume it).

Read first:
- `runs/diver-v3-a-character-bible-2026-07-11/report.md`
- `runs/diver-v3-a-character-bible-2026-07-11/artifacts/bible/character-bible.md`
- canonical master and all review/registration boards in that run
- `runs/current-diver-sprite-audit-2026-07-11/report.md`
- the prior rejected v2 production report solely for technical contracts and rejection lessons; do not reuse or derive pixels from its procedural-looking art
- relevant runtime diver animation/rendering code and asset-loading paths

Goal: create the smallest credible game-ready animated proof from approved Concept A—6 to 8 deliberately authored frames spanning hover, swim, and scanner. This is an art-directed motion test and live integration proof, not bulk generation of the full replacement package.

Non-negotiable art direction:
- Preserve the canonical A identity: heavy brass pressure suit, cyan faceplate, backpack mass, warm/cool separation, horizontal underwater silhouette, connected anatomy, painterly industrial materials.
- Do not create procedural geometry, vector assembly, traced pixel art, puppet-like cutouts, palette swaps, or mechanically repeated body parts. Do not reuse v2 pixels.
- Each pose must be individually authored/refined from the canonical master, with consistent volumes, helmet/backpack proportions, lighting direction, material response, anatomy, registration, and pose-to-pose continuity.
- Use an intentional 6–8 frame plan that visibly covers at least: hover/settle, swim propulsion/cruise, and scanner deploy/hold/recover. The hands/body must visibly operate the scanner; tool and effects may remain modular.
- Produce high-resolution authored masters first, then carefully downsample and clean alpha edges/pixel clusters at the actual gameplay footprint. No opaque studio backgrounds in runtime assets.
- Binary or clean graded alpha is acceptable only if halo-free in all representative biomes. Document pivots, frame bounds, sockets, timing, and loop/hold behavior.

Work sequence:
1. Create `runs/diver-v3-a-motion-test-2026-07-11/report.md` immediately as an early stub containing HEAD, dirty-start classification, intended frame plan, inspected runtime paths, and blockers.
2. Inspect existing dirt. Do not overwrite unrelated user work. If target runtime files are already dirty in a conflicting way, stop implementation and produce isolated assets plus an integration patch/spec rather than clobbering them.
3. Author/refine the 6–8 frame masters and runtime-ready transparent frames. Keep exact generation/edit lineage and SHA-256 manifest. Retain rejected candidates separately and clearly exclude them from authority.
4. Integrate only the narrow motion-test slice into the live runtime, behind the safest bounded path available. Prove the actual generated/bitmap assets are loaded—not a procedural stand-in, old atlas, or stale cache.
5. Run TypeScript/build checks and the focused Playwright smoke needed to enter normal play. Use only ports 5180–5199; if occupied choose another in range and never kill processes outside it. Ensure Vite does not watch `.desktop-build`.
6. Capture the actual `#game canvas` during normal play at representative surface, mid, and deep bands straddling relevant biome cutoffs. Include HUD/runtime identity. Capture hover, swim, and scanner reads where feasible. Produce color and grayscale review boards, native gameplay scale plus useful enlargement, side-by-side with the approved canonical A benchmark. Contact-sheet or review-harness-only evidence is insufficient.
7. Self-critique ruthlessly for procedural-placeholder read, disconnected anatomy, registration wobble, silhouette drift, alpha halos, painterly noise at reduction, weak scanner interaction, or divergence from A. If the result fails, report it honestly and preserve evidence rather than declaring PASS.

Artifacts under `runs/diver-v3-a-motion-test-2026-07-11/artifacts/` must include:
- high-resolution authored frame masters
- transparent runtime frames/atlas and machine-readable metadata
- frame plan/timing, pivots, sockets, palette/material notes
- generation/edit lineage and SHA-256 manifest
- color, grayscale, native-scale, enlarged, motion/contact, and canonical-comparison boards
- actual `#game canvas` captures for surface/mid/deep normal play

Repo safety:
- Preserve all unrelated dirty state.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- If safe and the integrated slice passes, commit only assigned runtime/assets plus durable run artifacts by explicit path. Otherwise do not commit and explain precisely.

Return:
- status: PASS, REVISE, BLOCKED, or MOUNT_DOWN
- report path and key review/canvas image paths
- actual HEAD and optional commit hash
- changed runtime/assets files
- checks and smoke results
- exact evidence that live runtime loaded the new bitmap assets
- visual caveats and recommended next gate
- blockers

Do not claim the complete diver replacement is finished. This stage succeeds only as a manager-reviewable motion-test gate.
