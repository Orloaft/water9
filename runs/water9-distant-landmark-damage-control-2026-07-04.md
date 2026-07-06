# Water9 Distant Landmark Damage Control - 2026-07-04

Goal: recover the subtle, wide distant biome background landmark look from Alex's reference screenshots, and stop further replacement with oversized mixed-style foreground-like cutouts.

Repo preflight required for every worker:
"Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else."

Reference target from Alex screenshots:
- B1 surface 119 / B1 upper 180: hazy shallow reef/overhang shelf near top of frame, soft and distant.
- B2 mid 760: dark, subtle wreck/ledge/reef plate, readable but not foreground pasted.
- B3 lower 1260: pale high-key horizontal shelf/ice-sand/plate forms, soft grayscale-readable background.
- B4 lower 1260: large diagonal submerged structural spans/pipes across the scene, atmospheric and wide.

Rejected current direction:
- Giant pasted painterly landmark cutouts dominating the normal gameplay canvas.
- Flat procedural/vector shell arches and circles replacing prior subtle plates.
- Mixed bitmap/procedural composition where one biome has painterly art and another has obvious generated shapes.

Checklist:
- [x] Forensic read-only audit — session-key `agent:codex-dev:mgr-water9-distant-landmark-damage-control-audit` — expected artifact `runs/water9-distant-landmark-damage-control-2026-07-04/forensic-report.md`
- [ ] Restoration implementation owner — session-key TBD after audit — expected artifacts: patch/commit, normal gameplay canvas proof for B1 surface/upper, B2 mid, B3 lower, B4 lower, grayscale proof, report.
- [ ] Manager visual acceptance — compare live `#game canvas` captures against Alex's reference target before reporting accepted.

Iteration log:
- 2026-07-04 14:49 manager: rejected/cancelled restore attempt `agent:codex-dev:mgr-water9-distant-landmark-damage-control-restore` before acceptance. Proof existed at `runs/water9-distant-landmark-damage-control-2026-07-04/restore-proof/restore-proof-contact-sheet.png`, but B2 still read as vertical dark pillars/spotlight instead of the July 3 horizontal sulfide shelf, B3 was nearly blank except lamp cone instead of pale shelf, and B1 still showed obvious flat shell-arch geometry. Do not resume this result or commit it as a pass.
- 2026-07-04 15:01 manager: rejected/cancelled correction attempt `agent:codex-dev:mgr-water9-distant-landmark-damage-control-correction` before acceptance. Proof existed at `runs/water9-distant-landmark-damage-control-2026-07-04/correction-proof/correction-proof-contact-sheet.png`, but B2 still read as vertical shaft/columns, B3 was still lamp-cone-only/blank, and B1 still read as flat arch/circle geometry. Pattern change for next pass: stop tuning scale/opacity; surgically recover the actual July 3 asset/source/runtime path for B2 and B3 and prove the rejected silhouettes are gone.
- 2026-07-06 heartbeat: no active task found for this stale pending ledger; asked Alex whether to continue or mark it ABANDONED.

Acceptance rule:
Only accept after manager inspection of normal gameplay `#game canvas` color + grayscale captures at B1 surface/upper, B2 mid, B3 lower, and B4 lower. The result must match the subtle wide background-read of Alex's reference, not the oversized foreground-cutout recovery proofs.
