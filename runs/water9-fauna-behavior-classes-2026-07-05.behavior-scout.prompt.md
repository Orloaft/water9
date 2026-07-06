# Worker Prompt - Water9 Fauna Behavior Taxonomy Scout

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only behavior taxonomy scout for Water9. Repo pin: `/mnt/nxt-dev/water9`. Current committed animation-upgrade HEAD should be `2c4ff8d` or a descendant. This is a design/report task, not implementation.

Goal: analyze the current active fauna roster and design a small, implementable set of behavior classes so non-swimming fauna like clams, crabs, urchins, tripodfish, searobins, clingfish, and garden eels no longer behave like generic fish.

Important current context:
- There is known unrelated dirty state. Preserve it. Do not revert anything.
- Dirty paths observed by the manager before dispatch include `src/content.ts`, `src/helpers.ts`, tracked `public/assets/generated/fauna-abyss-viperfish*`, untracked viperfish source/review files, and unrelated ore-anchor run files.
- Do not stage or commit. Do not edit source/runtime assets. Write only the two report artifacts requested below.
- If you need a smoke/dev server for inspection, use only ports 5180-5199, leave busy ports alone, and do not kill processes outside that range. A design-only pass should not need a long-running server.

Read these local areas first:
- `src/types.ts`
- `src/content.ts`
- `src/scene-entities.ts`
- `src/scene.ts`
- `src/helpers.ts`
- `src/scene-worldgen.ts`
- `tools/build_small_life_manifest.mjs`
- `public/assets/generated/small-life.manifest.json`
- `public/assets/generated/exploration-life-2026-07-04/manifest.json`

Known manager observation to verify or correct:
- Current `FishPattern` is only `school | sway | glide | stalk | circle`.
- Current `updateFish` routes all fauna through `steerFish`, then applies x/y velocity, then `keepFishInWater`.
- Current `steerFish` mostly varies open-water target offsets by pattern; there is no body-plan behavior class, terrain-walker class, sessile anchoring, or bottom-contact motion.

Deliverables:
1. Create `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md`.
2. Create `runs/water9-fauna-behavior-classes-2026-07-05/fauna-behavior-classification.json`.

The Markdown report should include:
- Status and preflight HEAD.
- Current movement model with exact file/line references.
- Proposed small behavior-class set. Keep it practical: likely classes include open-water schooling fish, cruiser/solo swimmer, hover/drifter, cephalopod/nautilus hover, vertical/anchored eel-seahorse, benthic walker/crawler, sessile/attached, bottom-resting glider, and predator pursuer/ambusher. Adjust based on the code and roster.
- For each class: movement model, terrain contact/spawn rules, player avoidance or attack behavior, orientation/facing notes, and why it is worth a separate class.
- A classification summary by class with counts and representative species.
- Specific recommendations for mismatches Alex named or implied: Nacre Thorn Clam, Silver Hinge Crab, Glimmer Spine Urchin, Opal Fan Shrimp, Chimney Ghost Shrimp, Brass Knuckle Prawn, Tripodfish/Goldcap Tripodfish, Tin Plate Searobin, Cinder Vent Clingfish, Shellback Garden Eel, Pearl Eye Flounder, Lumen Kite Ray, Glass Helm Nautilus, Prism Bell Jelly, seahorses, squid/cuttle, and normal fish.
- Implementation plan in phases: schema/type changes, content migration, runtime movement/terrain helpers, spawn placement, validation/report tooling, and visual proof.
- Risks and edge cases: terrain collision, wall/floor anchoring, mined terrain changing under sessile fauna, scan/combat expectations, perf.
- Verification plan for implementation: `npx tsc --noEmit --pretty false`, `npm run build`, targeted unit/tooling checks if available, and normal-play `#game canvas` captures across representative bands showing walkers/sessile fauna actually on terrain, not swimming.

The JSON should be machine-readable and include one object per active `biomeFish` fauna entry with at least:
- `biome`
- `species`
- `assetKey`
- `currentPattern`
- `hostile`
- `radius`
- `proposedBehaviorClass`
- `terrainAffinity` (`openWater`, `bottom`, `wall`, `ceiling`, `surfaceAttached`, `nearTerrain`, etc.)
- `confidence` (`high`, `medium`, `low`)
- `notes`

Use current runtime data, not wishful names only. It is fine to infer from species names and generated manifest silhouettes, but mark uncertain calls. Keep classifications broad enough that implementation can be done in a focused follow-up without hand-authoring one bespoke behavior per species.

Return block:
- Status
- Report paths
- Behavior classes proposed, with counts
- Top implementation risks
- Suggested next worker prompt shape
- Caveats/blockers

