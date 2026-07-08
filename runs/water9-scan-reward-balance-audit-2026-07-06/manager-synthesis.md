# Scan Reward Balance Manager Synthesis

Date: 2026-07-06
HEAD: 03b2dad

## Verdict

The current scan economy is too rich because common/uncommon/rare rewards are high, B1/B2 contain many rare entries, scanner upgrades multiply scan credits while also speeding scans up, and aux-sub scanning can pay per individual without the diver path's durable species guard.

This pass was read-only. No source code was changed.

## Current Problem

- Authoritative scan credits come from `scanReward()` in `src/helpers.ts`.
- Current base payouts are common 320c, uncommon 620c, rare 1150c, epic 2100c, legendary 3600c.
- Hostile fish add 180c, hazardous flora add 220c, and articulated creatures add 720c.
- Scanner upgrades multiply the whole reward by `1 + scannerLevel * 0.16`.
- B1 normal-runtime scans total 44,410c at scanner 0 and 72,835c at likely max scanner.
- B2 normal-runtime scans total 49,510c at scanner 0 and 104,959c at likely max scanner.
- Rare scans are the main low-tier offender: plain rare fish pay 1150c, rare hostile fish 1330c, rare hazardous flora 1370c, and rare articulated creatures 1870c.

## Recommended Curve

Use this replacement curve:

`common=60, uncommon=140, rare=360, epic=1800, legendary=4200; hostile/hazardous +60 below epic, +240 at epic/legendary; articulated +160 rare-or-below, +500 epic, +900 legendary; scanner credits +8% per level.`

Expected result:

- Common scan: 320c -> 60c.
- Uncommon scan: 620c -> 140c.
- Plain rare scan: 1150c -> 360c.
- Hostile rare scan: 1330c -> 420c.
- Rare articulated scan: 1870c -> 520c.
- Epic hostile/hazardous scans stay around 2040c.
- Epic articulated scans stay around 2300c.
- Legendary articulated scans become about 5100c.

Estimated catalog impact:

- B1 catalog: about 46.3k -> 16.3k base.
- B2 catalog: about 72.0k -> 30.3k base.
- Whole unique catalog: about 267.2k -> 147.9k base.
- B1 max scanner: about 75.9k -> 21.5k.
- B2 max scanner: about 118.0k -> 40.0k.

## Implementation Notes

- Keep rarity labels unchanged in this slice.
- Keep scan quest rewards unchanged until after one playtest/progression pass.
- Keep scanner speed/range behavior unchanged, but halve the scan credit multiplier from 16% to 8% per level.
- Add the missing aux-sub durable species payout guard so it cannot pay for repeated individuals of a species already in `state.scannedSpecies`.
- Mirror the formula in progression measurement and rarity balance tools.

## Suggested Next Worker Prompt

```text
Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are working in /mnt/nxt-dev/water9. Implement the scan reward rebalance from runs/water9-scan-reward-balance-audit-2026-07-06/manager-synthesis.md and runs/water9-scan-reward-balance-audit-2026-07-06/proposal.md.

Chosen curve:
common=60, uncommon=140, rare=360, epic=1800, legendary=4200; hostile/hazardous +60 below epic, +240 at epic/legendary; articulated +160 rare-or-below, +500 epic, +900 legendary; scanner credits +8% per level.

Also fix aux-sub scan rewards so credit is granted only when the species was not already present in state.scannedSpecies, matching the diver scan path.

Keep rarity assignment unchanged. Keep scan quest rewards unchanged. Do not change ore values, shop costs, upgrade costs, sub costs, or charting requirements.

Edit the smallest robust slice:
- src/helpers.ts: update scanRarityCredits() and scanReward().
- src/scene-sub.ts: add the durable species payout guard to aux-sub scanning.
- tools/measure_progression.mjs: mirror the formula.
- tools/check_fauna_rarity_balance.mjs: mirror representative scan reward labels.
- tools/test_progression_tuning_smoke.mjs and/or a focused scan reward curve test: assert the new curve, scanner multiplier, aux-sub duplicate guard, and articulated/danger examples.
- tools/test_biome_creature_balance.mjs only if current scan assertions need updating.

Verify with:
- npm run water9:progression-tuning-smoke
- npm run water9:fauna-rarity-check
- npm run water9:biome-creature-balance-smoke
- npm run water9:progression-measurement
- npm run build

Acceptance:
- B1 scan total is about 16.3k base and under 22k at max scanner.
- B2 scan total is about 30.3k base and about 40k at max scanner.
- Whole unique catalog scan total is about 147.9k base.
- Epic/legendary payouts remain large, with legendary articulated around 5100c at scanner level 0.
- Scanner level 4 increases scan credits by 32%, not 64%.
- Aux-sub scanning cannot grant credits for a species already cataloged by diver or aux-sub.
- git status shows only intentional implementation/test/report changes.
```

