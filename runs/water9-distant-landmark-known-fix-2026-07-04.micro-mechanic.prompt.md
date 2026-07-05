You are the micro mechanic patch owner for Water9 distant landmark damage control.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Preserve unrelated dirty work. Do not commit. Do not run destructive git/filesystem commands.

Report path:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/micro-mechanic-report.md`
Create/update it early.

Goal: make a tiny mechanics-only patch to fix the rejected proof:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/proof/water9-distant-landmark-known-fix-contact-sheet.png`

Do exactly this investigation/patch shape:
1. In `src/scene-rendering.ts`, fix B2 mid terrain visibility. The current constants hide terrain into the lamp cone:
   - `BRINE_MID_TERRAIN_ALPHA = 0.08`
   - `BRINE_MID_TERRAIN_EDGE_ALPHA = 0.025`
   - `BRINE_MID_ORE_OVERBURDEN_ALPHA = 0.08`
   Restore B2 mid terrain/edges/overburden to normal or near-normal visibility so B2 no longer reads as a black field with a vertical spotlight/shaft.
2. In `src/scene-rendering.ts`, fix B3/B4 authored bitmap compositing so dark/black source pixels do not draw as hard rectangular boxes. The rejected proof shows obvious rectangle bounds around `biome-midnight-black-coral-ribs` and `biome-ruins-vault-causeway-lattice`.
   Use a small renderer-side change: for those dark-background biome landmark assets, use an appropriate light-only blend mode such as `Phaser.BlendModes.ADD`/screen-like compositing with tuned alpha, or another tiny existing-Phaser approach that removes the black rectangle. Do not add a large masking system.
3. Do not generate art. Do not redesign asset pools. Do not broaden beyond `src/scene-rendering.ts`/tiny helper if absolutely required.

Reference target remains:
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`

Required proof under:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/micro-mechanic-proof/`

Capture actual Water9 normal gameplay `#game canvas`, color and grayscale, for:
- B1 surface 119
- B1 upper 180
- B2 mid 760
- B3 lower 1260
- B4 lower 1260

Also produce a contact sheet and provenance/notes JSON.

Self-check:
- If B2 still reads as vertical lamp/shaft, return `NEEDS_MANAGER_REJECTION`, not PATCH_READY.
- If B3/B4 still show rectangular bitmap boxes, return `NEEDS_MANAGER_REJECTION`, not PATCH_READY.
- If B1 regresses to the old flat/procedural shell/circle look, return `NEEDS_MANAGER_REJECTION`.

Verification:
- Run `npm run build` unless blocked before verification.
- Use ports 5180-5199 only for proof. If a port is busy, pick another in range; do not kill processes outside it.

Return in the report and final message:
- Status: PATCH_READY, NEEDS_MANAGER_REJECTION, BLOCKED, or MOUNT_DOWN.
- Changed files.
- Proof paths.
- Build/verification summary.
- Caveats.
- Exact line: `Do not accept yet; manager visual inspection required.`
