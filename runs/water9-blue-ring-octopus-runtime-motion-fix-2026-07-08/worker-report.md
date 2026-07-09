# Water9 Blue Ring Octopus Runtime Motion Fix

- Status: DONE
- Preflight HEAD: `89121a1`
- Branch observed: `ux-work`
- Date: 2026-07-08

## Root Cause

The Blue Ring Octopus frames existed and the renderer did call `setFrame`, but normal gameplay ignored the asset manifest's `swim.frameRate: 8`. The generic hostile-fish clock used `animatedFrame(..., fps = 3.3)` and then scaled that by velocity, which often made the octopus advance at roughly 2 fps during normal play. At gameplay scale that read as static.

The old focused smoke also did not prove motion. It only asserted that target crops contained enough color/luma, and it followed the first matching octopus loosely enough that a baseline run could crop HUD/terrain instead of cleanly proving same-target animation.

## Fix

- `src/scene-rendering.ts`: Blue Ring Octopus now uses its spritesheet manifest swim animation frames and frame rate directly.
- `src/scene-playtest.ts`: playtest snapshots now expose fish phase, texture key, frame name, and frame cut position for runtime proof.
- `tools/test_blue_ring_octopus_animation_smoke.mjs`: smoke now tracks the same target, captures live `#game canvas` frames, writes contact sheets, records runtime frame sequence, and asserts visible color/grayscale crop deltas.

## Proof Artifacts

- `blue-ring-octopus-normal-play-smoke.json`
- `blue-ring-octopus-normal-play-contact-sheet.png`
- `blue-ring-octopus-normal-play-crop-contact-sheet.png`
- `blue-ring-octopus-normal-play-crop-grayscale-contact-sheet.png`
- `blue-ring-octopus-normal-play-0.png` through `blue-ring-octopus-normal-play-3.png`
- `blue-ring-octopus-normal-play-crop-0.png` through `blue-ring-octopus-normal-play-crop-3.png`
- `blue-ring-octopus-normal-play-canvas.png`
- `blue-ring-octopus-normal-play-canvas-grayscale.png`

## Smoke Metrics

- Runtime sprite frames: `0 -> 3 -> 1 -> 2`
- Runtime frame changes: 3 of 3 pairs
- Max grayscale changed ratio: `0.8037`
- Max mean luma delta: `21.695`
- Pair deltas:
  - `0 -> 1`: gray changed ratio `0.5219`, mean luma delta `14.668`
  - `1 -> 2`: gray changed ratio `0.8037`, mean luma delta `21.695`
  - `2 -> 3`: gray changed ratio `0.4171`, mean luma delta `7.303`

## Verification

- `npm run build`: PASS
- `WATER9_BLUE_RING_OCTOPUS_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-runtime-motion-fix-2026-07-08 WATER9_BLUE_RING_OCTOPUS_REPORT=/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-runtime-motion-fix-2026-07-08/blue-ring-octopus-normal-play-smoke.json WATER9_BLUE_RING_OCTOPUS_PORT=5197 node tools/test_blue_ring_octopus_animation_smoke.mjs`: PASS

Build emitted existing Vite warnings about unresolved `/assets/generated/...` runtime paths, a large chunk, and plugin timing.

## Caveats

The fix is intentionally scoped to `fauna-shallow-blue-ring-octopus`. Other fish still use the generic speed-scaled clock. The proof includes normal gameplay movement as well as frame motion, but the runtime frame telemetry and grayscale crop sequence make the octopus pose changes explicit.
