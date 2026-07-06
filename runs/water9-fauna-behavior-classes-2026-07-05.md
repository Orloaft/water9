# Water9 Fauna Behavior Classes - 2026-07-05

## Goal

Analyze the current active fauna roster and design a small, implementable set of behavior classes so non-swimming fauna like clams, crabs, urchins, tripodfish, searobins, clingfish, and garden eels no longer behave like generic fish.

## Starting Point

- Animation upgrade committed as `2c4ff8d` (`Upgrade exploration fauna animations`).
- Dirty paths still present before this run and not part of this goal: `src/content.ts`, `src/helpers.ts`, tracked `public/assets/generated/fauna-abyss-viperfish*`, untracked viperfish source/review files, and unrelated ore-anchor run files.
- Current code has `FishPattern = 'school' | 'sway' | 'glide' | 'stalk' | 'circle'` and routes all `Fish` entities through `updateFish`, `steerFish`, and `keepFishInWater`.

## Checklist

- [x] Read-only behavior taxonomy scout - session key `water9-fauna-behavior-taxonomy`, child `agent:mgr-water9:subagent:dfe464cd-3306-453c-a82a-735f1319056b`, run `99596a75-dd84-4e73-a64f-fe122bcf995a` - artifacts verified: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md`, `runs/water9-fauna-behavior-classes-2026-07-05/fauna-behavior-classification.json` - REPORTED 2026-07-05
- [x] Manager synthesis and next implementation decision - notes below; update sent to Alex - REPORTED 2026-07-05

## Acceptance Rule

This design pass is accepted when the proposal:

1. Identifies the current movement model and exact source touch points with file/line references.
2. Classifies every active `biomeFish` fauna entry into a proposed behavior class, with special attention to all `fauna-exp-*` entries and the named mismatches: clam, crab, shrimp/prawn, urchin, tripodfish, searobin, clingfish, garden eel, flounder/ray, nautilus, jelly, squid/cuttle, seahorse, and fish.
3. Recommends a small behavior-class set that is practical for Water9 now, including movement, terrain contact, spawn/placement, player reaction, and hostile behavior notes.
4. Calls out implementation risks, migration path, verification commands, and required normal-play `#game canvas` proof for the eventual behavior implementation.
5. Makes no source/runtime asset edits in this read-only pass.

## Manager Synthesis

Accepted the read-only design pass on 2026-07-05. Preflight and current HEAD were `2c4ff8d`, matching the committed fauna animation upgrade. The scout wrote only the expected proposal and JSON artifacts; repo dirty state remains the known pre-existing `src/content.ts`, `src/helpers.ts`, abyss viperfish assets/review files, and unrelated run ledgers.

JSON verification:

- `entryCount`: 138 active `biomeFish` entries, matching the declared count.
- Missing required fields: 0.
- Declared class counts match computed counts:
  - `openWaterSchoolingFish`: 18
  - `cruiserSoloSwimmer`: 38
  - `hoverDrifter`: 9
  - `cephalopodHover`: 12
  - `verticalAnchored`: 6
  - `benthicWalker`: 10
  - `sessileAttached`: 3
  - `bottomRestingGlider`: 16
  - `predatorPursuerAmbusher`: 26

Decision: the behavior taxonomy is ready to use as the migration map. The first implementation slice should target the biggest mismatch species without boiling the whole fish system: `sessileAttached`, `verticalAnchored`, and `benthicWalker`. That covers clams, urchins, clingfish, garden eels, tripodfish, crabs, shrimp/prawns, sea spiders, and searobins. It should reuse flora `TerrainSurfaceAnchor` logic, keep combat/scan/stun compatible, and include live `#game canvas` proof for Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish, Shellback Garden Eel, Tripodfish/Goldcap Tripodfish, Silver Hinge Crab, Brass Knuckle Prawn, Opal Fan Shrimp, Chimney Ghost Shrimp, and Tin Plate Searobin.
