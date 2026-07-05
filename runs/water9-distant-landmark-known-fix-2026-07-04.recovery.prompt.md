You are the recovery implementation owner for Water9 distant landmark damage control.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. The prior task `19578584-073d-423c-a05b-0e5a4b20dea0` was cancelled because it only created a report stub and then made no visible progress. Do not resume a hidden redesign. Finish the existing narrow goal from disk.

First commands:
- `pwd`
- `git -C /mnt/nxt-dev/water9 rev-parse --show-toplevel`
- `git -C /mnt/nxt-dev/water9 status --short`
- Inspect `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/report.md`

Safety:
- Preserve unrelated dirty work.
- Do not run destructive git/filesystem commands.
- Do not commit.
- Make only the smallest source/manifest/asset changes needed for this visual fix.
- Use ports 5180-5199 only for dev server/proof. If a port is busy, pick another in range; do not kill processes outside that range.

Report path to update throughout:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/report.md`

Hard target:
Recover the July 3 subtle distant background look in normal gameplay canvas:
- B1 119/180: soft hazy top/background shelf. The rejected flat/procedural shell arches/circles/vector shapes must be gone.
- B2 760: restore/use `biome-brine-vent-sulfide-shelf` as the horizontal dark shelf/ledge. The rejected vertical chimney/shaft/columns read must be gone.
- B3 1260: visible pale horizontal shelf/plate/rib forms. Not blank/lamp-cone-only.
- B4 1260: wide diagonal structures remain atmospheric; preserve if good.

Reference images:
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png`
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png`

Useful forensic context:
- `/mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/forensic-report.md`
- It identifies the good B2 path as `biome-brine-vent-sulfide-shelf` and the bad later path as `biome-brine-vertical-chimney-gpt`.
- It identifies the B1 failure as surface/immediate-landmark scaling of flat shell arch geometry.

Proof requirement:
Produce actual Water9 normal gameplay `#game canvas` PNGs, color and grayscale, under:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/proof/`

Required captures:
- B1 surface 119
- B1 upper 180
- B2 mid 760
- B3 lower 1260
- B4 lower 1260

Also produce a contact sheet from those captures. Do not use the old first-water/immediate-landmark contact sheet as acceptance proof.

Verification:
- Run `npm run build` unless the repo clearly has a narrower existing typecheck command.
- Record exact proof command/port.

Return in `report.md` and final message:
- Status: PATCH_READY, BLOCKED, or MOUNT_DOWN.
- What changed.
- Proof paths.
- Verification summary.
- Caveats.
- Exact line: `Do not accept yet; manager visual inspection required.`
