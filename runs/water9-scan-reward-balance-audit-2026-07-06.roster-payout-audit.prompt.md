Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a read-only codex-dev worker in `/mnt/nxt-dev/water9`.

Goal: produce a full roster of current scan credit payouts for fauna, flora,
and articulated creatures, grouped by biome/kind/rarity, so we can see exactly
where early money is coming from.

Context:
- Alex says current fauna/flora scan rewards are far too high and make the
  player too rich early.
- Desired direction: common/uncommon/rare scan payouts should drop sharply;
  epic/legendary are the only categories that should feel like big discoveries.
- Current HEAD at dispatch: 03b2dad.

Scope:
- Read source and use small local scripts as needed, but do not change source.
- You may write generated audit artifacts under
  `runs/water9-scan-reward-balance-audit-2026-07-06/`.
- Include all current scannable life:
  - fish/fauna from `biomeFish`
  - flora from `biomeFlora`
  - articulated creatures from the manifest/runtime definitions
- For each target include kind, biome availability/min biome, species/id, rarity,
  hostile/hazardous if applicable, count/spawn hints if available, direct scan
  reward at scanner 0, direct scan reward at likely max scanner for that biome
  if tool helpers expose it, and aux sub reward where applicable.

Artifacts:
- `runs/water9-scan-reward-balance-audit-2026-07-06/scan-payout-roster.json`
- `runs/water9-scan-reward-balance-audit-2026-07-06/roster-report.md`

Report format:
- Totals by biome/kind/rarity.
- Top 20 current payouts, with why each is high.
- Early-game B1/B2 payout summary: first 5, 10, and all reachable scans at
  scanner level 0, plus notes on scanner multiplier if relevant.
- Cases that violate the intended direction: non-epic/non-legendary rewards that
  are still large, and common/uncommon/rare clusters that can be farmed early.
- Data caveats.

Verification:
- `git status --short` must show only your two audit artifacts as new/modified.

Return:
- status
- artifact paths
- key payout findings in 5 bullets max
- verification
- caveats/blockers
