# Water9 Tool Radial Audit

Date: 2026-07-07
Preflight HEAD: `8a04ef5`
Lane: read-only research; source/gameplay files not edited.

## Executive Recommendation

Use a staged hybrid, not a pure radial-only redesign:

1. First introduce an explicit `selectedTool` / `unlockedTools` state and make `Space` / gamepad `A` / right trigger the primary selected-tool action. Default selected tool is `drill`, preserving today's feel.
2. Add keyboard number quick-select (`1` drill, `2` scanner, `3` sampler, `4` sonar, `5` flare/light, later `6` stun, `7` charge/TNT, `8` repair/supply`) plus a compact HUD tool strip.
3. Add hold-to-open tool wheel once the state is stable: keyboard `LeftShift` or `T` as the least disruptive binding; controller hold `LB` as wheel, tap `LB` remains sonar/ping. Release selects, `B`/Esc cancels. Do not put the wheel on `Space`, because `Space` is already primary action, menu confirm, and barge dive.

This keeps the current mining loop intact while making the progression loop depend on "what did you bring/unlock/select?" instead of every nearby target going through mining/scanning or cargo item use.

## Current Input And Action Map

Evidence:

- `src/scene.ts:132-134` initializes cursor keys and `W,A,S,D,E,F,G,H,M,Q,L,P,ESC,SPACE,R,ENTER`, then installs gamepad events.
- `src/scene.ts:497-555` builds `ControlState` from keyboard, Phaser gamepad, and browser Gamepad API.
- `src/types.ts:816-831` defines the current input abstraction: movement plus booleans for mine, scan, board, scout, sonar, sonar map, use item, pause, cancel, logbook, confirm.
- `src/hud.ts:511-591` adds DOM-level shortcuts for Tab cargo overlay, cargo navigation, menu activation, space-to-dive, `M` sonar map, Esc sonar-map close, and `G` item use.
- `src/hud.ts:300-313` title-screen controls copy exposes the controller/keyboard mappings.
- `README.md:37` still documents the older minimal controls: movement, mouse/Space mining, hold E scan, R restart.

Current gameplay bindings:

| Input | Current action | Evidence |
| --- | --- | --- |
| WASD / arrows / left stick / d-pad | Swim or menu/map/cargo navigation depending UI state | `src/scene.ts:527-533`, `src/hud.ts:529-540`, `src/scene.ts:758-779`, `src/hud.ts:854-929` |
| Mouse down | Mine/cut at pointer world position | `src/scene.ts:933-934` |
| Space / gamepad A / right trigger | Hold mine/cut; also confirm/start/dive in UI states | `src/scene.ts:539-550`, `src/scene.ts:254-268`, `src/scene.ts:933-938`, `src/hud.ts:541-563` |
| E / gamepad X | Hold scanner on nearest life target | `src/scene.ts:540`, `src/scene.ts:938`, `src/scene-entities.ts:1143-1183` |
| F / gamepad B | Hold/press board or forward outpost; cancel/close in menus | `src/scene.ts:541-548`, `src/scene-sub.ts:189-217`, `src/scene.ts:930-932`, `src/scene-economy.ts:208-250` |
| H / left-stick press | Deploy scout from tier-3 carrier sub | `src/scene.ts:543`, `src/scene-sub.ts:178`, `src/scene-sub.ts:91-105` |
| Q / LB / left trigger | Sonar ping | `src/scene.ts:544`, `src/scene.ts:924-926`, `src/scene-sonar.ts:9-58` |
| M / View | Sonar map overlay | `src/scene.ts:545`, `src/scene.ts:719-735`, `src/hud.ts:564-585` |
| G / RB | Use selected cargo item; in tier-3 sub, fires sub weapon if item use fails | `src/scene.ts:546`, `src/scene.ts:927-929`, `src/scene-sub.ts:180-182`, `src/scene-combat.ts:850-880`, `src/hud.ts:586-591` |
| L / Y | Logbook | `src/scene.ts:549`, `src/scene.ts:274-276`, `src/hud.ts:410-419` |
| Esc/P/Start | Pause or close overlays | `src/scene.ts:547-548`, `src/scene.ts:719-755`, `src/scene.ts:277-286` |
| Tab | Hold cargo overlay; arrow/WASD changes selected cargo slot | `src/hud.ts:511-540`, `src/hud.ts:1580-1618` |

Controller specifics:

- `readControls()` tracks held and just-pressed buttons through `gamepadButtonsDown` (`src/scene.ts:503-516`, `src/scene.ts:552-555`).
- Standard gamepad assumptions are A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, View=8, Start=9, left-stick press=10 (`src/scene.ts:536-550`).
- Analog triggers are normalized for non-standard pads too (`src/scene.ts:706-716`).
- Controller diagnostics exist in state but are intentionally hidden in HUD outside debug (`src/state.ts:92-111`, `src/hud.ts:128-167`, `src/hud.ts:64-66`).

## Current Interaction Flow

Mining / cutter:

- `updatePlayer()` calls `mineAt()` on pointer hold or `mineHeld` (`src/scene.ts:933-937`).
- `mineAt()` points the diver, checks nest targets, life targets, then terrain (`src/scene-combat.ts:59-112`).
- The same mining action currently cuts nest eggs/larvae (`src/scene-combat.ts:206-243`), damages fish/flora/articulated creatures (`src/scene-combat.ts:245-286`), and mines terrain/ore (`src/scene-combat.ts:370-514`).
- Mining consumes fuel and oxygen, uses `player.mineCooldown`, and sets `drillingThisFrame` for visual/audio feedback (`src/scene-combat.ts:77-111`).

Scanning:

- `scanNearbyLife()` is a hold action over nearest fish/flora/articulated target in range (`src/scene-entities.ts:1143-1197`).
- Scan progress increases by scanner upgrade, can agitate fish and articulated creatures, then sets `target.scanned`, adds species to `state.scannedSpecies`, pays credits, drives apex/biome charting status, and updates HUD (`src/scene-entities.ts:1151-1182`).
- Scan rewards are rarity/danger/scanner-upgrade based (`src/helpers.ts:2581-2595`).
- Flora is already in the scanner target list (`src/scene-entities.ts:1188`) and update loop (`src/scene-entities.ts:328-351`), including hazardous contact damage.

Sonar:

- `sonarPing()` is an immediate active ability with fuel cost, cooldown, map reveal, contacts capture, predator attraction, and status copy (`src/scene-sonar.ts:9-58`).
- Passive sonar reveal also runs every 0.18s while diving (`src/scene.ts:782-788`).
- Contacts include barge, fish, predators, and flora (`src/scene-sonar.ts:60-86`).

Inventory / item use:

- Cargo is a single array plus `selectedCargoIndex` (`src/state.ts:13-14`, `src/types.ts:684-691`).
- Shop items include consumables and one reusable tool-like cargo item, `injector-knife` (`src/content.ts:73-139`).
- `useSelectedItem()` drops non-consumables, dispatches consumables, and only has special tool behavior for `injector-knife` (`src/scene-combat.ts:850-880`).
- Flares and dynamite are currently consumable cargo items thrown via item use, not selected tools (`src/scene-combat.ts:624-711`).
- Oxygen tank, fuel tank, first aid, and antivenom are immediate selected-item consumables (`src/scene-combat.ts:778-848`).

Quests and progression:

- Quest kinds are depth, scan, ore, nest, gulperSurvey, forwardOutpost (`src/types.ts:34`, `src/types.ts:858-873`).
- Scan contracts currently count `state.scannedSpecies.size`, not samples (`src/helpers.ts:140-145`).
- Forward outpost is already a special action on `F`, gated by Biome 3, depth, nearby non-hazardous flora, and terrain support (`src/scene-economy.ts:208-250`).
- Current objective copy explicitly teaches Space as cut and E as scan (`src/hud.ts:179-201`), and opening radio says scans cover fauna and flora (`src/hud.ts:330-362`).

HUD / modal hosts:

- The HUD is DOM/CSS over the Phaser canvas with fixed overlays created in `renderHud()` (`src/hud.ts:12-33`).
- Existing full-screen/modal patterns: title, pause menu, logbook, sonar map, radio dialogue, biome loading (`src/hud.ts:100-110`, `src/hud.ts:1198-1215`).
- Existing compact in-dive affordances: objective panel, meters, selected item chip, cargo manifest, sub hatch chip, sonar panel (`src/hud.ts:115-125`, `src/hud.ts:1546-1572`, `src/hud.ts:1580-1618`, `src/hud.ts:1111-1137`).
- Cargo grid styling is already a good pattern for a quickbar/tool strip (`src/styles.css:737-918`).

Save/load:

- Save schema is `water9.save.v1` / version 1 (`src/save-load.ts:10-11`).
- Saved state currently includes cargo, selected cargo slot, sonar reveal, scanned species, upgrades, achievements, quests, forward outpost, sub ownership/active state, win/loss/start/dock flags (`src/save-load.ts:49-100`, `src/save-load.ts:201-248`).
- Load restores those fields, resets transient overlays, cooldowns, scan target, sonar contacts, venom/bleed, and player action cooldowns (`src/save-load.ts:281-330`, `src/save-load.ts:379-391`).
- Adding selected tools requires either a schema bump or backward-compatible optional fields with defaults.

Tests / smokes:

- `package.json:25-33` exposes relevant smokes: save/load, ux feedback, sonar-map-controller, progression tuning, flora scannability.
- `tools/test_sonar_map_controller_smoke.mjs:76-92` mocks browser Gamepad state, then exercises controller movement, sonar, scanning, mining, sonar map, and sub actions.
- That smoke asserts X scans, RT mines, LB sonar, RB item/sub action, B boarding, View/M sonar map, and controller map pan/zoom (`tools/test_sonar_map_controller_smoke.mjs:263-293`).
- `tools/test_save_load_smoke.mjs:89-147` verifies save/load round trip for credits, biome, selected sub tier, cargo capacity, and position.
- `tools/test_flora_scannability_audit.mjs:53-78` statically checks that flora remains scannable and decorative terrain flora is not treated as gameplay flora.

## Proposed Tool Taxonomy

Core selected tools:

- `drill`: the current cutter/mining behavior. Primary terrain/ore tool; can still cut nests if design keeps emergency nest removal here. Unlock/upgrade from current `laser` upgrade path.
- `scanner`: non-invasive catalog scan. Should identify fauna/flora, fill logbook, pay credits, and drive charting/scan quests. Keep current E/X direct scan as an accessibility/legacy shortcut during transition.
- `sampler`: flora-focused extraction tool. See mechanics below. This should be separate from scanner and drill.
- `sonar-ping`: active mapping pulse. Keep tap Q/LB as direct ping; optionally let it be selected for Space/A action after radial work.
- `flare-light`: deploys flare/light. Today this is a consumable cargo item; it can become a selected utility with charges tied to cargo or tool ammo.
- `stun-grenade`: predator emergency utility. Today item use triggers a pulse around the player; as a selected tool, it should be an aimed/held utility or panic pulse with charges.
- `tnt-charge`: currently dynamite as thrown item. As a tool, it should be place/throw charge with fuse and charges.
- `repair-supply`: not a terrain tool, but a quick-select family for oxygen tank/fuel tank/first aid/antivenom. Keep them in cargo, but allow the quickbar/radial to surface "best relevant supply" without overloading drill/scanner.

Progression-oriented states:

- `selectedTool: ToolId` with default `drill`.
- `unlockedTools: Record<ToolId, boolean>` or `Set<ToolId>`, initially drill/scanner/sonar, sampler unlocked by early biology objective.
- `toolCharges` for flare/stun/charge/sampler vials if they are not simple cargo item counts.
- `toolCooldowns` for drill/scanner/sampler/sonar/grenade/charge.
- `tutorialFlags` / objective copy state for first radial open, first sample, first utility use.
- Optional `quickbar: ToolId[]` for remappable slots once the default strip exists.

## Flora Sampling Should Differ From Scanning And Mining

Scanning should answer "what is it?" Sampling should answer "what can we bring back from it?"

Recommended sampler mechanics:

- Target only eligible flora, not all life. Scanner can identify fauna/flora; sampler extracts from anchored flora specimens.
- Require close range and a steadier channel than scan, ideally `hold primary action while sampler selected` within ~28-40 px plus line-of-sight/anchor facing. Do not use nearest-any-life targeting.
- Do not award immediate generic scan credits. Instead create a `sample` result: cargo item, lab token, quest progress, outpost charge ingredient, or biome research material.
- Sampling should not normally kill flora. It should put the flora on a per-specimen cooldown/harvested flag, reduce sample quality if rushed, and maybe damage/hazard the player if sampling hazardous flora without scanner identification or upgraded suit.
- Scanning a flora first should reveal sample value/risk and improve sample quality; sampling unscanned flora should be possible but risky/low-yield.
- Mining/cutter on flora remains destructive defense with no biology reward, making "sample vs cut" a real choice.
- Quest loop: early "sample 2 oxygen flora" or "bring one hazardous tissue sample" should unlock/upgrade outpost/supply recipes, while scan contracts remain catalog breadth.

Data implication: `scannedSpecies` is species-level. Sampling probably needs instance-level or species-level sample state such as `sampledSpecies`, `sampleInventory`, and/or per-Flora `sampled`, `sampleCooldown`, `sampleQuality` transient runtime fields. If per-instance sample cooldown must survive save/load, flora identity persistence becomes a larger world-state problem; prefer species/sample inventory persistence for the first slice.

## Implementation Slices

Slice 1: tool state and no-regression dispatch

- Add `ToolId` type and state fields: `selectedTool`, `unlockedTools`, `toolCooldowns` defaults.
- Refactor `ControlState` to separate `primaryHeld`, `primaryPressed`, direct legacy inputs, and UI confirm. Keep `mineHeld` as derived from selected drill for compatibility during transition.
- Make `Space/A/RT` call `useSelectedToolPrimary()` during active dive only. It dispatches drill to existing `mineAt`, scanner to existing `scanNearbyLife`, sonar to `sonarPing`, sampler to a stub/status until implemented.
- Leave E scanner, Q sonar, G cargo item use working as legacy shortcuts so smokes and current players do not break.

Slice 2: quickbar HUD

- Add a compact in-dive `toolStrip()` beside or replacing selected item chip, using existing cargo-slot visual language.
- Number keys select tools; mouse/touch click selects; disabled/unlocked states visible.
- Update title controls, pause controls, current objective copy, and opening radio copy.
- Extend playtest snapshot with selected tool/unlocked tools for test assertions.

Slice 3: sampler MVP

- Add `sampler` unlock and primary behavior. Implement nearest eligible flora targeting separately from `nearestLife`.
- Add sample rewards: likely `state.sampledSpecies` plus optional cargo `flora-sample` items. For first slice, avoid per-Flora save persistence unless required.
- Add one biology/outpost objective that requires samples rather than scans.
- Add visual feedback: sample beam/probe distinct from scan ring and drill sparks.

Slice 4: radial/wheel

- Keyboard: hold `LeftShift` or `T` opens radial; mouse/stick direction highlights; release selects; Esc cancels.
- Controller: tap `LB` still sonar; hold `LB` past threshold opens wheel; left stick chooses; release selects. Consider `RB` as "utility quick-use" until the wheel exists.
- Touch/mobile: persistent tool strip with large hit targets is more reliable than a press-and-hold radial; add radial later as optional long-press.

Slice 5: utility consolidation

- Move flare/stun/dynamite to selected utility tools backed by cargo counts/charges.
- Decide whether supplies stay cargo-only or get quickbar aliases.
- Make sub-specific tool set: Seeker scanner/sampler/sonar, Marlin drill, Leviathan weapon/utility, with unavailable tools disabled and explained.

## Test Plan

Static/unit-like:

- Add a tool state migration/check smoke similar to `water9:progression-tuning-smoke` that asserts `ToolId` defaults, HUD labels, title controls, and save fields exist.
- Extend `water9:flora-scannability-audit` so sampler code cannot accidentally classify decorative terrain flora as gameplay samples.
- Add typecheck/build: `npm run build` or `npx tsc --noEmit --pretty false`.

Playwright/controller:

- Extend `tools/test_sonar_map_controller_smoke.mjs` because it already mocks Gamepad and asserts scan/mine/sonar. New assertions: default selected tool is drill, RT mines; select scanner by number/wheel then A/RT scans; tap LB still sonar; hold LB opens/closes wheel without firing sonar; RB still uses cargo or utility.
- Add keyboard quickbar smoke: press `2`, hold Space near flora/fauna to scan; press `1`, hold Space near terrain to mine; press Q still pings; press G still uses selected cargo.
- Add sampler smoke: playtest teleport to eligible flora, select sampler, hold primary, verify `sampledSpecies`/sample cargo/quest progress changes while `scannedSpecies` does not change unless scanner was used.
- Add save/load smoke extension: selected tool, unlocked tools, charges, sample state, and cooldowns round-trip or intentionally reset with documented defaults.
- Add mobile/touch viewport smoke if tool strip is implemented: tool buttons selectable at 360-430 px wide without overlapping meters/cargo/objective.

Manual visual acceptance:

- Capture normal play canvas/HUD at surface/mid/deep with tool strip/radial open and closed.
- Verify radial does not occlude immediate threats too much; if it pauses/slows time, confirm this is intentional.
- Verify grayscale/readability for selected tool, cooldown, charges, locked state.

## Risks And Watchpoints

- `Space` is overloaded. It currently confirms menus/radio/title, starts/dive-from-barge, and mines. Tool-primary dispatch must only run during active, unpaused, non-modal dive (`src/scene.ts:240-359`, `src/hud.ts:541-563`).
- Gamepad `A` is also confirm and mine. A selected-tool model must keep UI/menu paths ahead of active-dive paths or controller menus will regress.
- `mineAt()` is a broad context action. It mines terrain, cuts nests, and damages life. Splitting tool behavior later may reveal hidden dependencies where "drill" was being used as emergency weapon and nest cleanup.
- Scanner currently targets nearest life across fish/flora/articulated. A sampler must not reuse `nearestLife()` blindly or it will sample fauna/predators/articulated by accident.
- Cargo item use and selected tools are separate concepts today. Flares, dynamite, stun grenades, and supplies live in cargo; making them tools needs clear charge/count ownership to avoid duplicating or consuming items twice.
- Save schema v1 lacks tool fields. Backward-compatible defaults are easy; persisting per-instance sampled flora is hard unless flora objects get stable IDs saved with the world.
- Controller hold-vs-tap on LB can delay sonar. Pick a threshold and test accidental pings carefully. A first release can ship quickbar without wheel to avoid this.
- Cargo overlay uses Tab hold and movement keys. Avoid making Tab the tool wheel unless cargo inventory is redesigned at the same time.
- Sub restrictions matter: Seeker currently "scanners only" and tier <2 cannot mine from sub (`src/scene-combat.ts:59-64`, `src/content.ts:34-70`). Tool UI must show unavailable tools when piloting different subs.
- Current tests assume RT mines and X scans. Keep legacy bindings until replacement smokes prove the new selected-tool action.

## Caveats

This audit did not run the smokes; it is based on source inspection only. The worktree was already dirty before this report, so any implementation lane should re-check current diffs before editing shared files.
