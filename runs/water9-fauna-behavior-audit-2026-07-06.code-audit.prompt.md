# Worker Prompt - Water9 Current Fauna Behavior Code Audit

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only behavior-code audit worker for Water9. Repo pin: `/mnt/nxt-dev/water9`. This is a report-only task; do not edit source/runtime assets, do not stage, and do not commit.

Goal: audit today’s actual fauna behavior implementation so the manager can decide the first behavior-class implementation slice. Alex’s concrete complaint is that an urchin in biome 1 swims rapidly at the player; non-swimming body plans should not behave like generic fish.

Context:
- Current manager preflight HEAD is `539c6b8` or a descendant.
- A prior accepted taxonomy exists at `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md`.
- The prior taxonomy said all small fauna currently use `FishPattern = school | sway | glide | stalk | circle`, and recommended first implementing `sessileAttached`, `verticalAnchored`, and `benthicWalker`.
- There is known unrelated dirty state in the repo. Preserve it. Do not revert anything.
- Port range for any dev server/smoke is 5180-5199; this audit should not need a server.

Read and cite exact current file/line references for:
- `src/types.ts` fauna types, `FishPattern`, `Fish`, `FishSpecies`, terrain-anchor-related types.
- `src/content.ts` `biomeFish` schema usage.
- `src/scene-worldgen.ts` fish spawning, `makeSchool`, open-water placement, and reusable flora surface-anchor placement.
- `src/scene-entities.ts` fish update/steering/collision behavior and how hostile/non-hostile differences currently work.
- `src/scene-rendering.ts` fish rendering/facing and flora terrain rendering as a comparison point.
- `src/helpers.ts` animation/facing, collision/contact, scan rarity or catalog text helpers that depend on pattern/hostile.
- `src/scene-sonar.ts`, `src/scene-combat.ts`, `src/hud.ts`, and `src/scene-playtest.ts` only where behavior-class changes would need compatibility updates.
- Existing run artifacts from `runs/water9-fauna-behavior-classes-2026-07-05/` only enough to confirm or correct earlier assumptions.

Deliverable:
- Write `runs/water9-fauna-behavior-audit-2026-07-06/code-audit.md`.

Report requirements:
- Status and preflight HEAD.
- Concise current architecture: spawn, steering, movement integration, terrain contact, rendering/facing, hostile contact/combat, scan/HUD/sonar, playtest/proof surfaces.
- Exact file/line references for each relevant touch point.
- Explicitly answer whether the July 5 finding is still true after later commits: do all active small fauna still share the same generic fish movement model?
- Identify what makes the biome 1 urchin behave like a chaser today: content flags/pattern plus runtime hostile steering logic.
- Name the safest integration points for adding behavior classes without breaking scan/combat.
- List implementation risks and required compatibility shims.
- Do not propose a broad rewrite; focus on what a first slice needs.

Return block:
- Status
- Report path
- Current HEAD
- Top 5 code touch points
- Whether first slice looks safe
- Caveats/blockers
