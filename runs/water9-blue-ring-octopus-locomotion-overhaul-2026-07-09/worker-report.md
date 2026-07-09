# Blue Ring Octopus Locomotion Overhaul

Status: complete

## Summary

Overhauled `fauna-shallow-blue-ring-octopus` from a four-frame compact twitch/ring-shimmer read into a six-frame octopus travel cycle at 8 fps. The new sheet has compact/gather, mantle squeeze, two elongated jet/trailing-arm poses, recovery flare, and settle poses. At runtime gameplay scale, the color and grayscale crop proof both show obvious silhouette locomotion, no longer the old slight twitch.

## Changed Files

- `public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source-chroma.png`
- `public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source.png`
- `public/assets/source/fauna-flora-source-art-slice-3-manifest.json`
- `public/assets/generated/fauna-shallow-blue-ring-octopus.png`
- `public/assets/generated/fauna-shallow-blue-ring-octopus-0.png` through `-5.png`
- `public/assets/generated/fauna-shallow-blue-ring-octopus.frames.json`
- `public/assets/generated/small-life.manifest.json`
- `tools/build_source_art_slice_3_assets.py`
- `tools/test_blue_ring_octopus_animation_smoke.mjs` (pre-existing dirty file; only added manifest-driven proof frame count for the new 6-frame asset)
- `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/`

Pre-existing dirty runtime-clock files in `src/scene-playtest.ts` and `src/scene-rendering.ts` were preserved and not edited.

## Generation Prompt

Built-in `image_gen`, saved first as `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-ai-source-strip.png`, then copied into the source asset path and processed by `tools/build_source_art_slice_3_assets.py --only fauna-shallow-blue-ring-octopus`.

```text
Use case: stylized-concept
Asset type: project-bound 2D game sprite animation source sheet for Water9 small fauna.
Primary request: Create a six-frame horizontal animation sprite sheet of a blue-ring octopus locomotion cycle, isolated on a perfectly flat solid #ff00ff chroma-key background for background removal.
Subject: one compact blue-ring octopus, warm ochre/yellow body, vivid cobalt-blue rings, painterly browser-game sprite style, readable at small gameplay scale.
Composition: six equal poses in a single horizontal row, generous padding around every pose, no dividers, no labels, no text, no shadows, no water, no bubbles, no scene elements. Keep the octopus centered within each frame with consistent scale and orientation, traveling/readable left-to-right in pose design but not jumping across the cell.
Animation poses from left to right: 1 compact ready pose with arms slightly spread and readable; 2 arms gathered under and behind body while mantle begins compressing; 3 mantle squeeze and elongation for a jet pulse with body stretched forward and arms trailing backward; 4 strongest travel pose with rear arms swept back in a clear trailing silhouette/wake shape; 5 recovery flare with arms opening outward and forward; 6 settle back toward compact ready pose.
Motion requirements: strong silhouette change between frames, clearly real octopus locomotion rather than shimmer, enough visible arms to read as octopus, visible mantle compression/elongation and arm sweep.
Avoid: squid or fish silhouette, symmetric starburst, cropped arms, large teleporting body jumps, muddy loss of blue rings, pure color shimmer, static mantle with only texture changes, background texture, gradients, shadows, watermark, or text.
```

## Verification

- `npm run build` PASS. Vite completed successfully. Existing public asset URL warnings and chunk-size warning appeared.
- First smoke attempt found missing Playwright Chromium in the environment, so I ran `npx playwright install chromium`.
- `WATER9_BLUE_RING_OCTOPUS_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09 WATER9_BLUE_RING_OCTOPUS_REPORT=/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-normal-play-smoke.json WATER9_BLUE_RING_OCTOPUS_PORT=5180 node tools/test_blue_ring_octopus_animation_smoke.mjs` PASS.

Smoke highlights:

- Manifest: 6 frames, `76x48`, swim frames `[0,1,2,3,4,5]`, 8 fps.
- Runtime sampled frames: `[1,5,4,2,0,5]`, 5 unique frames across 6 samples.
- Motion diffs all changed runtime frame; grayscale changed ratio ranged `0.3412` to `0.7037`.
- Smoke JSON errors: none.

## Artifacts

- Source strip: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-ai-source-strip.png`
- Before sheet: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-before-sheet.png`
- After sheet: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-after-sheet.png`
- Before/after contact sheet: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-before-after-sheet.png`
- Preview GIF: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-locomotion-8fps.gif`
- Runtime full canvas: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-normal-play-canvas.png`
- Runtime full canvas contact sheet: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-normal-play-contact-sheet.png`
- Runtime crop contact sheet: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-normal-play-crop-contact-sheet.png`
- Runtime grayscale crop contact sheet: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-normal-play-crop-grayscale-contact-sheet.png`
- Smoke JSON: `runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/blue-ring-octopus-normal-play-smoke.json`

## Caveats

- I did not commit or push.
- I did not delete pre-existing untracked proof folders.
- `tools/build_small_life_manifest.mjs` refreshed unrelated stale dimensions when run; I restored those unrelated hunks so the final `small-life.manifest.json` diff is scoped to Blue Ring Octopus.
