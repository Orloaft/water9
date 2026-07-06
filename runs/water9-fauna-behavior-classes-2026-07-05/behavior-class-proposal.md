# Water9 Fauna Behavior Class Proposal - 2026-07-05

## Status And Preflight

- Status: design/report only; no source, runtime asset, staging, or commit changes made.
- Repo pin: `/mnt/nxt-dev/water9`.
- Preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `2c4ff8d`.
- HEAD expectation: matches the requested committed animation-upgrade HEAD. I treated the known dirty working tree as current runtime data and did not revert it.
- Active fauna scanned: 138 `biomeFish` entries from `src/content.ts`.
- Manifest/tooling check: `node tools/build_small_life_manifest.mjs --check` reported `small-life manifest up to date (155 entries)`; that manifest covers fauna plus flora/special-room entries, while this classification covers active fauna only.

## Current Movement Model

- The only authored fauna movement selector is `FishPattern = 'school' | 'sway' | 'glide' | 'stalk' | 'circle'` in `src/types.ts:21`. `Fish` stores `pattern`, velocities, home position, aggro, radius, sprite, and facing fields but no behavior class, terrain anchor, or contact state at `src/types.ts:164`-`src/types.ts:194`. `FishSpecies` likewise exposes only `pattern`, `speed`, `radius`, `hostile`, and optional `assetKey` at `src/types.ts:587`-`src/types.ts:597`.
- The active roster is in `biomeFish` at `src/content.ts:141`-`src/content.ts:288`. It contains bottom/sessile/non-fish silhouettes such as clams, crabs, urchins, shrimp, tripodfish, searobins, clingfish, garden eels, flounders, rays, cephalopods, jellyfish, seahorses, and many normal fish, but all are expressed through the same five `FishPattern` values.
- World generation calls `biomeFish[state.biome].flatMap((species) => this.makeSchool(species))` at `src/scene-worldgen.ts:62`. `makeSchool` always calls `findOpenWaterInBand`, initializes `vx/vy`, `homeX/homeY`, `speed`, `pattern`, `assetKey`, and a generic centered sprite at `src/scene-worldgen.ts:877`-`src/scene-worldgen.ts:918`. `findOpenWaterInBand` returns a water tile center or water-ish fallback at `src/scene-worldgen.ts:1260`-`src/scene-worldgen.ts:1268`.
- Each update routes every living fish through the same loop: cooldowns and scan state, `this.steerFish(fish, delta)` unless stunned, position integration `fish.x += fish.vx * delta`, `fish.y += fish.vy * delta`, then `this.keepFishInWater(fish)`, facing updates, and generic contact bump/combat at `src/scene-entities.ts:10`-`src/scene-entities.ts:44`.
- `steerFish` calculates one open-water target around `homeX/homeY`, switches offsets by the five patterns, gives non-hostiles a generic player-avoid target inside 72 px, and clamps velocity at `src/scene-entities.ts:72`-`src/scene-entities.ts:132`. Hostile detection/leash and pursuit are based on `pattern === 'circle'` versus everything else at `src/scene-entities.ts:77`-`src/scene-entities.ts:95`.
- `keepFishInWater` only bounces fish out of non-water tiles and lerps the home point toward the bounced position at `src/scene-entities.ts:134`-`src/scene-entities.ts:144`; it does not support bottom contact, floor sliding, wall anchoring, or terrain following.
- Rendering uses `swimPose` and velocity-derived angle/facing for every fish at `src/scene-rendering.ts:3329`-`src/scene-rendering.ts:3359`; `updateFishVisualFacing` similarly derives visual angle from `vx/vy` at `src/helpers.ts:2225`-`src/helpers.ts:2263`. That is good for swimming silhouettes but wrong for clams, urchins, clingfish, garden eels, tripodfish, and bottom walkers.
- Existing flora already has the terrain-contact model fauna needs: `Flora` includes `anchor` and optional `surface?: TerrainSurfaceAnchor` at `src/types.ts:200`-`src/types.ts:221`; `makeFloraPatch` finds `findFloraAnchorInBand`, offsets from the surface normal/tangent, stores `surface`, and creates an anchored sprite at `src/scene-worldgen.ts:921`-`src/scene-worldgen.ts:957`; rendering rotates and sways by surface normal/tangent at `src/scene-rendering.ts:3410`-`src/scene-rendering.ts:3424`. `findFloraAnchorInBand` and surface preferences are at `src/scene-worldgen.ts:1227`-`src/scene-worldgen.ts:1245`.

## Proposed Behavior Classes

### openWaterSchoolingFish

Movement model: keep a schooling/open-water steering path, but make it explicit as a behavior class rather than an overloaded `pattern`. Use compact local offsets, mild cohesion/separation around a school home, and quick flee bursts from the player.

Terrain contact/spawn rules: spawn in open water using the existing `findOpenWaterInBand`; avoid solid tiles with the existing water bounce until a stronger obstacle helper exists.

Player behavior: non-hostile avoidance only; no attack. School should scatter briefly and reform.

Orientation/facing: current velocity-facing and `swimPose` are appropriate.

Why separate: it preserves the current good behavior for small fish while freeing non-fish from the same steering path.

### cruiserSoloSwimmer

Movement model: solo fish patrols around home with low-frequency glide arcs, mild depth bias, and less tight schooling. This is the default for fish-like non-hostiles.

Terrain contact/spawn rules: open-water spawn, optionally biased away from floor/walls unless species later asks for `nearTerrain`.

Player behavior: flee or give way; no damage except collision bump.

Orientation/facing: velocity-facing with smooth turn delay remains correct.

Why separate: many normal fish are not schools, predators, or bottom fauna; a default cruiser keeps migration low-risk.

### hoverDrifter

Movement model: near-zero steering with sinusoidal bob, slow current drift, and soft home return. Jellyfish/medusa/microfish/copepods should not point into velocity like fish.

Terrain contact/spawn rules: open water, with larger padding from terrain for jelly bodies. Avoid hard bounces by damping velocity near solids.

Player behavior: weak avoidance for harmless forms; hazardous variants can damage on contact without pursuit.

Orientation/facing: keep mostly upright or asset-native orientation; animation frame speed should come from phase/current rather than swim speed.

Why separate: drifting bodies visually break when they turn and accelerate like fish.

### cephalopodHover

Movement model: hover with pulsed jets: slow station-keeping, short backward/side bursts, and pauses. Octopus can use more terrain affinity later, but the first class can cover squid, cuttle, octopus, and nautilus.

Terrain contact/spawn rules: mostly open water; optional `nearTerrain` homes for octopus. Avoid spawning embedded in walls; allow lower speed and higher turn damping.

Player behavior: non-hostiles drift away; hostile/venomous cephalopods lunge or flash when close, then retreat to home rather than constant chase.

Orientation/facing: face intent vector with slower rotation; nautilus should remain shell-forward with limited pitch.

Why separate: cephalopods and nautilus have a readable hover/jet silhouette and should not use fish tail-swim pose timings.

### verticalAnchored

Movement model: root or tether to a floor/near-terrain anchor. Garden eels and tripodfish keep a fixed base, sway along tangent/normal, and retract when the player approaches; seahorses/pipefish drift only a short radius near vegetation/terrain.

Terrain contact/spawn rules: use `TerrainSurfaceAnchor` floor anchors for garden eels/tripodfish and near-terrain anchors for seahorses/pipefish. If no anchor is found, fall back to low-speed hover rather than open-water fish movement.

Player behavior: avoid by shrinking/retracting, not fleeing horizontally; no attack for current entries.

Orientation/facing: garden eels/tripodfish stay vertical/upright relative to floor normal; seahorses remain mostly vertical with mild lean.

Why separate: these are the most obvious current mismatches because open-water steering detaches them from the seafloor.

### benthicWalker

Movement model: maintain ground contact on floor anchors, move along the terrain tangent, pause frequently, and use short skitters/hops. Hostile walkers use local lunges instead of full water-column pursuit.

Terrain contact/spawn rules: spawn on floor or stable near-floor surface anchors; store surface/root data and periodically validate/refresh it if terrain changes.

Player behavior: non-hostiles sidestep or hop away along floor; hostile shrimp/prawn/sea spider/mantis shrimp lunge within short range and then recover.

Orientation/facing: align feet/body to floor tangent; flip along tangent, not raw `vx`; preserve a small bob/hop but keep body close to terrain.

Why separate: crabs, prawns, shrimp, sea spiders, and searobins need contact motion and cannot plausibly swim like generic fish.

### sessileAttached

Movement model: no translational steering during normal life. Animate with pulsing, shell open/close, spine shimmer, or brief re-anchor hop for clingfish only.

Terrain contact/spawn rules: spawn on floor/wall/ceiling anchors based on `terrainAffinity`; store `TerrainSurfaceAnchor`; validate after mining and either relocate nearby or detach into a short fallback state.

Player behavior: clams are passive; urchins are contact hazards; clingfish can detach/reattach or flee a short distance. None should chase through open water.

Orientation/facing: rotate to surface normal; set sprite origin per anchor like flora; do not use `swimPose`.

Why separate: sessile silhouettes are currently the least believable under `steerFish` and need the existing flora anchoring model more than a fish steering tweak.

### bottomRestingGlider

Movement model: floor-adjacent glide with settle/rest states. Rays and flounders skim over the bottom; bottom fish make short low glides and return to a near-floor home.

Terrain contact/spawn rules: use rock-top/floor anchors or open-water positions just above terrain; keep a target clearance above the surface and slide along floor contours.

Player behavior: low burst away and resettle; hostile variants, if added later, can ambush upward from rest.

Orientation/facing: face tangent/glide direction with limited pitch; flounder/ray sprites should remain flatter than fish.

Why separate: bottom-associated fish are still swimmers, but their terrain relationship is the point of the silhouette.

### predatorPursuerAmbusher

Movement model: preserve hostile detection/leash/chase as the open-water predator path, with optional ambush homes and stronger home return. This class should own bite cooldown/damage tuning instead of checking `pattern === 'circle'`.

Terrain contact/spawn rules: open water for sharks/viperfish/dragonfish; near-terrain homes for morays/eelpouts/cusks where appropriate.

Player behavior: pursue, flank, lunge, bite, and leash back. Ambushers should telegraph from home before burst.

Orientation/facing: velocity-facing and swim pose are correct for most predators; elongated eels may need tighter pitch limits.

Why separate: combat expectations are different from passive fish and should not be coupled to the same display patterns used for movement flavor.

## Classification Summary

| Behavior class | Count | Representative species |
| --- | ---: | --- |
| `openWaterSchoolingFish` | 18 | Lantern Fry, Cobalt Sawtail Minnow, Ivory Spined Cardinal, Aurora Fin Damselfish, Copperglass Cardinal, Brightscale Halfbeak |
| `cruiserSoloSwimmer` | 38 | Obsidian Reef Wrasse, Ribbonjaw Cleaner Wrasse, Mottle Reef Cowfish, Reef Needle Snipefish, Teal Mask Filefish, Goldbar Squirrelfish |
| `hoverDrifter` | 9 | Comb Jelly, Moon Jelly, Prism Bell Jelly, Vent Pearl Copepod, Abyssal Jelly, Lantern Swarm |
| `cephalopodHover` | 12 | Reef Squid, Nautilus, Blue-ring Octopus, Tidepool Octopus, Kelp Arrow Squid, Glass Squid |
| `verticalAnchored` | 6 | Ember Needle Pipefish, Basalt Lantern Seahorse, Copper Banded Seahorse, Shellback Garden Eel, Tripodfish, Goldcap Tripodfish |
| `benthicWalker` | 10 | Snapping Shrimp, Mantis Shrimp, Opal Fan Shrimp, Silver Hinge Crab, Deep Sea Shrimp, Sea Spider |
| `sessileAttached` | 3 | Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish |
| `bottomRestingGlider` | 16 | Glass Ray, Amber Comb Blenny, Blue Lantern Goby, Pearl Eye Flounder, Opalstripe Tilefish, Opal Eye Mudskipper |
| `predatorPursuerAmbusher` | 26 | Gulper Eel, Moonmask Lionfish, Vent Jade Eelpout, Abyssal Viperfish, Goblin Shark, Frilled Shark |

## Specific Mismatch Recommendations

- Nacre Thorn Clam: classify as `sessileAttached`, `bottom`, high confidence. It should spawn on a floor/rock anchor, use shell pulse/open-close animation, and never call open-water steering.
- Silver Hinge Crab: `benthicWalker`, `bottom`, high. Spawn on stable floor anchors, walk tangent to terrain, pause, and sidestep from the player.
- Glimmer Spine Urchin: `sessileAttached`, `surfaceAttached`, high. Treat hostile as defensive contact damage, not `stalk` pursuit.
- Opal Fan Shrimp: `benthicWalker`, `nearTerrain`, medium. Allow short swim hops, but bias home/return to bottom or vent surfaces.
- Chimney Ghost Shrimp: `benthicWalker`, `nearTerrain`, medium. Same as Opal Fan Shrimp, probably vent-adjacent if spawn helpers expose that.
- Brass Knuckle Prawn: `benthicWalker`, `bottom`, high. Hostile should be a short-range lunge plus recovery, not full-column chase.
- Tripodfish and Goldcap Tripodfish: `verticalAnchored`, `bottom`, high. Root legs to floor, sway, retract/lean away from player.
- Tin Plate Searobin: `benthicWalker`, `bottom`, high. Walking-fish silhouette should crawl/hop along floor with occasional low glide.
- Cinder Vent Clingfish: `sessileAttached`, `wall`, high. Prefer wall/ceiling/floor vent anchors; detach only briefly.
- Shellback Garden Eel: `verticalAnchored`, `bottom`, high. Root to sand/rock top and retract rather than flee.
- Pearl Eye Flounder: `bottomRestingGlider`, `bottom`, high. Rest on floor, low glide away, settle again.
- Lumen Kite Ray: `bottomRestingGlider`, `nearTerrain`, high. Cruise just above terrain with ray banking, not mid-water circling.
- Glass Helm Nautilus: `cephalopodHover`, `openWater`, high. Slow buoyant hover and pulse-turns; no fast glide.
- Prism Bell Jelly: `hoverDrifter`, `openWater`, high. Bob/current drift with weak avoidance; orientation mostly upright.
- Seahorses: `verticalAnchored`, `nearTerrain`, high. Hover near terrain/flora and stay upright; no broad circle patrol.
- Squid and cuttle: `cephalopodHover`, `openWater`, high. Use hover plus jet bursts; hostile vampire squid can lunge then retreat.
- Normal fish: split between `openWaterSchoolingFish`, `cruiserSoloSwimmer`, and `predatorPursuerAmbusher`; current fish steering is acceptable as a starting point once renamed out of body-plan duties.

## Implementation Plan

1. Schema/type changes: add `FishBehaviorClass` and `TerrainAffinity` unions in `src/types.ts`; add optional `behaviorClass`, `terrainAffinity`, `surface?: TerrainSurfaceAnchor`, `anchorState`, and behavior timers to `Fish`/`FishSpecies`. Keep `pattern` temporarily as a legacy animation/flavor field during migration.
2. Content migration: add behavior class/terrain affinity to `biomeFish` using this JSON as the initial map. Keep names broad; avoid bespoke per-species code except small data knobs such as `retracts`, `lungeRange`, or `clearancePx` if needed.
3. Runtime movement helpers: replace the monolithic `steerFish` branch with dispatch helpers such as `steerOpenWaterSchoolingFish`, `steerCruiserSoloSwimmer`, `steerHoverDrifter`, `steerCephalopodHover`, `steerVerticalAnchored`, `steerBenthicWalker`, `steerSessileAttached`, `steerBottomRestingGlider`, and `steerPredatorPursuerAmbusher`. Reuse common aggro, scan, stun, and bump code.
4. Terrain helpers: extract reusable surface offset/origin/rotation utilities from flora instead of duplicating logic. Add `findFaunaAnchorInBand` with class-specific preferences: floor for walkers/eels/flounders, wall/ceiling for clingfish, any stable surface for urchins.
5. Spawn placement: update `makeSchool` into something like `makeFaunaGroup`; choose open water versus surface anchor by `terrainAffinity`; set sprite origin/depth/initial facing based on class.
6. Rendering/orientation: route fish rendering through behavior-aware pose helpers. Swimming classes keep `swimPose`; anchored/sessile/walker classes use surface normal/tangent; hover/drifter classes use upright or low-pitch pose.
7. Validation/report tooling: extend `tools/build_small_life_manifest.mjs` or add a small behavior manifest checker to ensure every active `biomeFish` entry has a behavior class and terrain affinity, and emit counts by class.
8. Visual proof: add or reuse review commands/captures that teleport to representative species in each biome and produce `#game canvas` screenshots showing floor/wall contact.

## Risks And Edge Cases

- Terrain collision: walkers and bottom gliders need clearance above the terrain mask, not just tile centers. Raw tile anchors may embed sprites in sloped/irregular masks.
- Wall/floor anchoring: flora supports anchors, but fauna adds combat, stun, scan, death, and bump. Those systems must not knock sessile fauna into invalid states.
- Mined terrain: mining can remove the tile under clams, urchins, garden eels, or walkers. Use `validateTerrainSurfaceAnchor` and nearby re-anchor; if no anchor exists, hide/dead/drop or switch to a short detached fallback.
- Scan/combat expectations: hostile urchin/prawn/mantis behavior should still satisfy scan/combat loops, but not every hostile should chase. Bite cooldown/damage should be behavior-owned rather than derived from `pattern`.
- Performance: surface validation every frame for many fauna could be expensive. Cache anchors, validate on terrain-dirty events or low-frequency timers, and keep open-water classes on the cheap path.
- Sprite origins: generated frames currently assume centered fish sprites. Anchored fauna may need per-asset anchors/origin metadata in frames manifests or behavior defaults.
- Pathological spawns: some depth bands may not have enough floor/wall anchors. Spawn helpers need fallback counts and should report shortfalls rather than silently converting everything to swimmers.

## Verification Plan For Implementation

- Run `npx tsc --noEmit --pretty false`.
- Run `npm run build`.
- Run `node tools/build_small_life_manifest.mjs --check` and the new behavior-class coverage check.
- Add targeted unit/tooling checks if available: every `biomeFish` entry has a known behavior class; every non-open-water class has a terrain affinity; representative anchor search returns viable anchors in each biome/depth band.
- Normal-play visual proof: capture `#game canvas` across representative bands showing walkers and bottom gliders on terrain, sessile fauna attached to floor/wall/ceiling, garden eels/tripodfish rooted upright, jellyfish drifting, cephalopods hovering, and normal fish/predators still swimming. Suggested representatives: Nacre Thorn Clam, Silver Hinge Crab, Glimmer Spine Urchin, Chimney Ghost Shrimp, Tripodfish, Goldcap Tripodfish, Tin Plate Searobin, Cinder Vent Clingfish, Shellback Garden Eel, Pearl Eye Flounder, Lumen Kite Ray, Glass Helm Nautilus, Prism Bell Jelly, one seahorse, one squid/cuttle, one schooling fish, and one predator.

## Caveats

- The JSON uses current `src/content.ts` in the dirty working tree, not a clean checkout. That is intentional per the task request for current runtime data.
- Some classifications are inferential from species names and generated manifest silhouettes; those are marked `medium` confidence where a real animal could plausibly swim or hover. The set is intentionally broad enough for a focused implementation pass without bespoke per-species behaviors.
