# Water9 Water Visuals Proposal - 2026-07-04

Status: PROPOSAL_READY

Scout reports:
- `runs/water9-water-visuals-research-2026-07-04/reference-scout.md`
- `runs/water9-water-visuals-research-2026-07-04/current-render-scout.md`
- `runs/water9-water-visuals-research-2026-07-04/effects-feasibility-scout.md`
- `runs/water9-water-visuals-research-2026-07-04/acceptance-plan-scout.md`

## Recommendation

Do not start by commissioning more distant-landmark art. Start by making the water itself feel alive.

The highest-leverage first slice is a **live water-column atmosphere pass**:
- drifting particulate / marine snow
- broad low-alpha haze and sediment mottle
- shallow-only soft caustic ribbons
- optional lamp-volume scattering in dark bands

This should reuse Water9's existing Phase 3 atmospheric mask assets and existing depth-band metadata before adding new art.

## Why This Is The Right First Slice

Current Water9 already has the raw pieces:
- `public/assets/generated/background-phase3/background-phase3.manifest.json` includes texture masks for sediment flecks, broad fog mottle, soft caustic ribbons, plankton speckle, and lamp-scattering bloom.
- `src/helpers.ts` already defines depth bands with `hazeAlpha`, `sedimentAlpha`, `causticAlpha`, overlay color/density/drift, and world-space noise metadata.
- `src/scene-rendering.ts` already has a `parallaxBackdrop` layer and an empty `drawBiomeVisibilityCues()` hook.

But the actual live water-column path is mostly inert:
- `worldSpaceNoise` is currently `alpha: 0` and has no assets.
- `parallaxBackdrop` is cleared every frame but not used.
- haze/sediment/caustic values are mostly reported as metadata, not rendered.

That means Water9 can gain a lot of visual satisfaction without changing gameplay, landmarks, ore, movement, or UI.

## Reference Direction

Borrow the principle, not the style wholesale:

- **Dave the Diver**: layered 2D/3D scenery, readable bright shallows, dense but controlled life cues. Borrow the layered depth and small moving scale cues, not the cheerful aquarium density.
- **Aquaria**: soft painterly background layers behind a crisp playable foreground. Borrow the broad wash plus distant silhouettes.
- **SILT**: deep-water value discipline and strong silhouettes. Borrow grayscale-first deep readability.
- **Barotrauma**: darkness, particulate murk, and light cones making water feel heavy. Borrow restrained abyss contrast and lamp emphasis.
- **Shinsekai: Into the Depths**: depth as pressure zones, not just color grading. Borrow distinct shallow/mid/deep atmosphere.

## Visual Art Direction

Water9 should read as descending through different pressure/water zones:

1. Surface / shallow:
   - brighter cyan-teal volume
   - faint sunlight shafts and caustic ribbons
   - sparse plankton specks
   - clean gameplay foreground

2. Mid / brine:
   - greener denser haze
   - sediment flecks and slow brine drift
   - wide horizontal environmental reads
   - avoid vertical spotlight/chimney compositions

3. Deep / trench:
   - indigo-black water
   - sparse marine snow
   - lamp scattering inside the beam
   - silhouette-first background structures

4. Ancient / abyssal ruins:
   - cold gray-blue haze
   - huge low-contrast forms and diagonal spans
   - no hard rectangular bitmap windows
   - faint particulate to glue foreground and background

## First Implementation Slice

Name: `water-column-atmosphere-v1`

Scope:
- `src/helpers.ts`
  - expose ready `textureMask` manifest entries through `profile.background.worldSpaceNoise.assets`
  - derive conservative per-band mask alpha from existing `hazeAlpha`, `sedimentAlpha`, and `causticAlpha`
  - keep biome/depth variation explicit
- `src/scene.ts`
  - add a small pool of `TileSprite` water-column layers, or reuse a similarly cheap retained display-list path
  - place it between scenic background and terrain/actors
- `src/scene-rendering.ts`
  - add `drawWaterColumn(camera, profile)` after `drawParallax(camera)` and before `drawWorld(camera)`
  - drift masks in world space at different parallax speeds
  - tint by the active band haze color
  - keep alphas low and depth-gated
- `src/scene-playtest.ts`
  - report visible water-column layers, texture keys, alpha, tile offsets, and loaded status in `backgroundReviewSnapshot`
- optional small proof script under `tools/`
  - capture before/after normal gameplay `#game canvas`, color and grayscale

Do not touch:
- distant landmark selection/framing
- gameplay logic
- HUD
- Telegram/gateway/system integrations
- movement, mining, sonar, save/load

## Acceptance Proof

Proof must be actual normal gameplay `#game canvas`, not asset previews.

Required captures:
- B1 surface 119
- B1 upper 180
- B2 mid 760
- B3 lower 1260
- B4 lower 1260

Required artifacts:
- baseline color + grayscale
- prototype color + grayscale
- before/after contact sheet
- provenance JSON with HEAD, git status, selected port, viewport, source selector, biome/depth, active band, visible water-column textures, and loaded status
- build result

Acceptance is manager visual inspection only. Metrics and worker self-verdicts are supporting evidence.

## Rejection Modes

Reject if:
- water still reads as flat gradient / empty color field
- particles or caustics obscure player, ore, terrain, enemies, sonar, or HUD
- caustics remain strong in deep bands
- texture tiles or repeats are obvious
- grayscale readability collapses
- B2 reverts to vertical shaft/chimney/lamp-cone read
- B3 becomes blank/lamp-only
- B4 shows hard rectangular bitmap bounds
- proof is not live `#game canvas`

## Proposed Worker Prompt

```text
Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo: `/mnt/nxt-dev/water9` only. Preserve unrelated dirty work. Do not commit.

Goal: implement the first Water9 water-visual improvement slice: a live water-column atmosphere pass using existing Phase 3 texture-mask assets and existing environment depth-band metadata. This is not a distant-landmark pass and not new generated art.

Read first:
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/current-render-scout.md`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/effects-feasibility-scout.md`
- `/mnt/nxt-dev/water9/runs/water9-water-visuals-research-2026-07-04/acceptance-plan-scout.md`

Implement:
- Wire ready `textureMask` assets from `background-phase3.manifest.json` into a visible water-column profile.
- Render low-alpha drifting broad fog/plankton/sediment/caustic masks between scenic background and terrain/actors.
- Keep caustic strength shallow-biased; use sediment/marine snow for mid/deep.
- Add provenance fields to `backgroundReviewSnapshot` for visible water-column layers.
- Do not change landmark pools, gameplay, HUD, Telegram/gateway/system integrations, or unrelated files.

Verification:
- Run `npm run build`.
- Capture before/after normal gameplay `#game canvas`, color and grayscale, at B1 119, B1 180, B2 760, B3 1260, B4 1260.
- Use ports 5180-5199 only.

Return:
- Status: READY_FOR_MANAGER_VISUAL_REVIEW, NEEDS_MANAGER_REJECTION, BLOCKED, or MOUNT_DOWN.
- Changed files.
- Proof artifact paths.
- Build result.
- Caveats.
- Exact line: `Do not accept yet; manager visual inspection required.`
```

## Source Links Used

- Dave the Diver Steam page: https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/
- Unity Dave the Diver case study: https://unity.com/resources/dave-diver
- Aquaria Steam page: https://store.steampowered.com/app/24420/Aquaria/
- SILT Fireshine page: https://fireshinegames.co.uk/games/silt/
- Barotrauma Steam page: https://store.steampowered.com/app/602960/Barotrauma/
- Shinsekai Nintendo page: https://www.nintendo.com/us/store/products/shinsekai-into-the-depths-switch/
