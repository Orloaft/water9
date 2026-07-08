Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement Slice 5, "Pinned B1-B4 Expedition Milestones," for the Water9 full-loop tightening work. Build a small persisted story/progression backbone above optional contracts, using the already-landed final proof, large-threat, selected-tool, and sampler slices.

Context:
- Parent run ledger: `runs/water9-full-loop-tools-threats-2026-07-07.md`
- Prior proposal: `runs/water9-progression-tools-threat-tightening-2026-07-07/tightening-proposal.md`
- Prior closure proposal: `runs/water9-game-loop-closure-analysis-2026-07-07/game-loop-closure-proposal.md`
- Slice 4 sampler report: `runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-report.md`
- The repo is already dirty from previous full-loop slices. Classify dirty files before editing and preserve unrelated changes.

Design target:
- Keep the existing dive/sell/upgrade/contract board economy intact.
- Add a pinned expedition objective layer that does not occupy the one active contract slot.
- Define four authored milestone IDs, one per biome:
  - B1: first survey/license signal. Use existing scan/sample/sonar/depth/charting hooks. It should encourage drill + scanner + sampler + sonar, then return/travel readiness.
  - B2: vent chemistry / gulper route proof. Use sample/scan hooks, hazardous/safe flora if available, sonar/charting, and the B2 apex/threat proof.
  - B3: forward pocket / predator preparation. Use existing `state.forwardOutpost`, Gulper Wake/large predator proof where available, Abyssal Serpent charting proof, and Marlin preparation copy.
  - B4: reliquary/final proof. Use existing final proof flow: ruins/vault progress where available, sampled/scanned ruins flora clue if practical, Crownmaw proof, and return-to-barge victory.
- Show the pinned story objective in the HUD objective panel above or instead of generic charting when active.
- Persist completed story milestones and any lightweight flags through save/load with old-save migration.
- Use `state.sampledSpecies` / `sampledSpeciesCount()` from Slice 4 where useful.
- Do not build radial UI in this slice. Do not redesign the contract board beyond story objective display if not needed.

Likely files:
- `src/types.ts`
- `src/state.ts`
- `src/helpers.ts`
- `src/save-load.ts`
- `src/hud.ts`
- `src/scene-economy.ts`
- `src/scene-entities.ts`
- `src/scene-playtest.ts`
- new smoke under `tools/`, probably `tools/test_story_milestones_smoke.mjs`

Safety:
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- Because this repo has overlapping dirty full-loop work, do not commit if your required files overlap pre-existing dirt. Report "no commit" with the reason instead.
- Dev server/smoke ports must be in 5180-5199. If a port is busy, pick another in range; never kill processes outside it.
- Do not touch Telegram bindings, gateway config, systemd units, cron jobs, or external integrations.

Implementation expectations:
- Add durable story state with a small typed model, e.g. active milestone id, completed milestone ids, heard radio/flags if needed.
- Add helper functions for current pinned expedition milestone, progress evaluation, completion, and objective copy.
- Make story completion listen to existing game state where possible instead of adding a second quest system.
- Keep story milestones tolerant of existing saves and prior progress. If a player already meets requirements, objective copy should advance naturally.
- Add deterministic playtest command(s) that can stage or advance story milestones without brittle long manual loops.
- Add a focused smoke that proves:
  1. old/default saves initialize story state safely;
  2. B1 pinned objective appears and can complete through staged scan/sample/sonar/depth/charting progress;
  3. story completion persists across save/load;
  4. travel/biome progression selects the next pinned milestone;
  5. B4 final proof/victory state coexists with story completion.
- If you alter the new sampler/quickbar smokes, keep the manager hardening: slow startup/restart waits, deterministic restaging after `setBiome`, and base-drill timing that can actually break copper.

Verification:
- `npm run build`
- focused new story milestone smoke
- rerun relevant existing smokes if touched paths require it, at minimum:
  - `node tools/test_flora_sampler_smoke.mjs`
  - `node tools/test_selected_tools_quickbar_smoke.mjs`
  - final proof smoke if B4/finale helpers are touched
- `git diff --check -- <your touched paths>`
- Include runtime HUD screenshot/artifact if the smoke displays the pinned objective.

Report:
- Create/update `runs/water9-full-loop-tools-threats-2026-07-07/story-v1-report.md`.
- Include implementation summary, changed files, story state fields, objective/milestone rules, verification commands/results, proof artifact paths, commit hash or no-commit reason, and caveats.

Return exactly:
- status
- report path
- changed files
- commit hash or no-commit reason
- verification
- caveats/blockers
