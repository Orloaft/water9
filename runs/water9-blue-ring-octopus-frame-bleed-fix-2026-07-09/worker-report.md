# Blue Ring Octopus Frame Bleed Fix Worker Report

Status: complete

## Root Cause

The six-frame source strip was chroma-keyed and then globally alpha-trimmed before slicing. The original chroma source is 2172 x 724, so the correct source cell width is 362 px. The saved keyed source had been trimmed to 2088 px wide, reducing the derived cell width to 348 px and shifting every slice boundary. That put pixels from adjacent poses into neighboring runtime frames.

The original strip also had a few tiny detached edge islands inside some cells. Those were separate alpha components from adjacent poses, not part of the main octopus silhouette.

This was not a manifest/frame-count mismatch, and the atlas boundary columns themselves were transparent. I did not change Phaser runtime rendering.

## Changes

- Updated `tools/build_source_art_slice_3_assets.py` so the Blue Ring Octopus source strip preserves its original chroma canvas before equal-cell slicing.
- Added focused strip cleanup that removes only small disconnected alpha islands touching a source cell's left/right edge.
- Regenerated the Blue Ring Octopus source cutout, six loose frame PNGs, packed atlas, and frame manifest.
- Left the accepted six-frame, 8 fps swim sequence intact: frames `0..5`, `frameWidth=76`, `frameHeight=48`, `frameRate=8`.

## Verification

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
  - Passed: `89121a1`
- `python3 tools/build_source_art_slice_3_assets.py --only fauna-shallow-blue-ring-octopus`
  - Passed.
- Boundary/edge diagnostic
  - After fix: source and chroma source both `2172 x 724`, source cell width `362.0`.
  - Loose frames match atlas cuts.
  - Atlas cut boundary columns all report `nontransparent: 0`, `strongAlpha: 0`, `maxAlpha: 0`.
- `npm run build`
  - Passed. Only existing Vite unresolved runtime asset warnings and chunk-size warning appeared.
- `WATER9_BLUE_RING_OCTOPUS_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09 WATER9_BLUE_RING_OCTOPUS_PORT=5180 node tools/test_blue_ring_octopus_animation_smoke.mjs`
  - Passed.
  - Smoke JSON `ok: true`, no errors.
  - Runtime sampled six-frame manifest data and sprite frame cuts at x `0, 76, 152, 228, 304, 380`.

## Visual Verdict

Adjacent-frame bleed is gone in the generated atlas/proof: the detached edge slivers visible before are removed, and the atlas frame boundaries remain transparent. Normal-play proof still reads as the accepted six-pose locomotion cycle: compact/gather, mantle squeeze/jet, trailing arms, flare/settle. The gameplay crop sheet includes normal scan/UI overlays and target movement, but I did not see the previous right-edge adjacent-frame artifact.

## Artifacts

- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-boundary-diagnostic-before.json`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-boundary-diagnostic-after.json`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-boundary-diagnostic-before-after.png`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-normal-play-smoke.json`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-normal-play-canvas.png`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-normal-play-canvas-grayscale.png`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-normal-play-contact-sheet.png`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-normal-play-crop-contact-sheet.png`
- `runs/water9-blue-ring-octopus-frame-bleed-fix-2026-07-09/blue-ring-octopus-normal-play-crop-grayscale-contact-sheet.png`

## Caveats

- The repo was already dirty with the uncommitted Blue Ring Octopus locomotion overhaul and related proof files. I did not commit or push.
- No runtime texture gutter/loader change was added because the diagnosed cause was source strip slicing plus detached source-cell edge islands.
