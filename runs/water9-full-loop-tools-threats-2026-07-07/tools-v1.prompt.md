Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement Slice 3 of Alex's approved Water9 loop-tightening plan: **Selected Tool State + Quickbar HUD**.

Design sources:
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tightening-proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tool-radial-audit.md`
- `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/finale-v1-report.md`
- `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-report.md`
- Ledger: `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07.md`

Important dirty-state warning:
- The repo is intentionally dirty from pre-existing asset/progression lanes plus Slice 1 finale and Slice 2 threat work.
- Start with `git status --short` and record a dirty-start summary in your report.
- Preserve unrelated dirty work. Do not revert, format, or rewrite files outside your assigned slice.
- Files you likely need are already dirty: `src/types.ts`, `src/state.ts`, `src/save-load.ts`, `src/hud.ts`, `src/styles.css`, `src/scene.ts`, `src/scene-playtest.ts`, maybe `src/scene-sonar.ts` / `src/scene-entities.ts` / `src/scene-combat.ts`.
- Inspect before editing and make the smallest compatible change. If commit safety is not possible because required files overlap pre-existing dirt, do not commit; report the exact reason.

Required staging rule:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Scope:
1. Add explicit tool state.
   - Introduce a narrow `ToolId` type or equivalent local union.
   - Add `state.selectedTool` with default `drill`.
   - Add persisted/unlocked tool state with first-slice defaults: `drill`, `scanner`, and `sonar` unlocked; `sampler`, `flare`, `stun`, and `charge` can exist as locked/coming-soon entries if that fits the HUD, but do not implement their behavior in this slice.
   - Save/load must round-trip selected/unlocked tool state with backward-compatible defaults for old saves.
2. Make active-dive primary action dispatch through the selected tool.
   - During normal diving only, Space / gamepad A / right trigger should call a small selected-tool dispatcher.
   - `drill` dispatches to the existing mining/cutter path.
   - `scanner` dispatches to the existing scan path.
   - `sonar` dispatches to existing sonar ping behavior.
   - Locked or not-yet-implemented tools should show clear status feedback and not consume cargo.
   - Preserve current UI/menu behavior for Space/A. Title, menus, radio, barge dive, pause, sonar map, cargo overlay, and victory panel controls must not regress.
3. Preserve legacy shortcuts during the transition.
   - Existing E / gamepad X scanner still works.
   - Existing Q / LB sonar still works.
   - Existing G / RB cargo item use still works.
   - Mouse/pointer drilling should keep current behavior unless you see an established pattern for selected tool pointer targeting; if ambiguous, leave pointer as drill and document it.
4. Add quick-select controls.
   - Number keys select tools: `1` drill, `2` scanner, `3` sonar for this slice. You may reserve labels for later sampler/flare/stun/charge if the HUD stays compact.
   - Do not build the full radial/wheel yet.
   - Avoid stealing keys already used by critical active controls.
5. Add compact HUD tool strip.
   - Use existing HUD/cargo visual language. It should be compact and readable beside the existing in-dive HUD, not a large tutorial panel.
   - Show selected state, locked state, and key hints.
   - Do not put cards inside cards or make a marketing-style panel.
   - Add/update only concise in-game control copy where the existing UI already lists controls; do not add a large instructional overlay.
6. Extend playtest/debug snapshot enough for deterministic tests to assert selected tool and unlocked tools.

Out of scope:
- No flora sampler extraction behavior.
- No radial/wheel.
- No utility consolidation for flare/stun/dynamite cargo items.
- No B1-B4 story milestone implementation.
- No economy rebalance.
- No visual asset changes.
- Do not change large-threat drill immunity or finale flow except to keep selected tool dispatch compatible.

Verification:
- Add a focused deterministic smoke, e.g. `tools/test_selected_tools_quickbar_smoke.mjs`, covering:
  - default selected tool is drill and primary action mines/cuts as before
  - number key `2` selects scanner and primary action scans an eligible life target
  - number key `3` selects sonar and primary action triggers sonar ping
  - E scanner, Q sonar, and G cargo item shortcut paths still exist/work at least at the state/control level
  - save/load round-trips selected tool or intentionally resets to documented defaults
  - locked tools cannot be selected or cannot fire behavior, whichever model you choose
- Extend existing controller smoke only if that is the least risky place; otherwise leave it and add your own focused smoke.
- Run your focused smoke.
- Run `npm run build`.
- Run `npm run water9:sonar-map-controller-smoke` if your input changes could affect controller routing.
- Capture at least one normal runtime screenshot showing the in-dive HUD tool strip. Use a dev server port in 5180-5199 only and write proof under `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/`.

Report:
- Create `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-report.md` early, before long test/proof loops.
- Include:
  - preflight HEAD
  - dirty-start summary
  - implementation summary
  - exact tool IDs/unlock defaults
  - input/control behavior after the slice
  - changed files
  - runtime HUD screenshot path
  - verification commands and results
  - commit hash if safely committed, or exact no-commit caveat
  - follow-up needed for sampler/Slice 4

Return block:
- status
- report path
- changed files
- commit hash or no-commit reason
- verification
- caveats/blockers
