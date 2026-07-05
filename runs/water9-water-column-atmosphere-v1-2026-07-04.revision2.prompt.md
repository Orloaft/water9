Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Preserve unrelated dirty work. Do not write anywhere else. Do not commit. Do not stage files.

Session continuation: `water-column-atmosphere-v1-revision2`

You are the active revision worker for Water9's water-column atmosphere implementation. The manager inspected `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/contact-sheet.png` while your session was still active and rejects revision1. Do not stop at revision1. Continue from the current dirty tree and produce revision2 proof.

Read first:
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04.md`
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/contact-sheet.png`
- `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision1/provenance.json`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/proposal.md`

Manager rejection of revision1:
- B1 surface 119 m and B1 upper 180 m are improved but still mostly flat teal fields at gameplay scale. The visible pass looks like faint horizontal/vertical banding rather than convincing water volume. Add broad soft mottle, diagonal/ribbon motion, and sparse particulate without turning it into obvious tiles.
- B2 mid 760 m is still the main failure. The after image reads almost the same as baseline: a narrow vertical lamp shaft in darkness. Revision2 must add visible wide horizontal brine/sediment atmosphere outside and through the lamp beam so the whole view reads as murky water, not a spotlight column. If the current pre-darkness layers are being swallowed by darkness, make the post-darkness/lamp-volume water contribution visibly stronger while preserving a crisp player silhouette with a guard radius/mask.
- B4 lower 1260 m still shows the bright hard rectangular ruin/window. The old rectangular read must be gone in revision2. If water-column haze alone cannot solve it, apply the smallest renderer-side fix needed: soft-edge/mask/dim/veil the `biome-ruins-vault-causeway-lattice` runtime presentation or add a cold gray-blue foreground veil that actually crosses the rectangle. Do not generate art or redesign landmark pools.
- B3 lower 1260 m is acceptable enough; preserve readability and do not make it blank, lamp-only, or noisy.

Implementation guidance:
- Prefer focused edits in `src/helpers.ts` and `src/scene-rendering.ts`.
- Touch `src/scene.ts` or `src/scene-playtest.ts` only if needed for runtime proof/provenance.
- Do not alter gameplay, HUD, controls, save/load, mining, sonar, Telegram/gateway/system integrations, or unrelated files.
- Do not just crank global alpha. Tune per-biome/per-band behavior, protect player readability, keep deep caustics absent, and make the before/after difference visually obvious in normal gameplay screenshots.
- If a rejection mode cannot be fixed inside this water-column slice, return `BLOCKED` with the exact reason and the smallest next scope. Otherwise keep iterating until the proof is ready for manager visual review.

Verification:
- Run `npm run build`.
- Use only ports 5180-5199 for proof. If a port is busy, pick another in range; never kill processes outside that range.
- Write revision2 artifacts under:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/`
- Capture actual normal gameplay `#game canvas`, color and grayscale, with same-runtime effect-off baseline and revised effect-on after:
  - B1 surface 119 m
  - B1 upper 180 m
  - B2 mid 760 m
  - B3 lower 1260 m
  - B4 lower 1260 m
- Include drift stills for B1 119 m and B2 760 m.
- Produce `contact-sheet.png` and `provenance.json`. Provenance must include HEAD, git status before/after, selected port, viewport, URL/source selector, biome/depth, active band, visible water-column textures/layers, alpha, blend mode if available, tile offsets/drift, loaded status, and luma/readability stats.
- Write a concise report at:
  - `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/report-revision2.md`

Return:
- Status: READY_FOR_MANAGER_VISUAL_REVIEW, NEEDS_MANAGER_REJECTION, BLOCKED, or MOUNT_DOWN.
- Changed files.
- Proof artifact paths.
- Build result.
- Git status summary before/after.
- Caveats.
- Exact line: `Do not accept yet; manager visual inspection required.`
