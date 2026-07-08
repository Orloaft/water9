# Water9 Game Loop Closure Proposal

Preflight/audit HEAD: `8a04ef5`

Source audits:
- `biome-progression-audit.md`
- `quest-systems-audit.md`
- `final-ending-audit.md`

## Verdict

Water9 already has a mechanically finishable four-biome loop, but it does not yet have a satisfying authored game loop conclusion.

Today the player can dive, mine, scan, upgrade, chart biomes, pay route costs, travel from The Shallows to Brine Vent Shelf to Midnight Trench to Ancient Ruins, and "win" by scanning the Abyssal Crownmaw at depth. The missing layer is a persistent expedition story arc that turns those mechanics into a journey with clear milestones, escalating stakes, a final proof objective, an escape/return beat, and an unmistakable victory presentation.

Recommended direction: add a small durable `story` progress layer, keep the existing procedural contract board, and add one required authored expedition quest chain that rides on existing scan/depth/sonar/outpost/sub/biome-gate systems.

## Current Game Flow

Current working loop:
1. Dive from the barge.
2. Mine ore, scan fauna/flora, ping sonar, and complete optional contracts.
3. Return to the barge to sell cargo, claim rewards, buy upgrades, refill, and repair.
4. Satisfy biome charting requirements: unique scans, depth record, sonar coverage, and threat/apex proof.
5. Pay barge retrofit cost and travel to the next biome.
6. In biome 4, scan Crownmaw at or below `TARGET_DEPTH` to set `state.won`.

Current biome route:
- Biome 1, The Shallows: starter charting, hostile scan fallback, 7500c route cost.
- Biome 2, Brine Vent Shelf: vents, hazardous flora, bobbit pressure, mandatory Gulper Eel proof, 15000c route cost.
- Biome 3, Midnight Trench: anchorstone, stronger predators, Abyssal Serpent proof, forward outpost and Gulper Wake Survey hooks, 36000c route cost.
- Biome 4, Ancient Ruins: ruin resources, Reliquary route/vault signals, Crownmaw apex, no next route.

What is weak:
- Most progression is systemic checklist completion, not authored expedition movement.
- Quests are procedural and biome-local; travel clears active quest, scans, sonar, max depth, cargo, and outpost.
- Biome 4 promises "escape with proof" in UI copy, but the game ends immediately underwater on Crownmaw scan.
- `state.won` freezes play without victory UI, finale radio, achievement, credits, return-to-barge, or post-ending choice.

## Definition Of Finished

Water9 should define "finishing the game" as:

1. The player reaches Ancient Ruins through normal biome charting and barge retrofits.
2. The player completes the final expedition chain: locate the Reliquary Vault, catalog Crownmaw, recover/uplink proof of the drowned architects, and survive the extraction.
3. The game records durable completion: `won`, final proof flag, ending seen flag, final achievement, and stats.
4. The player receives an unmistakable ending: finale radio, victory panel, run summary, and a deliberate restart/continue choice.
5. Post-finale behavior is intentional. Recommended: allow "Continue Survey" after the ending panel so the player can keep exploring a won save, while "New Expedition" restarts.

## Recommended Quest Arc

Working title: **The Drowned Architects**

Keep procedural contracts as optional economy. Add a required expedition chain that appears as a pinned story objective in the quest/objective UI and is persisted across biome transitions.

### Prologue: First Signal

Biome: The Shallows

Goal: teach that scanning is not just money; it is how the expedition finds a buried civilization.

Quest beats:
- Scan 4 local species/flora and reach 900 m, matching existing B1 charting.
- Find enough sonar coverage to reveal a "cold geometry" route anomaly.
- Return to barge and trigger short radio: the barge has found a pattern beneath the biome chart.

Mechanical hooks:
- Reuse `biomeChartingProgress()` and `currentDiveObjective()`.
- Add a story milestone when B1 charting becomes complete.
- No new art required for first slice.

### Act 1: Vent Proof

Biome: Brine Vent Shelf

Goal: make biome 2 feel like the expedition is crossing an active barrier, not just paying a route fee.

Quest beats:
- Scan the Gulper Eel apex or equivalent named threat.
- Chart vent terrain with sonar.
- Recover/sell enough B2 ore or artifact value to fund the vent-shield retrofit.
- Return to barge for radio: the vent chemistry matches inscriptions from older wreckage.

Mechanical hooks:
- Existing mandatory apex proof already gates B2.
- Existing thermal plating and vent hazards make the mechanical escalation legible.
- A story quest can listen for named species scanned plus current charting completion.

### Act 2: The Forward Pocket

Biome: Midnight Trench

Goal: turn B3's strongest existing content into the expedition midpoint.

Quest beats:
- Establish the Forward Air Pocket near safe flora at 900 m+.
- Complete Gulper Wake Survey or scan a named deep predator trail.
- Scan Abyssal Serpent to prove the trench route.
- Unlock/discount Marlin as the expedition craft for ruin entry.
- Return to barge for radio: the route to the Ancient Ruins is stable, but the signal is guarded.

Mechanical hooks:
- Reuse B3 `forwardOutpost` quest and Marlin voucher pattern.
- Reuse charting requirements, sub economy, and existing `state.forwardOutpost`.
- This is the best place to make one story quest required, because it already has authored flavor.

### Act 3: Reliquary Vault

Biome: Ancient Ruins

Goal: make the final biome a destination with a clear job: prove the drowned architects existed and get out.

Quest beats:
- Enter Ancient Ruins and receive finale radio.
- Reveal the Reliquary Vault route with sonar or reach the vault depth band.
- Scan Crownmaw, but do not immediately hard-freeze the game.
- Mark `finalProofRecovered` or `proofUplinked`.
- Escape/return to the barge with proof, or explicitly trigger a remote uplink if we choose not to require return.
- Show victory panel and run summary.

Recommended choice: require return to barge after Crownmaw scan.

Why: the existing biome 4 copy already says "escape with proof"; returning creates tension, lets the player feel the journey back, and avoids the current abrupt underwater freeze. If requiring escape feels too punishing, add a visible "proof uplink complete, return optional" finale, but change the copy so it matches the mechanic.

## Required State Model

Add a small durable story object beside existing quest board state:

```ts
interface StoryProgress {
  activeId: string;
  completed: string[];
  flags: Record<string, boolean>;
  heardRadio: string[];
  endingSeen: boolean;
  finalProofRecovered: boolean;
}
```

Low-risk rules:
- Do not replace procedural quests.
- Do not make every story objective a normal accepted contract if the one-active-quest rule gets in the way.
- Let story progress be a persistent overlay, while optional contracts remain biome-local.
- Add optional `Quest` fields only when needed: `storyId`, `targetBiome`, `targetSpecies`, `targetArtifact`, `required`, `prerequisites`.
- Save/load must default missing story fields for old saves.

## UI And Player Communication

Use existing UI first:
- Objective panel: show pinned story objective above or instead of generic charting when a story milestone is active.
- Quest board: add required story contracts as a distinct row, not random rare contracts.
- Radio panel: use it for major milestone dialogue and persist `heardRadio`.
- Status line/floating text: keep it for moment-to-moment confirmation.
- Logbook: optionally show story-critical scanned creatures/artifacts later, but not required for first slice.

Add new UI for the ending:
- Victory panel parallel to the loss screen.
- Title: `Proof Recovered` or `The Drowned Architects`.
- Summary: max depth, biomes charted, species/flora scanned, credits/ore recovered, final proof status.
- Actions: `Continue Survey` and `New Expedition`.

## Implementation Hooks

Likely files:
- `src/types.ts`: add story types and optional quest fields.
- `src/state.ts`: initialize `state.story`.
- `src/save-load.ts`: persist/restore story with migration defaults.
- `src/helpers.ts`: story quest table, story progress helpers, named scan progress source, charting/story gate helpers.
- `src/hud.ts`: objective panel, quest board story row, finale/victory panel, radio copy.
- `src/scene-economy.ts`: travel and quest claim hooks, story milestone advancement.
- `src/scene-entities.ts`: final Crownmaw scan should set proof flag, not only `won`.
- `src/scene.ts`: post-proof return/docking detection and ending transition.
- `src/scene-playtest.ts`: deterministic hooks for story/final completion smoke.

Test/smoke targets:
- `npm run water9:progression-tuning-smoke`
- `npm run water9:progression-measurement`
- `npm run water9:forward-outpost-smoke`
- New final completion smoke: B4 Crownmaw scan -> proof flag -> return/uplink -> victory panel.
- Save/load smoke extension for story progress and won/continue behavior.

## Minimal First Implementation Slice

Do not implement the full authored arc first. Start with the end-state closure because it fixes the biggest player-facing gap and gives us a testable finish line.

Slice 1: **Final Proof And Victory Panel**

Scope:
- Add durable story fields for `finalProofRecovered`, `endingSeen`, and `heardRadio` with save/load migration.
- Change Crownmaw scan in B4 from immediate hard stop to "proof recovered" state.
- Add objective copy: "Return to the barge with proof" after scan.
- On docking with proof in B4, set `state.won = true`, unlock final achievement, and show victory panel.
- Add victory UI with Continue Survey and New Expedition.
- Add deterministic playtest/smoke coverage.

Acceptance:
- Existing B4 scan still recognizes Crownmaw at final depth.
- The player sees an objective after scan instead of silent freeze.
- Returning to barge triggers finale radio/panel.
- Won save/load behavior is intentional and tested.
- Existing progression/outpost smokes still pass.

Slice 2: **Pinned Story Quest Backbone**

Scope:
- Add static story quest definitions for the four biome milestones.
- Show a pinned story objective in HUD.
- Mark story milestones on charting completion and route travel.
- Persist completed milestones.

Slice 3: **B3 Expedition Midpoint**

Scope:
- Promote Forward Air Pocket and Gulper Wake into required or strongly guided story beats.
- Keep optional contracts separate.
- Tune Marlin voucher/sub messaging as the preparation for Ancient Ruins.

Slice 4: **B1/B2 Narrative Polish**

Scope:
- Add first-signal and vent-proof radio beats.
- Add clearer travel-card copy tying charting to the drowned-architect trail.
- Keep mechanics mostly unchanged.

## Suggested Next Worker Prompt

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement the first Water9 game-loop closure slice: final proof recovery and a real victory panel, without building the full multi-biome story chain yet.

Use `/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07/game-loop-closure-proposal.md` as the design source. Preserve unrelated dirty state. There are existing dirty files from other lanes; inspect before editing and do not revert unrelated changes.

Scope:
- Add minimal durable story/finale state for `finalProofRecovered`, `endingSeen`, and `heardRadio` or the smallest equivalent.
- Persist/restore it in save/load with old-save defaults.
- Change B4 Crownmaw scan at `TARGET_DEPTH` from immediate hard stop to proof recovered/objective update.
- Trigger actual win when the player returns to/docks at the barge with proof.
- Add a victory panel parallel to the existing loss UI with clear final text and actions for Continue Survey and New Expedition.
- Add final achievement/radio/status copy using existing UI systems where possible.
- Add or extend deterministic playtest/smoke coverage for Crownmaw proof -> return -> victory UI and save/load of final state.

Verification:
- `npm run build`
- `npm run water9:progression-tuning-smoke`
- `npm run water9:biome-creature-balance-smoke`
- New/updated final completion smoke
- If visual UI changed, capture normal `#game canvas`/DOM proof of the victory panel on a port in 5180-5199.

Safety:
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- Do not touch Telegram bindings, gateway config, systemd, cron, or external integrations.

Return:
- Status
- HEAD observed from preflight
- Commit hash if committed
- Changed files
- Verification output
- Proof paths
- Caveats/blockers
