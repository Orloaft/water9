# Water9 Water Visuals Acceptance Plan Scout

Status: OK

Repo: /mnt/nxt-dev/water9
HEAD: 7776913
Scope: proposal-only; no source edits and no commit.

## Evidence Inspected

- Current benchmark proof: `runs/water9-biome-background-screenshot-assessment-2026-07-03/`, especially `report.md`, `capture-biome-backgrounds.mjs`, `water9-biome-background-contact-sheet.png`, and `water9-biome-background-provenance.json`.
- Prior normal-play capture tooling: `tools/review_biome_landmark_implementation.mjs`, `tools/review_immediate_biome_landmark_proof.mjs`, and the run-local correction capture scripts under `runs/water9-distant-landmark-damage-control-2026-07-04/`.
- Distant-landmark failure ledger: `runs/water9-distant-landmark-known-fix-2026-07-04.md`.
- Runtime capture API: `src/scene-playtest.ts` commands `backgroundReview`, `biomeLoadingReview`, and `clearProofOverlays`.
- Runtime water/background profile: `src/helpers.ts` environment bands and `src/scene-rendering.ts` parallax/background rendering.

## Recommended Capture Depths / Biomes

Use the same `#game canvas` capture surface and 1280x800 viewport as the working landmark proof loops. Run the Vite server on an allowed Water9 proof port, 5180-5199, and use `?playtest=1&biome=N` plus `window.__AQUA_PLAYTEST__.command('backgroundReview', ...)`.

- Biome 1 / The Shallows / 119 m / `reviewX: 3600`: surface band near the 0-140 m range. This catches waterline tone, top-water caustics, bright haze, and any flat shell/arch/circle shapes reintroduced near the entry read.
- Biome 1 / The Shallows / 180 m / `reviewX: 3600`: upper band inside the 90-520 m range and the established July 3 benchmark. This is the best shallow-water before/after for texture richness without losing reef/terrain readability.
- Biome 2 / Brine Vent Shelf / 760 m / `reviewX: 4700`: mid band inside the 430-980 m range. This is the highest-risk regression point because previous work repeatedly collapsed into a vertical spotlight/chimney read instead of a horizontal sulfide/brine shelf.
- Biome 3 / Midnight Trench / 1260 m / `reviewX: 5800`: lower band straddling the transitionDeep start at 1260 m. This catches the blank/lamp-cone-only failure and verifies deep water texture still leaves black coral/rib silhouettes readable in grayscale.
- Biome 4 / Ancient Ruins / 1260 m / `reviewX: 6900`: same deep cutoff with a different palette and ruin vocabulary. This catches pasted rectangular bitmap windows, hard asset edges, and over-darkening of vault/causeway structure.

Conditional expansion for any pass that changes depth color progression or band blending:

- Add Biome 1 at 430 m and 520 m to straddle upper-to-mid blend behavior.
- Add Biome 2 or 3 at 980 m and 1260 m if fog/darkness/caustic strength changes near lower and transitionDeep thresholds.
- Add one normal gameplay capture without `clearWaterWindow` after the staged proof passes, so the effect is checked against real terrain density rather than only the clean review window.

## Required Artifacts For First Prototype

Create a run-local proof directory, for example `runs/water9-water-visuals-first-prototype-2026-07-04/proof/`, with:

- Fresh before captures from the current unmodified baseline, not only old July 3 screenshots.
- After captures from the prototype at the five required depth/biome points above.
- Individual color PNGs captured directly from normal gameplay `#game canvas`, not from a contact sheet or standalone review harness.
- Matching grayscale PNGs derived from the same canvas pixels for every required after capture; baseline grayscale is strongly recommended for direct comparison.
- A before/after contact sheet that places each depth row side-by-side: baseline color, prototype color, baseline grayscale, prototype grayscale.
- A provenance JSON recording repo root, HEAD, git status before/after, selected port, URL, source selector, viewport, requested depth, actual `state.depth`, biome, `activeProfile.activeBand`, canvas size/luma stats, and visible background layer/anchor asset IDs.
- A short report with explicit self-verdict for each required depth, but manager visual inspection remains authoritative.
- If the prototype adds animation, include two time-separated stills at the same camera for at least B1 119 m and B2 760 m, or a short capture, to catch shimmer flicker, pattern swimming, and temporal noise.
- Verification: `npm run build` or `npx tsc --noEmit --pretty false`, plus any focused existing smoke relevant to the touched rendering path. Build success is required but never enough for visual acceptance.

The first prototype should reuse the proven capture pattern from `tools/review_biome_landmark_implementation.mjs`: wait for `biomeLoadingReview`, stage `backgroundReview`, call `clearProofOverlays`, wait briefly for rendering to settle, capture `#game canvas`, derive grayscale, and write provenance/contact sheet.

## Visual Failure Modes That Trigger Rejection

- Proof is not direct normal gameplay `#game canvas`, or the only evidence is a contact sheet, asset preview, generated source image, or review page.
- Missing baseline/after parity: mismatched depth, viewport, `reviewX`, biome, source selector, or camera makes before/after comparison invalid.
- B1 shows obvious flat shell arches, circles, portholes, rectangular industrial linework, or other procedural/card-like landmarks as the dominant read.
- B2 reads primarily as vertical shafts, chimneys, columns, a lamp cone, or a foreground pasted cutout instead of a broad horizontal brine/sulfide shelf environment.
- B3 is mostly blank, lamp-cone-only, or loses black coral/rib structure.
- B4 shows hard rectangular bitmap bounds, pasted-window edges, or loses the diagonal/vault/causeway read.
- Water texture is still effectively a flat gradient at gameplay scale, with no improved volume, particulate, caustic, haze, or depth texture visible in the actual canvas.
- Water texture is too busy: particles, caustics, distortion, or noise obscure the diver, terrain silhouette, ore tiles, enemies, sonar pings, controller feedback, or mining targets.
- Grayscale read collapses: foreground terrain, landmarks, lamp cone, player, and hazards merge into the same luma band.
- Depth language is wrong: surface caustics stay strong in deep/transition bands, deep bands become bright shallow teal, or every biome receives the same generic water treatment.
- Texture tiling/repetition is visible as screen-space wallpaper, seams, marching bands, moire, or hard clamp lines at band cutoffs.
- Animation flickers, swims against camera motion, strobes under the lamp cone, creates aliasing, or causes visible frame pacing regressions.
- New effects mask or revive the distant-landmark failure pattern: asset IDs and metrics may pass, but the actual read still looks like the rejected composition.

## Suggested Manager Acceptance Checklist

- Confirm preflight passed and the run reports `/mnt/nxt-dev/water9` with the expected HEAD.
- Confirm proof server used only ports 5180-5199 and no stale proof server remains running afterward.
- Open individual source PNGs first, not only the contact sheet.
- Verify every required capture is direct `#game canvas` at 1280x800 with color and grayscale pairs.
- Verify provenance says the page used `?playtest=1&biome=N`, the playtest API was present, `backgroundReview` ran, and `activeProfile.activeBand` matches the intended band.
- Compare B1 119/180, B2 760, B3 1260, and B4 1260 against the accepted July 3 benchmark and fresh baseline.
- Inspect grayscale before accepting any readability claim.
- For animated effects, inspect time-separated frames for flicker, shimmer crawl, and lamp-cone artifacts.
- Reject with one named visual failure mode per iteration; do not ask for generic "more polish" or broad contrast increases.
- Accept only when the manager's own visual inspection passes color, grayscale, before/after, and old-failure-gone checks.
