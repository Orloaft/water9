# Water9 Scan Reward Rebalance - 2026-07-06

Goal: implement the accepted scan reward curve so common, uncommon, and rare
fauna/flora scans stop overfunding the early game, while epic and legendary
scans remain large moments.

Current repo preflight: 03b2dad.

Checklist:
- [x] implementation — session agent:mgr-water9:subagent:42407353-21a0-4248-bb5d-48343c8b3353 / run 8175a65f-b729-4f7d-b1a3-d5cd0f79c979 — expected changes: scan reward runtime formula, aux-sub duplicate-species payout guard, mirrored progression/rate tools, focused tests, regenerated progression measurement if required — completed 2026-07-06 — REPORTED 2026-07-06
- [x] manager verification — expected artifact: this ledger updated with commit/diff state and verification summary — completed 2026-07-06 — REPORTED 2026-07-06

Acceptance rule:
- Common/uncommon/rare payouts match the proposed lower curve.
- Epic/legendary payouts remain large, with legendary articulated about 5100c at scanner 0.
- Scanner level 4 adds 32% scan credit value, not 64%.
- Aux-sub scanning cannot grant credits for a species already in `state.scannedSpecies`.
- Rarity labels, scan quest rewards, ore values, shop costs, upgrade costs, sub costs, and charting requirements stay unchanged.
- Verification includes the focused smoke/tests plus `npm run build`.

Verification summary:
- Changed runtime/tooling files: `src/helpers.ts`, `src/scene-sub.ts`, `tools/measure_progression.mjs`, `tools/check_fauna_rarity_balance.mjs`, `tools/test_progression_tuning_smoke.mjs`.
- Regenerated reports: `public/review/water9-progression-measurement.json`, `runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json`.
- Added manager run artifacts: `runs/water9-scan-reward-rebalance-2026-07-06.md`, `runs/water9-scan-reward-rebalance-2026-07-06.prompt.md`.
- `npm run water9:progression-tuning-smoke`: PASS.
- `npm run water9:fauna-rarity-check`: PASS.
- `npm run water9:biome-creature-balance-smoke`: PASS.
- `npm run water9:progression-measurement`: PASS.
- `npm run build`: PASS with existing unresolved generated asset references and chunk-size warnings.
- Measured progression report totals: B1 16,300c base / 21,512c scanner max; B2 30,340c base / 40,040c scanner max; B3 64,220c base / 84,762c scanner max; B4 80,700c base / 106,513c scanner max.
- Worker reported deduped whole-catalog unique scan total: 147,880c base / 195,181c scanner max.
