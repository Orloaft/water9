# Water9 Biome 2/3 Landmark Redo - 2026-07-03

Status: PASS_WITH_CAVEATS

Repo preflight:
- `pwd`: `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`
- `git rev-parse --short HEAD`: `7776913`

Cleanup:
- Moved rejected proof artifacts out of the repo:
  `/home/orlovboros/.local/share/Trash/files/water9-rejected-runs/water9-biome-2-3-landmark-parity-2026-07-03`
- Preserved the broad pre-existing dirty Water9 background worktree and untracked generated assets/tools.

Implementation:
- `src/helpers.ts`
  - Removed Biome 2 landmark eligibility from the `upper` band so Brine Vent Shelf anchors cannot appear in surface-entry/upper presentation.
  - Removed Biome 3 landmark eligibility from the `upper` band.
  - Tightened Biome 2/3 normal-band authored landmark placement, scale, and anchor alpha.
  - Correction pass raised only the Biome 2/3 authored background anchor visibility caps; surface and Biome 4 caps were left unchanged.
- `src/scene-rendering.ts`
  - Reduced the source cutout opacity for Biome 2 and Biome 3 so the old horizontal/washed bitmap slabs do not dominate.
  - Strengthened the procedural Brine Vent Shelf signature: taller chimney clusters, sulfide ledges, brine curtains, and pipe/cable spans.
  - Strengthened the Midnight Trench signature: darker vertical pressure ribs, black-coral fans/gates, and sparse abyssal strands.
  - Correction pass raised only the Brine Vent Shelf and Midnight Trench distant-background sprite alpha scale/caps.

Verification:
- `npx tsc --noEmit --pretty false`: PASS
- Runtime Playwright proof command:
  `WATER9_BIOME_LANDMARK_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03 WATER9_BIOME_LANDMARK_PORT=5238 node tools/review_biome_landmark_implementation.mjs`
- Proof harness result: PASS for all captures.
- Surface-entry ledger: PASS, active band `surface`, `anchorCount: 0`.
- Biome 2 ledger: PASS, 3/3 visible anchors are `biome-brine-vent-sulfide-shelf`, no disallowed transition assets, max alpha `0.78`, max height `630.4`.
- Biome 3 ledger: PASS, 3/3 visible anchors are `biome-midnight-black-coral-ribs`, no disallowed transition assets, max alpha `0.545`, max height `843`.
- Biome 4 ledger: PASS, 2/2 visible anchors are `biome-ruins-vault-causeway-lattice`, no disallowed transition assets.

Proof artifacts:
- Contact sheet:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome-landmark-final-contact-sheet.png`
- Contact sheet HTML:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome-landmark-final-contact-sheet.html`
- Provenance/ledger:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome-landmark-proof-provenance.json`
- Biome 1 surface-entry:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome1-surface-entry-game-canvas.png`
- Biome 1 benchmark:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome1-upper-shell-survey-game-canvas.png`
- Biome 2 color:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome2-mid-vent-sulfide-game-canvas.png`
- Biome 2 grayscale:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome2-mid-vent-sulfide-game-canvas-grayscale.png`
- Biome 3 color:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome3-lower-black-coral-ribs-game-canvas.png`
- Biome 3 grayscale:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome3-lower-black-coral-ribs-game-canvas-grayscale.png`
- Biome 4 comparison:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome4-lower-vault-causeway-game-canvas.png`
- Biome 4 grayscale:
  `/mnt/nxt-dev/water9/runs/water9-biome-2-3-landmark-redo-2026-07-03/water9-biome4-lower-vault-causeway-game-canvas-grayscale.png`

Caveats:
- The proof harness stages a water window and floor for screenshot stability; Biome 3 and Biome 4 remain visually busy because their authored backgrounds are now high-read. The anchors are still rendered by the distant background layer, and manager visual acceptance should inspect the contact sheet.
- I did not commit because the repository was already broadly dirty with pre-existing background/rendering changes and untracked tools/assets. Only the redo-specific tracked code edits are in `src/helpers.ts` and `src/scene-rendering.ts`, plus this new run directory.
