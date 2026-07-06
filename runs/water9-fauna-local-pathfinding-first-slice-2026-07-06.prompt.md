# Water9 Fauna Local Pathfinding First Slice

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a codex-dev worker for Water9 only. Repo pin: `/mnt/nxt-dev/water9`.

Goal: implement the first local-navigation slice so legacy swimming fauna do
not spawn in bad corridors, wedge between rocks, or jitter back and forth.

Context:
- Starting manager HEAD is `f231778`.
- Read `runs/water9-fauna-pathfinding-appraisal-2026-07-06/proposal.md`.
- Read `runs/water9-fauna-pathfinding-appraisal-2026-07-06/code-audit.md`.
- Appraisal synthesis is `runs/water9-fauna-pathfinding-appraisal-2026-07-06/manager-synthesis.md`.
- First-slice behavior classes already exist: `sessileAttached`,
  `verticalAnchored`, and `benthicWalker`.
- Most swimming fauna still use legacy swimmer steering in `steerFish`.
- Existing unrelated dirty state is present. Preserve it. Do not revert or
  stage unrelated files.

Scope:
- Implement a small local steering/spawn validation slice only.
- Do not implement full A*, flow fields, or a global navmesh.
- Keep anchored/benthic classes on their current behavior paths.
- Add proof tooling and artifacts under
  `runs/water9-fauna-pathfinding-appraisal-2026-07-06/implementation-proof/`.

Likely code changes:
- `src/types.ts`: optional legacy-swimmer nav/stuck fields on `Fish`.
- `src/scene-worldgen.ts`: validated legacy open-water spawn/home selection
  using reachable water/local corridor/radius-clear checks.
- `src/scene-entities.ts`: local terrain feelers around the current target
  vector, stuck detection, reseed cooldown, and terrain-bounce metrics.
- `src/scene-playtest.ts`: expose pathfinding metrics in snapshots or add a
  focused review command if needed.
- `tools/test_fauna_pathfinding_smoke.mjs`: focused Playwright/playtest smoke
  with JSON plus `#game canvas` screenshots.
- `src/scene.ts`: declarations only if new scene methods are added.

Implementation requirements:
- Spawn validation: legacy swimmers should prefer reachable, radius-clear
  water with a local corridor sized by pattern.
- Feelers: sample short horizon terrain around desired target direction and
  blend away before collision.
- Contact response: replace hard whole-vector reversal where practical with
  radius-aware contact resolution that preserves tangential motion.
- Stuck detector: combine repeated terrain bounces, lack of progress, and
  heading flips; reseed temporary target/home only with cooldown.
- Local waypoint sampling: use only as fallback after blocked/stuck state;
  do not maintain global routes.
- Per-pattern envelopes: schools, gliders, stalkers, circle, and sway should
  have small tuning differences.
- Anchored/benthic fauna must stay off the legacy swimmer navigation path.

Verification:
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `node tools/test_fish_visual_facing_smoke.mjs`
- `node tools/test_aggro_cue_regression.mjs`
- `node tools/test_fauna_pathfinding_smoke.mjs`

Visual proof:
- Capture live `#game canvas` images in normal play across surface, mid, and
  deep bands, straddling biome cutoffs where practical.
- Include B1, B2, B3, and B4 samples; include neutral swimmers near terrain,
  one hostile swimmer near terrain, and one first-slice anchored/benthic
  regression sample.
- Save color captures, grayscale captures, a contact sheet, and proof JSON
  under the implementation-proof directory.

Commit safety:
- Stage files by explicit path only. `git add -A`, `git add .`, and
  `git commit -a` are forbidden. Before committing, run `git status --short`
  and confirm every staged path belongs to your assigned stage.
- If verification passes, commit the implementation and proof with a concise
  message.
- Do not push.
- Preserve unrelated dirty state.

Return:
- status
- commit hash if committed
- changed files
- verification commands/results
- proof artifact paths
- caveats/blockers
