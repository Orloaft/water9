# Water9 Distant Landmark Asset/Runtime Restoration Relaunch

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the single commit-capable Water9 worker for this pass, but DO NOT commit. Work only in `/mnt/nxt-dev/water9`.

Context:
- This is a relaunch after the prior asset/runtime restore dispatch did not produce the required report/proof artifacts.
- Do not assume the previous wrapper succeeded unless you find completed artifacts on disk.
- Preserve unrelated dirty work. Do not revert existing edits you did not make.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage. For this pass, do not actually commit.

Read first:
- `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04.md`
- `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/manager-report.md`
- Reference proof set:
  - `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png`
  - B1 surface 119: `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png`
  - B1 upper 180: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png`
  - B2 mid 760: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png`
  - B3 lower 1260: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png`
  - B4 lower 1260: `/mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png`
- Latest rejected proof:
  - `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/asset-restore-proof/water9-distant-landmark-asset-restore-contact-sheet.png`

Goal:
Recover the distant-landmark known fix after repeated visual failures. This is not another opacity/blend tuning pass. Replace/reframe the bad source/runtime assets so normal gameplay canvas proof matches the subtle wide July 3 background read.

Current named failures:
- B2 must not be a vertical spotlight, curtain, chimney, shaft, column stack, or foreground pasted cutout.
- `water9-biome-landmark-brine-vent-sulfide-shelf.png` currently appears to be the wrong asset: a procedural-looking vertical curtain/chimney. Do not accept it just because the id sounds right.
- `water9-biome-landmark-brine-shelf-gpt.png` may be closer painterly/horizontal source, but current runtime crops/scales it into a narrow vertical-ish read. Inspect and reframe/crop/rebuild as needed.
- B3/B4 must not show rectangular bitmap source bounds. Fix the source alpha/cutout/mask/runtime framing so the rectangular windows are gone in normal gameplay. Blend modes alone have already failed.
- Preserve B1 if it continues to read organic and does not reintroduce flat shell/arch/circle/card shapes.

Scope:
- Inspect current asset files, source inbox files, build scripts, manifest entries, and render path involved in generated background/landmark loading.
- Make the smallest source/cutout/runtime patch that removes the named failures.
- If you generate replacement/cutout assets, keep them deterministic from repo-local source images/scripts where practical and put outputs under the existing generated asset conventions.
- Do not touch Telegram bindings, gateway config, systemd, cron, public integrations, or any repo outside `/mnt/nxt-dev/water9`.

Port/server rules:
- Use dev server/smoke ports only in 5180-5199. If a port is busy, pick another in range. Never kill processes outside that range.
- Vite must not watch `.desktop-build`.

Verification:
- Write `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/asset-runtime-restore-report.md` before long capture loops, then update it before returning.
- Run `npm run build`.
- Capture actual normal gameplay `#game canvas` proof, not debug harness screenshots and not first-water/immediate-landmark-only sheets.
- Required proof locations:
  - color and grayscale captures under `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/asset-runtime-restore-proof/`
  - contact sheet at `/mnt/nxt-dev/water9/runs/water9-distant-landmark-known-fix-2026-07-04/asset-runtime-restore-proof/water9-distant-landmark-asset-runtime-restore-contact-sheet.png`
- Required captures:
  - B1 surface 119
  - B1 upper 180
  - B2 mid 760
  - B3 lower 1260
  - B4 lower 1260
- Include runtime provenance proving the captures came from `#game canvas`, with current HEAD, selected port, manifest asset ids/paths, and visible anchors.

Self-check before returning:
- If B2 still reads as any vertical shaft/chimney/curtain/spotlight composition, return BLOCKED or NEEDS_MANAGER_REJECTION, not ready.
- If B3/B4 still show hard rectangular bitmap windows, return BLOCKED or NEEDS_MANAGER_REJECTION, not ready.
- If B1 regresses to flat shell/arch/circle/card shapes, return BLOCKED or NEEDS_MANAGER_REJECTION, not ready.

Return block:
- Status: READY_FOR_MANAGER_VISUAL_REVIEW, NEEDS_MANAGER_REJECTION, BLOCKED, or MOUNT_DOWN.
- Changed files.
- Exact proof paths.
- `npm run build` result.
- What changed for B2, B3, and B4.
- Caveats and any remaining visual risk.
- Exact line: `Do not accept yet; manager visual inspection required.`
