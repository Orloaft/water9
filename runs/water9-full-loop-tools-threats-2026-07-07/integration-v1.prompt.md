You are the codex-dev worker for Water9. Goal: run the final integration verification for the full-loop progression/tools/threats/story work already landed in this dirty repo, make only narrow integration fixes if the combined slices expose a real break, and produce a manager-reviewable proof package.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo pin: `/mnt/nxt-dev/water9`
Current expected HEAD from manager preflight: `8a04ef5`
Run ledger: `runs/water9-full-loop-tools-threats-2026-07-07.md`
Your report path: `runs/water9-full-loop-tools-threats-2026-07-07/integration-v1-report.md`

Context:
- Prior slices implemented:
  - final Crownmaw proof must be returned to the barge before victory.
  - large articulated threats are immune to drill/cutter HP damage; stun still works; dynamite remains the explicit blast route.
  - selected-tool state and quickbar exist for drill/scanner/sonar/sampler/flare/stun/charge.
  - sampler is a real unlocked flora-only tool with sample persistence and distinct rewards.
  - B1-B4 pinned expedition milestones sit above contracts and persist independently of active contracts.
- Read the existing slice reports before testing:
  - `runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-report.md`
  - `runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-report.md`
  - `runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-report.md`
  - `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-report.md`
  - `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-report.md`

Safety:
- The repo is intentionally dirty from prior full-loop slices and other Water9 work. Classify dirty state before touching files and preserve unrelated changes.
- This is one integration-owner lane. You may edit only if a verification failure identifies a real integration issue, and only the narrow files needed for that fix.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- If required source files overlap pre-existing dirty work, do not commit; report the no-commit reason. Do not revert or overwrite unrelated dirty work.
- Dev server/smoke ports: 5180-5199 only. If a port is busy, pick another in range; never kill processes outside it.
- Vite must not watch `.desktop-build`.

Required verification:
1. Create the report file early with preflight and dirty-start summary.
2. Run `npm run build`.
3. Run the focused full-loop smoke set:
   - `node tools/test_finale_victory_smoke.mjs`
   - `node tools/test_large_threat_drill_immunity_smoke.mjs`
   - `node tools/test_selected_tools_quickbar_smoke.mjs`
   - `node tools/test_flora_sampler_smoke.mjs`
   - `node tools/test_story_milestones_smoke.mjs`
4. Run compatibility smokes:
   - `npm run water9:save-load-smoke`
   - `npm run water9:sonar-map-controller-smoke`
   - `npm run water9:progression-tuning-smoke`
5. Produce a runtime proof package under `runs/water9-full-loop-tools-threats-2026-07-07/`:
   - one JSON summary, suggested path `integration-v1-proof.json`
   - at least three actual normal-play `#game canvas` captures or viewport captures that clearly include the game canvas/HUD, covering surface/B1, mid/B2 or B3, and deep/B4/finale-adjacent proof.
   - grayscale companions for the captures, or a documented grayscale readability pass generated from those captures.
   - The captures must show runtime identity and relevant UI/state where possible: quickbar/selected tool, sampler/story objective, and finale/deep objective or victory panel.
6. Run `git diff --check` on any paths you touched. If you only generated run artifacts, include those paths.

Acceptance focus:
- Verify the features work together, not just separately:
  - selected-tool primary actions do not break scan/sonar/drill/sampler paths.
  - sampler progress feeds B1/B2 story objectives without consuming the active contract slot.
  - large articulated fauna cannot be killed by drill/cutter, but stun and dynamite routes remain available.
  - final proof returns to the barge and triggers victory without being blocked by B4 story copy.
  - save/load round-trips finale, story, selected tools, unlocked tools, scanned/sampled species, and old-save defaults.

Return block in your final message:
- status: complete / partial / blocked
- report path
- changed files
- proof paths
- verification commands and pass/fail
- commit hash or no-commit reason
- caveats/blockers
