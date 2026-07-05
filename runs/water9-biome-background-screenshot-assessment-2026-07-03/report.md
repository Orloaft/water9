# Water9 Biome Background Screenshot Assessment

Status: PASS_WITH_CAVEATS
Repo: /mnt/nxt-dev/water9
HEAD: 7776913
Runtime: http://127.0.0.1:5237/
Source selector: #game canvas

## Detected Live Biomes
- Biome 1: The Shallows
- Biome 2: Brine Vent Shelf
- Biome 3: Midnight Trench
- Biome 4: Ancient Ruins

## Captures
- Biome 1: The Shallows
  - Path: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome1-benchmark-upper-shell-survey-runtime-canvas.png
  - Bytes: 241430
  - Framing: depth 180 m, reviewX 3600, viewport 1280x800
  - Runtime proof: http://127.0.0.1:5237/?playtest=1&biome=1; playtestApi=true; canvas=1280x800; activeBand=upper
- Biome 2: Brine Vent Shelf
  - Path: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome2-mid-vent-sulfide-shelf-runtime-canvas.png
  - Bytes: 223415
  - Framing: depth 760 m, reviewX 4700, viewport 1280x800
  - Runtime proof: http://127.0.0.1:5237/?playtest=1&biome=2; playtestApi=true; canvas=1280x800; activeBand=mid
- Biome 3: Midnight Trench
  - Path: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome3-lower-black-coral-ribs-runtime-canvas.png
  - Bytes: 370699
  - Framing: depth 1260 m, reviewX 5800, viewport 1280x800
  - Runtime proof: http://127.0.0.1:5237/?playtest=1&biome=3; playtestApi=true; canvas=1280x800; activeBand=lower
- Biome 4: Ancient Ruins
  - Path: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome4-lower-vault-causeway-runtime-canvas.png
  - Bytes: 218284
  - Framing: depth 1260 m, reviewX 6900, viewport 1280x800
  - Runtime proof: http://127.0.0.1:5237/?playtest=1&biome=4; playtestApi=true; canvas=1280x800; activeBand=lower

## Contact Sheet
- PNG: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.png
- HTML: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-contact-sheet.html

## Commands / Checks Run
- `pwd` from `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel` from `/mnt/nxt-dev/water9`
- `git rev-parse --short HEAD` from `/mnt/nxt-dev/water9`
- `git status --short` from `/mnt/nxt-dev/water9`
- `sed -n '1,220p' AGENTS.md`
- `sed -n '1,180p' CLAUDE.md`
- `rg -n "biome|Biome|BIOME|background|playtest|screenshot" src tools package.json vite.config.ts index.html`
- `rg --files | rg 'playtest|screenshot|review|biome|background'`
- `sed -n '1,280p' tools/review_biome_landmark_implementation.mjs`
- `sed -n '1510,1550p' src/hud.ts`
- `sed -n '1,260p' src/main.ts`
- `sed -n '1,260p' src/scene-playtest.ts`
- `sed -n '260,620p' src/scene-playtest.ts`
- `sed -n '280,620p' tools/review_biome_landmark_implementation.mjs`
- `cat package.json`
- `node /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/capture-biome-backgrounds.mjs`
- `find runs/water9-biome-background-screenshot-assessment-2026-07-03 -maxdepth 1 -type f -printf '%f %s\n' | sort`
- `file runs/water9-biome-background-screenshot-assessment-2026-07-03/*.png`
- `git status --short -- runs/water9-biome-background-screenshot-assessment-2026-07-03`

## Runtime Confirmation
- Screenshots were captured from the actual Water9 runtime/canvas, not from another project and not from a generated review sheet.
- Each page URL used `/mnt/nxt-dev/water9` local Vite output with `?playtest=1&biome=N`; each capture has a DOM/playtest probe and `backgroundReview` metadata in `water9-biome-background-provenance.json`.

## Caveats
- Capture used Water9 dev playtest staging with `backgroundReview` and `clearWaterWindow: true` for consistent distant landmark visibility, matching the existing local review pattern.
- Existing uncommitted worktree changes were present before capture and were preserved.

Provenance: /mnt/nxt-dev/water9/runs/water9-biome-background-screenshot-assessment-2026-07-03/water9-biome-background-provenance.json
