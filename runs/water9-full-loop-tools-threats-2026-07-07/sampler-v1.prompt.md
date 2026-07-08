Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working only in repo `/mnt/nxt-dev/water9`.

Goal: implement Slice 4 of Alex's approved Water9 loop-tightening plan: **Flora Sampler MVP + sample objective hooks**.

Design sources:
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tightening-proposal.md`
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/tool-radial-audit.md`
- `/mnt/nxt-dev/water9/runs/water9-progression-tools-threat-tightening-2026-07-07/progression-loop-audit.md`
- `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/tools-v1-report.md`
- Ledger: `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07.md`

Important dirty-state warning:
- The repo is intentionally dirty from pre-existing asset/progression lanes plus Slice 1 finale, Slice 2 threats, and Slice 3 selected-tool quickbar work.
- Start with `git status --short` and record a dirty-start summary in your report.
- Preserve unrelated dirty work. Do not revert, format, or rewrite files outside your assigned slice.
- Files you likely need are already dirty: `src/types.ts`, `src/tools.ts`, `src/state.ts`, `src/helpers.ts`, `src/save-load.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene.ts`, `src/hud.ts`, `src/scene-playtest.ts`, `src/styles.css`.
- Inspect before editing and make the smallest compatible change. If commit safety is not possible because required files overlap pre-existing dirt, do not commit; report the exact reason.

Required staging rule:
Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Scope:
1. Turn the locked `sampler` quickbar entry into a real selected tool.
   - Unlock `sampler` for normal play in this slice so the mechanic is testable before the authored story gate exists.
   - Keep `flare`, `stun`, and `charge` locked/coming-soon.
   - Preserve `drill`, `scanner`, and `sonar` behavior from Slice 3.
2. Add flora-only sample behavior.
   - Primary action with selected `sampler` should target eligible gameplay flora only, not fish, predators, articulated fauna, decorative terrain flora, ore, nests, or terrain.
   - Use close range and a steady short channel similar to scanner/mining timing, with feedback distinct from drill/scanner.
   - Sampling should not normally kill flora and should not grant normal scan credits.
   - Sampling unscanned flora is allowed but should be lower-value/riskier in copy or reward; scanning first should be encouraged.
   - Hazardous flora may sting through existing contact behavior, but do not add a new broad damage system unless there is an obvious narrow hook.
3. Persist sample progress at species level.
   - Add `state.sampledSpecies` or equivalent durable species-level set/map.
   - Save/load must round-trip samples with old-save defaults.
   - Sampling the same species twice should not spam rewards/objective progress.
   - Per-instance harvested/cooldown fields may be transient if needed, but avoid a large world-persistence system.
4. Add small reward/objective hooks.
   - Add a modest first-sample reward or status so sampling feels useful, separate from scan credits. Keep economy conservative.
   - Make scan/quest/story code able to query sample count/species. Do not replace procedural board contracts yet.
   - If there is a clean objective copy hook, update the current goal/control copy so players see "sample flora" as a real action. Do not build the full B1-B4 story milestone chain in this slice.
5. Add HUD/logbook/playtest visibility.
   - HUD tool strip should show sampler unlocked/active.
   - Logbook or a compact catalog detail may indicate whether a flora species has been sampled if that is a narrow local change.
   - Extend playtest snapshot/commands enough to deterministically place/select/sample flora and assert sampled species.

Out of scope:
- No radial/wheel.
- No utility consolidation for flare/stun/dynamite cargo items.
- No B1-B4 pinned expedition milestones. Only sample progress hooks that Slice 5 can consume.
- No economy rebalance.
- No visual asset changes.
- Do not change large-threat drill immunity, finale flow, or quickbar controls except to make sampler real.

Verification:
- Add a focused deterministic smoke, e.g. `tools/test_flora_sampler_smoke.mjs`, covering:
  - sampler is unlocked/selectable
  - selected sampler primary action samples a nearby gameplay flora species
  - sampled species persists in state and does not increment repeatedly for the same species
  - sampling does not add normal scan credit/progress unless the flora was separately scanned
  - sampler does not target fish/articulated fauna/decorative terrain/ore
  - save/load round-trips sampled species
  - existing scanner still scans flora/fauna and drill still damages/mine paths from previous slices are not obviously broken
- Run your focused smoke.
- Run `npm run build`.
- Run `npm run water9:flora-scannability-audit`.
- Run `node tools/test_selected_tools_quickbar_smoke.mjs` to guard Slice 3 behavior.
- Capture at least one normal runtime screenshot showing sampler selected near sampled flora. Use a dev server port in 5180-5199 only and write proof under `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/`.

Report:
- Create `/mnt/nxt-dev/water9/runs/water9-full-loop-tools-threats-2026-07-07/sampler-v1-report.md` early, before long test/proof loops.
- Include:
  - preflight HEAD
  - dirty-start summary
  - implementation summary
  - exact sample state fields and unlock defaults
  - sample targeting/reward rules
  - changed files
  - runtime screenshot path
  - verification commands and results
  - commit hash if safely committed, or exact no-commit caveat
  - follow-up needed for pinned story milestones/Slice 5

Return block:
- status
- report path
- changed files
- commit hash or no-commit reason
- verification
- caveats/blockers
