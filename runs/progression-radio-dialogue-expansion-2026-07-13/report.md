# Progression radio dialogue expansion

Status: complete on base `0817f02` (2026-07-13).

## Architecture and integration

`src/progression-radio.ts` owns the event schema, authored dialogue, heard-once IDs, queue normalization, and the safe delivery gate. Quest/rendering code does not select dialogue branches.

- `completeQuest()` enqueues one event keyed by the dynamic quest ID: `progression-v1:quest:<quest-id>`.
- `travelToNextBiome()` enqueues `progression-v1:arrival:biome-<2|3|4>` only after assigning the new biome and immediately before scene restart.
- The scene update presents the FIFO head only after world loading is inactive and no radio, pause, logbook, cargo, sonar, loss, or blocking finale overlay is active. Arrival events additionally require the matching biome and the diver docked at its barge.
- Presentation reuses `state.radioMessages`, `radioIndex`, `radioOpen`, the existing modal, and its keyboard/pointer/controller paths. Closing a progression exchange clears only its active identity; the next FIFO item opens at the next safe frame.
- Delivery adds the namespaced ID to `story.heardRadio`. Pending event records persist in save v1 through an optional field; active/delivered events do not replay after load.
- Radio speaker, role, and body text now pass through the HUD's existing `escapeHtml()` convention.

## Event and conversation inventory

The original five-line opening conversation is unchanged.

Quest completion events (24 new lines):

- `depth` — 3 lines: Vale interprets the actual target pressure profile, the diver answers, and Chief Alvarez checks winch/submersible seals.
- `scan` — 3 lines: Sato confirms the actual lifeform count and distinguishes resident life from pressure-lane traffic; diver response.
- `sample` — 3 lines: Sato confirms viable flora tissue, diver response, and Vale correlates holdfast minerals.
- `ore` — 3 lines: Vale confirms the actual assay-order value, diver response, and Alvarez clears the cargo bins.
- `nest` — 4 lines: Sato accounts for eggs/larvae and the reclaimed migration lane, diver response, and Alvarez verifies the sonar locator is quiet.
- `gulperSurvey` — 4 lines: Sato interprets the actual wake depth, diver response, Alvarez confirms the Marlin voucher, and Vale links the deliberate route to the drowned-architect signal.
- `forwardOutpost` — 4 lines: Alvarez reports actual placement depth/flora and limited charge, diver response, and Sato covers the shelter-zone draw.

Arrival events (15 new lines):

- Biome 2 / Brine Vent Shelf — 5 lines on anchoring, heat/salt seals, vent geology, Brine Grass, Vent Coral/Ember Bloom, the Gulper Eel route, and the chemistry/sonar proof needed next.
- Biome 3 / Midnight Trench — 5 lines on anchorstone, fuel discipline, Gulper wake, Abyssal Serpent route safety, drowned-architect linework, and the forward air pocket needed before the ruins jump.
- Biome 4 / Ancient Ruins — 5 lines on Glass Obelisks, Circuit Kelp, constructed geometry, Crownmaw sentinel ecology, recovery machinery, and returning proof to the barge.

Total authored expansion: 39 new lines. Dr. Vale remains the geological interpreter, Dr. Sato remains the life-science lead, and Chief Alvarez is the consistent machinery/hazard/outpost/submersible engineer. The diver speaks in every event family; dry humor remains subordinate to actionable debriefs.

## Save compatibility

- Save schema/version remains `water9/save` v1.
- `progressionRadioQueue` is optional. Legacy saves without it normalize to an empty queue.
- Queue normalization accepts only valid `progression-v1:` quest/arrival records, removes duplicates and already-heard IDs, bounds restored text, and rejects malformed biome/family combinations.
- Existing story/finale IDs do not collide because progression IDs have their own prefix.
- An exchange is marked heard when it opens. Saving during an active exchange preserves that heard ID and any later queued records; loading closes the transient modal and safely delivers the next pending record without replaying the active one.

## Changed files

- `src/progression-radio.ts` — event queue, authored content, delivery policy, persistence normalization.
- `src/types.ts`, `src/state.ts` — event/state types and playtest commands.
- `src/scene-economy.ts` — quest completion and post-transition arrival enqueue points.
- `src/scene.ts`, `src/hud.ts` — safe presentation tick, progression close hook, escaped radio rendering.
- `src/save-load.ts`, `src/helpers.ts` — optional queue persistence/load normalization and fresh-run reset.
- `src/scene-playtest.ts` — deterministic quest, FIFO, and actual travel/restart staging plus radio snapshot data.
- `tools/test_progression_radio_dialogue.mjs`, `package.json` — canonical regression command.
- `tools/test_consumable_tools_sampler_quests_smoke.mjs` — dismisses the now-expected sample-quest completion exchange before inspecting the barge menu.
- This report.

## Verification

- `npm run water9:progression-radio-smoke` — PASS on port 5194. Proved all seven quest families, one queue per first completion, heard-once suppression, actual Biome 1→2 / 2→3 / 3→4 travel with no pre-restart opening, post-restart barge delivery, arrival no-replay, FIFO scan→ore delivery, active-plus-pending save/load, legacy missing-field normalization, unchanged opening, keyboard advance, pointer close/resume, and UI bounds/overflow.
- `WATER9_CONSUMABLE_PORT=5191 WATER9_CONSUMABLE_OUT_DIR=runs/progression-radio-dialogue-expansion-2026-07-13/artifacts/quest-smoke node tools/test_consumable_tools_sampler_quests_smoke.mjs` — PASS after teaching the existing smoke to advance the expected completion exchange.
- `WATER9_SAVE_LOAD_PORT=5192 WATER9_SAVE_LOAD_OUT_DIR=runs/progression-radio-dialogue-expansion-2026-07-13/artifacts/save-load-smoke node tools/test_save_load_smoke.mjs` — PASS.
- `npm run build` — PASS; Vite transformed 38 modules. Existing unresolved-at-build generated-asset and large-chunk warnings remain warnings only.
- `git diff --check` — PASS.
- `npx tsc --noEmit --pretty false` — not a clean project gate at this base; it reports existing unrelated type errors in helpers, save-load world narrowing, articulated/combat/playtest code. The canonical Vite build passes.

Regression detail: `artifacts/progression-radio-smoke.json`.

## Runtime captures

Normal-play quest completion (depth family, Shallows, 1,350 m staged completion):

- `artifacts/quest-completion-depth-viewport.png`
- `artifacts/quest-completion-depth-canvas.png`

Post-restart arrival (actual Biome 1→2 travel, docked at the Brine Vent Shelf barge after world loading completed):

- `artifacts/biome-2-arrival-viewport.png`
- `artifacts/biome-2-arrival-canvas.png`

At 1280×800, automated bounds/overflow checks and visual inspection confirmed readable wrapping, visible role/speaker labels, visible Continue buttons, and no clipping. Captures and browser-generated JSON are intentionally not committed.

## Caveats and unrelated failures

- The legacy story smoke completed all milestone/save assertions but still exits nonzero on a pre-existing Phaser teardown race: `drawFish()` calls `setTexture()` on a destroyed sprite after repeated `setBiome` restarts (`Cannot read properties of undefined (reading 'sys')`). Report: `artifacts/story-smoke-rerun/story-v1-smoke.json`.
- The legacy forward-outpost smoke fails before this radio layer can participate: `stageForwardOutpostSite(980)` is clamped to world y=4862 and reports depth 794, below the existing 900 m placement requirement. No quest balance/world-depth fix was made because it is outside this slice. Report: `artifacts/outpost-smoke/water9-forward-outpost-quest-smoke-2026-06-29.json`.
- Substantial unrelated pre-existing dirt under `runs/` was left untouched. No artifacts, screenshots, browser state, or unrelated run files are staged.
