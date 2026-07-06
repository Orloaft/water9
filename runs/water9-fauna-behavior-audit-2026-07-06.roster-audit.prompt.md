# Worker Prompt - Water9 Current Fauna Roster Behavior Audit

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only roster/classification audit worker for Water9. Repo pin: `/mnt/nxt-dev/water9`. This is a report-only task; do not edit source/runtime assets, do not stage, and do not commit.

Goal: account for every active `biomeFish` entry in today’s repo, compare it with the July 5 behavior taxonomy, and flag creatures whose current behavior is biologically/game-feel wrong. Alex specifically called out a biome 1 urchin swimming rapidly at the player.

Context:
- Current manager preflight HEAD is `539c6b8` or a descendant.
- Prior classification JSON: `runs/water9-fauna-behavior-classes-2026-07-05/fauna-behavior-classification.json`.
- Prior proposal: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md`.
- Current `src/content.ts` may have unrelated dirty changes from prior fauna/rarity work. Treat current disk as source of truth for this audit, but report dirty-state caveats.
- Do not run a dev server unless absolutely needed. If needed, use ports 5180-5199 only.

Read:
- `src/content.ts`
- `src/types.ts`
- Prior JSON/proposal artifacts above
- Asset manifests only if needed to disambiguate body plans: `public/assets/generated/small-life.manifest.json`, `public/assets/generated/exploration-life-2026-07-04/manifest.json`

Deliverables:
- Write `runs/water9-fauna-behavior-audit-2026-07-06/roster-audit.md`.
- Write `runs/water9-fauna-behavior-audit-2026-07-06/fauna-behavior-delta.json`.

JSON requirements:
- One object per active `biomeFish` entry currently present.
- Include: `biome`, `species`, `assetKey`, `count`, `currentPattern`, `hostile`, `radius`, `speed`, `previousProposedBehaviorClass`, `recommendedBehaviorClass`, `terrainAffinity`, `mismatchSeverity` (`none`, `low`, `medium`, `high`, `critical`), `confidence`, and `notes`.
- Include summary totals at the top-level: current entry count, counts by recommended behavior class, counts by mismatch severity, species missing from prior classification, prior-classification species not found today.

Markdown report requirements:
- Status and preflight HEAD.
- Current active fauna count and any delta from the July 5 138-entry classification.
- Highest-severity mismatches first, with special attention to urchins, clams, crabs, shrimp/prawns, tripodfish, searobins, clingfish, garden eels, flounders/rays, jellyfish, nautilus, cephalopods, seahorses, and normal fish.
- Identify exactly which biome 1 urchin entry is likely Alex’s example, including current pattern/hostile/speed/radius and why that produces the wrong read.
- Recommend which two or three behavior classes cover the most severe mismatches first.
- Keep recommendations broad enough for data-driven implementation; avoid bespoke one-off behavior per species unless unavoidable.

Return block:
- Status
- Report paths
- Current entry count
- Critical/high mismatch count
- Top 10 species to fix first
- Caveats/blockers
