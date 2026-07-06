# Water9 Fauna Pathfinding Runtime Proof

Date: 2026-07-06
HEAD: `166b689`
Port used: `5180`
Result: not reproduced in this proof window

## Scope

This was a runtime appraisal lane only. I created artifacts only under `runs/water9-fauna-pathfinding-appraisal-2026-07-06/`; I did not edit `src/`, `tools/`, content, assets, tests, stage, or commit.

Existing unrelated dirty state was preserved.

## Commands Run

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- Inspected existing playtest/tooling with `sed`/`rg`: `package.json`, `tools/playtest.mjs`, `tools/test_fauna_behavior_slice.mjs`, `src/scene-playtest.ts`, `src/scene-entities.ts`, `src/scene-worldgen.ts`, `src/content.ts`
- `node runs/water9-fauna-pathfinding-appraisal-2026-07-06/fauna_pathfinding_runtime_probe.mjs`
- Final successful proof command: `FAUNA_PATHFINDING_CANDIDATES=3 FAUNA_PATHFINDING_SAMPLE_MS=5200 node runs/water9-fauna-pathfinding-appraisal-2026-07-06/fauna_pathfinding_runtime_probe.mjs`

The probe launched Vite on `127.0.0.1:5180`, used `window.__AQUA_PLAYTEST__`, teleported near neutral `legacySwimmer` fauna in normal play, sampled movement over about 5 seconds per subject, and captured actual `#game canvas` PNGs plus grayscale versions.

## Evidence

Primary metrics:

- `runs/water9-fauna-pathfinding-appraisal-2026-07-06/fauna-pathfinding-runtime-metrics.json`
- `runs/water9-fauna-pathfinding-appraisal-2026-07-06/fauna_pathfinding_runtime_probe.mjs`

Representative actual `#game canvas` captures from the successful run:

- B1 upper/surface, neutral school: `b1-cobalt-sawtail-minnow-5-canvas.png`, `b1-cobalt-sawtail-minnow-5-canvas-gray.png`
- B1 mid, neutral circle near terrain: `b1-nautilus-2-canvas.png`, `b1-nautilus-2-canvas-gray.png`
- B1 deeper, neutral glide: `b1-goldbar-squirrelfish-1-canvas.png`, `b1-goldbar-squirrelfish-1-canvas-gray.png`
- B2 upper, neutral school: `b2-hatchetfish-9-canvas.png`, `b2-hatchetfish-9-canvas-gray.png`
- B2 mid, neutral glide near terrain: `b2-glass-squid-1-canvas.png`, `b2-glass-squid-1-canvas-gray.png`
- B2 deeper, neutral glide: `b2-ashveil-butterflyfish-2-canvas.png`, `b2-ashveil-butterflyfish-2-canvas-gray.png`
- B3 upper, neutral school: `b3-mirror-fry-4-canvas.png`, `b3-mirror-fry-4-canvas-gray.png`
- B3 mid, neutral glide: `b3-bigfin-squid-3-canvas.png`, `b3-bigfin-squid-3-canvas-gray.png`
- B3 deep, neutral school near terrain: `b3-brassstripe-fusilier-1-canvas.png`, `b3-brassstripe-fusilier-1-canvas-gray.png`
- B4 upper/mid, neutral glide: `b4-abyss-vampire-squid-0-canvas.png`, `b4-abyss-vampire-squid-0-canvas-gray.png`
- B4 mid, neutral sway near terrain: `b4-hadopelagic-microfish-6-canvas.png`, `b4-hadopelagic-microfish-6-canvas-gray.png`
- B4 deep, neutral school: `b4-cinderstripe-cardinal-1-canvas.png`, `b4-cinderstripe-cardinal-1-canvas-gray.png`

I visually inspected the higher-risk captures. They show normal-play canvas frames at rock/terrain boundaries; none showed the reported obvious repeated wall-bounce wedging during the captured final frame.

## Observations

The successful probe observed 12 neutral `legacySwimmer` subjects across biomes 1-4. It did not mark any sample suspicious under the metric:

- repeated derived x/y velocity sign flips or derived facing flips
- small bounding box for several seconds
- low net displacement compared with path length
- close to terrain proxy, from nearest sampled terrain-surface anchor or canvas high-contrast proximity

Highest-risk non-reproductions:

- B3 Brassstripe Fusilier, school, 1056 m: 4 x-flips, 4 derived facing flips, nearest sampled surface anchor 46 px, but bounding box was tall and net displacement was 89 px, so it read as normal schooling/flee movement rather than wedging.
- B3 Mirror Fry, school, 305 m: path/net ratio 5.1 and nearest sampled surface anchor 25 px, but the motion covered a large vertical band rather than a tight wall bounce.
- B1 Cobalt Sawtail Minnow, school, 149 m: path/net ratio 5.0 near terrain proxy, but bbox and displacement were too large for a stuck signature.
- B4 Hadopelagic Microfish, sway, 714 m: small bbox and high path/net ratio near terrain, but only 1 x-flip and 1 y-flip; this looked like expected sway/idling, not a terrain-caused oscillation.

## Caveats

- I did not reproduce Alex's exact stuck/oscillation symptom in the runtime window.
- The current playtest API exposes position, velocity magnitude, behavior class, surface data for anchored fish, and sampled terrain anchors, but it does not expose raw `vx/vy`, `facingSign`, center tile, terrain contact, or home distance for individual legacy swimmers in `faunaBehaviorReview`. The probe derived velocity/facing flips from position deltas and used `rootX/rootY` plus nearby sampled surface anchors/canvas high-contrast pixels as proxies.
- Some normal-play captures include gameplay HUD and warning overlays because they are actual `#game canvas` captures. The final successful run used `maxUpgrades`/`refill` to avoid game-over blockers.
- The probe perturbs normal play by teleporting the player close to neutral fish to trigger the flee branch, because that is a plausible way to expose terrain-wall bouncing quickly.

## Recommended Proof Harness For Implementation

Add a focused `tools/test_fauna_pathfinding_smoke.mjs` after the implementation slice. It should:

1. Launch Vite on a port in `5180-5199` and use `?playtest=1`.
2. Expose or sample these legacy-swimmer fields in playtest output: raw `vx`, `vy`, `facingSign`, `homeX`, `homeY`, center tile, radius-clear terrain contact, terrain-bounce count, stuck timer, temporary nav target, reseed count, and blocked-feeler count.
3. Stage deterministic near-terrain cases by selecting neutral legacy swimmers close to sampled rock boundaries and by placing the player within flee distance.
4. Fail if a neutral legacy swimmer has repeated sign/facing flips, low net displacement, high path/net ratio, repeated terrain contact/bounces, and no nav reseed over a fixed 5-8 second window.
5. Save JSON metrics, color `#game canvas` captures, grayscale captures, and a contact sheet for B1/B2/B3/B4, including surface/mid/deep bands and at least one anchored/benthic regression sample.

The implementation worker should prefer adding direct playtest metrics rather than relying on the proxies used here.
