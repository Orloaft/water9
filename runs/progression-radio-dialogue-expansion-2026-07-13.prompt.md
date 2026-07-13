# Worker task: progression-aware radio dialogue across quests and biomes

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You own one integrated narrative/gameplay slice in `/mnt/nxt-dev/water9`: expand the opening-only radio dialogue so the barge crew talks to the player at meaningful quest-completion and biome-progression moments.

Current expected base HEAD is `0817f02`. The repo has substantial unrelated pre-existing dirt under `runs/`; preserve it. Before editing, inspect `git status --short`, identify the exact source/test files you will own, and stop if any target source/test file is already dirty. Do not modify, delete, stage, or clean unrelated work.

First inspect the existing opening dialogue, `RadioMessage` UI/controls, quest completion paths, travel/restart lifecycle, story `heardRadio` persistence, save normalization, story/finale radio conventions, and the existing Water9 voice/lore. Create an early report stub at `runs/progression-radio-dialogue-expansion-2026-07-13/report.md` before lengthy implementation or proof loops.

Implement a small, data-driven progression dialogue layer that reuses the current radio presentation and input behavior.

Behavior requirements:

1. Preserve the current opening conversation.
2. On first completion of each quest, queue and present a context-specific exchange. Cover every current `QuestKind`: `depth`, `scan`, `sample`, `ore`, `nest`, `gulperSurvey`, and `forwardOutpost`. Dialogue should respond to the actual work/result and may include quest/biome-specific details; do not use one generic “contract complete” exchange for all kinds.
3. Add a distinct arrival/debrief conversation for entering each later biome (Biomes 2, 3, and 4). It must survive the `travelToNextBiome()` scene restart and appear at the barge in the newly entered biome, not prematurely in the prior biome.
4. Support multiple progression conversations without clobbering the currently open one. Deliver queued conversations FIFO at a safe transition, using the existing radio modal. Do not spam, reopen every frame, or interrupt another overlay/finale in a broken state.
5. Each progression event is heard once. Save/load must preserve heard identity so already delivered quest/arrival conversations do not replay. Dynamic quest identity may be used where necessary. Normalize legacy saves safely; do not invalidate existing saves or collide with story/finale IDs already in `heardRadio`.
6. Preserve keyboard, pointer, and controller advancement/close behavior, as well as pause/combat safety. The player must resume normally after the final line.
7. Keep narrative code/content separated enough that adding another conversation does not require scattering conditionals through rendering code. Do not over-engineer a general cutscene engine.

Narrative requirements:

- Keep Dr. Vale (geology) and Dr. Sato (marine biology) recognizable from the opening.
- Establish at least one consistent named barge technician/engineer for machinery, hazard, outpost, and submersible topics; reuse that identity rather than inventing a different technician in each exchange.
- Include the diver’s voice in many exchanges. Maintain the existing dry, slightly wary humor without turning every line into a joke.
- Give the later biomes distinct subjects: their local ecology/geology/hazards, what the expedition learned, and what the barge crew needs next. Ground lines in existing Water9 names, mechanics, story milestones, and biome lore—do not invent contradictions or future mechanics.
- Aim for a meaningful expansion: roughly 2–4 lines per quest-kind completion and 4–6 lines per later-biome arrival, at least 30 authored new lines overall. Favor short readable lines over lore dumps.
- Escape/render authored strings safely through the existing UI conventions.

Testing requirements:

- Add deterministic regression coverage proving each of the seven quest-kind completions selects the correct conversation family and only queues once.
- Prove Biome 2, 3, and 4 arrival conversations appear only after the correct travel/restart transition and do not replay.
- Prove two back-to-back events queue FIFO and neither is overwritten.
- Prove save/load preserves heard events and does not replay or corrupt the radio state.
- Prove opening dialogue and dialogue advance/resume still work.
- Run focused quest/story/radio tests, relevant save/load smoke(s), and `npm run build` (or the canonical equivalent).

Runtime acceptance:

- Use only ports 5180–5199. If a port is busy, pick another in range; never kill processes outside it.
- Capture at least two representative live Water9 full-viewport proofs: one quest-completion exchange during normal play and one later-biome arrival exchange at the barge. Include companion `#game canvas` captures so project/runtime identity is auditable. These are UI/content proofs, so representative depth-band/grayscale environment captures are not required unless you change visual styling.
- Check text wrapping, speaker/role labels, buttons, and no clipping at a normal desktop viewport. Do not change visual styling unless required to fix a demonstrated readability defect.
- Write captures under `runs/progression-radio-dialogue-expansion-2026-07-13/artifacts/` and document exact trigger state in the report. Do not commit bulky captures/browser state.

No generated art, no voice synthesis, no unrelated quest balance changes, no broad UI redesign, and no drive-by refactors.

Update `runs/progression-radio-dialogue-expansion-2026-07-13/report.md` with architecture/integration points, the full event/conversation inventory, recurring character voice notes, changed files, precise verification commands/results, capture paths, save compatibility, and caveats. Commit only owned source, tests, lightweight durable report, and any necessary package script change.

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Return:

- status (`COMPLETE`, `BLOCKED`, or `MOUNT_DOWN`);
- commit hash;
- changed files and report path;
- dialogue/event inventory and system summary;
- verification commands/results and runtime capture paths;
- save compatibility notes;
- caveats or blockers, including unrelated dirt left untouched.
