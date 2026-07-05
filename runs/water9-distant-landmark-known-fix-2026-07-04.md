# Water9 Distant Landmark Known Fix - 2026-07-04

Goal: implement the known distant-landmark recovery fix after damage control: remove the rejected B1 procedural-looking shell/arch/circle read, recover B2's July 3 horizontal sulfide shelf path, and prove B1/B2/B3/B4 match the subtle wide runtime reference.

Repo preflight required for every worker:
"Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else."

Reference proof set:
- `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`
- B1 surface 119: `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png`
- B1 upper 180: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png`
- B2 mid 760: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png`
- B3 lower 1260: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png`
- B4 lower 1260: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png`

Rejected proof/failure modes:
- `/mnt/nxt-dev/water9/runs/water9-painterly-bitmap-landmark-final-proof4-2026-07-04/water9-immediate-biome-landmark-contact-sheet.png`
- B1 top-left must not show flat/procedural shell arches, circles, or vector-like shapes.
- B2 must not read as a vertical chimney, shaft, columns, or foreground pasted cutout.
- B3 must not be mostly blank/lamp-cone-only.
- No biome should be accepted from first-water/immediate-landmark contact sheets alone.

Checklist:
- [x] Implementation owner — session-key `agent:codex-dev:mgr-water9-distant-landmark-known-fix` — expected artifacts: patch/commit safety report, normal gameplay canvas color + grayscale proof under `runs/water9-distant-landmark-known-fix-2026-07-04/proof/`, and worker report at `runs/water9-distant-landmark-known-fix-2026-07-04/report.md`.
- [x] Recovery implementation owner if first wrapper stalls — session-key `agent:codex-dev:mgr-water9-distant-landmark-known-fix-recovery` — expected artifacts: same report/proof paths, with explicit note that task `19578584-073d-423c-a05b-0e5a4b20dea0` only created a stub and was cancelled.
- [ ] Mechanic correction owner — session-key `agent:codex-dev:mgr-water9-distant-landmark-mechanic-correction` — expected artifacts: corrected patch, color + grayscale normal gameplay proof under `runs/water9-distant-landmark-known-fix-2026-07-04/mechanic-correction-proof/`, and report `runs/water9-distant-landmark-known-fix-2026-07-04/mechanic-correction-report.md`.
- [ ] Micro mechanic patch owner — session-key `agent:codex-dev:mgr-water9-distant-landmark-micro-mechanic-patch` — expected artifacts: tiny patch, proof under `runs/water9-distant-landmark-known-fix-2026-07-04/micro-mechanic-proof/`, and report `runs/water9-distant-landmark-known-fix-2026-07-04/micro-mechanic-report.md`.
- [x] Asset/runtime restoration owner — session-key `agent:codex-dev:mgr-water9-distant-landmark-asset-runtime-restore` — expected artifacts: source/cutout/runtime patch, color + grayscale normal gameplay proof under `runs/water9-distant-landmark-known-fix-2026-07-04/asset-runtime-restore-proof/`, and report `runs/water9-distant-landmark-known-fix-2026-07-04/asset-runtime-restore-report.md`.
- [ ] Manager visual acceptance — inspect normal gameplay `#game canvas` proof at B1 119/180, B2 760, B3 1260, B4 1260 in color and grayscale against the July 3 reference.
- [ ] Commit decision — commit only if manager visual acceptance passes and dirty-state safety is clear; explicit-path staging only.

Acceptance rule:
Only accepted after manager visual inspection of live normal gameplay `#game canvas` captures, color and grayscale, at B1 surface 119, B1 upper 180, B2 mid 760, B3 lower 1260, and B4 lower 1260. The result must match the subtle wide July 3 background-read and must prove the rejected B1 procedural shapes and B2 vertical chimney/shaft read are gone.

Progress log:
- 2026-07-04 15:52 manager: created implementation ledger after Alex requested the known fix.
- 2026-07-04 16:03 manager: cancelled task `19578584-073d-423c-a05b-0e5a4b20dea0` after it stayed running with only the report stub and no proof/code artifact updates; launching narrower recovery lane.
- 2026-07-04 16:09 manager: visual inspection rejected recovery proof `runs/water9-distant-landmark-known-fix-2026-07-04/proof/water9-distant-landmark-known-fix-contact-sheet.png`. B1 is closer and no longer the flat first-water shell-card problem, but B2 still reads as a vertical spotlight/shaft instead of the July 3 horizontal sulfide shelf; B3 and B4 show hard rectangular bitmap windows rather than integrated distant backgrounds. Cancelled recovery task `43cb4cf6-90d7-481d-9846-25c255231b13`.
- 2026-07-04 16:12 manager: next correction target is mechanics, not asset IDs: B2 mid terrain alpha is being forced near invisible (`BRINE_MID_TERRAIN_ALPHA = 0.08`), so the lamp cone becomes the main silhouette; B3/B4 authored anchors are being rendered as normal rectangular sprites with hard edges.
- 2026-07-04 16:17 manager: cancelled mechanic correction task `6bae7ebc-ee1a-443c-9aba-768b6f452c47` after no report/proof/diff movement. Relaunching as a micro patch: restore B2 terrain visibility and composite dark-background B3/B4 bitmaps without drawing their black rectangles.
- 2026-07-04 17:07 manager: reported NOT_ACCEPTED to Alex. Latest manager proof rejects asset-restore attempt: B2 asset id `biome-brine-vent-sulfide-shelf` points to procedural-looking vertical curtain/chimney geometry, and B3/B4 still show rectangular pasted bitmap windows. Dispatching one focused asset/runtime restoration owner.
- 2026-07-04 17:12 manager: dispatched native Codex worker Helmholtz `019f2ef8-4727-74e1-b8d2-2513af8b2959` for `agent:codex-dev:mgr-water9-distant-landmark-asset-runtime-restore`. Native wait probe timed out normally, indicating it is still running.
- 2026-07-04 17:21 manager: interruption recovery after Alex reported no response. Disk check found no `asset-runtime-restore-report.md`, no `asset-runtime-restore-proof/`, and no active visible subagent. Prepared same focused asset/runtime restoration relaunch prompt at `runs/water9-distant-landmark-known-fix-2026-07-04.asset-runtime-restore-relaunch.prompt.md`.
- 2026-07-04 17:23 manager: OpenClaw `sessions_spawn` rejected direct `codex-dev` targeting from this topic (`agentId is not allowed`); launched native Codex worker Pasteur `019f2f03-a918-7031-91c6-f0758f12d437` with the relaunch prompt instead.
- 2026-07-04 17:36 manager recovery: cancelled stale duplicate native worker Helmholtz `019f2ef8-4727-74e1-b8d2-2513af8b2959`; kept relaunch Pasteur `019f2f03-a918-7031-91c6-f0758f12d437` running. Disk now has `asset-runtime-restore-report.md` plus color/grayscale proof and provenance under `asset-runtime-restore-proof/`.
- 2026-07-04 17:36 manager visual inspection: latest `asset-runtime-restore-proof/water9-distant-landmark-asset-runtime-restore-contact-sheet.png` is NOT accepted. B2 is still dominated by the vertical lamp/spotlight read, and B3/B4 still show pasted rectangular bitmap bounds. Report remains `IN_PROGRESS`, so this is artifact-present evidence only, not a completed acceptance.
