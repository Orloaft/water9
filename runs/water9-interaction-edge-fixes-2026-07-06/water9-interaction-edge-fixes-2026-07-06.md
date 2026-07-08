# Water9 Interaction Edge Fixes - 2026-07-06

Goal: fix Alex-reported interaction regressions after the flora slice: some ore is still unmineable, some stamped flora is still not scannable, mantis shrimp gets stuck pacing on small destructible wall terrain, and neutral crab flips vertically while walking along edges.

Repo: `/mnt/nxt-dev/water9`
Manager preflight HEAD: `03b2dad`

Acceptance rule:
- Ore: reproduce at least one currently visible-but-unmineable ore case, fix root cause, and prove direct mining succeeds in normal play without breaking adjacent-rock mining.
- Flora: audit stamped/decorative flora that visually reads like flora; anything intended as flora must be scannable or explicitly documented as terrain texture/background with no scan affordance. Prove the specific stamped-flora misses are resolved.
- Mantis shrimp: live movement proof on destructible wall edges where it no longer paces back and forth on a small terrain lip, and can climb around or make short jumps to continue along wall edges.
- Neutral crab: live movement proof on edge/path surfaces where it no longer flips vertically while walking.
- Verification must include `npm run build` plus focused smokes/scripts. Visual proof must be actual `#game canvas` during normal play, with readable contact sheets and any relevant grayscale/control captures.

Checklist:
- [x] implementation owner — session `water9_edge_interaction_owner`, child `agent:mgr-water9:subagent:d2403e90-e7ba-4375-95e3-17daf6629e7d`, run `853cfcd6-4a26-4c1d-9e03-43ecd0e8801e` — expected artifact `/mnt/nxt-dev/water9/runs/water9-interaction-edge-fixes-2026-07-06/worker-report.md` — REPORTED 2026-07-06

Notes:
- At most one commit-capable lane is active for this repo.
- Completion must be manager-verified from disk before reporting accepted.
