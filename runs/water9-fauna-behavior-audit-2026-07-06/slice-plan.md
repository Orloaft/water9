# Water9 Fauna Behavior First Slice Plan - 2026-07-06

## Status And Preflight

- Status: read-only planning lane completed; no source/runtime assets staged or committed.
- Repo pin: `/mnt/nxt-dev/water9`.
- Required preflight: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `539c6b8`.
- Project anchor check: `pwd` and `git rev-parse --show-toplevel` both returned `/mnt/nxt-dev/water9`.
- Dirty state observed and preserved. Notable tracked dirty paths include `src/content.ts`, `src/helpers.ts`, several generated viperfish assets, and existing run reports/proof JSON. A future commit lane must classify this before touching or staging anything.
- Prior inputs read: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md` and `runs/water9-fauna-behavior-classes-2026-07-05/fauna-behavior-classification.json`.

## Blunt Recommendation

Implement the same three first classes: `sessileAttached`, `verticalAnchored`, and `benthicWalker`.

Do not revise the prior set. Alex's biome 1 urchin example is exactly the first-slice bug: `Glimmer Spine Urchin` is currently hostile with `pattern: 'stalk'`, so the generic fish steer path can make it chase the player through open water. `sessileAttached` is mandatory. `verticalAnchored` and `benthicWalker` should ship with it because they reuse the same terrain-surface anchor plumbing, cover the most visibly wrong silhouettes, and keep the slice focused on "non-swimming fauna must stop swimming like fish."

Keep all other fauna on legacy fish movement for this first implementation. Do not attempt the whole taxonomy in one commit.

## Recommended Classes

### `sessileAttached`

- Body plans covered: Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish.
- Movement model: no normal translational steering. Clamp to a cached terrain surface; animate by phase only. Clingfish may use a tiny surface jitter or short detach later, but first slice should keep it attached.
- Terrain anchoring/spawn rule: `bottom` for clam, any stable `surfaceAttached` floor/wall/ceiling for urchin, `wall` preference for clingfish with floor/ceiling fallback. Use terrain-mask anchors, not open-water homes.
- Player reaction: clam does nothing; urchin raises `aggroCue` or pulse when the player is close; clingfish may lean away but must not flee into the water column.
- Hostile/contact behavior: urchin deals defensive contact damage only. It must not set pursuit aggro, must not lead the player, and must not receive fish chase acceleration. Contact language should read like a sting/spine contact, not "slammed your helmet."
- Rendering/orientation rule: rotate to surface normal, set sprite origin from anchor side, and ignore velocity-derived `swimPose`. Frame rate from phase/pulse, not swim speed.
- Data fields needed: `behaviorClass: 'sessileAttached'`, `terrainAffinity`, `surface?: TerrainSurfaceAnchor`, anchor side, `anchorOffset`, low-frequency `anchorRefreshTimer`, and contact style/damage flag.

### `verticalAnchored`

- Body plans covered: Shellback Garden Eel, Tripodfish, Goldcap Tripodfish, Ember Needle Pipefish, Basalt Lantern Seahorse, Copper Banded Seahorse.
- Movement model: fixed or near-fixed base. Garden eels and tripodfish sway from a floor root and retract/lean along the surface normal when approached. Seahorses/pipefish remain upright and drift only inside a short tether.
- Terrain anchoring/spawn rule: floor anchors for garden eel and tripodfish; near-terrain anchors for seahorse/pipefish, with floor preferred before walls. If no anchor exists, spawn as a very slow local hover but report the fallback in proof metrics.
- Player reaction: retract or lean away from player proximity. No horizontal fish flee path.
- Hostile/contact behavior: none for current entries.
- Rendering/orientation rule: mostly upright relative to the floor normal. Tripodfish/eels should not point into velocity; seahorses stay vertical with mild lean and facing flip only for left/right presentation.
- Data fields needed: `behaviorClass: 'verticalAnchored'`, `terrainAffinity`, `surface`, `anchorOffset`, `retract`, `tetherRadius`, optional `uprightBias`.

### `benthicWalker`

- Body plans covered: Snapping Shrimp, Mantis Shrimp, Opal Fan Shrimp, Silver Hinge Crab, Deep Sea Shrimp, Sea Spider, Chimney Ghost Shrimp, Brass Knuckle Prawn, Tin Plate Searobin, Hadopelagic Shrimp.
- Movement model: stay close to terrain, move along the anchor tangent, pause often, and use short skitters/hops. Hostile walkers perform a short local lunge plus recovery, not full water-column pursuit.
- Terrain anchoring/spawn rule: bottom anchors for crabs, mantis shrimp, sea spider, prawn, and searobin; near-terrain floor-biased anchors for shrimp. Maintain a clearance offset outside the surface normal and periodically refresh as they move.
- Player reaction: non-hostiles sidestep/hop along the floor away from the player. Hostiles warn, lunge only inside short range, then recover to terrain contact.
- Hostile/contact behavior: mantis shrimp, sea spider, and prawn can damage on contact/lunge. Damage should still flow through existing scan/combat/hull systems, but the aggro model should be behavior-owned rather than `pattern === 'circle'` or `pattern === 'stalk'`.
- Rendering/orientation rule: align body to floor/wall tangent. Flip along tangent direction; preserve a small bob/hop while body remains close to terrain. Do not derive pitch from raw `vx/vy` in open water.
- Data fields needed: `behaviorClass: 'benthicWalker'`, `terrainAffinity`, `surface`, `anchorOffset`, `walkDir`, `walkPause`, `lungeTimer`, `recoverTimer`, `grounded`.

## Exact Future File Changes

Recommended smallest-safe implementation shape:

- `src/types.ts`
  - Add `FishBehaviorClass = 'legacySwimmer' | 'sessileAttached' | 'verticalAnchored' | 'benthicWalker'`.
  - Add `TerrainAffinity = 'openWater' | 'nearTerrain' | 'bottom' | 'wall' | 'surfaceAttached'`.
  - Add optional behavior fields to `FishSpecies` for the eventual full content migration.
  - Add runtime fields to `Fish`: `behaviorClass`, `terrainAffinity`, `surface?: TerrainSurfaceAnchor`, `anchor?: TerrainSurfaceAnchor['anchor']`, `anchorOffsetX/Y`, `anchorRefreshTimer`, and small state fields for retract/walk/lunge.
  - Add `teleportToFauna` and `faunaBehaviorReview` to `PlaytestCommand`.

- `src/fauna-behavior.ts` (new)
  - Add the first-slice behavior profile table keyed by species or asset key.
  - Export a resolver such as `fishBehaviorProfile(species: FishSpecies)`.
  - Export helpers for anchor preferences and behavior-aware logbook text.
  - This avoids mass-editing `src/content.ts` while that file is dirty. Later, when the tree is clean, the same profile can be migrated into `biomeFish` entries.

- `src/scene-worldgen.ts`
  - Keep `makeSchool` name for low churn or rename only if the worker is comfortable updating declarations.
  - In `makeSchool`, resolve the behavior profile. Open-water/legacy entries continue using `findOpenWaterInBand`.
  - Add `findFaunaAnchorInBand` and `faunaSurfaceOffset`, using `findTerrainSurfaceAnchorInBand`/`sampleTerrainSurfaceAnchors` with class-specific preferences.
  - Initialize `surface`, `homeX/homeY`, `x/y`, origin/facing hints, and zero/minimal velocity for anchored classes.
  - Add `refreshFaunaAnchorsAround`, mirroring `refreshFloraAnchorsAround`, for mined terrain under surface fauna.

- `src/scene-combat.ts`
  - Call `refreshFaunaAnchorsAround` anywhere mining currently calls `refreshFloraAnchorsAround`.
  - Keep life damage compatible with fish targets; anchored fauna still need scanner/cutter/dynamite/stun behavior.

- `src/scene-entities.ts`
  - Replace the top-level fish update with behavior-aware dispatch while preserving shared scan, stun, death, hurt flash, and bump cooldown handling.
  - Keep the current `steerFish` as the legacy/open-water path.
  - Add steering/update helpers for the three first classes.
  - Update `bumpFish` or add a contact-style branch so urchin defensive contact does not knock itself into swimmer physics and hostile walkers use lunge/contact wording.
  - Ensure stunned anchored fauna damp state but do not drift away from anchors.

- `src/helpers.ts`
  - Make `updateFacingFromVelocity` and `updateFishVisualFacing` no-op or behavior-aware for anchored/sessile/walker classes.
  - Update `predatorBiteCooldown` and any pattern-coupled hostile math so first-slice hostile walkers/urchin are not tuned by `circle`/`stalk`.
  - Avoid broad rarity or asset-loader churn.

- `src/scene-rendering.ts`
  - Route `drawFish` through behavior-aware pose/origin helpers.
  - Legacy swimmers keep `swimPose`.
  - Sessile/vertical/walker classes use surface normal/tangent rotation, behavior frame speed, and anchor origins similar to flora.
  - Keep scan rings, hurt flash, stun rings, and aggro cue markers behavior-independent.

- `src/hud.ts`
  - Update `fishLogbookInfo` so first-slice fauna says "attached", "rooted", or "walks the bottom" instead of open-water glide/chase text.
  - Keep catalog sorting and scan reward behavior unchanged.

- `src/scene-playtest.ts`
  - Add `teleportToFauna` targeting by species/asset key/class.
  - Add `faunaBehaviorReview` returning per-target metrics: behavior class, terrain affinity, `hasSurface`, `supported`, anchor side, normal/tangent, distance from surface/root, velocity magnitude, aggro/chase state, contact result, and screen position.
  - Extend fish snapshots with those same behavior fields for proof scripts.

- `tools/test_fauna_behavior_slice.mjs` (new, preferred) or `tools/playtest.mjs` (only if manager wants one harness)
  - Follow the structure of `tools/test_edge_flora_playtest.mjs`: launch Vite, use `window.__AQUA_PLAYTEST__`, command representative species into view, capture `#game canvas`, and write JSON plus screenshots under `runs/water9-fauna-behavior-audit-2026-07-06/`.
  - Keep `tools/build_small_life_manifest.mjs --check` intact; optionally extend it to include first-slice behavior metadata once the source fields exist.

- `src/scene.ts`
  - Add prototype declarations for any new worldgen/entities/playtest methods.

## Phased Implementation Sequence

1. Schema: add behavior and terrain unions plus runtime fields in `src/types.ts`; add first-slice resolver in `src/fauna-behavior.ts`.
2. Content migration: populate only the three first classes in the resolver. Do not touch the full 138-fauna roster yet. If `src/content.ts` is clean in the future lane, the worker may add optional fields directly to those selected rows instead.
3. Spawn placement: add `findFaunaAnchorInBand` and initialize first-slice fauna on surface anchors. Legacy fauna still use open water.
4. Update/steer dispatch: keep current `steerFish` for legacy swimmers; add anchored/sessile/walker update helpers and prevent selected classes from entering chase steering.
5. Render/facing: add surface-normal/tangent rendering paths and behavior-aware visual facing.
6. HUD/catalog text: update first-slice field notes so scanned fauna no longer claim open-water pursuit/glide.
7. Playtest proof tool: add `teleportToFauna`, `faunaBehaviorReview`, and `tools/test_fauna_behavior_slice.mjs`.
8. Verification: run typecheck/build and the targeted proof script; include normal-play screenshots and JSON metrics in the run directory.

## Normal-Play `#game canvas` Proof Plan

Capture actual gameplay canvas screenshots, not sandbox sprites or contact sheets. Required representative targets:

- Biome 1, 660-1740 m: `Nacre Thorn Clam` on floor/rock surface.
- Biome 1, 860-1580 m: `Glimmer Spine Urchin` attached to terrain, player nearby, no chase.
- Biome 2, 660-1740 m: `Cinder Vent Clingfish` on wall/ceiling/floor surface.
- Biome 1, 1340-2100 m: `Shellback Garden Eel` rooted and retracting/leaning.
- Biome 2, 1500-2380 m: `Tripodfish` rooted upright on bottom.
- Biome 1, 520-1600 m: `Silver Hinge Crab` walking on floor.
- Biome 1, 760-1520 m: `Mantis Shrimp` hostile local lunge/recover without full chase.
- Biome 2, 1260-2180 m: `Sea Spider` floor/wall tangent movement.
- Biome 2, 1300-2200 m: `Tin Plate Searobin` bottom walk/hop.

Before/after metrics to record:

- Pre-fix legacy sample for urchin if possible: velocity magnitude near player and distance from any terrain anchor after 2-3 seconds.
- Post-fix per target: `behaviorClass`, `terrainAffinity`, `hasSurface`, `supported`, `distanceFromSurfaceRoot`, `velocityMagnitude`, `homeDistance`, `aggro`, and `screenVisible`.
- For urchin rejection guard: with player inside 80 px for 3 seconds, displacement from anchor should stay under roughly 10 px, `velocityMagnitude` should stay near zero, and no pursuit aggro should accumulate.
- For walkers: distance to surface should stay within the configured clearance plus tolerance, and movement should be mostly along tangent rather than normal.
- For vertical anchored: base/root should remain fixed while top/body sways/retracts.

Rejection criteria:

- Any first-slice class spawns in open water when a suitable anchor exists.
- Urchin, clam, clingfish, garden eel, or tripodfish uses generic fish chase/flee steering.
- Hostile urchin moves rapidly toward the player.
- Benthic walkers spend sustained time detached from terrain or swim through the water column.
- Surface support mining leaves visible living fauna floating unsupported after refresh.
- Scan, cutter, dynamite, stun, sonar/camera visibility, or HUD catalog behavior breaks for any target.
- Proof screenshots are not from `#game canvas` normal play.

## Test And Build Plan

- `npx tsc --noEmit --pretty false`
- `npm run build`
- `node tools/build_small_life_manifest.mjs --check`
- Existing focused checks worth keeping: `node tools/test_fish_visual_facing_smoke.mjs`, `node tools/test_aggro_cue_regression.mjs`
- New targeted proof: `node tools/test_fauna_behavior_slice.mjs`
- Optional regression: rerun `node tools/test_edge_flora_playtest.mjs` because fauna anchoring should reuse the same terrain-mask surface concepts.

I did not run these commands in this read-only planning lane.

## Risks

- Terrain masks: `sampleTerrainSurfaceAnchors` gives good roots, but sprites have variable silhouettes. First slice needs tolerance so clams/urchins do not embed in rough mask edges.
- Mined terrain under anchored fauna: current mining refreshes flora only. The implementation must refresh fauna on the same mining paths and either re-anchor nearby or mark dead/hidden if support disappears.
- Dirty state: `src/content.ts` and `src/helpers.ts` are already dirty. A commit worker must not accidentally commit unrelated edits. The new resolver module reduces pressure on `src/content.ts`.
- Scan/combat compatibility: first-slice fauna should remain `kind: 'fish'` for scan/cutter/dynamite compatibility, but contact wording and aggro semantics need behavior branches.
- Sonar/camera/proof: snapshot currently exposes fish but not behavior/surface support. Playtest snapshots must be extended before proof can be authoritative.
- Perf: validating every anchored fish every frame is unnecessary. Validate on mining refresh and a low-frequency timer, not per draw tick.
- Rendering origins: fauna frame manifests are centered fish sprites today. Surface classes may need behavior default origins; avoid changing generated asset files in the first commit unless proof shows unavoidable clipping.

## Draft Next Worker Prompt

```text
# Water9 Fauna Behavior First Slice Implementation

Before any work:
1. Run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN.
2. `cd /mnt/nxt-dev/water9`.
3. Run `pwd` and `git rev-parse --show-toplevel`; both must be `/mnt/nxt-dev/water9` or STOP and ask.
4. Run `git status --short` and classify the dirty state before editing. Preserve unrelated changes.

Goal: implement the first fauna behavior slice for `sessileAttached`, `verticalAnchored`, and `benthicWalker`, using the plan in `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md`.

Scope:
- Keep all non-first-slice fauna on legacy fish movement.
- Fix the biome 1 urchin behavior: `Glimmer Spine Urchin` must be an attached defensive contact hazard, not a chasing fish.
- Implement terrain-surface spawn/update/render support for:
  - `sessileAttached`: Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish.
  - `verticalAnchored`: Shellback Garden Eel, Tripodfish, Goldcap Tripodfish, Ember Needle Pipefish, Basalt Lantern Seahorse, Copper Banded Seahorse.
  - `benthicWalker`: Snapping Shrimp, Mantis Shrimp, Opal Fan Shrimp, Silver Hinge Crab, Deep Sea Shrimp, Sea Spider, Chimney Ghost Shrimp, Brass Knuckle Prawn, Tin Plate Searobin, Hadopelagic Shrimp.
- Prefer a new `src/fauna-behavior.ts` resolver for the first-slice data so dirty `src/content.ts` does not need a mass edit. Only edit `src/content.ts` if you first confirm its existing dirt is in-scope and safe to preserve.
- Add `teleportToFauna`, `faunaBehaviorReview`, and a targeted proof script `tools/test_fauna_behavior_slice.mjs`.
- Nothing else.

Likely files:
- `src/types.ts`
- `src/fauna-behavior.ts`
- `src/scene-worldgen.ts`
- `src/scene-entities.ts`
- `src/scene-combat.ts`
- `src/helpers.ts`
- `src/scene-rendering.ts`
- `src/hud.ts`
- `src/scene-playtest.ts`
- `src/scene.ts`
- `tools/test_fauna_behavior_slice.mjs`

Verification:
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `node tools/build_small_life_manifest.mjs --check`
- `node tools/test_fish_visual_facing_smoke.mjs`
- `node tools/test_aggro_cue_regression.mjs`
- `node tools/test_fauna_behavior_slice.mjs`

Proof requirements:
- Write JSON and `#game canvas` screenshots under `runs/water9-fauna-behavior-audit-2026-07-06/`.
- Include representative normal-play proof for Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish, Shellback Garden Eel, Tripodfish, Silver Hinge Crab, Mantis Shrimp, Sea Spider, and Tin Plate Searobin.
- The urchin proof must show player proximity without pursuit/chase displacement.

Commit safety:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Return:
- Status
- Commit hash
- Changed files
- Verification commands and results
- Proof artifact paths
- Any dirty-state caveats or blockers
```

## Return Block

- Status: completed read-only slice plan at HEAD `539c6b8`.
- Report path: `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md`.
- Recommended first classes: `sessileAttached`, `verticalAnchored`, `benthicWalker`.
- Files a future implementation worker would likely touch: `src/types.ts`, `src/fauna-behavior.ts`, `src/scene-worldgen.ts`, `src/scene-entities.ts`, `src/scene-combat.ts`, `src/helpers.ts`, `src/scene-rendering.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/scene.ts`, `tools/test_fauna_behavior_slice.mjs`.
- Proof artifacts required: targeted JSON report plus normal-play `#game canvas` screenshots for the representative species listed above, all under `runs/water9-fauna-behavior-audit-2026-07-06/`.
- Caveats/blockers: dirty `src/content.ts` and `src/helpers.ts` require commit-lane caution; playtest snapshot needs behavior/surface fields before proof can be trusted; mined-terrain re-anchor handling is required for anchored fauna acceptance.
