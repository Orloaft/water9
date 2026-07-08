# Water9 Biome/Progression Audit

Verdict: current finishable loop exists, but the biome journey is partial.

The game currently has a working four-biome route from The Shallows through Brine Vent Shelf and Midnight Trench into Ancient Ruins. The player can earn credits from mining/scans/quests, satisfy charting requirements, pay barge retrofit costs, travel forward, and finish by scanning the Ancient Ruins apex at depth. The strongest progression systems are mechanical and readable in the barge UI; the weakest part is that most biome identity is generated atmosphere/content rather than authored quest beats.

## Biome Table

| Biome | Current name | Current target/depth | Gate to next | Depth/apex proof | Resources/hazards/signals | Transition trigger |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The Shallows | Charting requires 4 scans, 900 m record, 2400 sonar cells; global apex/finish depth is 1500 m | 7500c barge retrofit plus charting | Apex helper says Blue-ring Octopus; B1 allows hostile scan fallback instead of mandatory apex | Copper 180, quartz 460, ruby 900, relic 1240, drowned idol 1420; Glass Kelp/Moon Sponge/Sting Anemone; organic reef/coral landmark pool | At barge, click Travel once `canTravelToNextBiome()` is true |
| 2 | Brine Vent Shelf | 5 scans, 1100 m record, 3200 sonar cells | 15000c barge retrofit plus charting | Apex helper says Gulper Eel; mandatory apex scan | Quartz 260, cobalt 620, relic 1040, sunstone 1220, precursor engine 1320; vent fields; hazardous Vent Coral/Ember Bloom; bobbit burrow starts here; sulfide shelf/brine transition landmarks | Same barge Travel action |
| 3 | Midnight Trench | 6 scans, 1250 m record, 4200 sonar cells | 36000c barge retrofit plus charting | Apex helper says Abyssal Serpent; mandatory apex scan | Ruby 300, cobalt 760, relic 1120, sunstone 1260, abyssal crown 1440; stronger vents; anchorstone strata; gulper arena, skulk side tunnels, black coral ribs; forward outpost and Gulper Wake rare quests | Same barge Travel action into Ancient Ruins; Marlin is recommended/discounted but not required |
| 4 | Ancient Ruins in HUD; measurement calls it Abyssal Ruins | No next-biome charting gate; finish condition scans apex at >=1500 m | None after entry | Apex helper says Abyssal Crownmaw; scanning it at `TARGET_DEPTH` or deeper sets `state.won` | Cobalt 340, alien alloy 540, sunstone 960, abyssal crown 1180, ruin core 1560; 32 vents; 2 bobbit burrows; reliquary route/wyrm reservation; vault causeway landmark | Win by scanning Crownmaw at or below 1500 m |

Primary evidence:
- Biome names come from `biomeName()`/`nextBiomeName()` in `src/hud.ts:1533`.
- Target depth constant is `TARGET_DEPTH = 1500` in `src/constants.ts:7`.
- Charting requirements and apex mapping are in `biomeChartingRequirement()`, `biomeChartingProgress()`, and `currentApexSpecies()` in `src/helpers.ts:2718` and `src/helpers.ts:2819`.
- Barge costs are in `bargeUpgradeCost()` in `src/helpers.ts:2804`.
- Travel spends credits, clears per-biome proof state, increments `state.biome`, reseeds, and restarts the scene in `travelToNextBiome()` in `src/scene-economy.ts:131`.

## How Progression Works Today

The player starts in biome 1 with no credits, basic oxygen/hull/fuel, and barge services. The loop is:

1. Dive from the barge.
2. Mine ore, scan wildlife/flora/predators, ping sonar, and optionally complete one accepted quest.
3. Return to the barge to sell cargo, collect quest rewards, buy upgrades/items/subs, and refill.
4. Satisfy charting: enough unique scans, a depth record, enough revealed sonar cells, and threat proof.
5. Pay the barge retrofit cost in the travel card.
6. The scene resets into the next biome with cleared cargo, scans, sonar, max depth, active quest, and forward outpost.

Credits are not just gate currency. They compete with upgrades, utility items, sub purchases, fuel, sub service, and repair. The audit run's `water9:progression-measurement` estimates the combined gate plus recommended-upgrade pressure at 13420c for biome 1, 23430c for biome 2, and 48059c for biome 3. It also estimates 3.1, 2.3, and 2.6 trips respectively under its simple model.

The charting gate is stricter than a pure money gate. `canTravelToNextBiome()` requires both credits and `biomeChartingProgress().complete` (`src/helpers.ts:2880`). The HUD exposes all pieces: credits, survey scans, depth record, sonar chart, and threat proof (`src/hud.ts:1367`). If charting is incomplete, `travelToNextBiome()` reports the missing piece instead of travelling (`src/scene-economy.ts:131`).

## Gates In Use

- Scanning: mandatory unique-scan count in biomes 1-3, apex scan in biomes 2-3, hostile-or-apex fallback in biome 1. Scanning pays credits and records unique species in `scanNearbyLife()` (`src/scene-entities.ts:1143`).
- Credits: mandatory retrofit costs of 7500c, 15000c, and 36000c; earning comes from scans, cargo sale, and quest reward.
- Upgrades: not hard-gated for biome travel, but the economy model treats upgrade spend as expected pressure. Oxygen, cargo, laser, lamp, scanner, suit, and speed are B1 upgrades; thermal plating unlocks in B2 (`src/content.ts:23`).
- Hull/oxygen/fuel: not explicit travel gates, but they gate practical reach. Oxygen drains with depth (`src/helpers.ts:2884`), hull fails the run at zero (`src/scene.ts:1122`), fuel gates mining and sonar, and fuel max stays 100 (`src/helpers.ts:2542`).
- Sonar: explicit charting gate through `state.sonarRevealed.size`. Pings cost 1.5 fuel and reveal 16-tile-radius circles (`src/scene-sonar.ts:9`).
- Quests: optional economy/route flavor except B3's rare Gulper Wake Survey can grant a 12000c Marlin discount. Quest board generation is in `generateQuestBoard()` (`src/helpers.ts:158`).
- Outposts: the B3 forward outpost is an optional rare quest and oxygen refuge, not a travel gate. Placement requires B3, accepted quest, 900 m depth, non-hazardous flora, and terrain support (`src/scene-economy.ts:208`).
- Mining: required for credits but not a direct charting prerequisite; ore purchase quests use `oreSoldCredits`.
- UI action: all biome movement is ultimately the barge Travel button calling `travelToNextBiome()`.

## Biome-Specific Signals

Biome 1 is the clearest starter loop: shallow fauna, low-value ore, simple terrain, and no vent hazards. It already teaches mining, scanning, cargo return, upgrades, sonar, and threat proof. Its apex status is softer because any hostile scan can satisfy threat proof.

Biome 2 adds real danger: vent hazards (`makeVentFields()` creates 18 in B2), bobbit burrows, hazardous flora, thermal plating relevance, richer ore, and mandatory Gulper Eel scan. This is a real mechanical escalation.

Biome 3 adds the strongest authored feeling: anchorstone, deeper predators, Abyssal Serpent apex, gulper arena reservation, skulk side tunnels, black coral ribs, and two rare quests: Forward Air Pocket and Gulper Wake Survey. This is the best current bridge from survival/mining into expedition play.

Biome 4 has the most expensive resources and end-state threat, with ruin-core/alien-alloy ore, vault/causeway landmarking, Reliquary Wyrm reservation, Crownmaw apex, and final proof text. It is finishable, but there is no separate ruin quest chain or extraction requirement beyond scanning Crownmaw at depth.

Worldgen and signal evidence:
- Terrain changes and ore rules are in `generateTile()`/`veinRulesForBiome()` (`src/helpers.ts:13`, `src/helpers.ts:53`).
- Special rooms are biolume cavern and predator nest in `injectSpecialRooms()` (`src/scene-worldgen.ts:112`).
- Vent hazards are B2+ with counts 18/26/32 in `makeVentFields()` (`src/scene-worldgen.ts:83`).
- Bobbit burrows start at B2 and double in B4 (`src/scene-worldgen.ts:349`).
- Signature reservations add gulper arena in B3+, reliquary route in B4+, and skulk side tunnels in B3+ (`src/scene-worldgen.ts:475`).
- Landmark pools differentiate coral, brine shelf/transition assets, black coral ribs, and ruin-vault lattice (`src/helpers.ts:636`).
- Runtime articulated creatures are filtered by min biome, spawn budget, and signature reservations in `populateArticulatedCreatures()` (`src/scene-articulated.ts:712`).

## Journey vs Mechanical

Feels like a journey:
- B2 and B3 have meaningful pressure changes: vents, hazardous flora, darker water, anchorstone, richer ore, deeper apex proof, and specific encounter reservations.
- B3 has actual expedition texture through Forward Air Pocket and Gulper Wake Survey.
- The HUD objective panel guides the player from first ore/scan through charting and Ancient Ruins routing (`src/hud.ts:179`).

Feels mechanical:
- Biome transition itself is a barge button after a checklist. There is no spatial portal, hand-authored route, return objective, or intermediate event.
- B1 to B2 and B2 to B3 are mostly "same loop, bigger numbers" despite better biome atmosphere.
- B4's finish is only a scan-at-depth check on the apex species. It does not currently require bringing proof back to the barge, resolving the Reliquary Wyrm, collecting a ruin artifact, or completing a ruin quest.
- Quests are board contracts with generated targets; only a few rare B3 quests currently point toward an arc.
- Measurement naming disagrees with runtime naming for biome 4: HUD says Ancient Ruins, measurement output says Abyssal Ruins (`tools/measure_progression.mjs:525`).

## Implementation Hooks For A Future Quest Arc

- Biome route gates: extend `biomeChartingRequirement()`, `biomeChartingProgress()`, `canTravelToNextBiome()`, and `travelToNextBiome()` in `src/helpers.ts:2819` and `src/scene-economy.ts:131`.
- Quest content: extend `generateQuestBoard()` and `questProgressSource()` in `src/helpers.ts:138`; add new `Quest['kind']` variants in `src/types.ts`.
- Objective copy: extend `currentDiveObjective()` and `bargeTravelRow()` in `src/hud.ts:179` and `src/hud.ts:1367`.
- World beats: add authored rooms/reservations via `injectSpecialRooms()`, `reserveSignatureEncounters()`, and `populateSpecialRooms()` in `src/scene-worldgen.ts`.
- Apex/finish logic: replace or extend `currentApexSpecies()` and the `TARGET_DEPTH` scan win branch in `scanNearbyLife()` (`src/helpers.ts:2718`, `src/scene-entities.ts:1172`).
- Economy tuning: update `bargeUpgradeCost()`, sub voucher logic, and `tools/measure_progression.mjs` so reports and runtime names stay aligned.
- Forward base mechanics: expand `canEstablishForwardOutpost()`/`establishForwardOutpost()` if outposts should become actual expedition gates (`src/scene-economy.ts:208`).

## Test/Smoke Coverage

Existing relevant scripts:
- `water9:progression-tuning-smoke` checks barge costs, charting requirements, travel guard, B3 voucher, scan payouts, and measurement hooks (`tools/test_progression_tuning_smoke.mjs:46`).
- `water9:progression-measurement` produces ore/scan/quest/economy estimates and mirrors charting/economy logic (`tools/measure_progression.mjs:285` and `tools/measure_progression.mjs:477`).
- `water9:forward-outpost-smoke` launches a playtest B3 scene, accepts the forward outpost quest, stages a valid site, verifies oxygen refill, and save/load persistence (`tools/test_forward_outpost_quest_smoke.mjs:96`).
- `package.json` exposes these as npm scripts.

Commands run during this audit:
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `8a04ef5`
- `npm run water9:progression-tuning-smoke` -> passed
- `WATER9_PROGRESSION_REPORT=/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07/progression-measurement.json npm run water9:progression-measurement` -> passed
- `WATER9_FORWARD_OUTPOST_OUT_DIR=/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07 WATER9_FORWARD_OUTPOST_REPORT=/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07/forward-outpost-smoke.json WATER9_FORWARD_OUTPOST_PORT=5198 npm run water9:forward-outpost-smoke` -> passed

## Risks/Open Questions

- Apex naming mismatch in B2: charting requires `currentApexSpecies()` = Gulper Eel, but B3 also has an Abyssal Gulper articulated encounter. It works today, but could confuse an authored arc.
- B4 final proof text says the player has proof, but the code wins immediately on scan; there is no return-to-barge proof delivery.
- Fuel max is fixed at 100 while fuel pressure grows through sonar/mining/sub service; this may make fuel economy feel like refills rather than progression.
- Travel clears `scannedSpecies`, `sonarRevealed`, `maxDepth`, cargo, active quest, and forward outpost; this keeps gates clean but discards continuity that a story arc may want.
- Quests are optional for travel; a future arc must decide whether story quests become required gates or remain bonus economy.
- B4 has no post-entry charting requirement, so Ancient Ruins currently tests finish depth/apex only, not a full biome closure loop.
