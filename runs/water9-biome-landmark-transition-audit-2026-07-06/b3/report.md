Status: COMPLETE

Preflight HEAD: 2c4ff8d

Retry marker: b3-retry-2026-07-06-d65915fc

## B3 Landmark Count Table

| B3 depth area | Normal gameplay landmark assets that can appear | Count | Type | Anchor behavior |
|---|---:|---:|---|---|
| Surface / entry | none | 0 | none | `environmentAnchorSilhouettesFor` returns no surface anchors when there is no authored B3 surface landmark. B3 surface/upper band plates are also suppressed. |
| Upper | `kelp-curtain-cluster`, `reef-arch-distance`, `cable-buoy-chain` | 3 | generic Phase 3 bitmap cutouts, not B3-authored identity | Sparse seeded anchors from the generic upper pool. |
| Mid | `drowned-mine-structure` | 1 | generic Phase 3 bitmap cutout, not B3-authored identity | Sparse seeded anchors from the generic mid pool. |
| Lower | `biome-midnight-black-coral-ribs` | 1 | authored B3 bitmap asset, ready PNG, 1495x998 | Strict B3 landmark path, budgeted to 1 anchor per viewport; proof at 1116 m rendered it at alpha 0.211. |
| Transition-deep | configured B3 pool: `phase11-transition-far-drowned-signal-station`, `phase8-transition-rib-field`, `phase9-transition-organic-rib-reef`, `phase5-transition-pressure-ribs-wide`; runtime union also reaches Phase 11 mid/near through fallback priority | 4 configured / 6 possible runtime | authored/generated transition bitmaps, not the B3 black-coral asset | Multiple seeded anchors per viewport; vertical culling may leave fewer rendered sprites than anchor entries. |
| Procedural fallback landmark shapes | none found | 0 | none | Runtime skips missing anchor textures; it does not draw procedural shape fallbacks for landmarks. |
| Decorative non-landmark layers | 5 band-plate profiles, 5 texture-mask assets loaded, 4 water-column recipe layers, 1 visible water-column sprite budget | n/a | background/fog/parallax, not landmarks | B3 lower also enables a post-darkness veil (`alpha: 0.052`, particles `0.014`). |

Main code points: manifest import/load in `src/helpers.ts:11` and `src/helpers.ts:417`; B3 pools in `src/helpers.ts:615`; active band cutoffs in `src/helpers.ts:1071`; anchor selection and strict budgets in `src/helpers.ts:1372`; background layer assembly in `src/helpers.ts:1720`; rendering/culling in `src/scene-rendering.ts:423`.

## Transition Observations

- B2 -> B3 is a hard world transition, not a visual crossfade. `travelToNextBiome` resets depth, clears state, increments biome, rerolls `rng.seed`, and restarts the scene (`src/scene-economy.ts:145`). The loading panel is a short generation overlay (`src/scene.ts:362`). Normal B2 lower/transition assets vanish and B3 restarts at surface.
- B3 entry has no authored landmark. Proof at 24 m in B3 rendered zero anchors. This makes the first B3 frame much plainer than B2 transition-deep and B4 entry.
- Mid-B3 still uses generic Phase 3 landmarks. The B3-authored `biome-midnight-black-coral-ribs` appears only once the active band is `lower` (practically >=1040 m), then is removed again at transition-deep (>=1440 m).
- B3 -> B4 is abrupt for identity: B3 transition-deep swaps to Phase 11/Phase 8/Phase 9/Phase 5 transition assets, while B4 entry immediately shows the soft-edged ruin vault landmark. There is no shared fade from black-coral B3 identity into B4 entry.
- Seed behavior is stable inside a biome for a given `rng.seed`, but travel and playtest `setBiome` reroll it. Anchor choices are deterministic hash-by-slot after that seed.
- Z order: band plates sit behind anchors; bitmap anchors render around depth -7.3, water-column sprites around -6.76, then terrain and actors above. B4 ruin gets special soft-edge/dimming; B3 black coral does not.

## Proof Paths

- `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b3/b3-transition-canvas-proof.json`
- `/mnt/nxt-dev/water9/runs/water9-biome-landmark-transition-audit-2026-07-06/b3/b3-landmark-counts.json`
- B2 lower before B3: `b2-lower-before-b3.png`, `b2-lower-before-b3-grayscale.png`
- B2 transition-deep before B3: `b2-transition-deep-before-b3.png`, `b2-transition-deep-before-b3-grayscale.png`
- B3 entry: `b3-entry-first-water.png`, `b3-entry-first-water-grayscale.png`
- B3 lower landmark: `b3-lower-landmark.png`, `b3-lower-landmark-grayscale.png`
- B3 transition-deep before B4: `b3-transition-deep-before-b4.png`, `b3-transition-deep-before-b4-grayscale.png`
- B4 entry: `b4-entry-first-water.png`, `b4-entry-first-water-grayscale.png`

## Jarring Causes Ranked

1. Full biome travel resets depth/seed/world and has no B2->B3 or B3->B4 background crossfade.
2. B3 has no surface/upper authored landmark and suppresses surface/upper band plates, so entry lacks a strong B3 identity.
3. The authored B3 landmark is lower-band only and disappears at transition-deep instead of fading out.
4. B3 transition-deep selection can show large Phase 11 far/mid/near structures, which read closer to general deep/ruin transition than Midnight Trench black coral.
5. Anchor vertical culling is hard: anchors can exist in profile output but not render if their parallaxed bounds miss the viewport.

## Recommended Smallest First Slice

Use the existing `biome-midnight-black-coral-ribs` asset as a B3 bridge before making new art: keep one low-alpha B3-authored anchor in upper/mid and transition-deep, and fade it against current generic transition assets. This is mostly pool/selection/alpha tuning and should reduce both B2->B3 blank entry and B3->B4 identity swap without adding new assets.

## Verification Commands

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- `npm run dev -- --host 127.0.0.1 --port 5182 --strictPort`
- Inline Playwright capture against `http://127.0.0.1:5182/?playtest=1&biome=N`, saving `#game canvas` PNGs and `b3-transition-canvas-proof.json`
- Inline manifest/count audit, saving `b3-landmark-counts.json`

## Caveats / Blockers

Visual proof was not blocked. Deep boundary captures use playtest `teleportDepth` to hit exact depths without clearing terrain; this is normal `#game canvas` rendering, but the player may be inside terrain and foreground occlusion is not a traversal proof. A first reachable-water attempt could not reach the requested deep B2/B3 boundary depths and returned shallower water, so exact-depth capture was used for the final proof JSON.
