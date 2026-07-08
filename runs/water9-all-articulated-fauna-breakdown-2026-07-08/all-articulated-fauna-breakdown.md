# Water9 All Articulated Fauna Breakdown

Date: 2026-07-08
Repo: `/mnt/nxt-dev/water9`
Preflight HEAD: `8a04ef5`

This report audits every articulated creature currently present in `public/assets/generated/articulated-creatures.parts.json` and explains whether it actually appears through the runtime articulated spawn system. It deliberately does not apply a "large fauna" filter; smaller articulated creatures such as Abyssal Glasshook Skulk are included.

## Executive Summary

Normal gameplay articulated fauna:

| Biome | Normal articulated spawns | Count |
| --- | --- | ---: |
| 1 | None | 0 |
| 2 | Abyssal Mandible Bobbit x1 | 1 |
| 3 | Abyssal Glasshook Skulk x2, Abyssal Gulper x1, Abyssal Serpent x1, Abyssal Mandible Bobbit x1 | 5 |
| 4 | Abyssal Crownmaw x1, Abyssal Glasshook Skulk x2, Abyssal Gulper x1, Abyssal Serpent x1, Abyssal Mandible Bobbit x2 | 7 |

Prototype/playtest articulated fauna:

| Biome | Prototype/playtest spawns after budget/order | Starved enabled candidates |
| --- | --- | --- |
| 1 | Thorn Fan Coralline x1 | None |
| 2 | Brine Mycelium Shelf, Cavitation Boxer, Chain Vein Siphonophore, Coronate Sting Crown, Lantern Anemone Pit, Razor Kelp Harp, Reef Lion Moray, plus Bobbit x1 | Sand Battery, Sawback Ray, Thorn Fan Coralline, Thornhalo Urchin, Vampire Cloak Squid |
| 3 | Glasshook x2, Gulper, Serpent, Black Coral Gate, Brine Crown, Brine Mycelium Shelf, Cavitation Boxer, plus Bobbit x1 | Chain Vein Siphonophore, Chainmaw Eel, Coronate Sting Crown, Harpoon Cone, Hookjaw Isopod, Lantern Anemone Pit, Predatory Tunicate Maw, Razor Kelp Harp, Reef Lion Moray, Sand Battery, Sawback Ray, Siphon Lily, Thorn Fan Coralline, Thornhalo Urchin, Trap-Jaw Bristle, Vampire Cloak Squid, Velvet Lantern Cuttle |
| 4 | Crownmaw, Glasshook x2, Gulper, Reliquary Wyrm, Serpent, Abyssal Lantern Mantis, Abyssal Riftmaw, plus Bobbit x2 | All remaining eligible prototype entries after Abyssal Riftmaw in spawn order |

Biggest design implications:

- Normal mode has no budget starvation among spawn-enabled articulated fauna; the enabled set is small enough to fit.
- Prototype/playtest mode is heavily order-starved. Signature encounters consume budget first, then prototype creatures are alpha-sorted by id, so early ids such as `black-coral-gate` and `brine-crown` can appear while later ids such as `velvet-lantern-cuttle` never instantiate.
- Abyssal Reliquary Wyrm has a biome 4 reservation and signature priority, but it is still prototype-only because its runtime spawn mode resolves to `prototype`.
- Abyssal Glasshook Skulk is real normal gameplay fauna in biome 3 and biome 4. It is small, but it is not prototype-gated and it is not budget-starved.

## Source Evidence

Primary files:

- `public/assets/generated/articulated-creatures.parts.json`: 37 generated articulated creature manifests, all with `spawn` fields.
- `src/articulated.ts`: loads the generated manifest (`loadArticulatedAssets`, lines 261-270), decides runtime spawn mode (`articulatedRuntimeSpawnMode`, lines 312-317), spawn budgets (`ARTICULATED_SPAWN_BUDGETS`, lines 236-239), priority (`articulatedSpawnPriority`, lines 324-329), and gates (`shouldSpawnArticulatedCreature`, lines 331-335).
- `src/scene-articulated.ts`: population and budget consumption (`populateArticulatedCreatures`, lines 712-767), bobbit population (`populateBobbitArticulatedThreats`, lines 560-596), reserved signatures (`signatureEncounterCreatureIds`, lines 506-511), behavior/combat defaults (`articulatedCombatFor`, lines 41-66), steering and lunge/grab behavior (`steerArticulatedCreature`, lines 1173-1249), contact damage (`bumpArticulatedCreature`, lines 1750-1787), part damage and severing (`damageArticulatedPart`, lines 1817-1861).
- `src/scene-worldgen.ts`: bobbit burrows (`reserveBobbitBurrows`, lines 351-363), signature reservations (`reserveSignatureEncounters`, lines 477-490), gulper arena (`reserveGulperArena`, lines 519-530), reliquary route (`reserveReliquaryRoute`, lines 532-547), skulk side tunnels (`reserveSkulkSideTunnels`, lines 549-576).
- `src/scene-sonar.ts`: sonar attracts articulated creatures and marks them as predator contacts (lines 42-50 and 68-72).
- `src/scene-combat.ts`: stun grenade, injector knife, and sub weapon interactions with articulated creatures (lines 770-790, 822-850, 1052-1084).

## Spawn-System Explanation

Runtime gates:

- Normal gameplay is any run without `?prototypeThreats`, `?threats=prototype`, or `?playtest`.
- Prototype/playtest is enabled by those query params in `prototypeRuntimeEnabled`.
- A manifest spawns in normal mode only if its runtime mode is `accepted` or `legacy`.
- Runtime mode resolves in this order: explicit `manifest.runtime.spawn`; otherwise `quality.status === "accepted"`; otherwise hard-coded legacy ids; otherwise `prototype`.
- The hard-coded legacy ids are `abyssal-serpent`, `abyssal-gulper`, `abyssal-crownmaw`, `abyssal-glasshook-skulk`, and `abyssal-mandible-bobbit`.

Budgets:

| Biome | Normal budget | Prototype/playtest budget | Bobbit subtraction |
| --- | ---: | ---: | ---: |
| 1 | 4 | 8 | 0 |
| 2 | 6 | 8 | 1 |
| 3 | 8 | 9 | 1 |
| 4 | 10 | 10 | 2 |

Population uses `remainingBudget = spawnBudget - reservedBobbitSpawnCount(this)`. Non-bobbit creatures consume the remaining budget first. Then `populateBobbitArticulatedThreats` adds one bobbit per generated burrow. In normal biome 4, that means eight non-bobbit budget slots plus two bobbits.

Sorting, priority, and starvation:

- Candidate filters: `state.biome >= manifest.minBiome`, `shouldSpawnArticulatedCreature(manifest)`, and not `abyssal-mandible-bobbit`.
- Sort order: descending `articulatedSpawnPriority`, then `id.localeCompare`.
- Signature ids get priority 100: bobbit, gulper, reliquary wyrm, glasshook skulk, crownmaw. Bobbit is handled separately, so non-bobbit signature order is alphabetical among those ids after priority: crownmaw, glasshook, gulper, reliquary, then legacy serpent at priority 80.
- Accepted/legacy non-signatures get priority 80. Prototype entries get priority 30 and are alpha-sorted. Once remaining budget reaches zero, later prototype candidates are starved.

Reserved encounter slots:

- Bobbit: biome 2+ burrow reservations. Count is 1 in biome 2/3 and 2 in biome 4.
- Gulper: biome 3+ open-water arena reservation for `abyssal-gulper`.
- Reliquary: biome 4 ruin-route reservation for `abyssal-reliquary-wyrm`; it is only occupied in prototype/playtest because the manifest is prototype mode.
- Skulk: biome 3+ side-tunnel ambush reservations, capped at 2, for `abyssal-glasshook-skulk`.
- Crownmaw has signature priority, but no dedicated reservation function currently exists; it falls back to random open-water placement.

## Biome-by-Biome Runtime Breakdown

### Biome 1

Normal gameplay: no articulated fauna. The normal budget is 4, but no legacy/accepted articulated manifest has `minBiome <= 1`.

Prototype/playtest: Thorn Fan Coralline x1. Budget 8, no bobbit subtraction, no starved candidates.

### Biome 2

Normal gameplay: Abyssal Mandible Bobbit x1. The bobbit reservation subtracts one from the normal budget, and the burrow-population pass adds one bobbit.

Prototype/playtest: Brine Mycelium Shelf, Cavitation Boxer, Chain Vein Siphonophore, Coronate Sting Crown, Lantern Anemone Pit, Razor Kelp Harp, Reef Lion Moray, and Abyssal Mandible Bobbit x1. Starved by alpha order and budget: Sand Battery, Sawback Ray, Thorn Fan Coralline, Thornhalo Urchin, Vampire Cloak Squid.

### Biome 3

Normal gameplay: Abyssal Glasshook Skulk x2 in side-tunnel ambush slots, Abyssal Gulper x1 in the gulper arena, Abyssal Serpent x1 in random open water, and Abyssal Mandible Bobbit x1 in a burrow.

Prototype/playtest: all normal biome 3 entries plus Black Coral Gate, Brine Crown, Brine Mycelium Shelf, and Cavitation Boxer. Starved: Chain Vein Siphonophore, Chainmaw Eel, Coronate Sting Crown, Harpoon Cone, Hookjaw Isopod, Lantern Anemone Pit, Predatory Tunicate Maw, Razor Kelp Harp, Reef Lion Moray, Sand Battery, Sawback Ray, Siphon Lily, Thorn Fan Coralline, Thornhalo Urchin, Trap-Jaw Bristle, Vampire Cloak Squid, Velvet Lantern Cuttle.

### Biome 4

Normal gameplay: Abyssal Crownmaw x1, Abyssal Glasshook Skulk x2, Abyssal Gulper x1, Abyssal Serpent x1, and Abyssal Mandible Bobbit x2. The Reliquary Wyrm reservation is generated but not occupied in normal gameplay because the wyrm manifest is prototype mode.

Prototype/playtest: all normal biome 4 entries plus Abyssal Reliquary Wyrm x1, Abyssal Lantern Mantis x1, and Abyssal Riftmaw x1. Remaining eligible prototype creatures are starved because the budget is exhausted after signature encounters and the first two alpha-sorted prototype ids.

## Shared Runtime Behavior and Interaction

Unless overridden by `manifest.combat`, behavior is inferred from the id:

- `serpent`: ids containing eel, serpent, gulper, or maw. Detection 520, leash 860, attack 172, lunge 0.74 s, lunge speed 2.45, grab 1.15 s, grab enabled, cooldown 5.8.
- `charger`: ids containing ray, boxer, or mantis. Detection 520, leash 840, attack 220, lunge 0.58 s, lunge speed 3.15, no grab.
- `territorial`: ids containing coral, shelf, anemone, harp, sponge, battery, or crown. Detection 300, leash 440, attack 118, lunge 0.62 s, lunge speed 1.9, no grab.
- `ambusher`: fallback. Detection 360, leash 540, attack 140, lunge 0.82 s, lunge speed 2.7, grab 0.82 s, grab enabled.

Combat and player interaction:

- Hostile articulated creatures patrol around home, stalk when the player is inside detection range and within leash, lunge inside attack range, and may grab if their behavior permits it.
- Contact damage is applied only by dangerous parts. Dangerous parts are jaws, mandibles, bite/sting anchors, sharp named parts, and explicit bite parts.
- Damage formula includes biome, creature radius, impact, and `combat.damageMultiplier`.
- Sonar pings draw articulated predators closer and set patrol creatures to stalk.
- Stun grenades, tier 3 sub weapon, injector knife, life cutter, and dynamite can damage or stun articulated creatures. Part damage reduces total HP; head destruction kills; fins, tails, and jaws are severable by default. Missing/detached parts reduce mobility.
- Bobbit has custom burrow behavior: it telegraphs from the shaft, lunges upward, can latch, drags player/sub downward, and can be broken by struggle, knife, stun, or killing/severing bite parts.

## Creature-by-Creature Breakdown

All runtime radii below are `manifest.radius * ENTITY_SCALE`, and `ENTITY_SCALE` is `0.72`.

| Creature | Manifest line | Runtime status | Spawn fields and placement | Count/budget effect | Behavior and interaction | Articulation/rendering |
| --- | ---: | --- | --- | --- | --- | --- |
| Abyssal Serpent (`abyssal-serpent`) | 5 | Normal gameplay spawned in biome 3/4; also prototype. | `minBiome 3`; depth 1320-2700; random open-water placement, avoiding reservations. | Count 1; priority 80 legacy; fits normal budget. | Serpent, damage x1.52; lunge/grab enabled by defaults; sonar can aggro; cutter/knife/stun/dynamite affect parts. | Radius 82, runtime 59.04; HP 450; speed 32-62; 8 parts, 7 overlays; tail/body/jaw; dangerous head/jaw. |
| Abyssal Gulper (`abyssal-gulper`) | 659 | Normal gameplay spawned in biome 3/4; also prototype. | `minBiome 3`; depth 1300-2600; reserved `open_water_arena` when available. | Count 1; priority 100 signature; consumes one non-bobbit budget slot. | Serpent, damage x1.56; default lunge/grab; large-threat ripple turning. | Radius 82, runtime 59.04; HP 330; speed 30-58; 10 parts, 9 overlays; tail/body/fin/root/jaw; dangerous head/jaw. |
| Abyssal Crownmaw (`abyssal-crownmaw`) | 1586 | Normal gameplay spawned in biome 4; also prototype. | `minBiome 4`; depth 1650-2800; no dedicated reservation, so random open-water placement. | Count 1; priority 100 signature; consumes one non-bobbit budget slot. | Serpent, damage x1.56; default lunge/grab; large-threat ripple turning. | Radius 62, runtime 44.64; HP 490; speed 26-50; 9 parts, 8 overlays; tail/body/fin/root/jaw; dangerous head/jaw. |
| Chainmaw Eel (`chainmaw-eel`) | 2325 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 1180-2350; random placement if budget reached it. | Count 1; priority 30; starved behind signatures and earlier alpha prototype ids. | Serpent defaults; lunge/grab enabled. | Radius 68, runtime 48.96; HP 245; speed 30-58; 8 parts, 7 overlays; tail/body/jaw; dangerous head/jaw. |
| Sawback Ray (`sawback-ray`) | 2980 | Prototype-enabled but budget-starved in all eligible biomes. | `minBiome 2`; depth 520-1500; random placement if budget reached it. | Count 1; priority 30; starved in biome 2/3/4. | Charger defaults; lunge without grab; dangerous stinger. | Radius 72, runtime 51.84; HP 210; speed 24-68; 10 parts, 9 overlays; tail/fin/body. |
| Thornhalo Urchin (`thornhalo-urchin`) | 3797 | Prototype-enabled but budget-starved in all eligible biomes. | `minBiome 2`; depth 260-1200; random placement if budget reached it. | Count 2; priority 30; both requested instances are starved in biome 2/3/4. | Ambusher defaults; slow speed but grab-enabled by default behavior. | Radius 70, runtime 50.40; HP 185; speed 8-18; 11 parts, 10 overlays; dangerous radial spines. |
| Hookjaw Isopod (`hookjaw-isopod`) | 4705 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 900-2300; random placement. | Count 1; priority 30; starved. | Ambusher defaults; jaw grab/lunge. | Radius 62, runtime 44.64; HP 260; speed 18-42; 13 parts, 12 overlays; dangerous upper/lower jaws. |
| Cavitation Boxer (`cavitation-boxer`) | 5767 | Prototype spawned in biome 2 and 3; starved in biome 4. | `minBiome 2`; depth 540-1700; random placement. | Count 1; priority 30; appears before budget exhaustion in biome 2/3. | Charger defaults; no grab; club arms are dangerous. | Radius 54, runtime 38.88; HP 190; speed 30-72; 13 parts, 12 overlays; tail/body/fin/jaw. |
| Siphon Lily (`siphon-lily`) | 6837 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 760-1900; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled; petal parts are dangerous. | Radius 58, runtime 41.76; HP 220; speed 4-16; 13 parts, 12 overlays; tail/body/jaw/fin. |
| Harpoon Cone (`harpoon-cone`) | 7907 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 920-2200; random placement. | Count 1; priority 30; starved. | Territorial defaults; no grab; harpoon tooth is dangerous. | Radius 62, runtime 44.64; HP 230; speed 8-26; 9 parts, 8 overlays; body/tail/fin/jaw. |
| Sand Battery (`sand-battery`) | 8645 | Prototype-enabled but budget-starved in all eligible biomes. | `minBiome 2`; depth 540-1650; random placement. | Count 1; priority 30; starved in biome 2/3/4. | Territorial defaults; no grab; venom spine and jaw lip dangerous. | Radius 68, runtime 48.96; HP 210; speed 4-18; 11 parts, 10 overlays; body/tail/fin/jaw. |
| Trap-Jaw Bristle (`trap-jaw-bristle`) | 9557 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 980-2350; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled; mandibles dangerous. | Radius 66, runtime 47.52; HP 240; speed 10-34; 11 parts, 10 overlays; body/tail/jaw/fin. |
| Velvet Lantern Cuttle (`velvet-lantern-cuttle`) | 10468 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 940-2250; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled; beak and arm crown dangerous. | Radius 64, runtime 46.08; HP 225; speed 18-54; 11 parts, 10 overlays; body/tail/fin/jaw. |
| Glass Sponge Sentinel (`glass-sponge-sentinel`) | 11387 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Territorial defaults; no grab. | Radius 57, runtime 41.04; HP 180; speed 18-42; 5 parts, 4 overlays; root/body/tail/fin; starter plan. |
| Reliquary Siphonophore (`reliquary-siphonophore`) | 11804 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement if budget reached it. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled. | Radius 86, runtime 61.92; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Hadal Trencher Isopod (`hadal-trencher-isopod`) | 12221 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled. | Radius 70, runtime 50.40; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Abyssal Lantern Mantis (`abyssal-lantern-mantis`) | 12638 | Prototype spawned in biome 4; not normal. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; appears because it is the first alpha prototype id after signatures. | Charger defaults; no grab. | Radius 61, runtime 43.92; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Brine Mycelium Shelf (`brine-mycelium-shelf`) | 13055 | Prototype spawned in biome 2/3; starved in biome 4. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; appears early enough in biome 2/3. | Territorial defaults; no grab. | Radius 63, runtime 45.36; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Coronate Sting Crown (`coronate-sting-crown`) | 13472 | Prototype spawned in biome 2; starved in biome 3/4. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 2 only before budget fills. | Territorial defaults; no grab. | Radius 80, runtime 57.60; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Razor Kelp Harp (`razor-kelp-harp`) | 13889 | Prototype spawned in biome 2; starved in biome 3/4. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 2 only. | Territorial defaults; no grab. | Radius 98, runtime 70.56; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Thorn Fan Coralline (`thorn-fan-coralline`) | 14306 | Prototype spawned in biome 1; starved in biome 2/3/4. | `minBiome 1`; depth 900-2400; random placement. | Count 1; priority 30; only biome 1 has enough budget because no signatures/bobbits compete. | Territorial defaults; no grab. | Radius 99, runtime 71.28; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Saber Viperfish (`saber-viperfish`) | 14723 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled. | Radius 54, runtime 38.88; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Reef Lion Moray (`reef-lion-moray`) | 15140 | Prototype spawned in biome 2; starved in biome 3/4. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 2 only. | Charger by id heuristic; no grab. | Radius 45, runtime 32.40; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Tripod Stilt Stalker (`tripod-stilt-stalker`) | 15557 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled. | Radius 82, runtime 59.04; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Chain Vein Siphonophore (`chain-vein-siphonophore`) | 15974 | Prototype spawned in biome 2; starved in biome 3/4. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 2 only. | Ambusher defaults; grab-enabled. | Radius 96, runtime 69.12; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Trench Harvest Sea Spider (`trench-harvest-sea-spider`) | 16391 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled. | Radius 90, runtime 64.80; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Vent-Claw Yeti (`vent-claw-yeti`) | 16808 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Ambusher defaults; grab-enabled. | Radius 74, runtime 53.28; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Brine Crown (`brine-crown`) | 17225 | Prototype spawned in biome 3; starved in biome 4. | `minBiome 3`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 3 only. | Territorial defaults; no grab. | Radius 104, runtime 74.88; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Lantern Anemone Pit (`lantern-anemone-pit`) | 17642 | Prototype spawned in biome 2; starved in biome 3/4. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 2 only. | Territorial defaults; no grab. | Radius 67, runtime 48.24; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Predatory Tunicate Maw (`predatory-tunicate-maw`) | 18059 | Prototype-enabled but budget-starved in biome 3/4. | `minBiome 3`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Serpent by `maw` id; lunge/grab enabled. | Radius 98, runtime 70.56; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Black Coral Gate (`black-coral-gate`) | 18476 | Prototype spawned in biome 3; starved in biome 4. | `minBiome 3`; depth 900-2400; random placement. | Count 1; priority 30; appears in biome 3 because it is first alpha prototype id after signatures. | Territorial defaults; no grab. | Radius 102, runtime 73.44; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Gulper Eel Maw (`gulper-eel-maw`) | 18893 | Prototype-enabled but budget-starved in biome 4. | `minBiome 4`; depth 900-2400; random placement. | Count 1; priority 30; starved. | Serpent by id; lunge/grab enabled. | Radius 46, runtime 33.12; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Vampire Cloak Squid (`vampire-cloak-squid`) | 19310 | Prototype-enabled but budget-starved in all eligible biomes. | `minBiome 2`; depth 900-2400; random placement. | Count 1; priority 30; starved in biome 2/3/4. | Ambusher defaults; grab-enabled. | Radius 71, runtime 51.12; HP 180; speed 18-42; 5 parts, 4 overlays; starter plan. |
| Abyssal Riftmaw (`abyssal-riftmaw`) | 19727 | Prototype spawned in biome 4; not normal. | `minBiome 4`; depth 1580-2700; random placement. | Count 1; priority 30; appears as second alpha prototype after signatures in biome 4. | Serpent, damage x1.25; lunge/grab enabled. | Radius 84, runtime 60.48; HP 280; speed 28-54; 10 parts, 9 overlays; tail/body/fin/root/jaw; dangerous head/jaw. |
| Abyssal Reliquary Wyrm (`abyssal-reliquary-wyrm`) | 20654 | Prototype spawned in biome 4; not normal despite reservation. | `minBiome 4`; depth 1650-2900; reserved `ruin_route` slot. | Count 1; priority 100 signature; consumes one non-bobbit budget slot only in prototype/playtest. | Manifest behavior `ambusher`; damage x1.25; grab-enabled by ambusher defaults. | Radius 92, runtime 66.24; HP 340; speed 24-48; 12 parts, 11 overlays; tail/body/fin/root/jaw; dangerous head/jaw. |
| Abyssal Glasshook Skulk (`abyssal-glasshook-skulk`) | 21645 | Normal gameplay spawned in biome 3/4; also prototype. | `minBiome 3`; depth 920-2100; reserved `side_tunnel_ambush` slots, max two. | Count 2; priority 100 signature; consumes two non-bobbit budget slots; not starved in normal. | Ambusher defaults; lunge/grab enabled; small and fast; dangerous head plus upper/lower claws. | Radius 27, runtime 19.44; HP 92; speed 46-82; 11 parts, 10 overlays; tail/body/root/jaw/fin. |
| Abyssal Mandible Bobbit (`abyssal-mandible-bobbit`) | 22559 | Normal gameplay spawned in biome 2/3/4; also prototype. | `minBiome 2`; manifest depth 900-2600, but runtime uses generated bobbit burrows/reservations. | Count equals burrows: 1 in biome 2/3, 2 in biome 4. Bobbit reservation is subtracted before the non-bobbit budget pass, then added by `populateBobbitArticulatedThreats`. | Manifest override ambusher, hostile true, detection 390, leash 560, attack 158, lunge 0.78 s, lunge speed 2.2, grab 1.35 s, cooldown 5.8, contact padding 24, damage x1.18. Custom burrow latch/drag behavior. | Radius 58, runtime 41.76; HP 185; speed 42-58; 9 parts, 8 overlays; upper/lower mandibles dangerous. |

## Special Section: Abyssal Glasshook Skulk

Abyssal Glasshook Skulk is not a prototype-only or review-only creature. It is in the hard-coded legacy runtime set in `src/articulated.ts`, so `shouldSpawnArticulatedCreature` returns true in normal gameplay. It is also in the signature priority set and the scene reservation set.

The manifest defines:

- id: `abyssal-glasshook-skulk`
- species: Abyssal Glasshook Skulk
- `minBiome`: 3
- `spawn.minDepth`: 920
- `spawn.maxDepth`: 2100
- `spawn.count`: 2
- `radius`: 27
- parts: 11
- speed: 46-82

Worldgen creates up to two biome 3/4 `side_tunnel_ambush` reservations for `abyssal-glasshook-skulk`. The spawn loop tries reserved placement for signature ids, so the two skulk instances are placed in side-tunnel pockets when reservations exist. The budget also allows them: biome 3 has 7 non-bobbit slots after the bobbit reservation, and biome 4 has 8 non-bobbit slots after two bobbits. Glasshook consumes two of those slots before the legacy serpent.

The previous report undercounted Glasshook because it scoped the audit to "large" fauna. Glasshook is small at manifest radius 27, but it is still an articulated manifest, it has spawn logic, it is legacy-enabled, and it appears in normal biome 3 and 4 gameplay at count 2.

## Appendix: Not Articulated / Out of Scope Legacy Fish

The following fauna are whole-sprite/frame fish from `src/content.ts` `biomeFish`. They are not loaded from `articulated-creatures.parts.json`; they are spawned by `this.makeSchool(species)` during worldgen (`src/scene-worldgen.ts`, line 66) and use fish patterns such as `school`, `glide`, `sway`, `circle`, and `stalk`.

Biome 1 whole-sprite fish include: Lantern Fry, Snapping Shrimp, Glass Ray, Comb Jelly, Reef Squid, Nautilus, Moon Jelly, Mantis Shrimp, Blue-ring Octopus, Tidepool Octopus, Opal Fan Shrimp, Ember Needle Pipefish, Prism Bell Jelly, Cobalt Sawtail Minnow, Ivory Spined Cardinal, Amber Comb Blenny, Blue Lantern Goby, Obsidian Reef Wrasse, Silver Hinge Crab, Kelp Arrow Squid, Basalt Lantern Seahorse, Nacre Thorn Clam, Aurora Fin Damselfish, Ribbonjaw Cleaner Wrasse, Mottle Reef Cowfish, Glimmer Spine Urchin, Reef Needle Snipefish, Copperglass Cardinal, Pearl Eye Flounder, Teal Mask Filefish, Goldbar Squirrelfish, Night Reef Boxfish, Copper Banded Seahorse, Midnight Hogfish, Opalstripe Tilefish, Shellback Garden Eel, Brightscale Halfbeak, Lumeneye Squirrelfish, Opal Eye Mudskipper, Tideglass Cardinal, Amber Snout Boxfish.

Biome 2 whole-sprite fish include: Ash Minnow, Deep Sea Shrimp, Hatchetfish, Barreleye, Glass Squid, Vampire Squid, Lanternfish, Gulper Eel, Tripodfish, Sea Spider, Velvet Glass Cuttle, Copper Ribbon Eel, Glass Helm Nautilus, Vent Pearl Copepod, Moonmask Lionfish, Chimney Ghost Shrimp, Brass Knuckle Prawn, Saffron Paddle Cuttle, Cinder Vent Clingfish, Rustscale Hatchetfish, Lumen Brow Barreleye, Ivory Sail Chimaera, Ashveil Butterflyfish, Goldcap Tripodfish, Verdigris Parrotfish, Cyan Pulse Lanternfish, Scarletline Hawkfish, Vent Jade Eelpout, Blueglass Anthias, Tin Plate Searobin, Reef Amber Snapper, Blackwater Hatchet, Bluefire Dragonet, Lumen Kite Ray, Ventstripe Moray, Silvercap Grenadier, Ghostfin Croaker, Ghostplate Sea Moth.

Biome 3 whole-sprite fish include: Mirror Fry, Hadopelagic Shrimp, Abyssal Jelly, Bigfin Squid, Abyssal Viperfish, Lantern Swarm, Goblin Shark, Frilled Shark, Black Swallower, Glassjaw Viperfish, Abyssal Thread Eel, Twilight Surgeonfish, Obsidian Swallowtail, Cobalt Triggerfish, Snowcap Snailfish, Ironmask Ratfish, Pearlside Grunt, Saberfin Smelt, Brassstripe Fusilier, Starless Lantern Eel, Moonspot Drumfish, Hollow Eye Cusk, Knifecrest Snipe Eel, Rustjaw Blenny, Onyx Frillshark Fry, Black Velvet Cusk, Sulfur Eye Hagfish, Halo Dot Lanternfish, Ivory Ridge Rattail, Neonbar Dartfish, Bonefin Lantern Shark, Emberjaw Bristlefish.

Biome 4 whole-sprite fish include: Static Fry, Abyssal Hatchet School, Abyss Vampire Squid, Hadopelagic Microfish, Anglerfish, Snipe Eel, Goblin Shark, Black Swallower, Abyssal Medusa, Sable Razorfish, Ancient Mask Angler, Mirrorbone Hatchetfish, Anchorfin Eel, Glassfin Fangtooth, Cobalt Gulper Fry, Bonewhisker Brotula, Cinderstripe Cardinal, Kelpglass Rockfish, Ivorymask Goatfish, Hadal Needlefish, Blueflame Grouperlet, Silverthread Needlefish, Cinder Maw Dragonfish, Copperbelly Damselfish, Cathedral Fin Ribbonfish, Lattice Eye Barreleye, Brineglass Snailfish.

These fish may be hostile and may be important gameplay fauna, but they are outside the articulated-fauna scope Alex requested.

## Caveats

- This is a static code/data audit. I did not run Playwright to sample generated worlds; the report derives actual runtime status from the manifest, spawn filters, budget/order code, and reservation code.
- Skulk reservations are generated from side-tunnel pocket candidates and capped at two. The intended and configured normal runtime count is two in biome 3/4; if a future worldgen change produced fewer pocket candidates, reservation count could become the limiting factor.
- No source, asset, package, test, or gameplay files were modified. Only this report file was created.
