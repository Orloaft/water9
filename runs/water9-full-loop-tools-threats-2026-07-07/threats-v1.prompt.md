Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement Slice 2 of Alex's approved Water9 loop-tightening plan: **Large Threat Drill Immunity + stun/TNT rule audit**.

Design sources:
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tightening-proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-report.md`
- Ledger: `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07.md`

Important dirty-state warning:
- The repo is intentionally dirty from pre-existing asset/progression lanes plus Slice 1 finale work.
- Start with `git status --short` and record a dirty-start summary in your report.
- Preserve unrelated dirty work. Do not revert, format, or rewrite files outside your assigned slice.
- Some files you likely need (`src/helpers.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/types.ts`) are already dirty. Inspect and make the smallest compatible edit.
- If commit safety is not possible because required files overlap pre-existing dirt, do not commit; report the exact reason.

Required staging rule:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Scope:
1. Add a clear, reusable large-threat classifier for articulated giant fauna, using existing creature/articulated metadata where possible.
   - Target the big B3/B4 articulated threats, including Abyssal Serpent and Crownmaw-class creatures.
   - Avoid catching normal small fish/fry that should still be drill/cutter killable.
2. Gate mining drill/cutter HP damage against those large threats.
   - Drill/cutter should not reduce large-threat HP.
   - Add feedback using existing status/floating text/audio patterns if available: e.g. armored hide, cutter skates off, stun and escape.
   - Do not break mining ore/terrain/nests.
3. Keep stun grenade defensive behavior working against large threats.
   - Stun should still buy an escape/scan window and release pressure where existing systems support it.
4. Audit TNT/dynamite behavior for large threats.
   - Do not redesign economy or implement a full multi-charge kill route unless the code already has a natural narrow hook.
   - At minimum, make the current TNT behavior explicit in helper/test/report terms so it is not accidental generic drill-style DPS.
   - If generic TNT currently kills giants too cheaply, prefer documenting the risk and adding a narrow guard/constant that future Slice 7 can tune, rather than doing broad balance work now.
5. Add focused deterministic smoke coverage:
   - large threat takes no HP loss from cutter/drill contact/use
   - normal small hostile or non-large fauna still can take cutter/drill HP damage
   - stun still applies to a large threat
   - TNT/dynamite behavior matches the rule you leave in place and is stated in the report

Out of scope:
- No radial menu or selected-tool quickbar.
- No flora sampler.
- No pinned B1-B4 story milestone chain.
- No economy rebalance.
- No contract-board changes.
- No visual asset changes.
- Do not alter the Slice 1 finale flow except as required to keep Crownmaw classification compatible.

Verification:
- Run the focused smoke you add/extend.
- Run `npm run build`.
- Run any existing creature/combat balance smoke that covers articulated fauna if present.

Report:
- Create `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-report.md` early, before long test loops.
- Include:
  - preflight HEAD
  - dirty-start summary
  - implementation summary
  - exact large-threat classification rule
  - TNT/dynamite rule left in place
  - changed files
  - verification commands and results
  - commit hash if safely committed, or exact no-commit caveat
  - follow-up needed for selected tools/Slice 3

Return block:
- status
- report path
- changed files
- commit hash or no-commit reason
- verification
- caveats/blockers
