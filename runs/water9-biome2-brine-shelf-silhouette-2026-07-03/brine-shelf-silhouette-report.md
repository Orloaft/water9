# Water9 Biome 2 Brine Shelf Silhouette Report

Status: BLOCKED_VISUAL_NOT_ACCEPTED

Visual verdict: The generated Biome 2 source landmark now has a stronger vertical brinefall/elevator-well silhouette and no broad horizontal alpha slab in the raw PNG, but the actual runtime `#game canvas` still reads first as a bright horizontal shelf/playfield band in both color and grayscale. The vertical landmark mass is visible behind it, yet it does not dominate the phone-sized grayscale read enough to satisfy the requested composition change.

Proof:
- Color canvas: `water9-biome2-mid-vent-sulfide-game-canvas.png`
- Grayscale canvas: `water9-biome2-mid-vent-sulfide-game-canvas-grayscale.png`
- Full contact sheet: `water9-biome-landmark-final-contact-sheet.png`
- Provenance: `water9-biome-landmark-proof-provenance.json`

Verification:
- `python3 tools/build_biome_landmark_assets.py` passed.
- `WATER9_BIOME_LANDMARK_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-biome2-brine-shelf-silhouette-2026-07-03 WATER9_BIOME_LANDMARK_PORT=5237 node tools/review_biome_landmark_implementation.mjs` passed runtime anchor checks and wrote actual `#game canvas` captures.
- `npx tsc --noEmit --pretty false` passed.

Blocker: Within the narrow landmark asset/generator/manifest scope, the landmark can be made more vertical, but the runtime composition is still dominated by the horizontal shelf band. Solving the visual read likely requires changing the Biome 2 playfield/background band composition or capture setup beyond the landmark-only pass.
