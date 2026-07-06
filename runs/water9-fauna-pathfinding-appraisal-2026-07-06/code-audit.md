# Water9 Fauna Pathfinding Code Audit

Date: 2026-07-06
HEAD: `166b689`
Scope: read-only source audit, except this report.

## Dirty State Classification

Pre-existing unrelated dirty state was present before this report:
- Generated viperfish runtime assets under `public/assets/generated/` and review previews under `public/review/exploration-life-2026-07-04/`.
- Source edits in `src/content.ts` and `src/helpers.ts`; reviewed as current working tree state, not changed.
- Older run/proof files under `runs/`, including fauna behavior/pathfinding appraisal ledgers and other Water9 runs.

This worker created only `runs/water9-fauna-pathfinding-appraisal-2026-07-06/code-audit.md`. No source files were edited, staged, or committed.

## Findings, Ranked

### High: Legacy swimmers can wedge because collision is center-tile-only and reactive

Evidence:
- `src/scene-entities.ts:38-43` advances legacy fish by velocity, then calls `keepFishInWater`.
- `src/scene-entities.ts:263-272` checks only `this.getTile(floor(fish.x / TILE), floor(fish.y / TILE)) === 'water'`; it ignores fish radius, terrain-mask silhouettes, and nearby wall clearance.
- On a solid center tile, the correction nudges back by `fish.vx * 0.09` / `fish.vy * 0.09`, reverses velocity by `-0.65`, and pulls `homeX/homeY` toward the collision point.

Impact:
- Any `legacySwimmer` whose center crosses a rock tile can bounce back and forth if its target remains across the obstacle or its home gets pulled into a bad pocket.
- Because the body radius is ignored, larger neutral fish can visually intersect rocks before the center tile detects collision.
- The correction uses no terrain normal and no memory of which obstacle was hit, so the next steering frame can immediately drive the fish back into the same rock.

Most affected classes/species:
- All fish that fall through `fishBehaviorProfile()` to `legacySwimmer` in `src/fauna-behavior.ts:151-170`.
- That is most active small/open-water fauna in `src/content.ts`, especially neutral `school`, `glide`, `sway`, and `circle` fish such as Lantern Fry, Glass Ray, Comb Jelly, Reef Squid, Nautilus, Moon Jelly, Tidepool Octopus, Ash Minnow, Hatchetfish, Lanternfish, Bigfin Squid, Lantern Swarm, and the many `fauna-exp-*` swimmers not listed in the first-slice profile table.
- Nest-room adults are also raw swimmer fish: `populateNestRoom()` pushes fish without `behaviorClass` or terrain metadata in `src/scene-worldgen.ts:1179-1231`.

### High: Steering targets are not terrain-aware

Evidence:
- `steerFish()` computes target positions from home plus pattern offsets in `src/scene-entities.ts:217-240`.
- Neutral flee behavior overrides the target away from the player at `src/scene-entities.ts:242-245`.
- It then accelerates directly toward the target at `src/scene-entities.ts:247-260` with no line-of-sight, local obstacle, or target-validity check.

Impact:
- A swimmer can be in open water while its pattern target lies inside rock or behind a narrow pillar. The fish keeps steering toward that unreachable target, `keepFishInWater()` bounces it off the rock, and the next frame repeats the same decision.
- Neutral fish near the player are especially prone to visible oscillation because flee targets can point directly into a wall or into a narrow rock gap.
- This is not full pathfinding failure; it is local steering without obstacle awareness.

### High: Open-water spawn/home selection has no clearance contract

Evidence:
- `makeSchool()` uses `findOpenWaterInBand()` for legacy swimmers in `src/scene-worldgen.ts:899-905`, then uses that same point as `homeX/homeY` in `src/scene-worldgen.ts:914-923`.
- `findOpenWaterInBand()` accepts the first random tile whose tile id is `water` in `src/scene-worldgen.ts:1359-1365`.
- Its fallback returns a random coordinate in the band without checking that the coordinate is water at all in `src/scene-worldgen.ts:1366-1368`.

Impact:
- Legacy fish can spawn/home in one-tile pockets, narrow cracks, or immediately adjacent to solid terrain. Pattern offsets can then cross stone every cycle.
- The fallback is rare but dangerous: if random attempts fail in a tight band, it can place fish inside solid or in an unreachable position.
- This amplifies the reactive collision issue because `homeX/homeY` is the anchor for all non-aggro pattern targets.

### Medium: Anchored and benthic behaviors avoid the legacy bounce, but have different local-clearance risks

Evidence:
- Non-legacy behavior updates skip legacy movement/collision and instead call anchored behavior in `src/scene-entities.ts:33-46`.
- Anchor validation rechecks only the stored surface cell and nearby replacement anchors in `src/scene-entities.ts:55-72` and `src/terrain-mask.ts:363-389`.
- `benthicWalker` moves by sliding `rootOffsetX` along the anchor tangent and clamps it to a tether in `src/scene-entities.ts:122-172`.
- `faunaSurfaceOffset()` places benthic walkers outward from the anchor using profile clearance plus radius scaling in `src/scene-worldgen.ts:1321-1328`.

Impact:
- `sessileAttached` and `verticalAnchored` should not show the same back-and-forth rock bounce because they do not chase a terrain-blind open-water target.
- `benthicWalker` can still visually clip or sweep into opposing rock on concave surfaces because the update does not validate the projected body position or tangent sweep against terrain.
- Benthic endpoint flipping at `src/scene-entities.ts:152-154` is intentional tether behavior, but in a tight pocket it can look like oscillation if the tangent path is obstructed.
- Anchor refresh after mining is more robust than legacy collision: `refreshFaunaAnchorsAround()` revalidates/kills/repositions anchored fauna around edited terrain in `src/scene-worldgen.ts:765-783`, and mining calls it in `src/scene-combat.ts:94-95`, `src/scene-combat.ts:458-459`, and `src/scene-combat.ts:474-475`.

### Medium: Existing terrain-mask/contact APIs are strong, but fish do not use them

Available APIs:
- Terrain mask lifecycle and density: `ensureTerrainMask()`, `rebuildTerrainMask()`, `syncTerrainMaskTile()`, `terrainMaskDensityAt()` in `src/terrain-mask.ts:14-111`.
- Contact queries with normals: `terrainMaskContactForAabb()` in `src/terrain-mask.ts:121-149` and `terrainMaskContactForCapsule()` in `src/terrain-mask.ts:151-202`.
- Surface-anchor sampling/validation: `sampleTerrainSurfaceAnchors()` in `src/terrain-mask.ts:323-346`, `findTerrainSurfaceAnchorInBand()` in `src/terrain-mask.ts:348-360`, `validateTerrainSurfaceAnchor()` in `src/terrain-mask.ts:363-369`, and `findNearbyTerrainSurfaceAnchor()` in `src/terrain-mask.ts:371-389`.
- Player collision uses terrain mask density and collision sample points in `src/scene.ts:972-990` and `src/scene.ts:992-1010`.
- Articulated creatures already use terrain contact normals for push-out/sliding correction in `src/scene-articulated.ts:1251-1305`.

Gap:
- There is no fish-specific "nearest reachable water" API.
- There is no local path/segment validation from fish to pattern target.
- `findOpenWaterInBand()` is a random tile finder, not a reachable/clearance finder.

### Low: Existing test/debug surfaces can measure the issue, but do not assert it

Evidence:
- Playtest snapshot includes fish position, velocity, behavior class, surface support, distance from terrain surface, walk state, and screen visibility in `src/scene-playtest.ts:1853-1895`.
- `teleportToFauna` can focus a fish by species/asset/behavior in `src/scene-playtest.ts:2446-2489`.
- `faunaBehaviorReview` returns per-fish behavior metrics in `src/scene-playtest.ts:2490-2531`.
- `tools/test_fauna_behavior_slice.mjs:68-181` covers first-slice anchored/benthic behavior and screenshots, but it does not exercise legacy swimmer obstacle wedging.
- `package.json` exposes `playtest`, `water9:fauna-rarity-check`, and `small-enemy:motion-smoke`; there is no named pathfinding/wedging smoke.

## Likely Root Cause

The symptom is mostly legacy swimmer steering plus `keepFishInWater()`, with spawn/home selection as an amplifier.

The core loop is:
1. Legacy fish picks a pattern/flee/aggro target without terrain validation.
2. Fish accelerates directly toward that target.
3. After movement, only the center tile is checked.
4. If solid, velocity is reversed, position is nudged backward, and home drifts toward the impact.
5. On the next frame, the same target/home relationship can push the fish back into the same terrain.

This is a local avoidance problem, not a need for heavy full-map pathfinding.

## Recommended First Implementation Slice

Smallest plausible slice:
1. Add a fish-sized terrain contact helper that reuses the terrain mask:
   - For legacy fish, approximate the body as an AABB or small radial sample using `fish.radius`.
   - Use `terrainMaskContactForAabb()` or a tiny fish-specific sample helper that returns `TerrainMaskContact` with `nx/ny`.
   - Include world bounds and barge solid checks if needed.
2. Replace `keepFishInWater()` with a radius-aware contact resolution:
   - Push fish outward along the contact normal for 1-2 cheap passes.
   - Remove only the velocity component moving into terrain; preserve or damp tangential velocity instead of flipping the whole vector.
   - Do not pull `homeX/homeY` toward the collision point. If home is invalid, re-home separately to a nearby clear point.
3. Add local target validation in `steerFish()`:
   - If the direct step/short ray from fish to target intersects terrain, bias the desired vector along the obstacle tangent plus a small outward normal.
   - Keep a short `avoidTimer`/`avoidSign` on `Fish` only if one-frame tangent choice flickers; otherwise derive a stable sign from species/phase/hash.
4. Tighten legacy spawn/home selection:
   - Pass scaled species radius into `findOpenWaterInBand()`.
   - Require center water plus no terrain-mask contact at the proposed body radius.
   - Make the fallback search safer instead of returning an unchecked random coordinate.
5. Add one focused Playwright smoke:
   - Spawn or select a neutral legacy swimmer near terrain.
   - Sample its positions for several seconds via `faunaBehaviorReview` or snapshot.
   - Fail if it repeatedly alternates across a small segment while terrain contact remains high or if its center enters solid.

This keeps the fix local and cheap, reuses existing terrain-mask/contact code, and avoids global pathfinding.

## Caveats

- This audit did not run live playtests or modify code.
- Dirty `src/content.ts` and `src/helpers.ts` were treated as current working tree truth, so line evidence reflects the present dirty checkout at HEAD `166b689` plus local changes.
- Exact reproduction likelihood varies by generated terrain seed, biome, and fish spawn/home locations.
