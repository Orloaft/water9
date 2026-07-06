# Water9 Fauna Behavior Audit - Manager Synthesis - 2026-07-06

## Status

Accepted read-only audit at HEAD `539c6b8`.

Verified artifacts:

- `runs/water9-fauna-behavior-audit-2026-07-06/code-audit.md`
- `runs/water9-fauna-behavior-audit-2026-07-06/roster-audit.md`
- `runs/water9-fauna-behavior-audit-2026-07-06/fauna-behavior-delta.json`
- `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md`

All three audit workers were read-only. No source/runtime assets were intentionally edited by the audit lanes. Existing dirty state remains, including `src/content.ts`, `src/helpers.ts`, generated viperfish assets, and run artifacts.

## Finding

Alex's biome 1 example is confirmed. `Glimmer Spine Urchin` is currently authored as a hostile `stalk` fish with speed `[34, 64]`, so the shared fish steering path treats it like a pursuing swimmer. There is no small-fauna behavior class today for sessile/contact-hazard, rooted/upright, or benthic-walking body plans.

The current architecture still routes all active `biomeFish` entries through the generic `Fish` model: open-water spawn, velocity/home steering, water bounce, swimmer rendering/facing, and hostile pattern-based chase/contact logic.

## Roster Result

Current fauna count is unchanged from the July 5 classification:

- 138 active `biomeFish` entries today.
- 0 missing current species versus July 5.
- 0 prior species absent today.
- 24 critical/high body-plan behavior mismatches: 1 critical and 23 high.

Top species to fix first:

1. `Glimmer Spine Urchin`
2. `Shellback Garden Eel`
3. `Tripodfish`
4. `Goldcap Tripodfish`
5. `Brass Knuckle Prawn`
6. `Mantis Shrimp`
7. `Silver Hinge Crab`
8. `Tin Plate Searobin`
9. `Nacre Thorn Clam`
10. `Cinder Vent Clingfish`

## Recommended First Implementation Slice

Implement exactly three classes first:

- `sessileAttached`: urchin, clam, clingfish. Fixes the critical urchin issue by making hostility defensive contact only, not pursuit.
- `verticalAnchored`: garden eel, tripodfish, goldcap tripodfish, pipefish, seahorses. Rooted/upright with sway/retract behavior.
- `benthicWalker`: shrimp, mantis shrimp, crabs, sea spider, prawn, searobin. Terrain-following skitter/walk/hop with short local lunges for hostile entries.

Keep all other fauna on legacy swimmer behavior for this first commit.

## Implementation Shape

Use a new `src/fauna-behavior.ts` resolver for first-slice species so the worker avoids mass-editing dirty `src/content.ts`. Add optional behavior metadata/runtime fields to `src/types.ts`, reuse existing terrain-surface anchors from flora/hazards, then branch spawn/update/render/contact/proof code by behavior class while preserving `kind: 'fish'` scan/combat/logbook compatibility.

Likely implementation files:

- `src/types.ts`
- `src/fauna-behavior.ts`
- `src/scene-worldgen.ts`
- `src/scene-entities.ts`
- `src/scene-combat.ts`
- `src/helpers.ts`
- `src/scene-rendering.ts`
- `src/hud.ts`
- `src/scene-playtest.ts`
- `src/scene.ts`
- `tools/test_fauna_behavior_slice.mjs`

## Acceptance Bar For Implementation

Required checks:

- `npx tsc --noEmit --pretty false`
- `npm run build`
- `node tools/build_small_life_manifest.mjs --check`
- `node tools/test_fish_visual_facing_smoke.mjs`
- `node tools/test_aggro_cue_regression.mjs`
- `node tools/test_fauna_behavior_slice.mjs`

Required proof artifacts under this run directory:

- JSON metrics showing behavior class, terrain affinity, surface support, distance from surface/root, velocity magnitude, aggro/chase state, and visibility.
- Normal-play `#game canvas` screenshots for Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish, Shellback Garden Eel, Tripodfish, Silver Hinge Crab, Mantis Shrimp, Sea Spider, and Tin Plate Searobin.
- Specific urchin guard: player nearby for roughly 3 seconds, no chase/pursuit displacement, anchor displacement under about 10 px, and no fish-style pursuit aggro.

## Decision

The next worker should be a single commit-capable implementation lane for the three-class first slice. It must classify dirty state before editing and stage explicit paths only.
