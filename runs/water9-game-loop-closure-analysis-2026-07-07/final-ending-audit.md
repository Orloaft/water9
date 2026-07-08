# Water9 Final Biome / Ending Audit

## Verdict

Ending exists, but only as a partial hard stop. Scanning the final apex at depth sets `state.won = true` and changes the status text; there is no victory/credits screen, finale radio, achievement, return-to-barge beat, or post-finale free play. Player-facing consequence: the run freezes into a win state immediately after the Crownmaw scan, with only the HUD status line explaining that proof was found.

## Current Final-Biome Completion Path

- The final biome is biome 4, named `Ancient Ruins` by `biomeName()` (`src/hud.ts:1533-1537`).
- The final apex scan target is `Abyssal Crownmaw`: `currentApexSpecies()` maps biome 4 to that species (`src/helpers.ts:2718-2723`).
- `Abyssal Crownmaw` is an articulated creature, not a normal `biomeFish` entry. The generated manifest gives it `id: "abyssal-crownmaw"`, `species: "Abyssal Crownmaw"`, `minBiome: 4`, `rarity: "legendary"`, `hp: 490`, and spawn depth `1650-2800` (`public/assets/generated/articulated-creatures.parts.json:1586-1600`).
- Articulated creatures are included in scan targeting: `nearestLife()` searches `this.fish`, `this.flora`, and `this.articulatedCreatures` (`src/scene-entities.ts:1185-1190`), and scanner contact with an articulated target raises aggro (`src/scene-entities.ts:1151-1159`).
- On scan completion, `scanNearbyLife()` sets the target scanned, records the species, pays scan reward credits, spawns floating text, and sets the normal catalog status (`src/scene-entities.ts:1160-1172`).
- Then it checks `target.species === currentApexSpecies()` and `state.depth >= TARGET_DEPTH`; `TARGET_DEPTH` is `1500` (`src/constants.ts:7`, `src/scene-entities.ts:1172-1174`).
- If the target is biome 4 apex at or below target depth, it sets `state.won = true` and `state.status = 'The ruin sentinel is cataloged. Humanity finally has proof of the drowned architects.'` (`src/scene-entities.ts:1174-1177`).
- For earlier-biome apex scans at depth, it only changes status to "`<biome> is charted. The barge has a route deeper still.`" (`src/scene-entities.ts:1177-1179`).
- The update loop treats `state.won` like `state.lost`: it stops normal simulation and accepts confirm/Enter to call `restart()` (`src/scene.ts:287-292`). `restart()` resets biome, credits, scans, subs, won/lost, and starts a new run (`src/helpers.ts:2984-3029`).

## What The Code Does Not Do

- No victory modal or credits screen: `renderGameOver()` only creates `#game-over` when `state.lost` is true, and removes/returns when `!state.lost`; it has no `state.won` branch (`src/hud.ts:243-268`).
- No final achievement: achievement plumbing exists (`unlockAchievement()` adds a title and toast at `src/hud.ts:478-506`), but the final scan branch does not call it (`src/scene-entities.ts:1174-1177`). The only nearby demonstrated achievement use is Unhardcore respawn (`src/scene.ts:1165-1169`).
- No finale radio: title/opening radio exists (`openingRadioMessages()` at `src/hud.ts:330-363`), and radio UI is suppressed when `state.won` is true (`src/hud.ts:47`, `src/scene.ts:260-265`).
- No return-to-barge objective: biome 4 barge copy promises "catalog the Crownmaw sentinel, and escape with proof" (`src/hud.ts:1367-1374`), but actual completion happens instantly on scan, before any escape or docking step.
- No next-biome travel: `canTravelToNextBiome()` explicitly requires `state.biome < 4` (`src/helpers.ts:2880-2882`), and `travelToNextBiome()` returns if `state.biome >= 4` (`src/scene-economy.ts:131-134`).
- No post-finale play: most controls and overlays require `!state.won`; examples include dive from barge (`src/scene-economy.ts:40-42`), global controller actions (`src/scene.ts:719-720`), passive sonar (`src/scene.ts:782-783`), cargo overlay (`src/hud.ts:454-456`), barge menu (`src/hud.ts:93-95`), pause/sonar overlays (`src/hud.ts:100-103`), and audio pauses on win (`src/scene-audio.ts:22`).
- Persistence stores the hard stop: save state includes `won` (`src/save-load.ts:55-80`), writes it (`src/save-load.ts:221-233`), and restores it (`src/save-load.ts:309-310`). Loading a won save should resume into the same blocked win state.

## Existing Ending-Adjacent Content

- Biome 4 is framed as `Ancient Ruins` (`src/hud.ts:1533-1537`) with a final travel card mentioning the Reliquary Vault Route, Crownmaw sentinel, escape, and proof of drowned architects (`src/hud.ts:1367-1374`).
- The final scan status line is the strongest ending text: "The ruin sentinel is cataloged. Humanity finally has proof of the drowned architects." (`src/scene-entities.ts:1174-1177`).
- There is a loss screen (`src/hud.ts:243-268`), title screen panels limited to `main`, `options`, and `controls` (`src/types.ts:32`, `src/hud.ts:274-327`), opening radio lines (`src/hud.ts:330-363`), and achievement-toast infrastructure (`src/hud.ts:478-506`).
- I found no dedicated credits/finale screen, final radio sequence, victory achievement, ending save marker beyond `won`, or post-ending summary UI.

## Implementation vs Player Perception

Current implementation defines "finish the final biome" as: scan `Abyssal Crownmaw` while `state.depth >= 1500`; the scan reward is granted, the one-line status changes, and `state.won` freezes normal play.

A player would likely perceive this as abrupt or ambiguous. The barge text says to escape with proof, but the game ends immediately underwater. There is no special modal, no log/achievement confirmation, no return trip, no credits, and no clear choice between "continue exploring" and "restart." If the status line is missed, the main visible effect is that controls stop responding except restart.

One edge case: the win branch only runs inside the first-time scan block (`!state.scannedSpecies.has(target.species)`) and requires current `state.depth >= TARGET_DEPTH` (`src/scene-entities.ts:1165-1177`). Crownmaw normally spawns at 1650m+ (`public/assets/generated/articulated-creatures.parts.json:1597-1600`), but if a future spawn/review path allows an above-1500 scan, that species would be recorded without setting `won`, and rescanning later would not retrigger.

## Gap Analysis

- State: `won` exists and is persisted, but there is no separate `endingSeen`, `finalProofRecovered`, `postGameUnlocked`, or finale stage.
- UI: loss has a modal; victory has no equivalent. Barge/travel UI closes under `state.won`, so there is no finale action surface.
- Rewards: final scan gets the generic scan reward only; no final achievement, bonus payout, logbook completion, unlock, or credits roll.
- Narrative: final barge copy and final status text exist, but no radio response or concluding sequence.
- Post-ending behavior: the game effectively ends immediately; confirm restarts from biome 1 via `restart()`.
- Tests: existing smoke covers Crownmaw presence and balance (`tools/test_biome_creature_balance.mjs:59-63`) but not final scan -> `won`, victory UI, save/load of won state, or post-win control behavior.

## Recommended Definition Of Finished

For Water9, define final completion as:

1. Player scans `Abyssal Crownmaw` in `Ancient Ruins` at/after the final depth gate.
2. Game records durable completion: `won = true`, final species scanned, finale achievement unlocked, and optional `endingSeen/finalProofRecovered` marker persisted.
3. Player gets an unmistakable victory presentation: full-screen "Proof Recovered" or "Ancient Ruins Charted" panel with max depth, scans, credits/ore, and restart/continue choices.
4. The fantasy resolves the promise in the barge card: either require escape/return to barge after scan, or change the barge copy and finale to make immediate uplink extraction explicit.
5. Post-finale is intentional: choose one of "restart/new run only" or "continue exploring after credits." Do not leave controls frozen without a visible ending surface.

## Minimal Changes To Make It Satisfying

- Add a `state.won` branch to the current `renderGameOver()` pattern, or split it into `renderEndState()`, showing a victory panel instead of relying on the status line.
- In the final scan branch, call `unlockAchievement('Drowned Architects', 'Catalog the Crownmaw sentinel and recover proof from Ancient Ruins.')`.
- Add a final radio/message panel or short overlay text before the hard stop, or delay hard stop until the player docks after scanning Crownmaw.
- If immediate win remains, change biome 4 barge copy from "escape with proof" to "uplink proof from the Crownmaw sentinel" so implementation and objective copy match.
- Add a playtest command or test hook that can mark the Crownmaw scan complete at depth without manual keyboard scanning, so final completion can be verified deterministically.

## Verification Recommendations

- Add an npm smoke that starts `?playtest=1&biome=4`, stages/teleports to `abyssal-crownmaw`, simulates or directly invokes final scan completion at `state.depth >= 1500`, and asserts:
  - `snapshot().state.won === true` (`src/scene-playtest.ts:1976-1999` exposes `won`).
  - `snapshot().state.chartingProgress.apexScanned === true` and apex is `Abyssal Crownmaw` (`src/helpers.ts:2831-2878`).
  - victory UI exists and contains final stats once added.
  - `canTravelToNextBiome === false` in biome 4 (`src/scene-playtest.ts:1992-1993`, `src/helpers.ts:2880-2882`).
- Extend save/load smoke to save after a win and confirm the chosen expected behavior: either won save opens the victory panel, or loads into post-finale continue mode (`tools/test_save_load_smoke.mjs:89-147` covers existing save/load command shape).
- Keep `npm run water9:biome-creature-balance-smoke` as a guard that Crownmaw still exists and is biome 4 balanced; it currently asserts Crownmaw HP/damage and manifest presence (`tools/test_biome_creature_balance.mjs:59-63`).

## Commands Run

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `8a04ef5`
- `git status --short` to observe pre-existing dirty state
- Targeted `rg` and `nl -ba ... | sed -n ...` reads of `src/constants.ts`, `src/state.ts`, `src/types.ts`, `src/helpers.ts`, `src/hud.ts`, `src/scene.ts`, `src/scene-entities.ts`, `src/scene-economy.ts`, `src/content.ts`, `src/save-load.ts`, `src/scene-playtest.ts`, `src/scene-worldgen.ts`, `src/scene-articulated.ts`, `src/articulated.ts`, `public/assets/generated/articulated-creatures.parts.json`, `tools/test_biome_creature_balance.mjs`, `tools/test_save_load_smoke.mjs`, and `package.json`
- `npm run water9:biome-creature-balance-smoke` -> passed

## Caveats

- I did not run a full browser playthrough of the Crownmaw scan because there is no existing deterministic npm smoke for the exact final scan path, and this lane is read-only except for this report.
- The repo was already dirty before this audit; I did not modify source, assets, package files, tests, or generated review artifacts outside this run folder.
