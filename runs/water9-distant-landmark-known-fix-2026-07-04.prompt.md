You are the implementation owner for Water9 distant landmark damage control.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Also run `pwd`, `git rev-parse --show-toplevel`, and `git status --short` before editing. Preserve unrelated dirty work. Do not run destructive git/filesystem commands. Do not commit in this pass; leave changes dirty for manager visual acceptance. If you later need to explain commit safety, use this rule: "Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage."

Create this report stub before long proof/screenshot loops:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/report.md`

Goal:
Implement the known fix for the distant biome background landmarks. Recover the subtle, wide July 3 runtime background look. Remove the rejected B1 procedural-looking shell/arch/circle read. Recover B2's horizontal sulfide shelf path. Fix B3 lower so it is not blank/lamp-cone-only. Preserve B4 if it already matches the reference.

Primary reference proof set:
- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`
- B1 surface 119: `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png`
- B1 upper 180: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png`
- B2 mid 760: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png`
- B3 lower 1260: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png`
- B4 lower 1260: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png`

Forensic context:
- Existing forensic report: `/mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/forensic-report.md`
- Existing damage-control ledger: `/mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04.md`
- Good B2 proof used asset id `biome-brine-vent-sulfide-shelf` and source path `/mnt/nxt-dev/water9/public/assets/generated/background-phase3/water9-biome-landmark-brine-vent-sulfide-shelf.png`.
- Bad later direction introduced/reinforced `biome-brine-vertical-chimney-gpt` and first-water/immediate-landmark proof scripts. Do not accept those as proof.
- B1 rejected read is the top-left first-water image with flat/procedural shell arches/circles/vector-like shapes. The fix must prove those shapes are gone in normal gameplay at depth 119 and 180.

Implementation constraints:
- Make the smallest source/manifest/asset changes needed.
- Prefer existing July 3 assets/source/runtime path on disk. Do not generate new art unless you prove the required source is missing and explain why in the report.
- Do not broaden into unrelated rendering refactors, HUD work, control changes, save/load changes, Telegram bindings, gateway config, systemd units, cron, or external integrations.
- Vite/dev server ports must be in 5180-5199. If a port is busy, choose another in that range; do not kill processes outside it. Vite must not watch `.desktop-build`.
- Proof must be actual Water9 normal gameplay `#game canvas`, not generated-only review sheets, not first-water/immediate-landmark-only contact sheets, and not a review harness that hides HUD/game identity.

Required visual result:
- B1 surface 119 and upper 180: hazy shallow reef/overhang/top-background shelf, soft and distant. No flat shell arch/circle/vector procedural shapes.
- B2 mid 760: dark, subtle horizontal sulfide shelf/wreck/ledge/reef plate. No vertical chimney, shaft, columns, or foreground pasted cutout.
- B3 lower 1260: visible pale high-key horizontal shelf/plate/rib forms. Not mostly blank and not lamp-cone-only.
- B4 lower 1260: large diagonal submerged structural spans/pipes, atmospheric and wide; preserve if already good.

Required proof artifacts under:
`/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/proof/`

Capture normal gameplay `#game canvas` color and grayscale PNGs for:
- B1 surface 119
- B1 upper 180
- B2 mid 760
- B3 lower 1260
- B4 lower 1260

Also produce a contact sheet for those captures and a provenance/notes JSON if your capture script can record visible anchor ids. The manager will inspect the images manually; do not self-accept.

Verification:
- Run the focused project check needed for this change, preferably `npm run build` or the repo's typecheck/build command if different.
- If Playwright/capture tooling is used, report the exact command and port.
- Report any dirty paths that pre-existed versus paths you changed.

Return block in `report.md` and in your final message:
- Status: PATCH_READY, BLOCKED, or MOUNT_DOWN.
- Changed files.
- Proof artifact paths.
- Verification command/output summary.
- Caveats/blockers.
- Explicit "Do not accept yet; manager visual inspection required."
