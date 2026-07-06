# Water9 Ore Anchor + B2 Overlay Fix - 2026-07-05

## Goal

Implement fixes for two verified root causes:

- Gameplay ore clusters redraw/move when adjacent terrain is mined because visible ore placement is anchored to mutable terrain mask components instead of stable ore resource data.
- Biome 2 mid band, roughly 522m-1038m, becomes grey/semi-transparent because whole foreground terrain layers are faded to very low alpha.

## Baseline

- [x] Snapshot current dirty tree, build, commit, and push — manager — commit `9f6ffa1` pushed to `origin/ux-work`.

## Checklist

- [x] Implement fixes — `water9-ore-anchor-b2-overlay-fix-impl` — report: `/mnt/nxt-dev/water9/runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/report.md`; commit `7636082` pushed to `origin/ux-work`.
- [x] Manager verification — `mgr-water9` — inspected ore/B2 `#game canvas` proof, ran supplemental clean B2 control captures locally for visual review, verified `HEAD` and `origin/ux-work` at `7636082`.

## Manager Verification

- Commit/push: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `7636082`; `HEAD -> ux-work, origin/ux-work`.
- Status: only manager-owned untracked ledger files remain (`runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.md`, `.prompt.md`).
- Ore proof: inspected `ore-01-before-adjacent-mining.png`, `ore-02-after-adjacent-rock-mining.png`, and `ore-03-after-direct-ore-break.png`; copper/quartz visual anchors remain fixed after adjacent carving, direct copper break removes copper and produces loose copper.
- B2 proof: inspected color/grayscale captures at 522m, 690m, 1038m, 1044/1050m lower control, and 1440m transition control. Mid/lower terrain is readable and no longer a grey whole-terrain alpha wash; transition-deep still fades separately.
- Verification accepted with caveat: full `npm run playtest` still exits `1` on unrelated articulated creature review failures, summarized in `runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/playtest-failure-summary.json`.

## Acceptance Rule

Accepted only after manager inspection of actual `#game canvas` captures:

- Ore proof shows a visible gameplay ore cluster before adjacent mining, after adjacent rock mining, and after direct ore mining. The visible cluster must not slide/re-root from adjacent terrain carving, and breaking the visible ore must spawn/collect the expected resource.
- Any ore-looking decorative/background art in the proof must be visually distinguishable from mineable resource ore or absent from mineable terrain reads.
- Biome 2 proof straddles the bad band: at minimum around 504m/510m, 522m, one mid-band point around 636m or 690m, 1026m/1038m when reachable or diagnostic, and first lower-band control around 1044m. Color and grayscale captures are required.
- B2 mid terrain, terrain edges, and ore overburden must no longer be globally near-transparent (`0.08/0.025/0.08`). The separate transition-deep behavior must not regress.
- `npm run build` passes. Run focused mining/playtest/perf smokes where practical and report any skipped check with reason.
