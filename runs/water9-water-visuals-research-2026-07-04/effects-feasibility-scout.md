# Water9 Water Effects Feasibility Scout

Status: OK

Preflight: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `7776913`

Scope note: source code was not edited. This scout is based on the current Phaser/Vite/TypeScript runtime shape: Phaser 3.90, `DeepdiveScene` display-list layers, `#game` playtest API, and `?playtest` forcing the Canvas renderer in `src/main.ts`.

## Ranked Candidate Effects

1. Drifting particulate layers / marine snow
   - Complexity: Low to medium.
   - Performance risk: Low if drawn as capped viewport-dependent `Graphics` dots/streaks or 1-2 pooled `TileSprite` textures; medium if implemented as individual GameObjects.
   - Visual payoff: High. Gives the water volume immediate motion across surface, mid, and deep captures without changing terrain or creature art.
   - Water9 fit: Best first lane. `drawBiomeVisibilityCues` is currently empty, `draw()` already clears reusable `Graphics`, and `environmentVisualProfileFor()` already exposes overlay alpha/density/drift concepts.
   - Readability notes: Keep particles tiny, low-alpha, and biased toward darker/lower-saturation colors so they do not read as ore, pickups, sonar contacts, or damage sparks.

2. Lamp-volume scattering
   - Complexity: Medium.
   - Performance risk: Low to medium if it reuses the existing lamp cone math in `drawDarkness`; high only if it adds many dynamic sprites.
   - Visual payoff: High in deep water. Makes lamp upgrades feel valuable and gives dark captures a visible water medium instead of a flat mask.
   - Water9 fit: Strong. `drawDarkness()` already computes the beam polygon, halo, and lit intervals; scattering can be constrained inside that volume and drawn on `lampGloom` or a small helper layer.
   - Readability notes: It must not wash out enemies, scan targets, terrain openings, or ore silhouettes in grayscale. Scatter should be sparse near the player and fade before the cone edge.

3. Depth fog / haze bands
   - Complexity: Low to medium.
   - Performance risk: Low if done as a few broad translucent bands per frame; medium if combined with noise at high density.
   - Visual payoff: High when tuned well, especially for biome transitions and landmark depth staging.
   - Water9 fit: Good. `depthColor()`, `darknessForDepth()`, `shallowsBands`, and `environmentVisualProfileFor()` already model depth bands and haze color.
   - Readability notes: Highest non-shader readability risk among the simple effects. It can erase accepted landmarks, ore deposits, and terrain edges if alpha is too high.

4. Surface shimmer gradient / waterline shimmer
   - Complexity: Low.
   - Performance risk: Low.
   - Visual payoff: Medium to high near the barge and first descent; low in deep gameplay.
   - Water9 fit: Good. `drawBoat()` already draws waterline ripples around the barge, and `environmentVisualProfileFor().surface` already carries surface colors/stripe alpha.
   - Readability notes: Keep it localized near `SURFACE_Y` and below the barge/platform so docking and HUD state remain clear.

5. Animated caustic overlay
   - Complexity: Medium.
   - Performance risk: Medium. Canvas-safe if implemented as 1-2 low-alpha `TileSprite`/runtime textures drifting slowly; high if attempted as a shader/postprocess.
   - Visual payoff: High in shallows, medium elsewhere. It is the most recognizable "water texture" effect.
   - Water9 fit: Feasible but should be depth-gated. The playtest route forces Canvas, so use bitmap/runtime texture frames rather than a WebGL pipeline for first proof.
   - Readability notes: Caustics over terrain can make ore and flora sparkle like interactables. Limit to shallow water, draw below actors/sonar, and clamp alpha hard in grayscale review.

6. Parallax sediment clouds
   - Complexity: Medium.
   - Performance risk: Low to medium with `TileSprite` layers; medium if many alpha-blended bitmaps overlap.
   - Visual payoff: Medium to high in mid/deep bands.
   - Water9 fit: Good mechanically because `drawParallax()` already manages five `TileSprite` layers and depth-band visibility. It may belong in `environmentVisualProfileFor().background` or a sibling water-effects layer.
   - Readability notes: Must not bury the newly accepted painterly landmarks. Best as slow, broad, low-contrast shapes behind terrain/actors rather than foreground fog.

7. Noise texture overlay / water grain
   - Complexity: Low.
   - Performance risk: Low with one tiled texture; medium if redrawn procedurally every frame.
   - Visual payoff: Medium. Useful as glue, weak as a headline feature.
   - Water9 fit: Good. There is already a dormant `worldSpaceNoise` concept in the environment profile with `alpha: 0`.
   - Readability notes: The main risk is making the scene look dirty or compressed. Use world-space drift and low alpha; avoid high-frequency grain over HUD-like canvas text or scan rings.

8. Foreground micro-bubbles
   - Complexity: Medium.
   - Performance risk: Low to medium if pooled and capped; medium if spawned as many sprites.
   - Visual payoff: Medium. Nice near the diver/sub and around fast movement, but less important than fog/particles.
   - Water9 fit: Feasible. Can be procedural `Graphics` bubbles, no new art required.
   - Readability notes: Bubbles must not look like oxygen pickups, sonar pings, ore glints, or damage numbers. Keep foreground bubble count low.

9. Refractive / wavy distortion
   - Complexity: High for true distortion.
   - Performance risk: High on mobile/browser and risky with Canvas proof.
   - Visual payoff: High if it works, but it is not a first prototype.
   - Water9 fit: True refraction wants WebGL render textures or a custom pipeline. Current proof mode uses `Phaser.CANVAS` when `?playtest` is present, so this would either be unprovable in the standard acceptance path or require a Canvas fallback that is not real refraction.
   - Readability notes: Distortion can break terrain mining precision, creature silhouettes, and screenshot comparison. Avoid until the simpler effects establish a baseline.

10. Full-screen water shader / post-processing pipeline
    - Complexity: High.
    - Performance risk: High.
    - Visual payoff: Medium to high, depending on fallback.
    - Water9 fit: Poor for the immediate slice because Phaser custom pipelines are WebGL-first and the current Playwright proof path intentionally forces Canvas.
    - Readability notes: Treat as later optional enhancement only if the project adds a WebGL proof lane plus Canvas fallback.

## Recommended First Two Prototypes

1. Drifting particulate layers.

Why: It is the safest cross-biome water-medium upgrade. It fits the current renderer, can be implemented without source art, can be proven in normal `#game canvas` captures, and should remain legible in grayscale if density is capped. It also gives motion in still screenshots through varied positions and short streaks.

Implementation shape: Add a small deterministic camera-window drawing helper under `drawBiomeVisibilityCues()`. Use `environmentVisualProfileFor(state.biome, state.depth).overlay` for color/alpha/density. Draw 50-160 viewport-scaled motes/streaks on an existing world-space layer before `drawDarkness()` so deep darkness still controls final readability.

2. Lamp-volume scattering.

Why: It targets the strongest Water9 mood gap in deep water: darkness currently masks the world but the lamp cone does not strongly reveal suspended water. It reuses existing lamp geometry, reinforces upgrade progression, and can be judged clearly across mid/deep grayscale captures.

Implementation shape: Extend `drawDarkness()` or extract its beam polygon into a helper that draws sparse motes and 2-4 very faint cone streaks inside the lit area. Scale with `darknessAtDepth()` and `state.upgrades.lamp`; keep sonar pings and actors visually dominant.

Depth fog bands should be the third prototype, or part of the first prototype only as very faint band-specific alpha tuning. Caustics are desirable, but they should follow after the particle/scatter baseline because they are shallow-biased and more likely to damage terrain/ore readability.

## Risk Notes

- Mobile/browser performance: Prefer `Graphics` batch drawing or 1-2 reusable `TileSprite` layers. Avoid one GameObject per mote. Cap effect counts by viewport area and zoom. Avoid per-pixel canvas reads in the render loop; reserve pixel sampling for proof tooling.
- Canvas proof constraint: `src/main.ts` forces `Phaser.CANVAS` for `?playtest`, so WebGL-only pipelines, displacement shaders, and post-FX cannot be accepted through the normal visual bar unless a Canvas fallback is also implemented and captured.
- HUD conflict: The HUD appears outside the game canvas, but in-canvas status rings, sonar pings, scan rings, player/sub silhouettes, flares, and game-over overlays must stay dominant. Draw water effects before sonar/darkness where possible.
- Terrain/ore conflict: The environment rework intentionally makes terrain dark and organic. Bright caustics, bubbles, or noise can make ore deposits and terrain edge accents read as interactables. Grayscale review is mandatory.
- Landmark conflict: Recent background/landmark work is sensitive. Fog, sediment clouds, and noise should not hide accepted landmark silhouettes. Any background effect needs before/after captures at the same biome/depth/camera.
- Motion comfort: Slow drift only. Avoid full-screen wobble until there is a clear WebGL+Canvas proof story.
- Visual identity: Effects should vary by biome/depth. Shallows can have clearer motes and rare caustics; thermal/mid can use sediment/brine haze; abyssal/trench should rely on lamp scatter and sparse marine snow.

## Likely Files Touched

- `src/scene-rendering.ts`: primary implementation site. Fill in `drawBiomeVisibilityCues()`, add particulate helpers, and optionally extend `drawDarkness()` for lamp scatter.
- `src/scene.ts`: add any reusable `TileSprite`, texture, or object-pool fields if the prototype uses retained layers instead of pure `Graphics`.
- `src/helpers.ts`: tune `environmentVisualProfileFor()` overlay color/alpha/density/drift by biome/depth; optionally expose a water-effect profile helper.
- `src/types.ts`: only if the environment profile shape changes.
- `src/main.ts`: probably no change; keep Canvas playtest behavior intact.
- `public/assets/generated/...` or `assets/...`: only for caustic/noise bitmap textures, not needed for the first particulate/scatter prototype if procedural drawing is used.
- `tools/review_water_effects.mjs` or an existing review script: likely proof helper to drive playtest commands, capture `#game canvas`, and emit grayscale/contact-sheet evidence.
- `package.json`: only if adding a named smoke/review script.

## Proof Plan

1. Type/build check: run `npx tsc --noEmit --pretty false` or `npm run build`.
2. Start Vite on a manager-approved port in `5180-5199`.
3. Use the normal playtest API against `#game canvas`: `?playtest&biome=N`, `start`, `clearProofOverlays`, `teleportToReachableDepth` or `teleportDepth`, and `centerCameraOnPlayer`.
4. Capture normal gameplay screenshots, not review-harness-only output:
   - Biome 1 surface/entry near the barge.
   - Mid-depth open water around the 440m visual cutoff.
   - Deep water around 1040-1120m cutoff depending on biome.
   - At least one dark/lamp-heavy capture in biome 3 or 4.
5. For each accepted candidate, produce matching grayscale captures and a side-by-side contact sheet with before/after or effect-off/effect-on at the same camera/depth.
6. Include runtime identity in proof: visible Water9 HUD/scene state, player/sub, terrain/ore or landmark context, and actual canvas pixels from `#game`.
7. Run targeted smokes after implementation: `npm run water9:lighting-visibility-smoke`, `npm run water9:dark-terrain-outline-smoke`, `npm run water9:perf-guardrails-smoke`, plus any new water-effects review script.
8. Manager visual inspection remains the acceptance gate. Metric PASS, worker self-verdicts, and texture residency are supporting evidence only.
