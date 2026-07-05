You are codex-dev working for mgr-water9 on Water9.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: /mnt/nxt-dev/water9 only.
Goal: restore the subtle, wide distant biome background landmark look from Alex's reference screenshots and the July 3 runtime proofs. Do not invent a new art direction.

Run ledger:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04.md

Forensic report to use as source of truth:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/forensic-report.md

Write your implementation report early at:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/restore-report.md

Reference proofs to match:
- Overview/contact: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png
- B1 surface 119: /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png
- B1 upper 180: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png
- B2 mid 760: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png
- B3 lower 1260: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png
- B4 lower 1260: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png

Rejected proof/direction:
- /mnt/nxt-dev/water9/runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery-contact-sheet.png
- Do not preserve this look: giant pasted B2/B3/B4 landmark cutouts, flat/vector B1 shell arches, or first-water proof framing that hides the target depth bands.

Scope:
1. Inspect current dirty state first. Preserve unrelated dirty work.
2. Make the smallest source/manifest/tool changes needed to restore the July 3 distant runtime read.
3. In particular, restore B2 mid to the prior `biome-brine-vent-sulfide-shelf` asset/code path instead of `biome-brine-vertical-chimney-gpt`.
4. Keep B1 at 119/180 as a hazy top/background shelf, not a giant flat shell prop.
5. Tune B3 and B4 lower placement/scale/opacity to the wide distant 1260 proofs, not the giant immediate cutouts.
6. Do not run destructive git/filesystem commands. Do not delete or reset unrelated files.

Likely files, but inspect before editing:
- src/helpers.ts
- src/scene-rendering.ts
- src/scene-playtest.ts
- public/assets/generated/background-phase3/background-phase3.manifest.json
- tools/review_*landmark* or background proof scripts if needed for target captures

Proof requirements:
- Use dev server/smoke ports only in 5180-5199. If a port is busy, pick another in range; never kill processes outside it.
- Capture actual normal gameplay `#game canvas`, not harness-only or contact-sheet-only proof.
- Required color captures:
  - B1 surface 119
  - B1 upper 180
  - B2 mid 760
  - B3 lower 1260
  - B4 lower 1260
- Required grayscale captures for the same bands.
- Put proof under /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/restore-proof/
- Include enough runtime metadata to prove generated/bitmap assets loaded in the live runtime.

Verification:
- Run the project typecheck/build command used by this repo if practical (`npm run build` or equivalent after inspecting package scripts).
- Run a focused Playwright/proof script or create a narrow proof script only if needed.
- Stop any dev server you start and report final port cleanup.

Commit safety:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Commit expectation:
- If the restoration is implemented, verified, and the changed paths are only assigned paths, commit it.
- If unrelated dirty state prevents a safe commit, leave a patch/report and explain exactly why.

Return block:
STATUS: DONE / BLOCKED
REPORT: path
COMMIT: hash or reason not committed
CHANGED_FILES: explicit list
PROOF: color + grayscale paths
VERIFICATION: commands/results
CAVEATS: anything manager must inspect

Do not claim visual acceptance. The manager will inspect the proof against Alex's reference before reporting accepted.
