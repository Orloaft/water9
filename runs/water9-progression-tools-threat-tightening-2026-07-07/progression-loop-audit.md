# Water9 Progression Loop Tightening Audit

Preflight HEAD: `8a04ef5`

Context source: `runs/water9-game-loop-closure-analysis-2026-07-07/game-loop-closure-proposal.md`

## Summary Recommendation

Keep the satisfying dive/sell/upgrade cadence, but stop letting procedural board contracts be the player's main sense of progression. Add a persistent expedition layer that pins one authored milestone per biome above the optional contract board:

- B1: prove survey basics and discover the first drowned-architect signal.
- B2: prove vent traversal with flora chemistry plus Gulper Eel route proof.
- B3: establish the Forward Air Pocket, complete the Gulper Wake Survey, and prepare the Marlin/tool kit for ruin entry.
- B4: follow the Reliquary Vault route, scan Crownmaw, recover proof, and return/uplink for a real ending.

Optional contracts should stay as money and risk variety. Story milestones should be durable across route travel and should unlock/spotlight tools, threat-handling habits, and authored copy.

## What Currently Makes The Loop Repetitive

1. Quest generation is mostly three generic counters per biome.
   - `generateQuestBoard()` always builds `Pressure Line Survey`, `Live Catalog Sweep`, and `Ore Purchase Order` from biome/seed formulas, then sometimes appends a nest bounty and B3 rares (`src/helpers.ts:149-248`).
   - Progress is pulled from broad global counters: max depth, total scanned species, ore-sold credits, or a single outpost flag (`src/helpers.ts:140-146`). That makes many contracts feel like parallel accounting for things the player would already do.

2. Only one accepted quest can exist, so authored beats compete with basic income.
   - `acceptQuest()` blocks a second active contract with "Finish or claim..." (`src/scene-economy.ts:92-114`). This is fine for optional contracts, but bad if the Forward Air Pocket or final proof arc is represented as a normal board quest.

3. Accepted quest and discovery state are biome-local and erased on travel.
   - `travelToNextBiome()` clears cargo, ore-sold credits, sonar reveal, scanned species, `activeQuestId`, and forward outpost state (`src/scene-economy.ts:145-170`).
   - World generation also replaces the quest board and clears `activeQuestId`/outpost state (`src/scene-worldgen.ts:66-75`). This makes each biome feel like a reset rather than a chapter in the same expedition.

4. The HUD goal is accurate but generic.
   - `currentDiveObjective()` falls back to "scan local lifeforms", "push the pressure line", "pulse sonar", and "fund the barge retrofit" (`src/hud.ts:179-201`). Good guidance, but it reads as checklist management, not narrative progression.
   - B4 travel copy already promises "catalog the Crownmaw sentinel, and escape with proof" (`src/hud.ts:1367-1373`), but the runtime currently ends as soon as the Crownmaw scan condition hits.

5. The final proof beat is abrupt.
   - `scanNearbyLife()` immediately sets `state.won = true` when the current apex species is scanned at `TARGET_DEPTH` in biome 4 (`src/scene-entities.ts:1172-1177`, `src/constants.ts:7`). There is no return-to-barge, proof carry, victory panel, or post-ending choice in the current path.

6. Threat and tool escalation is present, but not staged as progression.
   - Stun grenades affect hostile fish and articulated creatures (`src/scene-combat.ts:661-688`), and Marlin harpoon fire stuns both fish and articulated creatures (`src/scene-combat.ts:948-979`).
   - Cutter/drill damage can currently damage and kill articulated creatures (`src/scene-combat.ts:246-268`, `src/scene-articulated.ts:1817-1861`). If large threats become non-drill-killable, that rule needs to be messaged as "scan, evade, stun, escape" progression rather than as a hidden nerf.

7. Flora is valuable but not yet a named progression pillar.
   - Flora exists as scannable life with hazardous/rare variants by biome (`src/content.ts:290-310`), contributes to hostile/threat proof when hazardous (`src/helpers.ts:2826-2829`), pays scan rewards (`src/helpers.ts:2581-2595`), and is required for the B3 Forward Air Pocket anchor (`src/scene-economy.ts:208-245`).
   - The generic scan quest counts flora and fauna together, so flora sampling currently reads as catalog filler except for the outpost slice.

## What Should Stay

- The core rhythm works: dive, mine/scan, return, sell/claim, buy upgrades, push deeper. It gives the player immediate decisions and short-cycle rewards.
- Cargo limits, oxygen/fuel pressure, sonar charting, and darkness all create natural return timing. The loop should be tightened, not replaced.
- The contract board is useful as optional economy. Depth, scan, ore, nest, and rare B3 contracts can keep runs from being identical.
- The barge retrofit gate is a strong macro goal because it combines money, survey scans, depth record, sonar chart, and threat proof (`src/helpers.ts:2819-2881`; `src/hud.ts:1391-1404`).
- The B3 authored hooks are good seeds: Forward Air Pocket already combines depth, terrain, non-hazardous flora, and local refuge; Gulper Wake Survey grants a Marlin discount (`src/helpers.ts:215-246`; `src/scene-economy.ts:208-245`).
- Scanner and catalog rewards already give a non-mining income line. Legendary articulated scans pay well (`src/helpers.ts:2581-2595`) and can support a "proof over kills" loop.

## Proposed Tighter B1-B4 Loop

### Shared Structure

Add a persistent `story` or `expedition` progress object separate from `Quest`:

- `activeMilestoneId`
- `completedMilestoneIds`
- `flags`
- `heardRadio`
- `finalProofRecovered`
- `endingSeen`

Do not make story milestones ordinary one-active contracts. Show a pinned expedition objective above optional contracts. Optional contracts stay biome-local and claimable for money; story progress persists across biome travel.

Each biome should have:

- One authored expedition milestone that must be completed for the route.
- Two to four optional contracts for money/risk.
- One tool or habit spotlight.
- One threat escalation lesson.

### B1: Survey License / First Signal

Goal: teach the player that scanning, sonar, mining, and returning to the barge are all part of charting a real expedition route.

Required milestone:
- Scan 2 fauna and 1 flora sample.
- Reach the B1 charting depth band.
- Pulse enough sonar to reveal the first "cold geometry" anomaly.
- Return to the barge to turn survey data into the B2 route.

Optional contracts:
- Keep current ore/depth/scan contracts.
- Add a simple "flora sample: Glass Kelp or Moon Sponge" optional contract if the story milestone only needs any flora.

Tool beat:
- Scanner Mk1 is the story tool. The scanner should be pitched as the expedition's proof instrument, not just bonus credits.

Threat beat:
- Hostile/hazard proof remains forgiving in B1 via hostile or apex fallback (`src/helpers.ts:2819-2854`). Use Blue-ring Octopus or Sting Anemone as the first "scan at risk, do not fight everything" lesson.

### B2: Vent Chemistry / Gulper Route Proof

Goal: make B2 feel like crossing an active barrier rather than grinding for the 15,000c route cost.

Required milestone:
- Collect/scan one safe vent flora sample and one hazardous vent flora sample.
- Scan Gulper Eel as apex proof.
- Use sonar in vent lanes.
- Return to the barge for radio that the vent chemistry matches the drowned-architect signal.

Optional contracts:
- Nest extermination and ore/depth/scan contracts remain optional.
- Add a "hazard assay" contract for Vent Coral/Ember Bloom as a high-risk payout.

Tool beat:
- Thermal Plating unlocks in B2 (`src/content.ts:31`); make the milestone explicitly say the vent assay justifies or discounts thermal plating.
- Stun Grenade becomes the emergency escape tool. Do not require it yet; introduce it as a recommended supply for Gulper scans.

Threat beat:
- Gulper scan is a route proof, not a kill objective. Rewards should favor scanning and surviving.

### B3: Forward Pocket / Deep Predator Preparation

Goal: turn B3 into the midpoint where the player learns to stage an expedition, not just dive from the barge every time.

Required milestone:
- Accept or automatically pin "Forward Air Pocket".
- Establish it below 900 m beside solid terrain and non-hazardous flora.
- Complete Gulper Wake Survey or an authored equivalent that confirms the predator lane.
- Scan Abyssal Serpent as apex proof.
- Return to the barge to unlock/discount Marlin preparation for B4.

Optional contracts:
- Current Forward Air Pocket and Gulper Wake can remain as board entries for now, but the story system should pin them so they do not block other income contracts.
- Nest and ore contracts remain optional hazard/income.

Tool beat:
- Flora sampling becomes functional here: non-hazardous flora is an oxygen seed for the outpost (`src/scene-economy.ts:215-245`).
- Marlin becomes "expedition craft for ruin work" rather than merely "not required for travel" (`src/hud.ts:1378-1388`; `src/content.ts:48-58`).
- Injector Knife should be framed as latch escape, not a boss-killing weapon.

Threat beat:
- Large articulated fauna should become the main pressure. They are scannable, high-value proof targets and should be stun/evade objectives. B3 is where the player learns "cripple/escape, do not drill-kill the giant."

### B4: Reliquary Vault / Final Proof

Goal: make Ancient Ruins a destination and ending, not just a deeper biome.

Required milestone:
- Enter Ancient Ruins and receive finale radio.
- Use sonar to reveal/follow the Reliquary Vault Route.
- Sample or scan one ruins flora clue: Glass Obelisk or Oracle Polyp.
- Scan Crownmaw at the final depth band.
- Set `finalProofRecovered`, then require return to the barge or explicit remote uplink.
- Show victory panel/run summary and allow Continue Survey or New Expedition.

Optional contracts:
- Keep optional ore/scans for post-game or side income, but stop using the board as the player's main B4 objective.

Tool beat:
- Scanner is the final proof tool.
- Stun Grenade/Marlin harpoon/flare are escape and positioning tools.
- Drill is for route/cargo, not for killing Crownmaw.

Threat beat:
- Crownmaw should be a moving environmental/encounter constraint. The win condition is proof under pressure and extraction, not DPS.

## Specific Role For Flora Sampling And Tool Progression

Flora should become the low-risk-to-high-risk sampling ladder:

- B1 safe flora: learn the scan hold, get small research payout, satisfy "botanical baseline".
- B1 hazardous flora: optional threat-proof shortcut or bonus contract.
- B2 vent flora: unlock/justify Thermal Plating and teach environmental hazards.
- B3 non-hazardous oxygen flora: required outpost anchor and local refuge.
- B3 hazardous flora: warning that the outpost needs the correct sample, not any plant.
- B4 ruins flora: final clue/proof modifier tied to the Reliquary Vault route.

Tool progression should map onto that ladder:

- Scanner: proof and catalog income. Later scanner levels should reduce scan exposure time and increase proof payout, not only credits.
- Thermal Plating: B2 vent sampling gate/recommendation.
- Stun Grenade: B2 recommended, B3 expected, B4 essential emergency escape.
- Flares/lamp: B3/B4 route and large-threat readability support.
- Injector Knife: close-range escape from latches/grabs; not a kill path for giants.
- Marlin: B3 reward/preparation and B4 cargo/harpoon/stun platform.
- Leviathan: optional mastery/power fantasy after proof or for post-game, not required for story completion.

## Large-Threat Non-Drill-Killability

If large articulated threats become non-drill-killable, the design rule should be: "large fauna are expedition constraints, not ore nodes with HP."

Recommended behavior:

- Scanner/proof is the primary interaction. Large-threat scans should pay strongly and advance story/apex proof.
- Drill/cutter should only create temporary behavior changes: flinch, weak-part stagger, jaw release, armor spark, or short route opening. It should not lower a boss health bar to zero.
- Stun Grenade and Marlin harpoon should be the main escape/spacing tools, consistent with current stun code for articulated creatures (`src/scene-combat.ts:661-688`, `src/scene-combat.ts:948-979`).
- UI/status copy must say why: "Cutter cannot pierce Crownmaw armor. Scan proof, stun to break contact, and run the route."
- Rewards should come from proof and extraction, so players do not feel robbed of a kill reward.
- Optional contracts should never ask the player to kill a giant. Use "scan", "survive wake", "recover shed plate", "mark lair", or "escape with proof" verbs.

This turns frustration into a clearer loop: prepare supplies, dive to the milestone, scan/sample under threat, use tools to survive, return to convert proof into progression.

## Staged Implementation Plan

1. Final-proof vertical slice first.
   - Add minimal durable story/finale state.
   - Change B4 Crownmaw scan from immediate `won` to `finalProofRecovered`.
   - Show "Return to the barge with proof" or "Uplink proof" objective.
   - On docking/uplink, set `won`, show victory panel, record ending seen.
   - Add save/load migration for the new state.

2. Pinned expedition objective backbone.
   - Add static story milestone definitions for B1-B4.
   - Render pinned objective above `currentDiveObjective()`/quest board.
   - Advance story on charting completion, route travel, scan, outpost, and final proof events.
   - Keep optional contracts unchanged.

3. Promote B3 midpoint.
   - Make Forward Air Pocket and Gulper Wake Survey story-pinned.
   - Decouple story milestones from one-active-quest blocking.
   - Tune Marlin voucher copy so B3 preparation points clearly toward B4.

4. Flora/tool progression pass.
   - Add B1/B2/B4 flora sample milestone hooks.
   - Add scanner/thermal/stun/Marlin copy and optional flora contracts.
   - Ensure flora sampling uses existing scannable flora and does not create reward spam.

5. Large-threat rules pass.
   - Add per-creature or per-rarity `nonLethalLargeThreat`/`proofTarget` rules.
   - Convert drill damage on story giants to stagger/escape affordances.
   - Add clear HUD/status feedback and smoke coverage.

## Tests And Smokes

Existing useful coverage:

- `npm run build` / `npx tsc --noEmit --pretty false` for type safety.
- `npm run water9:progression-tuning-smoke` validates charting gates, barge costs, Marlin voucher, B4 Reliquary copy, scanner reward math, and progression measurement hooks (`tools/test_progression_tuning_smoke.mjs:46-89`).
- `npm run water9:progression-measurement` measures ore, scan, quest, gate, charting, and trip assumptions (`tools/measure_progression.mjs:477-507`).
- `npm run water9:forward-outpost-smoke` proves B3 forward outpost quest accept/place/refill/save/load (`tools/test_forward_outpost_quest_smoke.mjs:95-132`).
- Playtest snapshot already exposes `chartingProgress`, quest board, forward outpost, Marlin effective cost, and won state (`src/scene-playtest.ts:1988-2012`).

Suggested new/extended coverage:

- Story migration smoke: old save loads with default story state.
- Pinned objective smoke: story objective persists when optional quest changes.
- B1/B2/B3/B4 milestone smoke: each milestone can advance deterministically through playtest commands.
- Final-proof smoke: B4 Crownmaw scan sets proof, does not immediately freeze; return/uplink triggers victory panel and `won`.
- Large-threat non-lethal smoke: drill hit on Crownmaw/Serpent does not kill, but stun/harpoon creates escape affordance and scan remains possible.
- Flora sampling smoke: required flora samples count only once per species and do not inflate scan rewards.

## First Vertical Slice

Implement "Final Proof And Return" before the full story chain.

Acceptance:

- In B4, scanning Abyssal Crownmaw at/under `TARGET_DEPTH` sets a durable proof flag, not immediate `won`.
- Objective changes to "Return to the barge with proof" or "Uplink proof".
- Docking at the barge with proof sets `state.won`, shows victory panel/radio/summary, and persists `endingSeen`.
- Existing B4 travel copy becomes true.
- `water9:progression-tuning-smoke`, `water9:save-load-smoke`, and a new final-proof smoke pass.

Why first:

- It fixes the largest loop closure mismatch.
- It establishes durable story state needed by later B1-B3 milestones.
- It creates a testable destination for threat/tool tuning.

## Risks And Open Questions

- Story overlay vs `Quest`: safest path is a separate story object. Reusing `Quest` will fight the one-active-contract rule.
- Persistence migration: save/load currently persists `won`, quests, scans, outpost, subs, and voucher, but no story/finale object (`src/save-load.ts:206-237`, `src/save-load.ts:281-310`).
- Travel reset: scans/sonar/outpost resets are good biome-local mechanics, but story milestones must survive them.
- Economy pacing: adding authored rewards may shorten barge-gate grind. Use `measure_progression.mjs` to include story rewards in trip assumptions.
- Non-drill-killability could feel unfair unless visual feedback, status copy, and scan/extraction rewards are implemented at the same time.
- Marlin requirement: current copy says Marlin is recommended, not required. Decide whether story requires Marlin for B4 proof, or keeps it optional but strongly rewarded.
- B4 extraction difficulty: requiring full return after Crownmaw scan is dramatic but can be punishing. Consider an expensive/slow "proof uplink" fallback if playtests show too many failed runs.
- Flora sampling wording: distinguish named scannable flora from decorative terrain flora so players know what counts.
