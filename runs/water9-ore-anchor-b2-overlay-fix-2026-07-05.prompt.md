# Worker Prompt: Water9 Ore Anchor + B2 Overlay Fix

You are `codex-dev` working on Water9 only.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo pin: `/mnt/nxt-dev/water9`
Branch: `ux-work`
Baseline snapshot: `9f6ffa1` was just built and pushed to `origin/ux-work`.

There may be manager-owned untracked ledger files:

- `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.md`
- `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.prompt.md`

Do not edit, stage, or commit those two files. You may create and stage files under `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/`.

## Goal

Implement the fixes for both verified root causes:

1. Visible mineable ore clusters should not move/re-root when nearby terrain is mined. Visible gameplay ore must stay anchored to stable ore/resource data until the backing ore tile is broken, and mining visible ore should produce the expected loose resource.
2. Biome 2 mid band must no longer render as a grey/semi-transparent terrain wash caused by whole-scene terrain alpha `0.08/0.025/0.08`.

## Context Reports

Read these first:

- `runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/ore-rootcause-report.md`
- `runs/water9-rootcause-mining-ore-b2-overlay-2026-07-05/b2-overlay-rootcause-report.md`

Important root-cause facts already verified:

- Gameplay resources are `Tile` values with `value > 0`.
- Current embedded ore rendering uses mask-derived connected components, so adjacent terrain mask carving can alter the ore component root/bounds and redraw the cluster while the actual ore tile remains unbroken.
- Loot only spawns when an actual value-bearing ore tile is broken.
- B2 mid-band terrain transparency is applied in `updateForegroundTerrainPresentation()` through `BRINE_MID_TERRAIN_ALPHA = 0.08`, `BRINE_MID_TERRAIN_EDGE_ALPHA = 0.025`, and `BRINE_MID_ORE_OVERBURDEN_ALPHA = 0.08` whenever biome 2 + `depthBand === 'mid'`.

## Scope

Implement narrowly. Expected touch areas are likely:

- `src/scene-rendering.ts`
- `src/scene-combat.ts`
- `src/scene-playtest.ts` or a focused proof helper, if needed
- possibly shared types/helpers only if a stable ore anchor API belongs there

No drive-by refactors. Do not alter Telegram/OpenClaw bindings, gateway config, systemd, cron, or public integrations.

## Implementation Requirements

Ore:

- Decouple visible gameplay ore placement from mutable terrain-mask component roots/bounds.
- Use a stable key/anchor based on ore tile coordinates, stable worldgen/resource component data, or another deterministic resource-backed identity that does not change when adjacent non-ore terrain mask samples are carved.
- It is okay to use mask data to clip/reveal/occlude, but not to move the visual center/root for a still-existing ore tile.
- When the player mines a visible gameplay ore cluster, the actual resource tile should be damageable/breakable and produce the expected loose resource. If the beam/brush visibly hits ore but target selection would choose adjacent rock, prefer the visible ore tile or otherwise prevent the visual from implying a resource break that did not happen.
- Reduce or remove ore-like decorative/background stamps that can be mistaken for mineable resource ore in normal mineable terrain views, or make them clearly visually distinct from resource ore.

B2 overlay:

- Remove or raise the Biome 2 mid-band whole-terrain alpha branch so the 522m-1038m band no longer makes foreground terrain globally semi-transparent.
- Preserve the separate transition-deep behavior unless you find and report a specific regression.
- If landmark readability needs help, use a local/background-only treatment. Do not fade the entire terrain/edge/ore-overburden graphics layers to near-transparent values across the whole mid band.

## Proof Requirements

Use normal runtime `#game canvas` captures, not review-harness-only proof. Vite/dev-server ports must stay in `5180-5199`; if a port is busy, choose another in that range and do not kill processes outside it. Vite must not watch `.desktop-build`.

Create an early report stub at:

- `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/report.md`

Capture and save proof under:

- `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/`

Minimum proof:

- Ore sequence: before adjacent mining, after adjacent rock mining, after direct ore mining/break, with JSON showing tile coords, visible ore count/anchor/position, target tile, loose item/cargo result.
- B2 sequence: color and grayscale `#game canvas` captures around 504m/510m, first bad former mid-band around 522m, deeper mid around 636m or 690m, last mid around 1026m/1038m when reachable or diagnostic, and lower-band control around 1044m. Include runtime alpha metrics for `terrain`, `terrainEdges`, and `oreOverburden`.
- A contact sheet is useful, but individual source captures must also exist.

## Verification

Run at minimum:

- `npm run build`

Also run focused smokes where practical:

- `npm run terrain:progressive-mining-review`
- `npm run playtest`
- `npm run water9:perf-guardrails-smoke`

If any focused smoke is not applicable or fails due an unrelated pre-existing reason, report that clearly with logs and still provide the build plus the custom proof above.

## Commit / Push

This is the only commit-capable lane for this repo.

Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Commit the fix and proof/report artifacts you created. Do not stage the two manager-owned prompt/ledger files listed above. Push the fix commit to `origin ux-work`.

## Return

Return:

- Status: accepted / needs manager visual review / blocked
- Commit hash and push result
- Changed files
- Verification commands and outcomes
- Proof/report paths
- Root-cause fix summary
- Caveats/blockers, if any
