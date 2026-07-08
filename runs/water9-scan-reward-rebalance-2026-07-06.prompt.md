Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are `codex-dev` working only in `/mnt/nxt-dev/water9`.

Implement the scan reward rebalance from:
- `runs/water9-scan-reward-balance-audit-2026-07-06/manager-synthesis.md`
- `runs/water9-scan-reward-balance-audit-2026-07-06/proposal.md`

Context:
- Dispatch HEAD expected by the manager is `03b2dad`.
- The repo currently has untracked audit/run artifacts under `runs/water9-scan-reward-balance-audit-2026-07-06*`. Treat those as manager artifacts and do not delete or rewrite them unless directly needed for this task.
- Preserve unrelated dirty state. No drive-by refactors.
- Do not commit. Leave changes for manager verification.

Chosen curve:
`common=60, uncommon=140, rare=360, epic=1800, legendary=4200; hostile/hazardous +60 below epic, +240 at epic/legendary; articulated +160 rare-or-below, +500 epic, +900 legendary; scanner credits +8% per level.`

Required behavior:
- Common scan: 60c.
- Uncommon scan: 140c.
- Plain rare scan: 360c.
- Hostile rare scan: 420c.
- Rare articulated scan: 520c.
- Epic hostile/hazardous scan: about 2040c.
- Epic articulated scan: about 2300c.
- Legendary articulated scan: about 5100c at scanner level 0.
- Scanner level 4 increases scan credits by 32%, not 64%.
- Aux-sub scanning must grant credits only when the species was not already present in `state.scannedSpecies`, matching the diver scan path.

Keep unchanged:
- Rarity assignment and labels.
- Scan quest rewards.
- Ore values.
- Shop costs.
- Upgrade costs.
- Sub costs.
- Charting requirements.
- Scanner range and scan speed behavior.

Edit the smallest robust slice:
- `src/helpers.ts`: update `scanRarityCredits()` and `scanReward()`.
- `src/scene-sub.ts`: add the durable species payout guard to aux-sub scanning.
- `tools/measure_progression.mjs`: mirror the formula.
- `tools/check_fauna_rarity_balance.mjs`: mirror representative scan reward labels.
- `tools/test_progression_tuning_smoke.mjs` and/or a focused scan reward curve test: assert the new curve, scanner multiplier, aux-sub duplicate guard, and articulated/danger examples.
- `tools/test_biome_creature_balance.mjs` only if current scan assertions need updating.
- `package.json` only if you add a new focused tool command and need it wired.
- `public/review/water9-progression-measurement.json` only if `npm run water9:progression-measurement` intentionally regenerates it with the new formula.

Verify with:
- `npm run water9:progression-tuning-smoke`
- `npm run water9:fauna-rarity-check`
- `npm run water9:biome-creature-balance-smoke`
- `npm run water9:progression-measurement`
- `npm run build`

Acceptance:
- B1 scan total is about 16.3k base and under 22k at max scanner.
- B2 scan total is about 30.3k base and about 40k at max scanner.
- Whole unique catalog scan total is about 147.9k base.
- Epic/legendary payouts remain large, with legendary articulated around 5100c at scanner level 0.
- Scanner level 4 increases scan credits by 32%, not 64%.
- Aux-sub scanning cannot grant credits for a species already cataloged by diver or aux-sub.
- `git status --short --untracked-files=all` shows only intentional implementation/test/report changes plus the known manager run artifacts.

Return block:
- Status.
- HEAD preflight result.
- Changed files.
- Exact verification commands and pass/fail result.
- New measured B1/B2/whole scan totals from progression measurement.
- Caveats/blockers.
