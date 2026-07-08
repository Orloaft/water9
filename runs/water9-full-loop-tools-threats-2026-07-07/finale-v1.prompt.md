Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement Slice 1 of Alex's approved Water9 loop-tightening plan: **Final Proof + Victory Panel**. This is the first vertical slice toward the full progression/tools/threat redesign. Do not implement the tool quickbar, radial menu, flora sampler, pinned B1-B4 story chain, or large-threat damage changes in this slice.

Design sources:
- `/mnt/nxt-dev/water9/runs/water9-game-loop-closure-analysis-2026-07-07/game-loop-closure-proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tightening-proposal.md`
- Ledger: `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07.md`

Important dirty-state warning:
- At dispatch time the repo already had many dirty files, including `package.json`, `src/types.ts`, `src/helpers.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene.ts`, and several run/artifact files.
- Start by running `git status --short` and recording a dirty-start summary in your report.
- Preserve unrelated dirty work. Do not revert, format, or rewrite files outside your assigned slice.
- If a required file is already dirty, inspect it and make the smallest compatible edit. If commit safety is not possible because pre-existing dirt overlaps your changes, still implement and verify, but report that you left the repo uncommitted and explain exactly why.

Required staging rule:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Scope:
1. Add minimal durable finale/story fields needed for:
   - `finalProofRecovered`
   - `endingSeen`
   - any needed final radio/finale flags
2. Persist/restore them with old-save defaults.
3. Change the B4 Crownmaw final-depth scan behavior:
   - currently it sets `state.won = true` immediately underwater.
   - after your change, scanning Crownmaw recovers/records final proof and updates objective/status copy.
   - the player should be told to return to the barge with proof.
4. Trigger actual win when the player docks/returns to the barge with proof. If the existing scene loop makes literal docking impractical, implement a clearly named uplink/return trigger using existing patterns and explain it.
5. Add victory UI parallel to existing loss/menu patterns:
   - final title/copy, e.g. `Proof Recovered` or `The Drowned Architects`
   - run summary using available stats
   - actions: Continue Survey and New Expedition
6. Add final radio/status/achievement copy using existing systems where possible.
7. Add deterministic smoke coverage for:
   - B4 Crownmaw scan -> proof flag set, not immediate win
   - return/docking/uplink with proof -> `won` true and victory UI/panel state
   - save/load default and persistence for finale fields

Out of scope:
- No radial menu.
- No selected-tool quickbar.
- No flora sampler.
- No large-threat drill immunity.
- No TNT rebalance.
- No economy/contract-board rewrite.
- No broad visual asset changes.

Verification:
- Run the focused smoke you add/extend.
- Run `npm run build`.
- If UI behavior is meaningful and feasible in this slice, capture normal runtime proof using a port in 5180-5199. Do not use ports outside that range.

Report:
- Create `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-report.md` early, before long test/capture loops.
- Include:
  - preflight HEAD
  - dirty-start summary
  - implementation summary
  - changed files
  - verification commands and results
  - commit hash if safely committed, or exact uncommitted status/caveat
  - any follow-up needed for Slice 2

Return block:
- status
- report path
- changed files
- commit hash or no-commit reason
- verification
- caveats/blockers
