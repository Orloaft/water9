Status: COMPLETE_WITH_CAVEATS

Retry marker: b2-retry-2026-07-06

Preflight HEAD: 2c4ff8d

## B2 Landmark Count Table

| B2 band / transition point | Depth rule in current code | Authored bitmap landmark variants that can render | Procedural fallback landmark shapes | Decorative non-landmark background |
| --- | --- | ---: | ---: | --- |
| Surface / B1->B2 entry | Active when `state.depth < 120`; surface band definition is 0-140 m with 190 px blend. | 0. B2 surface pool is empty. | 0. With no available B2 surface landmarks, no anchor is emitted. | Surface band plate manifest entry exists but is `rejected`, so the renderer hides that painterly layer; water-column haze/particles remain. |
| Upper B2 | Active from 120-519 m; blended from surface over about 36.7 m because upper starts at 90 m with `blendPx / 6`. | 1 unique: `biome-brine-vent-sulfide-shelf` from `water9-biome-landmark-brine-shelf-gpt.png`. | 0. Strict authored B2 landmarks suppress generic/procedural anchors. | Generic `upper` band plate, low-alpha adjacent layer bleed, water-column masks/ribbons. |
| Mid B2 | Active from 520-1039 m; blended from upper over about 41.7 m because mid starts at 430 m. | 1 unique: `biome-brine-vent-sulfide-shelf`. Pool lists it twice, but that only weights the same asset. Normal gameplay budget is 1 anchor. | 0. | Generic `mid` band plate; B2 mid water-column haze/sediment are heavily guarded; post-darkness brine veil is configured disabled. |
| Lower B2 | Active from 1040-1439 m; blended from mid over about 45 m because lower starts at 880 m. | 1 unique: `biome-brine-vent-sulfide-shelf`. Normal gameplay budget is 1 anchor. | 0. | Generic `lower` band plate; darkness reaches full strength, so the shelf is mostly a faint horizontal mass outside the lamp. |
| B2 transitionDeep / B2->B3 exit | Active at `state.depth >= 1440`; transition band definition is 1260-1720 m with 300 px blend. | 3 current effective variants from the global Phase 11 transition pool: `phase11-transition-far-drowned-signal-station`, `phase11-transition-mid-collapsed-gantry-brine-reef`, `phase11-transition-near-pipe-cable-cathedral`. B2's own transition pool also names Phase 8/9 assets, but current selection prioritizes any Phase 11 transition asset first. | 0 procedural fallback in the current asset-present path. | Phase 11 transition-deep band plate, reduced darkness mask, terrain alpha lowered to 0.48, multiple large background anchors. |

Normal non-transition B2 has exactly 1 authored landmark variant. B2 transitionDeep effectively has 3 authored Phase 11 variants, with multiple anchors visible at once. Decorative background layers are separate from landmarks: painterly band plates, water-column texture masks, procedural ribbons/particles, terrain, darkness, and lamp masks.

## Transition Observations

- B1->B2 is not an in-world crossfade. `travelToNextBiome` increments `state.biome`, randomizes `rng.seed`, resets depth/cargo/scans, and restarts the scene. The visible transition is a loading/restart cut.
- B2 surface entry is visually sparse. Proof at exact 90 m has 0 anchors and mostly flat teal water. At 180 m the shelf appears as a large bitmap anchor. That means the first B2 landmark can pop in at the surface->upper cutoff rather than being introduced at entry.
- Upper, mid, and lower B2 reuse the same brine shelf asset. This is coherent within B2, but it also means the biome reads as one repeated horizontal shelf language across most depths.
- B2 lower to transitionDeep is the highest-risk visual jump. At 1260 m the single shelf is very dim under full darkness. At 1500 m the renderer switches to multiple very large Phase 11 industrial anchors plus the Phase 11 transition band plate. The proof shows the scene changing from a faint shelf to huge pipe/cathedral silhouettes.
- B2->B3 travel is again a scene restart, not a gradual in-world transition. B3 surface entry returns to a blank/sparse surface view, so leaving B2 can feel like a hard content reset after the dense B2 transitionDeep frame.

## Selection, Layering, Fog, And Culling Notes

- Band cutoffs come from `shallowsBandForDepth`: `<120 surface`, `<520 upper`, `<1040 mid`, `<1440 lower`, otherwise `transitionDeep`.
- Anchor selection is deterministic for a given `rng.seed` and slot via `hash(...)`. Biome travel calls `rng.seed = Math.floor(Math.random() * 1_000_000)`, so the next biome's layout changes per travel.
- B2 upper/mid/lower set `strictBiomeNormalLandmarks`, use 2600 px spacing, skip odd slots, and cap normal gameplay to 1 anchor.
- B2 transitionDeep does not use that 1-anchor normal budget. It can render several anchors from visible slots, and Phase 11 transition landmarks override the B2-specific Phase 8/9 choices while present.
- Authored B2 anchors are framed relative to the current view window, then parallax-adjusted, so they are kept on-screen rather than acting like purely fixed world objects.
- Z-order: painterly scenic layers sit at about -12 to -8; bitmap anchors at -7.3; water-column graphics/sprites around -6.79 to -6.76; terrain at 0; player/actors around 2; darkness/lamp/overlay at 5-7. Terrain and darkness can heavily occlude landmarks.
- B2 landmark alpha is capped by `authoredBiomeLandmarkAlpha(2, band) = 0.74`, but darkness dominates by mid/lower. Proof metrics: exact 760 m mean luma 11.4; exact 1260 m mean luma 4.24.

## Proof Paths

- Proof JSON: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b2/b2-landmark-transition-proof.json`
- Capture script: `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b2/capture-b2-proof.mjs`
- Normal-play captures: `b1-lower-before-b2-depth1260-*`, `b2-entry-surface-depth90-*`, `b2-upper-first-landmark-depth180-*`, `b2-mid-brine-shelf-depth760-*`, `b2-lower-before-exit-depth1260-*`, `b2-transitiondeep-exit-depth1500-*`, `b3-entry-surface-depth90-*`.
- Exact-depth review captures: `exact-b1-lower-before-b2-depth1260-*`, `exact-b2-entry-surface-depth90-*`, `exact-b2-upper-first-landmark-depth180-*`, `exact-b2-mid-brine-shelf-depth760-*`, `exact-b2-lower-before-exit-depth1260-*`, `exact-b2-transitiondeep-exit-depth1500-*`, `exact-b3-entry-surface-depth90-*`.

The normal-play deep `teleportToReachableDepth` targets often landed shallower because the generated cave network did not have reachable water at the requested deep B2 depths. The exact-depth review captures are therefore the better visual proof for mid/lower/transition band composition, but they use playtest `backgroundReview` positioning rather than pure live traversal.

## Jarring Causes Ranked

1. Lower B2 to transitionDeep swaps from one dim brine shelf to multiple huge Phase 11 industrial landmarks and a different band plate at the 1440 m active-band cutoff.
2. B2 surface entry has no landmark, then upper B2 introduces a large shelf around the surface->upper cutoff.
3. B2 transitionDeep selection ignores most B2-specific transition pool intent while global Phase 11 assets exist, including the far signal station not listed in B2's pool.
4. B2 uses one shelf variant for upper/mid/lower, so perceived variety is low until the abrupt transitionDeep swap.
5. Normal biome travel is a restart/loading cut with a new random seed, so B1->B2 and B2->B3 cannot visually blend without an explicit transition treatment.

## Recommended Smallest First Slice

Add a small transition-specific selection guard before changing art: make B2 transitionDeep pick only the B2 transition pool, cap it to one or two anchors, and add an entry/exit alpha ramp based on transitionDeep blend progress. This is smaller than replacing assets and directly addresses the most jarring pop.

## Verification Commands

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `2c4ff8d`
- `node runs/water9-biome-landmark-transition-audit-2026-07-06/b2/capture-b2-proof.mjs` -> wrote proof JSON and 28 image captures under the B2 audit directory using port 5180.
- `python3 - <<'PY' ... validate proof paths ... PY` -> all proof image paths exist and are non-empty.
- `npx tsc --noEmit --pretty false` -> passed.
- `ps -eo pid,ppid,cmd | rg "vite --host 0.0.0.0 --port 5180|capture-b2-proof|chromium_headless_shell" || true` -> no audit capture/server process left on port 5180.

## Caveats / Blockers

- I did not change game code.
- Normal-play deep captures are limited by reachable-water placement in the generated world; exact-depth review captures were added for band-accurate visual evidence.
- The exact-depth review path suppresses the B2 lamp beam by existing playtest behavior, so use it for background/landmark composition, not final lighting judgement.
- Existing unrelated dirty worktree changes were present before this audit; I did not modify them.
