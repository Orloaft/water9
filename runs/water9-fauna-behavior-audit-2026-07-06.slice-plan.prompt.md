# Worker Prompt - Water9 Fauna Behavior First Slice Plan

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only implementation-slice planner for Water9. Repo pin: `/mnt/nxt-dev/water9`. This is a design/report task; do not edit source/runtime assets, do not stage, and do not commit.

Goal: turn the existing fauna behavior taxonomy into the smallest safe implementation plan for two or three behavior classes. The plan should be ready to hand to one commit-capable `codex-dev` worker after the manager reviews the parallel audits.

Context:
- Current manager preflight HEAD is `539c6b8` or a descendant.
- Prior accepted taxonomy: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md`.
- Prior classification: `runs/water9-fauna-behavior-classes-2026-07-05/fauna-behavior-classification.json`.
- Previous recommendation was to implement `sessileAttached`, `verticalAnchored`, and `benthicWalker` first, covering clams, urchins, clingfish, garden eels, tripodfish, crabs, shrimp/prawns, sea spiders, and searobins.
- Alex’s current example: biome 1 urchin swims rapidly at the player; urchins should not chase like fish.
- Current repo has unrelated dirty state. Preserve it. Do not revert anything.

Read:
- Prior behavior proposal/classification artifacts.
- `src/types.ts`, `src/content.ts`, `src/scene-worldgen.ts`, `src/scene-entities.ts`, `src/scene-rendering.ts`, `src/helpers.ts`, `src/scene-playtest.ts`.
- Any relevant existing proof/test scripts under `tools/` that can be extended for behavior proof.

Deliverable:
- Write `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md`.

Report requirements:
- Status and preflight HEAD.
- Blunt recommendation: implement which two or three behavior classes first, or revise the prior set if current code/content suggests a better first slice.
- For each recommended class: body plans covered, movement model, terrain anchoring/spawn rule, player reaction, hostile/contact behavior, rendering/orientation rule, and data fields needed.
- Exact file/module changes a future commit-capable worker should make.
- A phased implementation sequence small enough for one worker: schema, content migration, spawn placement, update/steer dispatch, render/facing, HUD/catalog text, playtest proof command/tool, verification.
- Normal-play `#game canvas` proof plan: named representative species, depth/biome bands, before/after metrics or screenshots, and rejection criteria.
- Test/build plan: `npx tsc --noEmit --pretty false`, `npm run build`, any targeted script to add/extend.
- Risks: terrain masks, mined terrain under anchored fauna, scan/combat compatibility, sonar, perf, existing dirty state.
- Include a draft next worker prompt for the first commit-capable implementation lane. It must include explicit-path staging rule from `../core/prompt-patterns.md`.

Return block:
- Status
- Report path
- Recommended first classes
- Files a future implementation worker would likely touch
- Proof artifacts required
- Caveats/blockers
