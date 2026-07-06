Water9 bug hunt: stray ore pickups when drilling plain terrain.

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

Repo pin: `/mnt/nxt-dev/water9`
Port range for any dev server/smoke: `5180-5199`. If a port is busy, pick another in range; never kill processes outside it.

Goal:
Reproduce and fix the bug where drilling ordinary destructible terrain can spawn collectible ore pickups. Ore pickups should spawn only when an actual ore/artifact tile node is mined.

User symptom:
After recent ore cluster drillability work, sometimes drilling through regular destructible wall terrain spawns a bunch of different floating ore. The player can pick them up later, but that should only happen once per actually mined ore node.

Manager context:
- Current manager preflight HEAD was `a70c88c`.
- Existing dirty state before dispatch includes fauna art assets, `src/content.ts`, and an unstaged `src/helpers.ts` spritesheet-loader hunk. Preserve unrelated dirt.
- Relevant code found during manager read:
  - `src/scene-combat.ts`
  - `mineAt()` carves the mining tunnel, damages selected target tiles, then calls `releaseOpenedOreTiles(this, impact)`.
  - `releaseOpenedOreTiles()` scans a 7x7 area around the impact and calls `breakTile()` for any ore tile whose mask looks opened.
  - `breakTile()` calls `spawnLoose()`.
  - `spawnLoose()` creates exactly one valuable pickup when `def.value > 0`, and rubble for non-value terrain.
- Suspicion to prove or disprove: `releaseOpenedOreTiles()` may be releasing nearby hidden/exposed ore during ordinary stone/sand drilling because the tunnel carve opens ore masks around the impact even when no ore node was intentionally mined. Do not patch only by guess; create before/after proof.

Scope:
- Fix the root cause in the mining/drop path only.
- Keep actual ore-node drillability working.
- Do not change ore visuals, worldgen distribution, fauna/content assets, economy pricing, cargo UI, or unrelated helper code.
- Add or extend a focused regression test/smoke that exercises the drop rules.

Expected behavior:
- Drilling plain `stone` or `sand` wall, including near/around hidden ore tiles, must produce zero collectible `kind: 'ore'` or `kind: 'artifact'` loose items.
- Mining an actual visible/targeted ore/artifact tile must produce exactly one collectible loose item for that mined node.
- Harmless rubble/chip effects may still happen for non-value terrain, but they must not be pickupable ore/artifact rewards.
- Dynamite behavior is not the main target unless the same bug is shared there; preserve existing intended behavior unless tests show it is part of the defect.

Verification:
- Add a focused command, test, or playtest smoke. Prefer a deterministic non-visual regression if possible; otherwise use Playwright/playtest commands.
- The proof must report counts split by `looseItems` kind/id/value before and after:
  - plain terrain drilled, no ore target: `0` collectible ore/artifact pickups
  - actual ore node mined: exactly `1` collectible pickup for the mined tile
- Run the focused regression.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run build`.
- Check no listener remains on ports `5180-5199`.

Safety:
- You are not alone in the codebase. Do not revert edits made by others; accommodate existing dirty state.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- Commit only the fix, focused test/smoke, and report/artifact files for this task.

Artifacts:
- Create `/mnt/nxt-dev/water9/runs/water9-stray-ore-drops-2026-07-06/report.md` before long test/smoke loops, then update it before returning.
- If you create JSON proof, put it under `/mnt/nxt-dev/water9/runs/water9-stray-ore-drops-2026-07-06/`.

Return:
- Status: PASS/FAIL
- Commit hash if committed
- Root cause
- Changed files
- Focused before/after proof summary
- Verification commands and results
- Caveats/blockers, especially dirty paths you preserved
