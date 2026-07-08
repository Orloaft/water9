# Water9 Quest/Systems Audit

Preflight HEAD: `8a04ef5`

## Verdict

Quest arc can be built mostly from existing hooks, but an authored critical path needs a small structural quest-state pass.

Why: Water9 already has a typed quest contract model, quest board UI, accept/progress/complete/claim lifecycle, persistent quest/outpost/sub/scan/save state, biome charting gates, radio dialogue panels, status/objective messaging, and a Biome 4 scan-based win condition. The weak point is that quests are currently generated per biome from procedural targets and a single active quest id; there is no durable named story quest chain, milestone ledger, prerequisite model, or authored per-step objective state.

## System Inventory

### Quest Model

Current capabilities:

- Quest kinds are typed as `depth`, `scan`, `ore`, `nest`, `gulperSurvey`, and `forwardOutpost` in `src/types.ts:34`.
- A quest stores id, kind, title, client, text, reward, target, progress, startValue, accepted, completed, claimed, optional rare flag, and optional Marlin voucher grant in `src/types.ts:858`.
- Global quest state is `state.questBoard` plus one `state.activeQuestId` in `src/state.ts:39`.
- `activeQuest()` resolves the one accepted, unclaimed active quest in `src/helpers.ts:136`.
- `questProgressSource()` maps quest kinds to existing systems: max depth, scanned species count, ore sold credits, nest progress, or forward outpost activation in `src/helpers.ts:140`.

Limitations:

- The model is contract-oriented rather than story-oriented. It has no explicit prerequisites, chain id, step id, milestone flags, fail state, optional/required tag, target biome, target species, target artifact, or narrative completion payload.
- `startValue` makes scan/depth/ore quests relative to when the quest was accepted, which works for repeatable contracts but is awkward for absolute milestone quests unless code branches around it.
- Only one active quest can be accepted at a time; `acceptQuest()` blocks additional active contracts in `src/scene-economy.ts:96`.

### Quest Generation and Lifecycle

Current capabilities:

- `generateQuestBoard()` creates three baseline procedural contracts for each biome: depth, scan, and ore in `src/helpers.ts:149`.
- Nest contracts are rare and only added if a nest room exists and a seeded hash passes in `src/helpers.ts:198`.
- Biome 3 adds named rare quests for `Forward Air Pocket` and `Gulper Wake Survey`; the gulper quest grants a Marlin voucher on claim in `src/helpers.ts:215`.
- New worlds regenerate the quest board, reset active quest, and clear forward outpost state in `src/scene-worldgen.ts:71`.
- Accepting a quest at the barge marks it accepted, clears completion/progress, stores the starting progress source, sets `activeQuestId`, emits status text, refreshes HUD, and redraws sonar in `src/scene-economy.ts:92`.
- Progress updates run every update loop, both while docked and diving, via `this.updateQuestProgress()` in `src/scene.ts:311` and `src/scene.ts:342`.
- Generic completion happens when progress reaches target, sets status text, spawns `Quest complete`, and redraws HUD/sonar in `src/scene-economy.ts:180` and `src/scene-economy.ts:191`.
- Claiming requires being at the barge, pays credits, clears active quest id, and can enable `state.marlinVoucherAvailable` in `src/scene-economy.ts:116`.

Limitations:

- Board generation depends on current biome and seed; there is no stable authored quest table.
- Biome travel resets active quest and clears biome-local state in `src/scene-economy.ts:145`, so cross-biome quests need separate durable state or must complete before travel.
- The rare nest contract is partially random because it depends on special-room generation and hash chance.

### Forward Outpost

Current capabilities:

- Forward outpost has durable fields for active, x/y, biome, depth, oxygen radius/rate, charge, max charge, and flora species in `src/types.ts:803`.
- State initializes the prototype outpost in `src/state.ts:41`.
- Placement validates active quest, no existing outpost, Biome 3 only, minimum depth, open water, nearby non-hazardous flora, and solid terrain support in `src/scene-economy.ts:208`.
- Establishing the outpost writes `state.forwardOutpost`, completes the quest, and returns a serializable outpost snapshot in `src/scene-economy.ts:221`.
- While diving, the outpost refills oxygen in radius and consumes charge in `src/scene.ts:1066`.
- Save/load persists and restores the outpost in `src/save-load.ts:224`, `src/save-load.ts:301`, and `src/save-load.ts:332`.
- Playtest coverage exists for accept/place/refill/save/load in `tools/test_forward_outpost_quest_smoke.mjs:95`.

Limitations:

- It is hard-coded to Biome 3, one prototype, and one objective step.
- It is a good milestone hook, but not yet a reusable "build station at named site" quest primitive.

### Scanning, Logbook, and Win Condition

Current capabilities:

- Scanning range and speed scale with scanner upgrades in `src/scene-entities.ts:1143`.
- First scan of a species writes `state.scannedSpecies`, pays credits, emits floating text, and updates status in `src/scene-entities.ts:1165`.
- Scanning the current apex species at sufficient depth sets either charting status or `state.won = true` in Biome 4 in `src/scene-entities.ts:1172`.
- Aux Seeker scanning can add species and pay partial scan reward in `src/scene-sub.ts:272`.
- Logbook entries are derived from current biome fish, flora, and eligible articulated creature definitions and hide names/notes until scanned in `src/hud.ts:1140`.
- Flora scannability has a static audit in `tools/test_flora_scannability_audit.mjs:53`.

Limitations:

- `state.scannedSpecies` is a single global set, but the logbook is current-biome-only; after travel, `state.scannedSpecies.clear()` runs in `src/scene-economy.ts:156`, so scans are not permanent across biomes today despite being saved inside one biome.
- Scan quests count total scanned species since accept, not named species. A story arc that says "scan Crownmaw" needs a specific target condition.
- Articulated apex creatures are included in logbook if their minBiome allows them, but story targeting would need stable species/encounter ids.

### Biome Progression and Critical Path Gates

Current capabilities:

- Barge route cost is biome-based: Biome 1 cost constant, Biome 2 15,000c, later 36,000c in `src/helpers.ts:2804`.
- `biomeChartingRequirement()` gates travel with scans, depth, sonar cells, and apex/hostile scan proof in `src/helpers.ts:2819`.
- `biomeChartingProgress()` reports completion and missing requirement in `src/helpers.ts:2831`.
- `canTravelToNextBiome()` requires biome < 4, enough credits, and complete charting in `src/helpers.ts:2880`.
- `travelToNextBiome()` consumes credits, clears biome-local exploration state, increments biome, reseeds, restarts the scene, and refills at the barge in `src/scene-economy.ts:131`.
- The HUD shows exact travel requirements and an optional Biome 3 Gulper Wake Survey hint in `src/hud.ts:1367`.
- Biome 4 already has finale-flavored UI copy for the Ancient Ruins route in `src/hud.ts:1368`.

Limitations:

- These gates can express a multi-biome climb, but mostly through systemic requirements rather than authored steps.
- Because travel clears scans, sonar, max depth, ore sold, active quest, and outpost, the existing progression is biome-local; permanent story progress must be stored separately from these reset fields.

### Radio, Status, Objective UI, and Story Communication

Current capabilities:

- `RadioMessage` supports speaker, role, text, and npc/player side in `src/types.ts:851`.
- `startRun()` opens the initial radio dialogue in `src/scene-economy.ts:25`.
- `openingRadioMessages()` provides a multi-speaker intro about mining and scanning in `src/hud.ts:330`.
- `radioDialoguePanel()` renders modal radio dialogue with portraits, speaker/role/text, and Continue/Resume button in `src/hud.ts:365`.
- `advanceRadioDialogue()` steps through messages and closes radio in `src/hud.ts:388`.
- `objectivePanel()` displays an active contract or current systemic goal while diving in `src/hud.ts:115`.
- `currentDiveObjective()` translates active quest progress and biome charting gaps into clear short goals in `src/hud.ts:179`.
- Top HUD includes status, max depth record, save/load error/loading state, and warnings in `src/hud.ts:45` through `src/hud.ts:90`.
- Achievement toasts exist via `showAchievement()` and persisted `state.achievements` in `src/hud.ts:475` and `src/state.ts:61`.

Limitations:

- Radio messages are transient and cleared on load in `src/save-load.ts:321`; there is no persisted "heard radio id" set.
- Achievements are just a set of strings and not integrated with quest milestones.
- There is no story journal separate from the scan logbook.

### Shop, Upgrades, Cargo, Mining, and Rewards

Current capabilities:

- Tiles define ore/artifact values from common copper through `ruinCore` and unmineable anchorstone/bedrock in `src/content.ts:4`.
- Upgrades cover oxygen, cargo, laser, lamp, scanner, suit, speed, and thermal, with biome availability in `src/content.ts:23`.
- Upgrade purchase spends credits, increments level, refills at boat, and writes status in `src/scene-economy.ts:11`.
- Shop items include combat, mining, light, oxygen/fuel, healing, antivenom, and reusable tool support in `src/content.ts:73`.
- Buying shop items uses cargo capacity and stores consumables/tools in cargo in `src/scene-economy.ts:71`.
- Mining consumes fuel/oxygen, damages mineable terrain, breaks tiles, and spawns loose ore in `src/scene-combat.ts:59`.
- Breaking valuable tiles creates loose cargo items with kind/icon/value in `src/scene-combat.ts:590`.
- Loose valuable items are picked up into `state.cargo`, with sub vacuum support for mining subs, in `src/scene-entities.ts:950`.
- Docking sells cargo, increments credits and `state.oreSoldCredits`, and filters sold cargo in `src/scene.ts:1050`.
- Cargo capacity is `6 + cargo upgrade * 4 + mining sub cargo` in `src/helpers.ts:2556`.
- Scan rewards use rarity and scanner upgrades in `src/helpers.ts:2581`.
- Nest clear awards an immediate hazard bounty and then completes a nest quest if active in `src/scene-entities.ts:932`.

Limitations:

- Ore/cargo quests target value sold, not named artifacts. Existing artifact tiles could support named story items, but cargo/save code currently treats them as generic `CargoItem`s.
- Nest rewards double as immediate bounty plus quest completion path; story bosses or named nests would need careful reward semantics.

### Sub Progression

Current capabilities:

- Sub definitions support Seeker, Marlin, and Leviathan with cost, hull, oxygen, fuel, cargo, speed, text, and features in `src/content.ts:34`.
- Buying/selecting a sub is persisted through `subOwned`, `selectedSubTier`, `activeSub`, `carrierSub`, `pilotingSub`, and `auxSubActive` in `src/state.ts:62`.
- `buySub()` applies Marlin voucher discount through `subEffectiveCost()`, purchases/selects, creates active vehicle, and clears voucher when buying Marlin in `src/scene-sub.ts:9`.
- Sub fuel, oxygen, and hull services exist in `src/scene-sub.ts:30`.
- Seeker cannot mine, Marlin/Leviathan can mine from sub in `src/scene-combat.ts:60`.
- Leviathan can deploy/recover a Seeker scout in `src/scene-sub.ts:91`.
- Save/load serializes sub runtime values in `src/save-load.ts:251` and restores them in `src/save-load.ts:267`.

Limitations:

- Sub tiers are economy gates and utility unlocks, not quest prerequisites today.
- Marlin voucher is one-off hard-coded reward logic, useful as a pattern but not generalized.

### Save/Load and Permanent State

Current capabilities:

- Save payload includes seed, biome, credits, oxygen/hull/fuel, depth/maxDepth, oreSoldCredits, cargo, sonarRevealed, scannedSpecies, upgrades, achievements, questBoard, activeQuestId, forwardOutpost, sub ownership/selection/runtime, Marlin voucher, won/lost/started, atBoat/docked, player, world tiles, and terrain damage in `src/save-load.ts:49`.
- `buildSave()` copies these state fields into localStorage in `src/save-load.ts:201`.
- `applySavedState()` restores the same core progression, clamps derived values, closes modal UI, clears transient radio messages, and resets hazards in `src/save-load.ts:281`.
- Save/load smoke covers round-tripping credits, biome, sub tier, cargo capacity, player position, and corrupt save handling in `tools/test_save_load_smoke.mjs:91`.

Limitations:

- Radio state is intentionally transient and not restored.
- There is no `story` or `milestones` save object. Reusing `achievements` for critical progression would work technically but would mix UX toasts with quest logic.
- Save schema is v1; adding fields needs migration-compatible defaults in `applySavedState()` and smoke coverage.

## Existing Systems That Can Express a Multi-Biome Critical Path

Works with minimal changes:

- Biome charting requirements already express "scan enough, reach depth, reveal sonar, prove threat" across Biomes 1-3.
- Quest lifecycle can express "accept at barge, do one measurable thing, return and claim reward."
- Radio dialogue and objective panel can communicate authored beats.
- Scanned species, maxDepth, sonar cells, cargo value sold, sub tier, upgrades, and forward outpost state are all available signals.
- Biome 4 apex scan already ends the game, so a final "catalog sentinel" beat exists.

Too random/procedural for an authored finale without code changes:

- Quest board generation is seeded/procedural and resets per biome.
- Nest availability and placement are special-room/procedural.
- Generic scan quests count any species, not named story species.
- Generic ore quests count sale value, not named artifacts or recovered story objects.
- Gulper Wake Survey is implemented as a depth quest with special title/voucher, not as a true encounter confirmation.
- Radio is transient and not milestone-gated.

## Proposed Quest-State Model

Keep current `Quest` and add a small durable story layer rather than replacing the board:

```ts
interface StoryProgress {
  activeId: string;
  completed: string[];
  flags: Record<string, boolean>;
  heardRadio: string[];
}
```

Minimal extensions grounded in current storage:

- Add `state.story` beside `questBoard` in `src/state.ts`.
- Persist it under `SavedGame.state.story` in `src/save-load.ts`, with fallback defaults for older saves.
- Keep current `Quest` fields for display/reward, but add optional fields only as needed:
  - `storyId?: string`
  - `targetBiome?: Biome`
  - `targetSpecies?: string`
  - `targetArtifact?: Tile`
  - `required?: boolean`
  - `prerequisites?: string[]`
- Add a small `storyQuestsForBiome()` or static table in `src/content.ts` or a new `src/story-quests.ts`.
- Merge story quests into `generateQuestBoard()` or append them after generation. Required story quests should not depend on hash chance.
- Add specific progress sources in `questProgressSource()` for named scan/artifact/outpost/story flags, while leaving existing procedural contracts untouched.
- Keep one active contract rule for now; story milestones can auto-activate or appear as required board entries.

This preserves current UI, save/load, playtest commands, and reward flow while giving authored progression durable state independent of biome-local scan/sonar resets.

## Likely Implementation Hooks

Low-risk files to touch later:

- `src/types.ts`: add optional quest fields and `StoryProgress` type.
- `src/state.ts`: initialize `state.story`.
- `src/save-load.ts`: serialize/restore `story`, default older saves, add version-compatible validation.
- `src/content.ts` or new `src/story-quests.ts`: define named critical path quests and radio snippets.
- `src/helpers.ts`: append/merge story quests in `generateQuestBoard()`, add named-target logic in `questProgressSource()`, and possibly add helper `hasCompletedStoryQuest()`.
- `src/scene-economy.ts`: handle claim side effects such as flags, radio, unlocks, and required quest completion.
- `src/scene-entities.ts`: when scanning a named target, set a story flag or complete a story scan quest.
- `src/scene-combat.ts` / `src/scene-entities.ts`: for named artifact cargo/recovery beats, mark flags when item is mined/picked up/sold.
- `src/hud.ts`: add story-specific objective detail, radio trigger rendering, and logbook/story entry affordances.
- `src/scene-worldgen.ts`: reserve stable authored encounter sites for finale/quest targets, following the existing gulper/reliquary reservation pattern.
- `src/scene-playtest.ts`: add commands to accept story quest, grant story flag, stage named species/artifact, and snapshot story state.

Useful current patterns:

- Forward outpost playtest commands already provide accept/stage/establish/tick/save/load flow in `src/scene-playtest.ts:2864`.
- Signature encounter reservations already reserve gulper and reliquary routes by biome in `src/scene-worldgen.ts:475`.
- Marlin voucher is an existing claim-side reward flag in `src/scene-economy.ts:122`.

## Tests and Smokes to Extend

Existing scripts to use/extend:

- `npm run water9:save-load-smoke` for persistence, from `package.json:25`.
- `npm run water9:forward-outpost-smoke` for quest acceptance, placement, oxygen refill, save/load, from `package.json:40`.
- `npm run water9:flora-scannability-audit` for scan-target integrity, from `package.json:33`.
- `npm run water9:progression-tuning-smoke` for economy/progression tuning, from `package.json:32`.
- `npm run water9:sonar-map-controller-smoke` for sonar map interaction, from `package.json:28`.
- `npm run build` or `npx tsc --noEmit --pretty false` when source changes touch types/save.

New or extended coverage recommended:

- Story quest save/load smoke: start story quest, progress partially, save, mutate, load, verify active story id, flags, quest progress, heard radio, and completed ids.
- Named scan quest smoke: stage a named target, scan it, verify exact species completion and no completion from unrelated species.
- Named artifact/cargo smoke: stage target tile, mine/pick up/sell, verify artifact quest progress and cargo/save behavior.
- Biome travel story smoke: complete required Biome 1 milestone, travel, verify durable story state survives even though scan/sonar/maxDepth reset.
- Finale smoke: reach Biome 4, stage final apex/sentinel scan, verify quest completion and `state.won`.
- Quest board deterministic smoke: ensure required story quests are present regardless of seed/procedural rare-contract roll.

## Risks and Open Questions

- Do story scans need to be permanent across biomes? Current travel clears `state.scannedSpecies`, so a critical path should not rely only on that set.
- Should story quests coexist with one active contract, or should required story goals be always active in parallel with optional contracts?
- Should radio be replayable in a story log, or is transient radio enough if story flags persist?
- Should named artifacts be cargo items, tile ids, or new inventory ids? Current cargo model can carry Tile ids, but the quest system cannot target a specific item yet.
- Should the final Biome 4 win condition remain direct apex scan logic in `scanNearbyLife()`, or move into story quest completion so rewards/UI/save behavior are consistent?
- Nest quest rewards currently pay immediate bounty plus quest completion; authored combat milestones should avoid accidental double-payout behavior.

## Verification

- Report artifact path: `/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07/quest-systems-audit.md`
- This report includes direct code references such as `src/types.ts:858`, `src/helpers.ts:149`, `src/scene-economy.ts:92`, `src/save-load.ts:49`, and `src/hud.ts:1059`.
- No tests were run for this read-only audit; existing smoke scripts were inspected.
