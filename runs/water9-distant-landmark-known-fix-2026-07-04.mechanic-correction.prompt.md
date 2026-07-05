You are the mechanic correction owner for Water9 distant landmark damage control.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Run `pwd`, `git -C /mnt/nxt-dev/water9 rev-parse --show-toplevel`, and `git -C /mnt/nxt-dev/water9 status --short` before editing. Preserve unrelated dirty work. Do not run destructive git/filesystem commands. Do not commit.

Context:
- Prior known-fix proof was rejected by manager visual inspection:
  `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/proof/water9-distant-landmark-known-fix-contact-sheet.png`
- Rejection:
  - B1 is closer and no longer the old first-water flat shell-card problem.
  - B2 still reads as a vertical spotlight/shaft instead of the July 3 horizontal sulfide shelf.
  - B3 and B4 show hard rectangular bitmap windows/pasted boxes instead of integrated distant backgrounds.
- Do not reuse that contact sheet as success proof.

Reference target:
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`
- B2 reference: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png`
- B3 reference: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png`
- B4 reference: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png`

Likely code mechanics to fix:
- `src/scene-rendering.ts` has `BRINE_MID_TERRAIN_ALPHA = 0.08`, `BRINE_MID_TERRAIN_EDGE_ALPHA = 0.025`, and `BRINE_MID_ORE_OVERBURDEN_ALPHA = 0.08`; at B2 mid this hides the horizontal world/ledge and makes the player lamp cone the dominant vertical silhouette. Restore B2 mid terrain/edges/overburden to normal or near-normal visibility. The result must not be a black field with a vertical light cone.
- `src/scene-rendering.ts` renders authored background anchors as normal image sprites. The B3/B4 proof shows obvious rectangular bitmap bounds. Fix this by using the existing July 3 compositing behavior, or by applying a real feather/mask/crop/placement change that removes visible rectangular edges. Lower alpha alone is not enough if the rectangle is still readable.
- `src/helpers.ts` anchor size/placement may need adjustment, but do not just tune scale/opacity around the same bad silhouettes.

Scope:
- Make the smallest correction in `src/helpers.ts`, `src/scene-rendering.ts`, manifest data, or capture tooling needed.
- Do not generate new art unless you first prove the existing source is missing. Prefer existing July 3 assets/runtime path.
- Do not touch unrelated HUD/control/save/config/integration code.
- Use dev server ports 5180-5199 only. If a port is busy, choose another in range; do not kill processes outside it.

Required proof under:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/mechanic-correction-proof/`

Capture actual Water9 normal gameplay `#game canvas`, color and grayscale, for:
- B1 surface 119
- B1 upper 180
- B2 mid 760
- B3 lower 1260
- B4 lower 1260

Also produce a contact sheet and provenance/notes JSON.

Visual self-check before returning:
- If B2 is still a vertical spotlight/shaft/cone, status must be BLOCKED or NEEDS_MANAGER_REJECTION, not PATCH_READY.
- If B3/B4 still show hard rectangular bitmap windows, status must be BLOCKED or NEEDS_MANAGER_REJECTION, not PATCH_READY.
- If B1 regresses to flat/procedural shell/circle shapes, status must be BLOCKED or NEEDS_MANAGER_REJECTION.

Verification:
- Run `npm run build` unless blocked before verification.
- Record the exact proof command and port.

Return in `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/mechanic-correction-report.md` and final message:
- Status: PATCH_READY, BLOCKED, or NEEDS_MANAGER_REJECTION.
- Changed files.
- Proof paths.
- Build/verification summary.
- Caveats.
- Exact line: `Do not accept yet; manager visual inspection required.`
