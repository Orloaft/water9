Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Preserve unrelated dirty work. Do not write anywhere else.

Session key: `water-column-atmosphere-v1-revision1`

Goal: revise the already-landed `water-column-atmosphere-v1` implementation until it passes manager visual inspection. The first pass builds and proves live runtime layers, but the manager rejected it visually.

Current state:
- HEAD is expected to be `7776913`.
- The repo was already heavily dirty before this water-column work. Treat all pre-existing dirt as user/other-worker work.
- The first pass changed only:
  - `src/helpers.ts`
  - `src/scene.ts`
  - `src/scene-rendering.ts`
  - `src/scene-playtest.ts`
  - `runs/water9-water-column-atmosphere-v1-2026-07-04/`
- Do not commit. Do not stage files.

Read first:
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04.md`
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report.md`
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/contact-sheet.png`
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof/provenance.json`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/proposal.md`

Manager rejection from pass 1:
- B1 surface 119 m and B1 upper 180 m still read too much like flat teal color fields. There is some texture, but it is too subtle to improve visual satisfaction.
- B2 mid 760 m still reads primarily as a vertical lamp cone in darkness. The water atmosphere does not yet break up the cone or give the wider brine column enough horizontal/particulate life.
- B4 lower 1260 m still exposes hard rectangular bitmap bounds. The rectangle may be pre-existing landmark dirt, but this water-column pass still needs to visually glue/veil it enough for the proof to pass.
- Do not simply crank alpha everywhere. The player, foreground terrain, ore, mining targets, enemies, sonar, and HUD-critical in-canvas state must remain readable in color and grayscale.

Implementation scope:
- Prefer small, focused edits in `src/helpers.ts` and `src/scene-rendering.ts`.
- Touch `src/scene.ts` or `src/scene-playtest.ts` only if required to expose/verify a revised layer or blend mode.
- Do not alter distant-landmark asset selection/framing/pools unless you can prove a one-line renderer-side clipping/veiling adjustment is required for the B4 rectangle. Do not generate or replace landmark art.
- Preserve the proof-only disable toggle used for same-runtime baselines.

Visual target:
- B1: add visible but tasteful water volume: soft broad mottle, faint diagonal/ribbon motion, and sparse particulate. It should no longer read as an empty flat gradient at gameplay scale.
- B2: add wide horizontal brine/sediment atmosphere outside and through the lamp beam so the scene reads as murky water, not just a vertical shaft. Keep the player silhouette crisp.
- B3: keep current readability; do not make it blank, lamp-only, or noisy.
- B4: use cold gray-blue haze/particulate/veil behavior to reduce hard rectangular bitmap boundaries and integrate the ruin background. Do not obscure the player.
- Deep caustics must stay extremely weak or absent. Surface/upper caustics may be visible, but not patterned like obvious tiles.

Proof and verification:
- Run `npm run build`.
- Use only ports 5180-5199 for proof. If a port is busy, pick another in range; never kill processes outside that range.
- Write revision artifacts under:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/`
- Capture actual normal gameplay `#game canvas`, color and grayscale, with same-runtime effect-off baseline and revised effect-on after:
  - B1 surface 119 m
  - B1 upper 180 m
  - B2 mid 760 m
  - B3 lower 1260 m
  - B4 lower 1260 m
- Include drift stills for B1 119 m and B2 760 m.
- Produce a contact sheet and provenance JSON. Provenance must include HEAD, git status before/after, selected port, viewport, URL/source selector, biome/depth, active band, visible water-column textures/layers, alpha, blend mode if available, tile offsets/drift, loaded status, and luma/readability stats.
- Add/update a concise revision report at:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report-revision1.md`

Rejection modes to guard against:
- water still reads as flat gradient / empty color field
- particles, caustics, haze, or noise obscure player, ore, terrain, enemies, sonar, mining targets, or in-canvas game state
- caustics remain strong in deep bands
- texture tiles or repeats are obvious
- grayscale readability collapses
- B2 remains a vertical shaft/chimney/lamp-cone read
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
