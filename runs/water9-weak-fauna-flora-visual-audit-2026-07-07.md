# Water9 Weak Fauna/Flora Visual Audit - 2026-07-07

Goal: identify the visually weakest fauna and flora sprites currently shipping in Water9, especially white fringes / bad matte backgrounds, and compile a reviewable prioritized list before any repair work starts.

Repo pin at planning time: 971e654

Checklist:

- [x] weak-sprite-visual-audit — session key `weak-sprite-visual-audit`; child `agent:mgr-water9:subagent:aae4bee8-79d0-46b1-868e-1ef3ba6c54b3`; run id `4a5253b7-9aaa-45ac-8ffa-b9df88d06f2d`; REPORTED 2026-07-07 — expected artifacts:
  - `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-review.md`
  - `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-review.json`
  - `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-top-review-contact.png`
  - `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-top-review-contact-gray.png`
  - `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/normal-play-proof.json`

Acceptance rule: report must be review-first, not fix-first. It must rank the weakest fauna/flora sprites by visible failure severity, include evidence paths, and distinguish hard visual defects from subjective polish asks. Proof must include actual `#game canvas` captures during normal play, representative depth bands, grayscale readability proof, and specific flags for white fringe / bad background, bad alpha/matte, low-res blur, procedural/simple shape read, style mismatch, poor scale/crop, and weak gameplay silhouette.

Notes:

- Prior cleanup proof baseline: `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/`
- Current cleanup audit is clean as of commit `971e654`, so this next pass is about visual weakness, not provenance gate failure.
