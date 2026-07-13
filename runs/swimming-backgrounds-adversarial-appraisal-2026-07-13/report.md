# Swimming Backgrounds Adversarial Appraisal

Status: Stage 1 retention verification complete; appraisal in progress.

## Checkpoint and retention inventory

The starting branch was `ux-work` at `7497c21`, 12 commits ahead of
`origin/ux-work`. The pre-checkpoint worktree contained 786 dirty paths: two
tracked manager-ledger edits and 784 untracked paths, all under `runs/`. No
source or product-code dirt was present.

Classification was exhaustive by path:

- Durable Git records in the recovered checkpoint: 57 Markdown
  ledgers/prompts/reports (including the two tracked ledger edits, the appraisal
  ledger, original prompt, recovery prompt, and this report), 112 structured
  JSON measurements at or below 1 MiB, 15 archive manifests, four Python
  reproduction/validation scripts, three MJS capture/measurement scripts, one
  text preservation marker, one SHA-256 list, one GPL palette, and the narrow
  `.gitignore` update: 195 paths total. The largest staged file is a structured
  measurement of 1,018,950 bytes. No PNG, status/log file, or file over 1 MiB
  is staged. The exact durable path list is the checkpoint commit name list;
  staging passed each recovery path explicitly.
- Bulky/transient evidence: 584 PNG files, 12 raw `.status` logs, and 12 raw
  JSON measurements larger than 1 MiB (608 files; 187,369,407 bytes). Every
  path remains in its original untracked location. Every file was also copied
  below `/home/orlovboros/artifacts/managers/water9/<run-slug>/`, and source and
  archive SHA-256 values were compared after the copy. The 15 manifests below
  enumerate every archived path, checksum, byte count, timestamp, and role.

| Run / manifest | Files | Bytes | Archive root |
| --- | ---: | ---: | --- |
| `current-diver-sprite-audit-2026-07-11.artifacts.json` | 9 | 4,734,385 | `/home/orlovboros/artifacts/managers/water9/current-diver-sprite-audit-2026-07-11/` |
| `diver-v2-asset-production-2026-07-11.artifacts.json` | 100 | 3,851,279 | `/home/orlovboros/artifacts/managers/water9/diver-v2-asset-production-2026-07-11/` |
| `diver-v3-a-character-bible-2026-07-11.artifacts.json` | 6 | 6,828,468 | `/home/orlovboros/artifacts/managers/water9/diver-v3-a-character-bible-2026-07-11/` |
| `diver-v3-a-mining-gif-2026-07-11.artifacts.json` | 14 | 5,689,246 | `/home/orlovboros/artifacts/managers/water9/diver-v3-a-mining-gif-2026-07-11/` |
| `diver-v3-gold-master-concepts-2026-07-11.artifacts.json` | 6 | 6,646,906 | `/home/orlovboros/artifacts/managers/water9/diver-v3-gold-master-concepts-2026-07-11/` |
| `glasshook-wall-fold-fix-2026-07-12.artifacts.json` | 1 | 395,440 | `/home/orlovboros/artifacts/managers/water9/glasshook-wall-fold-fix-2026-07-12/` |
| `progression-radio-dialogue-expansion-2026-07-13.artifacts.json` | 12 | 4,227,028 | `/home/orlovboros/artifacts/managers/water9/progression-radio-dialogue-expansion-2026-07-13/` |
| `water9-adversarial-60fps-postfix-review-2026-07-09.artifacts.json` | 46 | 11,268,494 | `/home/orlovboros/artifacts/managers/water9/water9-adversarial-60fps-postfix-review-2026-07-09/` |
| `water9-adversarial-performance-framerate-review-2026-07-10.artifacts.json` | 48 | 19,125,335 | `/home/orlovboros/artifacts/managers/water9/water9-adversarial-performance-framerate-review-2026-07-10/` |
| `water9-b4-performance-implementation-2026-07-09.artifacts.json` | 13 | 3,609,844 | `/home/orlovboros/artifacts/managers/water9/water9-b4-performance-implementation-2026-07-09/` |
| `water9-holistic-framerate-pass-2026-07-10.artifacts.json` | 76 | 27,934,024 | `/home/orlovboros/artifacts/managers/water9/water9-holistic-framerate-pass-2026-07-10/` |
| `water9-restore-worldgen-splitting-2026-07-09.artifacts.json` | 50 | 14,578,071 | `/home/orlovboros/artifacts/managers/water9/water9-restore-worldgen-splitting-2026-07-09/` |
| `water9-sonar-minimap-performance-restore-2026-07-09.artifacts.json` | 26 | 9,051,140 | `/home/orlovboros/artifacts/managers/water9/water9-sonar-minimap-performance-restore-2026-07-09/` |
| `water9-startup-save-perf-enforcement-2026-07-09.artifacts.json` | 136 | 52,184,920 | `/home/orlovboros/artifacts/managers/water9/water9-startup-save-perf-enforcement-2026-07-09/` |
| `water9-thorough-performance-review-2026-07-09.artifacts.json` | 65 | 17,244,827 | `/home/orlovboros/artifacts/managers/water9/water9-thorough-performance-review-2026-07-09/` |

The ignore additions are deliberately run-scoped: only archived PNG proof,
the archived status files, and the 12 individually named large JSON files are
ignored. They do not hide reports, prompts, scripts, small measurements, or
manifests. No pre-existing file was deleted, moved, or untracked. Recovery
revalidated all 608 manifest entries rather than sampling: each original and
archive copy exists, each reported byte count matches, and both copies match
the manifest SHA-256 (15 manifests; 187,369,407 bytes total).
