# Scan Reward Rebalance Proposal

Repo: `/mnt/nxt-dev/water9`  
Dispatch HEAD verified: `03b2dad`

## Recommendation

Change only the centralized scan payout formula first. Keep rarity assignment, scan quest rewards, ore tables, shop prices, and upgrade costs unchanged for this slice.

Recommended replacement curve:

`common=60, uncommon=140, rare=360, epic=1800, legendary=4200; hostile/hazardous +60 below epic, +240 at epic/legendary; articulated +160 rare-or-below, +500 epic, +900 legendary; scanner credits +8% per level; auxiliary sub gives no credit multiplier.`

This keeps ordinary B1/B2 catalog filling from behaving like a salary, while making epic/legendary discoveries still read as headline payouts.

## Current Findings

Current source grants scan money in `src/helpers.ts` through `scanReward()` and `scanRarityCredits()`:

- `common=320`
- `uncommon=620`
- `rare=1150`
- `epic=2100`
- `legendary=3600`
- hostile fish add `180`
- hazardous flora add `220`
- articulated creatures add `720`
- scanner upgrade multiplies the whole amount by `1 + scannerLevel * 0.16`

The early economy problem is mostly not common scans alone. It is the combination of many B1/B2 rare labels, a very high rare floor, and scanner multiplying every scan payout. In current B1, 28 of 45 catalog targets are rare. In current B2, 35 of 54 catalog targets are rare. A plain rare scan is `1150c`, which can rival or exceed several early ore hauls and a chain of low-tier upgrades.

Relevant pacing anchors:

- B1 barge gate: `7500c`; B1 gate plus recommended newly unlocked upgrades in `tools/measure_progression.mjs`: about `13420c`.
- B2 barge gate: `15000c`; B2 gate plus recommended newly unlocked upgrades: about `23430c`.
- Early upgrade base costs in `src/content.ts`: `60c` to `100c` for B1 upgrades.
- Ore tile values in `src/content.ts`: copper `14c`, quartz `32c`, ruby `78c`, cobalt `140c`, sunstone `310c`, relic `180c`, B1 artifact spike `drownedIdol=1200c`.
- Shop consumables and subs are separate sinks; the first big sub price is Seeker `18000c`, then Marlin `62000c`.

## Replacement Rules

Implement these rules inside `scanRarityCredits()` / `scanReward()`:

| Rarity | Current base | Proposed base |
| --- | ---: | ---: |
| common | 320 | 60 |
| uncommon | 620 | 140 |
| rare | 1150 | 360 |
| epic | 2100 | 1800 |
| legendary | 3600 | 4200 |

Danger and threat rules:

- Non-hostile fish and non-hazardous flora: no danger bonus.
- Hostile fish and hazardous flora: `+60` for common/uncommon/rare, `+240` for epic/legendary.
- Articulated creatures: `+160` for common/uncommon/rare, `+500` for epic, `+900` for legendary.
- Apply danger before scanner multiplier.

Scanner rule:

- Change scan credit multiplier from `1 + scannerLevel * 0.16` to `1 + scannerLevel * 0.08`.
- Leave scanner range and scan speed alone in `src/scene-entities.ts`; those are already useful non-cash progression.

Auxiliary-sub rule:

- Do not add any auxiliary-sub payout multiplier.
- If Seeker / Leviathan auxiliary scanning gets explicit economy hooks later, make them range, access, safety, or scan-speed benefits, not credit multipliers. This prevents late-game scan payouts from compounding with scanner levels.

## Before / After Estimates

Estimates were made from current source rosters in `src/content.ts`, current rarity rules in `src/helpers.ts`, and articulated manifest entries in `public/assets/generated/articulated-creatures.parts.json`. Values below are base scanner level unless noted.

| Scope | Targets | Current base scan income | Proposed base scan income | Change |
| --- | ---: | ---: | ---: | ---: |
| B1 catalog | 45 | 46,280c | 16,300c | -64.8% |
| B2 catalog | 54 | 71,950c | 30,340c | -57.8% |
| Whole catalog, unique | 187 | 267,240c | 147,880c | -44.7% |

At max scanner under the proposed `+8%/level` rule:

| Scope | Current max-scanner income | Proposed max-scanner income | Change |
| --- | ---: | ---: | ---: |
| B1 catalog | 75,902c | 21,512c | -71.7% |
| B2 catalog | 118,002c | 40,040c | -66.1% |
| Whole catalog, unique | 438,285c | 195,181c | -55.5% |

What changes inside early biomes:

| Scope | Current common+uncommon | Proposed common+uncommon | Current rare | Proposed rare | Current epic/legendary | Proposed epic/legendary |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| B1 | 8,580c | 1,920c | 33,100c | 10,300c | 4,600c | 4,080c |
| B2 | 6,520c | 1,460c | 49,070c | 14,580c | 16,360c | 14,300c |
| Whole catalog | 25,160c | 5,620c | 136,200c | 41,020c | 105,880c | 101,240c |

Representative payout feel:

- Common scan: `320c -> 60c`
- Uncommon scan: `620c -> 140c`
- Plain rare scan: `1150c -> 360c`
- Hostile rare scan: `1330c -> 420c`
- Rare articulated scan: `1870c -> 520c`
- Epic hostile / hazardous scan: about `2280-2320c -> 2040c`
- Epic articulated scan: `2820c -> 2300c`
- Legendary articulated scan: `4320c -> 5100c`

## Scan Quest Rewards

Blunt recommendation: leave scan quest rewards alone for this slice.

`Live Catalog Sweep` currently pays `640 + biome * 460`, so B1 is `1100c` and B2 is `1560c`. After per-scan payouts are reduced, those quest rewards become a useful contract objective instead of a runaway multiplier. They are also limited by active-quest flow and return-to-barge claiming, unlike immediate scan payouts.

Changing scan quest rewards at the same time would make it harder to tell whether the economy improvement came from the scan curve or quest tuning. Revisit quest rewards only after one playtest/progression-measurement pass with the new curve.

## Implementation Slice

Edit:

- `src/helpers.ts`
  - Update `scanRarityCredits()`.
  - Update `scanReward()` danger bonuses and scanner multiplier.
  - Add a tiny helper only if needed to avoid duplicated rarity rank checks.
- `tools/measure_progression.mjs`
  - Mirror the same `scanRarityCredits()` and `scanRewardFor()` rules.
  - Regenerate progression report after implementation.
- `tools/check_fauna_rarity_balance.mjs`
  - Mirror the scan credit curve used in its representative labels.
- `tools/test_progression_tuning_smoke.mjs`
  - Add assertions for the new curve and scanner multiplier.
- `tools/test_biome_creature_balance.mjs`
  - If it already checks articulated scan behavior, add/adjust one assertion so articulated scan danger bonus still exists.

Run:

- `npm run water9:progression-tuning-smoke`
- `npm run water9:fauna-rarity-check`
- `npm run water9:biome-creature-balance-smoke`
- `npm run water9:progression-measurement`

Optional focused addition:

- Add `tools/test_scan_reward_curve.mjs` if the implementation worker wants a clearer, direct test than string assertions. It should evaluate representative targets for common, uncommon, rare, epic, legendary, hostile rare, hazardous epic, rare articulated, epic articulated, and legendary articulated.

## Acceptance Criteria

- Common, uncommon, and rare scan payouts match the proposed curve and are at least 65% lower than the old base values before danger bonuses.
- Epic scans remain around `1800-2300c` depending on danger/articulated status.
- Legendary articulated scans pay about `5100c` at scanner level 0.
- Scanner level 4 increases scan credits by `32%`, not `64%`.
- Scanner range and scan rate behavior are unchanged.
- No auxiliary-sub credit multiplier is added.
- B1 total catalog payout is near `16.3k` base and under `22k` at max scanner.
- B2 total catalog payout is near `30.3k` base and near `40k` at max scanner.
- `water9:progression-measurement` writes an updated report whose scan totals reflect the new mirrored formula.
- Existing rarity classifications do not change.
- Focused tests pass and no source files outside the implementation slice are touched.

## Ready-To-Paste Worker Prompt

```text
You are working in /mnt/nxt-dev/water9. Before editing, run pwd and git rev-parse --show-toplevel and stop if they do not both resolve to /mnt/nxt-dev/water9.

Implement the scan reward rebalance from runs/water9-scan-reward-balance-audit-2026-07-06/proposal.md.

Chosen curve:
common=60, uncommon=140, rare=360, epic=1800, legendary=4200; hostile/hazardous +60 below epic, +240 at epic/legendary; articulated +160 rare-or-below, +500 epic, +900 legendary; scanner credits +8% per level; auxiliary sub gives no credit multiplier.

Keep rarity assignment unchanged. Keep scan quest rewards unchanged. Do not change ore values, shop costs, upgrade costs, sub costs, or charting requirements.

Edit the smallest robust slice:
- src/helpers.ts: update scanRarityCredits() and scanReward().
- tools/measure_progression.mjs: mirror the formula.
- tools/check_fauna_rarity_balance.mjs: mirror representative scan reward labels.
- tools/test_progression_tuning_smoke.mjs and/or a focused scan reward curve test: assert the new curve, scanner multiplier, and articulated/danger examples.
- tools/test_biome_creature_balance.mjs only if its current scan assertions need updating.

Verify with:
npm run water9:progression-tuning-smoke
npm run water9:fauna-rarity-check
npm run water9:biome-creature-balance-smoke
npm run water9:progression-measurement

Acceptance:
- B1 scan total is about 16.3k base and under 22k at max scanner.
- B2 scan total is about 30.3k base and about 40k at max scanner.
- Whole unique catalog scan total is about 147.9k base.
- Epic/legendary payouts remain exciting, especially legendary articulated around 5100c at scanner level 0.
- git status shows only intentional implementation/test/report changes.
```

## Caveats

- The checked-in `public/review/water9-progression-measurement.json` appears stale relative to current source and articulated content; the estimates above use current source directly.
- Runtime articulated spawn availability is filtered by `shouldSpawnArticulatedCreature()`, while logbook/progression views include broader min-biome manifest entries. The proposal intentionally estimates catalog-facing value, not one single spawned world seed.
- This proposal does not address whether B1 has too many rare labels. The requested smallest robust change is payout rebalance; rarity distribution can be a separate pass if early catalog still feels too rich after this.
