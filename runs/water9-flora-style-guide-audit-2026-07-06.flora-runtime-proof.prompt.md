# Worker Prompt: Flora Runtime Canvas Proof

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only runtime proof lane for Water9, repo `/mnt/nxt-dev/water9`. Current known HEAD from manager preflight is `03b2dad`.

Goal: capture normal-play `#game canvas` proof showing scannable flora and decorative non-scannable flora in the actual game, then compare why the decorative flora works better in context.

Context:
- Alex specifically cares about how flora looks in the game, not standalone static images.
- Visual acceptance requires actual `#game canvas` captures during normal play, representative depth bands, grayscale readability pass, and manager inspection.
- The repo starts dirty from a prior approved scan-reward implementation; do not edit source and do not stage/commit.

Scope:
- You may run a dev server on ports 5180-5199 only. If a port is busy, choose another in range. Never kill processes outside that range.
- Capture normal gameplay from the `#game` canvas. Avoid review-harness-only proof.
- Do not modify source or assets. Write only under `runs/water9-flora-style-guide-audit-2026-07-06/`.

Tasks:
1. Find existing Playwright/smoke utilities for Water9 canvas capture and reuse them if possible.
2. Capture at least these bands:
   - B1/surface or shallow where early scannable flora appears.
   - B2/mid/brine shelf where decorative terrain flora/stamps appear.
   - B3/deep.
   - B4/abyss.
   - Adjacent captures around biome/style cutoffs if feasible.
3. Ensure captures include actual runtime identity: HUD/game canvas and gameplay context.
4. Try to capture both scannable flora and decorative/non-scannable terrain flora in frame. If tooling cannot prove scan state, note the gap and show the best available visual evidence.
5. Produce grayscale variants for every key capture.
6. Produce a contact sheet comparing "current scannable flora read" versus "decorative terrain flora read" in live canvas context.
7. Write a report naming the visual failure modes and the decorative style traits that should become the target.

Suggested artifact names:
- `runs/water9-flora-style-guide-audit-2026-07-06/runtime-proof.md`
- `runs/water9-flora-style-guide-audit-2026-07-06/canvas-*.png`
- `runs/water9-flora-style-guide-audit-2026-07-06/canvas-*-grayscale.png`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-runtime-contact-sheet.png`

Verification:
- Report the dev server port used and whether it was shut down.
- Report capture count and exact paths.
- Report `git status --short` and confirm only run artifacts were created/modified.

Return block:
- Status
- Report path
- Canvas/contact sheet paths
- Runtime visual verdict
- Caveats/blockers

