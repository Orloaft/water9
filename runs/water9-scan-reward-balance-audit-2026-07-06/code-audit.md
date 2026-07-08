# Water9 Scan Reward Balance Code Audit

Date: 2026-07-06
Audited HEAD: 03b2dad
Repository: `/mnt/nxt-dev/water9`

## Current formula

Authoritative runtime formula is `scanReward(target)` in `src/helpers.ts:2559`.

```ts
reward = Math.round((scanRarityCredits(scannableRarity(target)) + dangerBonus) * (1 + state.upgrades.scanner * 0.16))
```

Relevant helpers:

- `src/helpers.ts:2559-2568`: adds rarity base, danger bonus, and scanner multiplier.
- `src/helpers.ts:2571-2577`: base credits by rarity.
- `src/helpers.ts:2591-2595`: rarity source by target kind.
- `src/helpers.ts:2631-2653`: fish rarity heuristic.
- `src/helpers.ts:2656-2662`: flora rarity heuristic.
- `src/articulated.ts:300-335`: articulated manifests and spawn eligibility; articulated scan rarity comes from `manifest.rarity`.
- `src/content.ts:23-31`: scanner upgrade is biome-1, max 4 before biome max extension.
- `src/helpers.ts:2897-2902`: biome max extension means scanner max is 4 in biome 1, 7 in biome 2, 10 in biome 3, and 12 in biome 4.

Rarity base credits before danger and scanner:

| Rarity | Base credits |
| --- | ---: |
| common | 320 |
| uncommon | 620 |
| rare | 1,150 |
| epic | 2,100 |
| legendary | 3,600 |

Danger bonuses:

| Target kind | Condition | Bonus |
| --- | --- | ---: |
| fish | `hostile` | +180 |
| flora | `hazardous` | +220 |
| articulated | any articulated creature | +720 |

Scanner multiplier:

| Scanner level | Multiplier | Notes |
| ---: | ---: | --- |
| 0 | 1.00x | starting value |
| 4 | 1.64x | current biome-1 max |
| 7 | 2.12x | current biome-2 max |
| 10 | 2.60x | current biome-3 max |
| 12 | 2.92x | current biome-4 max |

Base runtime payouts at scanner level 0:

| Rarity | Safe fish/flora | Hostile fish | Hazardous flora | Articulated |
| --- | ---: | ---: | ---: | ---: |
| common | 320 | 500 | 540 | 1,040 |
| uncommon | 620 | 800 | 840 | 1,340 |
| rare | 1,150 | 1,330 | 1,370 | 1,870 |
| epic | 2,100 | 2,280 | 2,320 | 2,820 |
| legendary | 3,600 | 3,780 | 3,820 | 4,320 |

Same examples at scanner level 4, the early max:

| Rarity | Safe fish/flora | Hostile fish | Hazardous flora | Articulated |
| --- | ---: | ---: | ---: | ---: |
| common | 525 | 820 | 886 | 1,706 |
| uncommon | 1,017 | 1,312 | 1,378 | 2,198 |
| rare | 1,886 | 2,181 | 2,247 | 3,067 |
| epic | 3,444 | 3,739 | 3,805 | 4,625 |
| legendary | 5,904 | 6,199 | 6,265 | 7,085 |

Aux-sub scan multiplier:

- `src/scene-sub.ts:272-280`: aux sub pays `Math.round(scanReward(target) * 0.45)`.
- Because `scanReward()` already includes scanner level, aux payouts also scale with scanner upgrades.
- At scanner 0, aux-sub safe common/uncommon/rare/epic/legendary payouts are 144 / 279 / 518 / 945 / 1,620.
- At scanner 4, aux-sub safe common/uncommon/rare/epic/legendary payouts are 236 / 458 / 849 / 1,550 / 2,657.

Current measured catalog totals from `public/review/water9-progression-measurement.json`:

| Biome | Targets | Base scan total | Scanner-max total |
| ---: | ---: | ---: | ---: |
| 1 | 14 | 13,560 | 22,240 |
| 2 | 42 | 38,180 | 80,935 |
| 3 | 69 | 74,180 | 192,868 |
| 4 | 80 | 105,750 | 308,775 |

Early high-value examples in biome 1 are Sting Anemone 2,320c, Blue-ring Octopus 2,280c, Thorn Fan Coralline 1,870c, Mantis Shrimp 1,330c, and each rare neutral fish 1,150c before scanner upgrades.

## Credit grant paths

### Diver scan

- `src/scene.ts:942`, `src/scene-sub.ts:186`, and `src/scene.ts:874` call `scanNearbyLife(delta, controls.scanHeld)` during normal swim, piloted sub, and a captured-player special case.
- `src/scene-entities.ts:1046-1056` selects nearest life in range and advances scan progress by `delta * (0.85 + state.upgrades.scanner * 0.28)`.
- `src/scene-entities.ts:1063-1074` completes the scan, marks the entity scanned, adds the species to `state.scannedSpecies`, and grants `scanReward(target)` only when the species was not already in `state.scannedSpecies`.
- This is the primary species catalog payout and correctly guards by species, not by individual entity.

### Aux sub scan

- `src/scene.ts:310` and `src/scene.ts:342` update the aux sub while docked and during normal play.
- `src/scene-sub.ts:256-283` runs the tier-3 aux sub scan loop.
- `src/scene-sub.ts:272-280` finds `nearestUnscannedLife`, marks the entity scanned, adds the species, and grants `Math.round(scanReward(target) * 0.45)`.
- `src/scene-entities.ts:1103-1115` defines `nearestUnscannedLife`; it only skips entities whose `life.scanned` flag is true.

Important balance risk: the aux-sub payout has no `state.scannedSpecies.has(target.species)` guard. It can pay 45% rewards for additional individuals of a species already cataloged by the diver or by a previous aux scan, as long as that specific entity has not been marked `scanned`. This is not a first-species-only grant path.

### Scan quest reward context

- `src/helpers.ts:139-142` uses `state.scannedSpecies.size` as progress for scan quests.
- `src/helpers.ts:148-181` creates `Live Catalog Sweep` quests with target `2 + biome + floor(hash * 3)` and reward `640 + biome * 460`.
- Current scan quest rewards are biome 1: 1,100c, biome 2: 1,560c, biome 3: 2,020c, biome 4: 2,480c.
- `src/scene-economy.ts:180-188` completes active quests when progress reaches target.
- `src/scene-economy.ts:116-127` grants the quest reward at the barge with `state.credits += quest.reward`.
- This payout is related economy context, but it is keyed to total unique species count and is separate from per-species scanReward payouts.

### Other scan-like payout paths

- I found no other direct credit grant tied to fauna/flora/articulated scanning beyond diver scan, aux-sub scan, and scan quest claim.
- Other `state.credits +=` paths are ore/cargo sales, nest bounty, quest claims, debug/playtest grants, and item recovery; they are not species scan payouts.

## Risks

- Aux-sub duplicate-species payout is likely the highest hidden risk if tier-3 play is considered part of scan economy; it pays per entity instead of per species.
- Scanner upgrades double-dip: they shorten scan time in `src/scene-entities.ts:1056` and increase payout in `src/helpers.ts:2567`, while early scanner upgrades are cheap (`src/content.ts:28` base cost 75).
- Common/uncommon/rare payouts are high relative to early gates: biome 1 has 13,560c base catalog value and 22,240c at scanner 4, while the first barge route cost is 7,500c (`src/helpers.ts:2778-2781`).
- Rarity and formula logic is duplicated in tools: `tools/measure_progression.mjs:321-384` mirrors the full formula; `tools/check_fauna_rarity_balance.mjs:47-97` mirrors fish rarity and a partial fish-only reward formula without scanner/flora/articulated handling.
- Save/load persists `scannedSpecies` globally (`src/save-load.ts:66`, `src/save-load.ts:219`, `src/save-load.ts:296`), but individual `life.scanned` flags are runtime-only; after load/regeneration, aux scans can still pay for individual entities of species already in `state.scannedSpecies` unless guarded globally.
- HUD/logbook/progression assume `scannedSpecies` is the durable catalog source: `src/hud.ts:1140-1191`, `src/helpers.ts:2699-2701`, and `src/helpers.ts:2805-2835`.
- Charting gates depend on unique scan count and hostile/apex scans, not credit amount: `src/helpers.ts:2793-2835`. Lowering rewards should not break gates, but changing rarity labels or what counts as scanned can.
- Apex/win path depends on scanning the current apex species: `src/scene-entities.ts:1075-1083` and `src/scene.ts:1116-1124`. Reward changes should avoid changing species names or scan completion semantics.

## Recommended implementation touch points

Runtime:

- `src/helpers.ts:2559-2577`: centralize the new rarity payout table and/or tier-specific scaling here. This is the authoritative payout hook used by both diver and aux scans.
- `src/scene-sub.ts:272-280`: add the same unique-species guard used by diver scans before granting aux-sub credits. Recommended shape: compute `const firstSpeciesScan = !state.scannedSpecies.has(target.species)` before `add`; only pay when true.
- `src/scene-entities.ts:1046-1074`: update status/floating text if low-tier scan rewards become much smaller, and keep the first-species guard intact.
- `src/content.ts:23-31` and `src/helpers.ts:2897-2902`: consider whether scanner should continue to be a payout multiplier, a speed/range upgrade only, or a smaller multiplier. This is the lever that makes early common scans scale quickly.
- `src/hud.ts:1140-1191`: only needs changes if rarity labels or scan info presentation changes; no credit math lives here.

Tools/tests:

- `tools/measure_progression.mjs:321-384`: update mirrored formula and scanner max projections.
- `tools/check_fauna_rarity_balance.mjs:87-97`: update the duplicated reward table; consider expanding it or deleting reward assertions if it is intentionally fish-only.
- `tools/test_progression_tuning_smoke.mjs:1-45`: add string/assertion coverage for the new low-tier payout table if this smoke test remains the progression contract.
- `tools/test_sonar_map_controller_smoke.mjs:273`: this only checks that scanning increases credits or status mentions cataloging; it should survive lower rewards, but may need adjustment if very low rewards can round to 0.
- Add or update a focused regression test for aux-sub duplicate-species behavior; current tests only smoke controller scan behavior and save/load credit round-trip.

## Caveats/blockers

- I did not change runtime code; this is an audit artifact only.
- There is no `tests/` directory in this checkout; relevant tests are under `tools/`.
- Running `node tools/measure_progression.mjs` rewrote `public/review/water9-progression-measurement.json`; I restored that file afterward. The measured totals cited above match the committed report content currently present in `public/review/water9-progression-measurement.json`.
- `git status --short` already showed unrelated untracked audit prompt artifacts under `runs/` before this report was written, so a clean "only this artifact" status is blocked unless the manager handles those pre-existing files.
