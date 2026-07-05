You are codex-dev working for mgr-water9 on Water9.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: /mnt/nxt-dev/water9 only.
Goal: correct the rejected restoration attempt for Water9 distant biome background landmarks.

Important context:
- The previous restore attempt was cancelled/rejected before acceptance.
- Do not commit or preserve its visual result.
- Work with the current dirty tree, but fix the named failures instead of starting a broad redesign.

Run ledger:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04.md

Forensic report:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/forensic-report.md

Rejected proof from previous attempt:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/restore-proof/restore-proof-contact-sheet.png

Manager rejection:
- B2 mid 760 still reads as vertical dark pillars/spotlight. It must match the July 3 horizontal dark sulfide shelf/ledge background, not vertical columns.
- B3 lower 1260 is nearly blank except the lamp cone. It must restore the pale high-key horizontal shelf/plate background from the July 3 proof.
- B1 surface/upper still shows obvious flat shell-arch geometry. It must be a hazy top/background shelf/reef read like Alex's screenshot, not foreground vector arches/circles.
- B4 lower 1260 is closest but still verify against the diagonal submerged structure proof.

Target reference proofs:
- Overview/contact: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png
- B1 surface 119: /mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png
- B1 upper 180: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png
- B2 mid 760: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png
- B3 lower 1260: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png
- B4 lower 1260: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png

Write early report:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/correction-report.md

Proof output:
- /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/correction-proof/

Implementation constraints:
- Preserve unrelated dirty work.
- Do not use destructive git or filesystem commands.
- Do not delete Alex/reference run artifacts.
- Do not claim acceptance; manager will inspect.
- Fix the actual runtime `#game canvas` read, not only metadata.
- If the existing asset cannot produce the target read, use/restore the prior July 3 asset path or tune placement/cropping/opacity/selection so the live normal gameplay canvas matches the reference.

Proof requirements:
- Use ports only 5180-5199.
- Capture actual normal gameplay `#game canvas`.
- Required color and grayscale captures:
  - B1 surface 119
  - B1 upper 180
  - B2 mid 760
  - B3 lower 1260
  - B4 lower 1260
- Include a contact sheet plus provenance/runtime metadata.
- The proof must demonstrate the old rejected reads are gone:
  - no vertical pillar/spotlight B2 composition
  - no blank B3 lamp-cone-only composition
  - no obvious flat B1 shell-arch/circle foreground composition

Verification:
- Run build/typecheck if practical.
- Stop any dev server you start.

Commit safety:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Commit expectation:
- Commit only if proof and verification are complete and only assigned paths are staged.
- If commit safety is blocked by pre-existing dirty state, leave the report/patch and explain why.

Return block:
STATUS: DONE / BLOCKED
REPORT: path
COMMIT: hash or reason not committed
CHANGED_FILES: explicit list
PROOF: color + grayscale paths + contact sheet
VERIFICATION: commands/results
CAVEATS: anything manager must inspect
