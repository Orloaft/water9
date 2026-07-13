# Worker task: autosave when the docked barge menu opens

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You own one bounded feature slice in `/mnt/nxt-dev/water9`: autosave through the existing persistence system each time normal gameplay docks the player and opens the barge menu.

Current expected base HEAD is `34109a3`. The repo has unrelated pre-existing dirt under `runs/`; preserve it. Before editing, inspect `git status --short`, identify the exact source/test files you will own, and stop if any of those target files are already dirty. Do not modify or clean unrelated changes.

Behavior contract:

1. Trigger one autosave on the genuine transition where docking opens the barge menu. Interpret “each time” as once per menu opening, not every render/update tick.
2. Use the existing canonical save serialization/storage path and existing slot semantics. Do not invent a second save format or duplicate state mapping.
3. Do not let initial startup, save restoration, ordinary HUD rerenders, or remaining docked with the menu visible repeatedly overwrite the save.
4. If the player leaves/closes the relevant flow and later docks to open the barge menu again, create a fresh autosave reflecting the newer game state.
5. Preserve manual save/load behavior and schema compatibility. Keep UI changes minimal; if the game already has save feedback conventions, reuse them without disruptive modal behavior.
6. No drive-by refactors and no unrelated visual work.

Start by tracing the dock/menu transition and save pipeline. Create the report stub at `runs/barge-menu-autosave-2026-07-13/report.md` before any lengthy test loop. Implement the smallest robust change at the state-transition boundary.

Add focused automated regression coverage that demonstrates all of the following with observable persisted data/call counts rather than only state flags:

- mutate a representative persisted gameplay value, dock/open the menu, and prove the stored save contains it;
- load/restore that autosave and prove the value returns;
- one menu opening produces exactly one autosave despite rerender/update activity;
- a later legitimate reopening produces another autosave with newer state;
- load/startup does not spuriously autosave over the slot.

Run the most focused relevant tests, the existing save/load smoke where available, and `npm run build` (or the repository's canonical typecheck/build command if different). Use only ports 5180–5199 for any server or browser smoke; if one is busy, choose another in range and do not kill processes outside it. This is behavioral, non-visual work; screenshots are not required unless the existing test harness needs them.

Update `runs/barge-menu-autosave-2026-07-13/report.md` with root integration point, changed files, precise behavior, commands/results, and caveats. Commit only your owned feature/test/report files.

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Return:

- status (`COMPLETE`, `BLOCKED`, or `MOUNT_DOWN`);
- commit hash;
- changed files and report path;
- implementation summary and why the trigger cannot duplicate;
- verification commands/results;
- caveats or blockers, including any pre-existing dirt left untouched.
