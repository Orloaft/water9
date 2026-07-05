# Water Column Atmosphere V1 Revision2 Report

Status: READY_FOR_MANAGER_VISUAL_REVIEW

Preflight:
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `7776913`
- Repo used: `/mnt/nxt-dev/water9`
- No files staged or committed.

Implementation summary:
- Reworked the shallow water-column draw so B1 surface/upper use broad procedural mottle, diagonal ribbons, and sparse particulate instead of relying only on faint tiled mask layers.
- Strengthened B2 mid post-darkness brine/sediment atmosphere with guarded screen veil, wider horizontal bands, and more suspended particulate outside and through the lamp volume.
- Added a restrained B3 lower post-darkness haze so sparse proof frames do not collapse to a blank lamp-only read.
- Added B4 lower runtime presentation fixes: stronger pre-foreground cold veil over background layers, guarded post-darkness ruin veil, and a heavily dimmed/softened `biome-ruins-vault-causeway-lattice` renderer presentation.

Changed files in this revision:
- `src/helpers.ts`
- `src/scene-rendering.ts`
- `runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/`
- `runs/water9-water-column-atmosphere-v1-2026-07-04/report-revision2.md`

Build:
- `npm run build` passed.
- Existing Vite unresolved `/assets/generated/...` runtime asset warnings remained.
- Existing chunk-size warning remained.

Proof:
- Proof dir: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/`
- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/contact-sheet.png`
- Provenance: `/mnt/nxt-dev/water9/runs/water9-water-column-atmosphere-v1-2026-07-04/proof-revision2/provenance.json`
- Mode: paired same-runtime baseline with water column disabled, then revised water column enabled.
- Source: actual normal gameplay `#game canvas`.
- Selected port: `5180`
- No listener remained on ports `5180-5199` after proof capture.

Proof captures:
- B1 surface 119 m: baseline/after color and grayscale plus drift still.
- B1 upper 180 m: baseline/after color and grayscale.
- B2 mid 760 m: baseline/after color and grayscale plus drift still.
- B3 lower 1260 m: baseline/after color and grayscale.
- B4 lower 1260 m: baseline/after color and grayscale.

Visual self-check:
- B1 after frames now show clear broad volume and mottle at gameplay scale, with the player still readable in color and grayscale.
- B2 after frame has a wider horizontal brine/sediment field beyond the lamp cone. The scene is still dark by design, so manager inspection should judge whether this is enough.
- B3 after frame retains readable player/lamp state and has some lower-band water atmosphere without deep caustics.
- B4 after frame no longer presents the same small bright hard rectangle from revision1; the ruin background is more veiled/dimmed, but it remains the riskiest frame for manager inspection.

Caveats:
- B4 was fixed with renderer-side veil/dim/softening only. No landmark art was generated or replaced, and no landmark pool/selection/framing logic was intentionally redesigned.
- The proof playtest target can land on slightly different live world/background arrangements between runs; the final `proof-revision2` artifacts are the authoritative revision2 proof.

Do not accept yet; manager visual inspection required.
