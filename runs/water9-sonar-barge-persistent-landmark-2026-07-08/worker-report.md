Status: PASS

Root cause:
- The barge was modeled as a normal transient sonar contact in `captureSonarContacts()`.
- `updateSonarPings()` ages `state.sonarContacts` and removes entries after 14 seconds, so the barge contact disappeared like fish/flora/predator contacts.
- The big sonar map also gated its barge drawing on the barge center tile being present in `state.sonarRevealed`.

Fix summary:
- Added a shared canvas helper in `src/scene-rendering.ts` that draws a stable solid barge landmark for both `#sonar-map` and `#big-sonar-map`.
- Draw the persistent barge after terrain/ping rings and before transient contacts/player marker.
- Removed barge insertion from `state.sonarContacts`, preserving fish/flora/predator transient aging.
- Skipped any legacy `kind === 'barge'` contact if an old/save/test path ever leaves one in the transient contact list.
- Added `tools/test_sonar_barge_persistence_smoke.mjs` and wired `npm run water9:sonar-barge-persistence-smoke`.

Changed files:
- `src/scene-rendering.ts` - my changes are the persistent barge sonar helper and small/big map rendering calls around lines 4032, 4116, and 4305. This file already had unrelated dirty changes.
- `src/scene-sonar.ts` - my change removes transient barge contact capture at `captureSonarContacts()`. This file already had unrelated dirty changes.
- `package.json` - added `water9:sonar-barge-persistence-smoke`. This file already had unrelated dirty changes.
- `tools/test_sonar_barge_persistence_smoke.mjs` - new focused Playwright smoke.
- `runs/water9-sonar-barge-persistent-landmark-2026-07-08/` - report, JSON, and screenshots.

Verification commands and results:
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `8a04ef5`
- `pwd` -> `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel` -> `/mnt/nxt-dev/water9`
- `npm run build` -> PASS. Vite emitted existing unresolved asset/chunk-size warnings but completed successfully.
- `npm run water9:sonar-barge-persistence-smoke` -> PASS.

Smoke proof:
- After ping near barge: `sonarPings: 1`, transient contact kinds were only `fish`, and small map barge-color pixels were `321`.
- After 15.2 seconds: `sonarPings: 0`, `sonarContacts: []`, and small map barge-color pixels were `325`.
- Big sonar map: barge-color pixels were `169`, independent of transient contacts.

Evidence artifact paths:
- `/mnt/nxt-dev/water9/runs/water9-sonar-barge-persistent-landmark-2026-07-08/sonar-barge-persistence-smoke.json`
- `/mnt/nxt-dev/water9/runs/water9-sonar-barge-persistent-landmark-2026-07-08/sonar-barge-small-after-ping.png`
- `/mnt/nxt-dev/water9/runs/water9-sonar-barge-persistent-landmark-2026-07-08/sonar-barge-small-after-expiry.png`
- `/mnt/nxt-dev/water9/runs/water9-sonar-barge-persistent-landmark-2026-07-08/sonar-barge-big-map.png`
- `/mnt/nxt-dev/water9/runs/water9-sonar-barge-persistent-landmark-2026-07-08/sonar-barge-full-page.png`

Caveats / remaining risks:
- The HUD sonar canvas remains a local minimap; this fix makes the barge persistent whenever it is in that local view and makes the big sonar map render the known barge unconditionally. It does not add a new offscreen HUD arrow or alter layout.
- `package.json`, `src/scene-rendering.ts`, and `src/scene-sonar.ts` had pre-existing unrelated edits; I preserved them.

Current git status --short summary:
- Assigned/touched paths:
  - `M package.json`
  - `M src/scene-rendering.ts`
  - `M src/scene-sonar.ts`
  - `?? tools/test_sonar_barge_persistence_smoke.mjs`
  - `?? runs/water9-sonar-barge-persistent-landmark-2026-07-08/`
- Pre-existing dirt still present across many unrelated paths, including generated barge/fauna assets, many run directories, `src/fauna-behavior.ts`, `src/helpers.ts`, `src/hud.ts`, `src/save-load.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene.ts`, `src/state.ts`, `src/styles.css`, `src/types.ts`, and several existing/new tools.
