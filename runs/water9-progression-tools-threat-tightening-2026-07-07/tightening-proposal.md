# Water9 Progression / Tools / Threat Tightening Proposal

Preflight/audit HEAD: `8a04ef5`

Source reports:
- `threat-combat-audit.md`
- `tool-radial-audit.md`
- `progression-loop-audit.md`
- prior context: `../water9-game-loop-closure-analysis-2026-07-07/game-loop-closure-proposal.md`

## Verdict

Alex's playtest read is accurate: the current loop works, but it leans too hard on repeated contract accounting. The stronger Water9 shape is already visible underneath it: dive preparation, proof gathering, hazard management, and retreat under pressure.

Recommendation:

1. Keep the dive / sell / upgrade cadence as the economic backbone.
2. Add a persistent pinned expedition objective layer above optional contracts.
3. Make large articulated fauna expedition constraints, not drill-killable enemies.
4. Move from "space bar equals drill" toward a selected-tool model: drill, scanner, sampler, sonar, flare/light, stun, charge/TNT.
5. Implement the final proof / victory panel first, because it defines what the whole loop is building toward.

## Current Problems

- Contracts are mostly generated counters: depth, scan count, ore sold, nest bounty, plus a few rare B3 entries. They provide income, but not enough journey.
- Only one quest can be accepted, so authored progression beats compete with money contracts.
- Biome travel clears local scan/sonar/quest state, which makes each biome feel like a reset.
- B3 has the best current authored shape: Forward Air Pocket, Gulper Wake Survey, Marlin discount, large articulated threats.
- B4 promises "escape with proof" in copy, but scanning Crownmaw currently ends immediately underwater.
- The drill/cutter can currently damage articulated creatures through the generic life-damage path, so large fauna can be beaten down by persistence.
- Dynamite can already damage articulated creatures. Because it is far cheaper than stun grenades, it needs special rules before it becomes the intended large-threat kill route.
- Input is overloaded: Space/A/RT currently mine/cut, while E scans, Q sonar-pings, G uses selected cargo, and cargo items handle flares/stun/dynamite.

## Large Threat Rule

Large articulated fauna should not be killable with the mining drill.

Preferred rule:

- Drill/cutter: no HP damage to large articulated fauna. It may produce a recoil, spark, stagger, weak-point flinch, or grab-release feedback if needed.
- Stun grenade: normal defensive answer. It buys an escape/scan window and releases grabs.
- Scanner: primary "win" interaction against giants. Scan proof should pay well and advance story/apex objectives.
- TNT/depth charges: optional special kill route only if explicitly designed. Do not rely on the current generic dynamite damage. If approved, require multiple close blasts, stronger feedback, and economy tuning.

Best first implementation: cutter immunity for large articulated threats, with status copy like "The cutter skates off armored hide. Stun it and run the route." Defer TNT kill rules until the tension loop is proven.

## Tool Model

Use a staged hybrid instead of a pure radial rewrite.

Stage 1:
- Add `selectedTool` and `unlockedTools`.
- Default selected tool: drill.
- Space / gamepad A / right trigger becomes primary selected-tool action during active diving.
- Keep current direct shortcuts during transition: E scan, Q sonar, G cargo item, mouse drill.
- Add number-key quick select and compact HUD tool strip.

Stage 2:
- Add sampler as a real tool.
- Scanner answers "what is it?"
- Sampler answers "what can we bring back from it?"
- Sampler should target eligible flora only, at close range, with sample rewards or story progress instead of generic scan credits.

Stage 3:
- Add hold-to-open radial/wheel once selected-tool state is stable.
- Keyboard: hold T or Left Shift, release to select.
- Controller: hold LB for wheel, tap LB remains sonar.
- Touch/mobile: keep a visible tool strip first; radial can come later.

Suggested tool taxonomy:
- Drill: ore/terrain/nest cleanup, not giant killing.
- Scanner: catalog/proof/apex scans.
- Sampler: flora samples, biology quests, outpost ingredients.
- Sonar: route reveal and vault/biome charting.
- Flare/light: visibility and threat readability.
- Stun grenade: emergency space/escape.
- TNT/charge: terrain blasting first; later special large-threat charge if approved.
- Repair/supply: quick-use aliases for oxygen/fuel/first aid/antivenom, still backed by cargo.

## Tighter Biome Progression

Keep optional board contracts as money/risk variety. Add one pinned expedition milestone per biome that persists across travel and does not occupy the one active quest slot.

### B1: Survey License / First Signal

Goal: teach scanning, mining, sonar, and return-to-barge as expedition charting.

Milestone:
- Scan 2 fauna and 1 flora.
- Reach the B1 charting depth band.
- Pulse sonar enough to reveal the first route anomaly.
- Return to the barge to convert survey data into the B2 route.

Tool beat: scanner as proof instrument.

Threat beat: learn "scan at risk, do not fight everything."

### B2: Vent Chemistry / Gulper Route Proof

Goal: make B2 feel like crossing an active barrier, not just saving 15000c.

Milestone:
- Sample/scan safe vent flora and hazardous vent flora.
- Scan Gulper Eel as route proof.
- Use sonar in vent lanes.
- Return for radio: vent chemistry matches the drowned-architect signal.

Tool beat: thermal plating and sampler relevance.

Threat beat: stun grenades become recommended emergency gear.

### B3: Forward Pocket / Deep Predator Preparation

Goal: make B3 the expedition midpoint.

Milestone:
- Establish Forward Air Pocket below 900m beside solid terrain and non-hazardous flora.
- Complete Gulper Wake Survey or authored predator-lane proof.
- Scan Abyssal Serpent.
- Return to unlock/discount Marlin preparation for B4.

Tool beat: sampler becomes functional, because correct flora enables outpost/refuge.

Threat beat: large articulated fauna are proof targets and route pressure, not drill enemies.

### B4: Reliquary Vault / Final Proof

Goal: make the final biome a destination and conclusion.

Milestone:
- Enter Ancient Ruins and receive finale radio.
- Use sonar to reveal/follow the Reliquary Vault route.
- Sample/scan one ruins flora clue.
- Scan Crownmaw at final depth.
- Set `finalProofRecovered`.
- Return to barge or complete explicit uplink.
- Show victory panel and run summary.

Tool beat: scanner proves the journey; stun/flare/Marlin help survival.

Threat beat: Crownmaw is a moving constraint. The win is proof and extraction, not DPS.

## Implementation Order

1. Final proof and victory panel.
   - Change B4 Crownmaw scan from immediate `won` to `finalProofRecovered`.
   - Objective becomes "Return to the barge with proof."
   - Docking/uplink triggers finale radio, `won`, ending state, victory panel, Continue Survey / New Expedition.
   - Add save/load defaults and final-completion smoke.

2. Large-threat drill immunity.
   - Add large-threat classifier for B3+ epic/legendary articulated fauna.
   - Gate cutter/drill damage so it cannot reduce large-threat HP.
   - Keep stun/grab release working.
   - Add smoke: cutter no HP loss, stun works, normal fish still cutter-killable.

3. Selected tool state plus quickbar.
   - Add selected/unlocked tool state.
   - Preserve existing bindings.
   - Add HUD strip and number select.
   - Extend controller/input smokes.

4. Sampler MVP and B1/B2/B3 objective hooks.
   - Flora-only sampler.
   - Species/sample progress or sample cargo.
   - Use it for B1 baseline, B2 vent chemistry, B3 outpost ecology.

5. Pinned expedition objective backbone.
   - Static B1-B4 milestone definitions.
   - Persist completed milestones.
   - Show pinned story objective above optional contracts.
   - Keep contract board optional.

6. Radial/wheel polish.
   - Hold-to-open wheel after tool state and quickbar are proven.
   - Add controller hold LB behavior carefully so tap sonar does not regress.

7. TNT/depth-charge decision.
   - If large-threat kills are desired, introduce special multi-charge rules and feedback.
   - Otherwise keep TNT as terrain/mining utility and stun as escape.

## Likely Files

- `src/types.ts`: story/tool/large-threat state types.
- `src/state.ts`: defaults.
- `src/save-load.ts`: migrations/defaults.
- `src/scene-combat.ts`: selected tool dispatch, cutter immunity, stun/TNT rules, sampler behavior.
- `src/scene-entities.ts`: Crownmaw proof scan, scanner/sampler target logic.
- `src/scene-articulated.ts`: large-threat damage gates or helper usage.
- `src/helpers.ts`: story milestones, quest/progression helpers, scan/sample reward logic.
- `src/hud.ts`: pinned objective, tool strip/radial, victory panel, copy.
- `src/scene-economy.ts`: docking/finale trigger, travel milestone hooks.
- `src/scene-playtest.ts`: deterministic story/tool/combat hooks.
- `tools/test_sonar_map_controller_smoke.mjs`: controller/tool input coverage.
- `tools/test_progression_tuning_smoke.mjs`: story/progression assertions.
- new final-completion and large-threat combat smokes as needed.

## Verification Targets

- `npm run build`
- `npm run water9:progression-tuning-smoke`
- `npm run water9:forward-outpost-smoke`
- `npm run water9:biome-creature-balance-smoke`
- Extended controller/input smoke for quickbar/radial.
- New final-completion smoke: Crownmaw scan -> proof -> return/uplink -> victory panel.
- New large-threat combat smoke: cutter no HP loss, stun works, TNT behavior matches chosen rule.
- If UI changes, capture normal runtime canvas/HUD proof on ports 5180-5199.

## First Worker Prompt

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement the first Water9 progression-tightening slice: final proof recovery and real victory panel, without building the full radial/tool system yet.

Use these design sources:
- `/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07/game-loop-closure-proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tightening-proposal.md`

Preserve unrelated dirty state. There are existing dirty files from other lanes; inspect before editing and do not revert unrelated changes.

Scope:
- Add minimal durable finale/story fields for `finalProofRecovered`, `endingSeen`, and any needed radio/finale flags.
- Persist/restore them with old-save defaults.
- Change B4 Crownmaw scan at `TARGET_DEPTH` from immediate hard stop to proof recovered/objective update.
- Trigger actual win when the player docks at the barge with proof, or implement a clearly named uplink trigger if return-to-barge is not practical in the existing scene loop.
- Add victory UI parallel to loss/menu patterns with clear final copy and actions: Continue Survey and New Expedition.
- Add final achievement/radio/status copy using existing UI systems where possible.
- Add/extend deterministic smoke coverage for Crownmaw proof -> return/uplink -> victory UI and save/load of final state.

Out of scope:
- Do not add radial menu or tool quickbar in this slice.
- Do not change large-threat damage rules yet.
- Do not rebalance economy.
- Do not replace the contract board.

Verification:
- `npm run build`
- `npm run water9:progression-tuning-smoke`
- `npm run water9:biome-creature-balance-smoke`
- new/updated final completion smoke
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
