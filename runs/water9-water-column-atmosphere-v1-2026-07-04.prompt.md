Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Preserve unrelated dirty work. Do not write anywhere else.

Session key: `water-column-atmosphere-v1-impl`

Goal: implement the first Water9 water-visual improvement slice from the research proposal: `water-column-atmosphere-v1`, a live water-column atmosphere pass using existing Phase 3 texture-mask assets and existing environment depth-band metadata. This is not a distant-landmark pass and not new generated art.

Important current state:
- Manager preflight saw HEAD `7776913`.
- The repo has a heavily dirty landmark/runtime tree. Treat all pre-existing dirt as user/other-worker work.
- Preserve unrelated changes. Do not revert, rewrite, or "clean up" landmark files except where absolutely required by this water-column slice.
- Do not commit. Do not stage files. If you believe a commit is required, stop and report that caveat.

Read first:
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/current-render-scout.md`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/effects-feasibility-scout.md`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/acceptance-plan-scout.md`
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04.md`

Before long work, create an early report stub at:
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report.md`

Implementation scope:
- `src/helpers.ts`
  - expose ready `textureMask` manifest entries from `background-phase3.manifest.json` through the environment profile/water-column metadata
  - derive conservative per-band mask alpha from existing `hazeAlpha`, `sedimentAlpha`, and `causticAlpha`
  - keep biome/depth variation explicit
- `src/scene.ts`
  - add a small retained pool of `TileSprite` or equivalent cheap display-list objects for water-column layers, if needed
  - place the pass between scenic background and terrain/actors
- `src/scene-rendering.ts`
  - add `drawWaterColumn(camera, profile)` or an equivalently named helper
  - call it after parallax/background scenic rendering and before terrain/actors
  - drift masks in world space at different parallax speeds
  - tint by the active band haze/water color
  - keep alphas low and depth-gated
  - keep caustic ribbons shallow-biased; use sediment/marine snow/fog for mid/deep
- `src/scene-playtest.ts`
  - extend `backgroundReviewSnapshot` to report visible water-column layers, texture keys, alpha, tile offsets/drift, and loaded status
- Optional focused proof helper under `tools/` or the run directory:
  - capture before/after normal gameplay `#game canvas`, color and grayscale, at the required five points
  - write provenance JSON and contact sheet

Do not touch:
- distant landmark selection/framing/pools except where the proof must read their current state
- gameplay logic
- movement, mining, sonar, controller, save/load
- HUD
- Telegram/gateway/system integrations
- generated art creation unless a proof helper needs derived grayscale/contact sheet output under the run directory

Visual direction:
- Surface/shallow: faint cyan-teal water volume, sparse plankton, soft shallow caustics only.
- Mid/brine: greener denser haze, sediment flecks, slow brine drift; avoid vertical spotlight/chimney reads.
- Deep/trench: indigo-black sparse marine snow, possible restrained lamp scatter later, silhouette-first.
- Ancient/abyssal: cold gray-blue haze and faint particulate; no hard rectangular bounds.

Verification:
- Run `npm run build`.
- Use only ports 5180-5199 for dev servers/proof. If a port is busy, pick another in range; never kill processes outside that range.
- Capture fresh baseline and after implementation, same viewport/camera/depth for comparison.
- Required captures are actual normal gameplay `#game canvas`, color and grayscale:
  - B1 surface 119 m
  - B1 upper 180 m
  - B2 mid 760 m
  - B3 lower 1260 m
  - B4 lower 1260 m
- Required proof artifacts:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/`
  - individual color PNGs and grayscale PNGs for every required point
  - before/after contact sheet
  - provenance JSON with HEAD, git status before/after, selected port, viewport, URL/source selector, biome/depth, active band, visible water-column textures/layers, alpha, tile offsets/drift, loaded status, and any luma/readability stats
- If animation/drift is visible, include two time-separated stills for at least B1 119 m and B2 760 m.

Rejection modes to guard against:
- water still reads as flat gradient / empty color field
- particles, caustics, haze, or noise obscure player, ore, terrain, enemies, sonar, mining targets, or in-canvas game state
- caustics remain strong in deep bands
- texture tiles or repeats are obvious
- grayscale readability collapses
- B2 reverts to vertical shaft/chimney/lamp-cone read
- B3 becomes blank/lamp-only
- B4 shows hard rectangular bitmap bounds
- proof is not live `#game canvas`

Return:
- Status: READY_FOR_MANAGER_VISUAL_REVIEW, NEEDS_MANAGER_REJECTION, BLOCKED, or MOUNT_DOWN.
- Changed files.
- Proof artifact paths.
- Build result.
- Git status summary before/after.
- Caveats.
- Exact line: `Do not accept yet; manager visual inspection required.`
