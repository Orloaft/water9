Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a read-only codex-dev worker in `/mnt/nxt-dev/water9`.

Goal: audit the current scan reward formula and every code path that grants
credits for scanning life, so the manager can balance overgenerous early credit
income.

Context:
- Alex reports scan rewards from fauna/flora are currently very high and make
  early progression too rich.
- Desired direction: only epic and legendary creature scans should grant really
  big rewards; common/uncommon/rare life scans need to be scaled down by a large
  amount.
- Current HEAD at dispatch: 03b2dad.

Scope:
- Read source only, except write your report artifact.
- Inspect `src/helpers.ts`, `src/scene-entities.ts`, `src/scene-sub.ts`,
  `src/content.ts`, `src/articulated*`, HUD/catalog code, progression tools, and
  tests that mirror scan reward logic.
- Identify every direct or indirect credit grant related to scanning fauna,
  flora, or articulated creatures.
- Include quest scan rewards only as related economy context; do not let them
  distract from species scan payouts.

Artifact:
- Create `runs/water9-scan-reward-balance-audit-2026-07-06/code-audit.md`.

Report format:
- Current formula: exact functions/files/lines and computed base credits per
  rarity, danger bonuses, scanner multipliers, aux-sub multiplier.
- Credit grant paths: diver scan, aux sub scan, quest scan rewards, any other
  scan-like payout path.
- Risks: duplicated formulas in tools/tests, save/load/catalog assumptions,
  achievements/progression gates that might be impacted.
- Recommended implementation touch points: exact files and tests/tools to update.
- Caveats/blockers.

Verification:
- `git status --short` must show only your report artifact as new/modified.

Return:
- status
- report path
- key findings in 5 bullets max
- verification
- caveats/blockers
