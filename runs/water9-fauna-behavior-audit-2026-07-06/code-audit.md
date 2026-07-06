# Water9 Fauna Behavior Code Audit - 2026-07-06

## Status And Preflight

- Status: report-only audit completed. No source/runtime assets were edited, staged, or committed.
- Repo pin: `/mnt/nxt-dev/water9`.
- Preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `539c6b8`.
- Project identity checked before writing: `pwd` and `git rev-parse --show-toplevel` both returned `/mnt/nxt-dev/water9`.
- Known dirty state was preserved. Targeted status showed user dirt in `src/content.ts` and `src/helpers.ts`; I did not modify those files.
- Prior artifact checked: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md` at lines 12-21 describes the legacy fish pattern architecture, lines 73-107 define the first anchored/sessile classes, and lines 149-152 call out Glimmer Spine Urchin as `sessileAttached`.

## Current Architecture

### Types And Schema

- `FishPattern` is still the full authored movement selector: `school | sway | glide | stalk | circle` at `src/types.ts:21`.
- `Fish` still stores velocity, home, `hostile`, `pattern`, aggro, scan/combat state, hp, sprite, and facing fields, but no behavior class, terrain affinity, surface anchor, root/tether state, or terrain contact state at `src/types.ts:165`-`src/types.ts:198`.
- `Flora` has the anchor/surface shape small terrain fauna will probably need: `anchor` and optional `surface?: TerrainSurfaceAnchor` at `src/types.ts:201`-`src/types.ts:223`.
- `TerrainSurfaceAnchor` already carries root, normal, tangent, anchor side, support, clearance, and source at `src/types.ts:226`-`src/types.ts:243`.
- `ScanTarget = Fish | Flora | ArticulatedCreature` is the compatibility boundary for scanning and life damage at `src/types.ts:523`.
- `FishSpecies` still has only species/count/depth/color/hostile/pattern/radius/speed/assetKey at `src/types.ts:588`-`src/types.ts:599`.
- `Hazard` also uses optional `surface?: TerrainSurfaceAnchor`, proving anchored non-flora runtime entities already exist at `src/types.ts:643`-`src/types.ts:650`.

### Content

- All active small fauna are authored in `biomeFish: Record<Biome, FishSpecies[]>` beginning at `src/content.ts:141`.
- Biome 1 uses only the five legacy fish patterns. Representative non-fish silhouettes are still authored as generic `FishSpecies`: `Silver Hinge Crab` is `pattern: 'glide'` at `src/content.ts:161`, `Nacre Thorn Clam` is `pattern: 'sway'` at `src/content.ts:164`, `Shellback Garden Eel` is `pattern: 'sway'` at `src/content.ts:178`, and `Glimmer Spine Urchin` is `hostile: true, pattern: 'stalk', speed: [34, 64]` at `src/content.ts:168`.
- Current count from the `biomeFish` block is still 138 active small fauna entries.

### Spawn

- World generation rebuilds the terrain mask before population, then spawns fish and flora with adjacent calls: `this.fish = biomeFish[state.biome].flatMap((species) => this.makeSchool(species))` and `this.flora = biomeFlora[state.biome].flatMap((species) => this.makeFloraPatch(species))` at `src/scene-worldgen.ts:59`-`src/scene-worldgen.ts:64`.
- `makeSchool` is the generic fish/fauna spawner: it always calls `findOpenWaterInBand`, seeds `vx/vy`, `homeX/homeY`, `speed`, `hostile`, `pattern`, hp, facing, and a centered sprite at `src/scene-worldgen.ts:877`-`src/scene-worldgen.ts:918`.
- `findOpenWaterInBand` only looks for any water tile center and falls back to a random band point at `src/scene-worldgen.ts:1260`-`src/scene-worldgen.ts:1268`; no body plan can currently request a floor/wall/ceiling anchor.
- Special-room adult threats also push `Fish` objects with the same runtime fields and patterns at `src/scene-worldgen.ts:1120`-`src/scene-worldgen.ts:1165`.

### Reusable Surface Anchors

- Decorative flora props already detect exposed terrain edges and stable footing at `src/scene-worldgen.ts:720`-`src/scene-worldgen.ts:734`.
- Gameplay flora uses `findFloraAnchorInBand`, offsets along normal/tangent, stores `surface`, and creates a sprite at `src/scene-worldgen.ts:921`-`src/scene-worldgen.ts:957`.
- Flora revalidates after terrain changes via `validateTerrainSurfaceAnchor` and `findNearbyTerrainSurfaceAnchor`, then moves or dies at `src/scene-worldgen.ts:741`-`src/scene-worldgen.ts:761`.
- Special rooms reuse the same anchor machinery for oxygen/lumen flora at `src/scene-worldgen.ts:985`-`src/scene-worldgen.ts:1057`.
- The low-level reusable anchor helpers are already in `src/terrain-mask.ts`: sampling at `src/terrain-mask.ts:323`-`src/terrain-mask.ts:345`, band search at `src/terrain-mask.ts:348`-`src/terrain-mask.ts:360`, validation at `src/terrain-mask.ts:363`-`src/terrain-mask.ts:368`, and nearby relocation at `src/terrain-mask.ts:371`-`src/terrain-mask.ts:380`.

### Steering, Integration, And Contact

- Every living `Fish` goes through the same update loop: timers, optional `steerFish`, Euler integration, `keepFishInWater`, facing updates, then contact bump at `src/scene-entities.ts:10`-`src/scene-entities.ts:44`.
- `steerFish` computes one target around `homeX/homeY`, switches only on `pattern`, has a generic non-hostile flee clause inside 72 px, accelerates toward the target, and clamps max speed at `src/scene-entities.ts:72`-`src/scene-entities.ts:132`.
- Hostile behavior is pattern-light: detection/leash are `circle` versus all other patterns at `src/scene-entities.ts:77`-`src/scene-entities.ts:83`; pursuit targets the player with lead/flank at `src/scene-entities.ts:91`-`src/scene-entities.ts:95`; pursuit speed is `1.42x` for `circle` and `1.58x` for all other hostile fish, with a `2.05x` max speed cap at `src/scene-entities.ts:121`-`src/scene-entities.ts:130`.
- `keepFishInWater` only bounces out of non-water tiles and lerps home toward the bounced position at `src/scene-entities.ts:134`-`src/scene-entities.ts:144`. There is no terrain tangent, root, floor contact, wall cling, or low-frequency anchor validation for fish.
- `scanNearbyLife` gently pushes fish away during scans by adding to `vx/vy`, which will need a guard for sessile/anchored classes at `src/scene-entities.ts:675`-`src/scene-entities.ts:715`.

### Rendering And Facing

- `drawFish` treats every small fauna as a swimmer: velocity/visual angle, `swimPose`, frame speed from `vx/vy`, hostile size/cue differences, and a width derived from `hostile`/`pattern` at `src/scene-rendering.ts:3331`-`src/scene-rendering.ts:3395`.
- `updateFacingFromVelocity`, `updateFishVisualFacing`, and `swimPose` are all velocity-facing helpers at `src/helpers.ts:2366`-`src/helpers.ts:2409` and `src/helpers.ts:2495`-`src/helpers.ts:2501`.
- Flora rendering is the comparison point: it rotates from `surface.normal`, sways along `surface.tangent`, and chooses origin from the anchor side at `src/scene-rendering.ts:3398`-`src/scene-rendering.ts:3460`.

### Hostile Contact, Combat, Scan, HUD, Sonar

- `bumpFish` handles all fish contact: hostile fish knock harder, set bite cooldown, apply hull damage, venom/bite registration, and bite SFX; non-hostiles only scatter at `src/scene-entities.ts:146`-`src/scene-entities.ts:167`.
- `predatorBiteCooldown` still depends on `fish.pattern === 'circle'` at `src/helpers.ts:2411`-`src/helpers.ts:2413`.
- Life damage selects fish and flora by radius at `src/scene-combat.ts:286`-`src/scene-combat.ts:300`; fish damage agitates hostile fish and nudges `vx/vy` at `src/scene-combat.ts:303`-`src/scene-combat.ts:318`.
- Stun grenade and harpoon treat hostile fish as mobile predators and zero/modify their velocity at `src/scene-combat.ts:625`-`src/scene-combat.ts:641` and `src/scene-combat.ts:909`-`src/scene-combat.ts:921`.
- Injector knife can only target hostile fish/articulated threats, then sets `stunned`, `aggro`, and `vx/vy` on the target at `src/scene-combat.ts:724`-`src/scene-combat.ts:735` and `src/scene-combat.ts:694`-`src/scene-combat.ts:708`.
- Sonar pings attract every hostile fish by setting `aggro` and pulling `homeX/homeY` toward the player at `src/scene-sonar.ts:25`-`src/scene-sonar.ts:34`; sonar contacts expose only `kind: 'fish'` and `hostile` at `src/scene-sonar.ts:53`-`src/scene-sonar.ts:79`.
- The sonar map renders contacts by `contact.kind` and `contact.hostile`, not pattern/body class, at `src/scene-rendering.ts:4003`-`src/scene-rendering.ts:4046` and `src/scene-rendering.ts:4211`-`src/scene-rendering.ts:4221`.
- Logbook entries use `hostile` for kind and `pattern` for habit text at `src/hud.ts:1139`-`src/hud.ts:1148` and `src/hud.ts:1278`-`src/hud.ts:1292`; charting threat proof only needs hostile/hazardous scanned species at `src/helpers.ts:2800`-`src/helpers.ts:2849` and `src/hud.ts:1388`-`src/hud.ts:1397`.
- Playtest snapshots expose `fish.pattern` but not behavior class at `src/scene-playtest.ts:1853`-`src/scene-playtest.ts:1865`; one review still asserts `smallFishUsesLegacyFacing` by checking no fish has `turn` at `src/scene-playtest.ts:2898`-`src/scene-playtest.ts:2905`; world survey counts only fish/hostileFish/flora at `src/scene-playtest.ts:3259`-`src/scene-playtest.ts:3332`.

## Is The July 5 Finding Still True?

Yes. After HEAD `539c6b8`, all active small fauna in `biomeFish` still share the same generic `Fish` movement model: they spawn through `makeSchool`, use open-water placement, update through `updateFish`, steer through `steerFish`, bounce through `keepFishInWater`, render with `drawFish`/`swimPose`, and expose behavior to scan/HUD/sonar mostly through `hostile` plus `pattern`.

The only important exception is not an active small-fauna behavior class: flora and hazards have surface anchors, and articulated creatures have their own runtime. Small fauna have not yet been split by body plan.

## Why The Biome 1 Urchin Chases Today

`Glimmer Spine Urchin` is authored as `hostile: true`, `pattern: 'stalk'`, `radius: 14`, and `speed: [34, 64]` at `src/content.ts:168`. Because `makeSchool` treats it like every other fish, it is placed in open water with an initial swimming velocity and a generic home at `src/scene-worldgen.ts:877`-`src/scene-worldgen.ts:918`.

At runtime, `steerFish` sees `hostile` and, when the player is inside the non-circle detection/leash range, sets `aggro`, targets the player's predicted position, and applies the non-circle pursuit multiplier/max-speed path at `src/scene-entities.ts:77`-`src/scene-entities.ts:95` and `src/scene-entities.ts:121`-`src/scene-entities.ts:130`. Sonar can also force aggro and move its home toward the player at `src/scene-sonar.ts:25`-`src/scene-sonar.ts:34`. Nothing in `Fish` or `FishSpecies` says "sessile/contact hazard," so the urchin becomes a fast generic hostile stalker.

## Safest First-Slice Integration Points

- Add optional behavior metadata to `FishSpecies` and runtime fields to `Fish` in `src/types.ts`, while keeping `pattern`, `hostile`, `speed`, `radius`, `hp`, scan fields, and combat fields intact for compatibility.
- Add a small resolver such as `fishBehaviorClass(speciesOrFish)` with legacy defaults. That lets existing content keep working while specific first-slice species opt into `sessileAttached`, `verticalAnchored`, or `benthicWalker`.
- Rename or wrap `makeSchool` only locally: dispatch between current `findOpenWaterInBand` spawn and a new fauna surface-anchor spawn that reuses `findTerrainSurfaceAnchorInBand`, `floraSurfaceOffset`-style math, and `validateTerrainSurfaceAnchor`.
- Split movement inside `updateFish` by behavior class but leave timers, scan progression, stun decay, death visibility, `nearestLife`, `damageLifeTarget`, and scan rewards on the same `Fish` object.
- Add render pose branching in `drawFish`: swimmers keep `swimPose`; anchored/sessile/walkers use surface normal/tangent/origin like `drawFlora`.
- Keep scan/combat identity as `kind: 'fish'` for the first slice. Scan, logbook, sonar, damage, quest charting, and playtest already key mostly off `kind`, `hostile`, `hazardous`, and species name, so they do not need a broad rewrite.

## Risks And Required Compatibility Shims

- Anchored hostile does not mean pursuing predator. Add a shim like `canPursuePlayer(fish)` or behavior-owned aggro response so sonar, damage, and scan can raise threat cues without turning a sessile urchin into a chaser.
- Velocity mutations currently happen in scan, damage, knife, stun, harpoon, and bump paths. Anchored/sessile classes need a helper to absorb, damp, or convert those impulses into animation/aggro cues instead of moving root position.
- Bite/contact is currently all `bumpFish`. First slice needs contact hazard or short lunge handling while preserving scan rewards, hostile scan proof, hp/death, floating text, and SFX.
- Terrain removal must use the flora precedent: validate anchors after mining and relocate nearby or enter a detached/dead fallback. Avoid per-frame full anchor searches for performance.
- HUD text currently derives habit from `pattern`. Add behavior-class-aware text but keep legacy pattern fallback until all 138 entries are migrated.
- Playtest snapshots should add optional `behaviorClass`, `terrainAffinity`, and `surface` without removing `pattern`, because existing proof scripts may inspect `pattern`.
- Asset origins may be wrong for centered fish frames. First slice can use behavior defaults and `floraSpriteOrigin`-style logic, but some generated fauna may later need per-asset anchor metadata.

## First Slice Recommendation

The first slice looks safe if it is intentionally narrow:

1. Introduce optional behavior-class metadata and default unresolved entries to current legacy swimmer behavior.
2. Opt in only the highest-confidence non-swimmers called out on July 5: `Glimmer Spine Urchin` and `Nacre Thorn Clam` as `sessileAttached`, `Shellback Garden Eel` and tripodfish as `verticalAnchored`, and a small set of crabs/shrimp as `benthicWalker`.
3. Reuse flora surface anchors and validation rather than creating a new terrain system.
4. Preserve `Fish` as the scan/combat/logbook entity shape for now.

This avoids a broad rewrite and directly fixes Alex's complaint: the urchin can remain hostile for scan/combat/threat proof, but its hostility should become defensive contact/short cue behavior rather than open-water pursuit.

## Top 5 Code Touch Points

1. `src/types.ts:21`, `src/types.ts:165`-`src/types.ts:198`, `src/types.ts:588`-`src/types.ts:599`: add optional behavior-class/terrain-affinity/anchor runtime data while preserving legacy fields.
2. `src/content.ts:141`-`src/content.ts:168`: opt in the first biome 1 mismatches, especially `Glimmer Spine Urchin`.
3. `src/scene-worldgen.ts:877`-`src/scene-worldgen.ts:918` plus `src/scene-worldgen.ts:921`-`src/scene-worldgen.ts:965`: split open-water fish spawn from anchored fauna spawn using existing flora placement math.
4. `src/scene-entities.ts:72`-`src/scene-entities.ts:132` and `src/scene-entities.ts:146`-`src/scene-entities.ts:167`: behavior-dispatch movement and separate contact hazard/lunge from generic chase/bite.
5. `src/scene-rendering.ts:3331`-`src/scene-rendering.ts:3395` plus `src/scene-rendering.ts:3398`-`src/scene-rendering.ts:3460`: add behavior-aware pose/origin while reusing flora anchoring as the comparison model.

## Caveats

- This audit used the current dirty working tree because the task asked for today's actual implementation. The current source files include existing uncommitted changes in `src/content.ts` and `src/helpers.ts`.
- I did not run a dev server or visual smoke because this was a read-only code audit and the task said a server should not be needed.
- The report confirms architecture and first-slice integration points; it does not validate visual asset origins or gameplay feel in a running scene.
