Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a read-only codex-dev worker in `/mnt/nxt-dev/water9`.

Goal: propose a concrete scan reward rebalance that reduces early overpay while
preserving exciting epic/legendary discovery payouts.

Context:
- Alex wants an appraisal of current monetary rewards granted by scanning fauna
  and flora.
- Problem: current rewards make the player too rich early.
- Desired direction: only epic and legendary creatures should grant really big
  rewards. Common, uncommon, and rare scans should be scaled down by quite a
  large amount.
- Current HEAD at dispatch: 03b2dad.

Scope:
- Read-only except for your proposal artifact.
- Inspect current economy/progression: scan payouts, scan quests, shop/upgrades,
  ore value/progression tools, and `tools/measure_progression.mjs` or equivalent.
- You may create temporary ignored scratch data only if needed; the required
  durable artifact is the proposal file.
- Do not edit source code.

Artifact:
- Create `runs/water9-scan-reward-balance-audit-2026-07-06/proposal.md`.

Proposal must include:
- Recommended replacement rarity credit curve and danger/scanner/aux-sub rules.
- Before/after estimates for B1 and B2 scan income and whole-catalog scan income.
- A blunt recommendation on whether to change scan quest rewards now or leave
  them separate.
- Implementation slice: exact source files/tools/tests to edit.
- Acceptance criteria for implementation.
- A ready-to-paste next worker prompt for implementing the chosen curve.

Bias:
- Prefer the smallest robust change: likely centralize in `scanRarityCredits` /
  `scanReward`, then update mirrored progression/audit scripts and focused tests.
- Keep epic/legendary feeling valuable, but avoid early rare/common clusters
  rivaling ore sale/quest pacing.

Verification:
- `git status --short` must show only your proposal artifact as new/modified.

Return:
- status
- proposal path
- recommended curve in one compact line
- key tradeoffs in 5 bullets max
- verification
- caveats/blockers
