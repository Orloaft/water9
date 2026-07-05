# Water9 Biome Landmark Acceptance Loop Iter 1

## Status

FAIL

## Changed files

- `src/helpers.ts`
- `src/scene-rendering.ts`

## What changed

- Reduced Biome 2 normal mid-band plate opacity so the brine proof is less dependent on a horizontal scenic slab.
- Widened the Biome 2 brine vent cathedral anchor profile and raised its runtime sprite depth above the background band stack while keeping it behind gameplay terrain/entities.
- Added a Biome 2-specific centered readability silhouette with hydrothermal tower columns, brine-fall strands, and diagonal pipe/cable arches.

## Verification

- `pwd`: `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`
- `git rev-parse --short HEAD`: `7776913`
- `npx tsc --noEmit --pretty false`: PASS
- Runtime proof command: `WATER9_BIOME_LANDMARK_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1 WATER9_BIOME_LANDMARK_PORT=5234 node tools/review_biome_landmark_implementation.mjs`
- Proof command result: script-level PASS, actual `#game canvas` captures written.

## Proof paths

- Contact sheet: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome-landmark-acceptance-contact-sheet.png`
- Provenance: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome-landmark-proof-provenance.json`
- Biome 1 surface-entry: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome1-surface-entry-game-canvas.png`
- Biome 1 benchmark: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome1-upper-shell-survey-game-canvas.png`
- Biome 2 color: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome2-mid-vent-sulfide-game-canvas.png`
- Biome 2 grayscale: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome2-mid-vent-sulfide-game-canvas-grayscale.png`
- Biome 3 color: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome3-lower-black-coral-ribs-game-canvas.png`
- Biome 3 grayscale: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome3-lower-black-coral-ribs-game-canvas-grayscale.png`
- Biome 4 color: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome4-lower-vault-causeway-game-canvas.png`
- Biome 4 grayscale: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/water9-biome4-lower-vault-causeway-game-canvas-grayscale.png`

## Dirty-state classification

Relevant to this pass:

- `src/helpers.ts`
- `src/scene-rendering.ts`
- `runs/water9-biome-landmark-acceptance-loop-2026-07-03-iter1/`

Pre-existing related Water9 background/visual dirty state:

- `package.json`
- `src/scene-playtest.ts`
- `src/scene.ts`
- `src/types.ts`
- `public/assets/generated/background-phase3/`
- prior `runs/water9-*` proof directories
- `tools/build_*background*`, `tools/review_*background*`, and source-inbox generated background files

Unrelated or not touched by this iteration:

- ore/reference/review tooling already present in the dirty tree

## Honest visual verdict

- Biome 2: FAIL / not manager-safe. The rescue pass now shows obvious vertical vent/cathedral columns, especially at left and through the light window, but the normal gameplay-scale read is still heavily dominated by the horizontal lamp/band mass. It is improved from a pure slab, but I would not ask the manager to accept it yet.
- Biome 3: PASS_WITH_CAVEATS. The Midnight Trench proof still has a memorable dark upper trench/coral-rib read in color and grayscale, but the final contact sheet is somewhat washed by the light window.
- Biome 1 surface-entry: PASS. No large landmark anchors in the surface band.
- Biome 1 benchmark: PASS. The shallow benchmark remains clean.
- Biome 4: FAIL / regression risk. The script metrics pass, but this final capture is weaker than the earlier strong ruins proof and reads as a pale horizontal light field with only partial ruin structure near the top.

## Commit state

No files staged. No commit made. The proof is not visually strong enough for commit safety.
