You are codex-dev working for mgr-water9 on Water9.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: /mnt/nxt-dev/water9 only.
Mode: READ-ONLY FORENSIC AUDIT. Do not edit files. Do not generate assets. Do not stage or commit.

Goal: find the exact prior assets/code/run artifacts that match Alex's "good" distant biome background landmark screenshots, because later agents replaced them with ugly mixed painterly/procedural foreground-like cutouts.

Run ledger: /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04.md
Write your report to: /mnt/nxt-dev/water9/runs/water9-distant-landmark-damage-control-2026-07-04/forensic-report.md
Create the report stub early, then fill it in.

Alex's reference target:
- B1 surface 119 and B1 upper 180: subtle hazy shallow reef/overhang shelf near the top/background, soft and distant, not flat shell-arch vector shapes.
- B2 mid 760: dark subtle wreck/ledge/reef plate across the background, visible but not a huge pasted chimney/cathedral sprite.
- B3 lower 1260: pale high-key horizontal shelf/ice-sand/plate forms, soft and grayscale-readable.
- B4 lower 1260: huge diagonal submerged structural spans/pipes crossing the scene, atmospheric and wide.

Known rejected current direction:
- /mnt/nxt-dev/water9/runs/water9-painterly-landmark-visual-recovery-2026-07-04/water9-painterly-landmark-visual-recovery-contact-sheet.png looks like the bad direction: giant pasted B2/B3/B4 assets and flat/vector B1.
- Current dirty tree has many untracked generated assets and run folders. Do not assume latest == good.

What to inspect:
1. `git status --short` and recent dirty diffs for background/landmark code:
   - src/helpers.ts
   - src/scene-rendering.ts
   - src/scene-playtest.ts
   - src/types.ts
   - public/assets/generated/background-phase3/background-phase3.manifest.json
   - tools/build_*background* and tools/review_*background* / landmark scripts
2. Run artifacts under `/mnt/nxt-dev/water9/runs`, especially screenshots/contact sheets that visually resemble Alex's good reference. Search by filenames and inspect likely images:
   - phase11-normal-entry-patch
   - background-phase / phase3 / phase8 / phase9 / phase11
   - painterly-restoration-before/after/final
   - immediate-biome-landmark-proof
   - biome-background-screenshot-assessment
3. Generated/source assets under:
   - public/assets/generated/background-phase3/
   - tools/source-inbox/

Output requirements:
- Report the current HEAD and whether the repo was dirty.
- List the best matching prior proof images for each target band (B1 surface/upper, B2 mid, B3 lower, B4 lower), with absolute paths.
- Identify which assets and code path likely produced those good proofs.
- Identify the likely breaking change(s): file/function/asset IDs and why they caused the oversized pasted/procedural mixed look.
- Recommend the smallest restoration implementation prompt for the next worker. It must preserve unrelated dirty work, avoid destructive git commands, and require normal gameplay `#game canvas` color + grayscale proof.
- Do not claim acceptance. Manager will visually inspect after implementation.

Return block:
STATUS: DONE or BLOCKED
REPORT: path
BEST_MATCHES: per biome/depth
LIKELY_BREAK: concise
NEXT_PROMPT: concise implementation prompt draft
