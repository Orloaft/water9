# Water9 Fauna Pathfinding Appraisal Proposal - 2026-07-06

## Recommendation

Ship a small local-navigation slice for legacy swimming fauna before considering A* or a navmesh.

The current problem is visible in the code: most swimmers still pick a direct target around `homeX/homeY` or the player, accelerate toward it, and only react to terrain after they have entered a non-water tile. `steerFish` computes a target and pushes velocity straight at it in `src/scene-entities.ts:201`-`src/scene-entities.ts:260`; `keepFishInWater` then backs the fish out, reverses velocity, and lerps the home point toward the collision in `src/scene-entities.ts:263`-`src/scene-entities.ts:273`. That collision-after-the-fact loop is the likely source of fish wedging between rocks and jittering back and forth.

The first implementation should add three narrow pieces around the existing legacy swimmer path:

1. Spawn/home validation for legacy swimmers so open-water fauna are placed in reachable, radius-clear local corridors, not just any water tile.
2. Short-horizon terrain feelers around the current target vector, using the existing terrain mask, so swimmers turn before impact.
3. A conservative stuck detector that reseeds the swimmer's local home/temporary target with cooldown when progress collapses or repeated terrain bounces happen.

This should remain local steering, not full pathfinding. Water9 already has useful terrain primitives: `terrainMaskDensityAt`, `terrainMaskContactForAabb`, `terrainMaskContactForCapsule`, and terrain surface anchors in `src/terrain-mask.ts`. Use those. Do not introduce a global navmesh unless the local slice fails in live normal-play captures.

## Current-Code Grounding

- `updateFish` now dispatches the first-slice anchored classes (`sessileAttached`, `verticalAnchored`, `benthicWalker`) and sends everything else through `steerFish` in `src/scene-entities.ts:31`-`src/scene-entities.ts:46`.
- Legacy swimmers spawn through `makeSchool`; current legacy placement calls `findOpenWaterInBand` in `src/scene-worldgen.ts:903`-`src/scene-worldgen.ts:905`.
- `findOpenWaterInBand` accepts the first random water tile it finds, then falls back to a random coordinate in-band in `src/scene-worldgen.ts:1359`-`src/scene-worldgen.ts:1368`. It does not check fish radius, local corridor size, connected reachability, or whether the fish's future home oscillation crosses terrain.
- The first-slice terrain fauna already reuse terrain anchors and validation: `findFaunaAnchorInBand` samples surface anchors in `src/scene-worldgen.ts:1295`-`src/scene-worldgen.ts:1319`, and anchored fish refresh their anchors in `src/scene-entities.ts:55`-`src/scene-entities.ts:78`.
- Playtest already has a reachable-water BFS for proof positioning in `src/scene-playtest.ts:25`-`src/scene-playtest.ts:83` and a world-survey reachable-water report in `src/scene-playtest.ts:3463`-`src/scene-playtest.ts:3495`. That proves a connected-water concept is already acceptable as tooling and can be extracted or mirrored for spawn validation without becoming per-frame pathfinding.

## Candidate Approaches

### Accept: spawn/home validation

Add a validated legacy-swimmer spawn helper rather than replacing the whole fish system. The helper should reject candidate water tiles unless:

- The tile is in the main reachable water component or another explicitly acceptable connected component.
- A radius-clear check around the candidate passes for `fish.radius + padding`.
- At least one local corridor through the home envelope is clear, sized by pattern: schools need wider horizontal corridors, gliders need longer forward space, sway/circle can accept smaller pockets, stalkers need chase-safe exits.

This directly addresses bad initial homes and avoids fish beginning inside narrow rock teeth. It also keeps behavior classes separate: anchored/benthic fauna still use the surface-anchor path.

### Accept: short-horizon terrain feelers

Add local feelers to legacy swimmer steering before velocity is applied. Sample the current desired direction plus angled side directions, e.g. center, +/-35 degrees, +/-70 degrees at one to three distances scaled by fish radius and speed. If a feeler hits terrain-mask density or tile solid, blend an avoidance vector away from contact and bias toward the clearest side.

This is the lowest-risk fix for visible jitter because it changes the input to `steerFish` before `keepFishInWater` has to bounce. It also fits Water9's terrain-mask model better than tile-only checks because terrain edges are eroded and mask-shaped.

### Accept: stuck detector with target reseeding and cooldown

Track a small amount of runtime state on legacy swimmers: previous target distance/progress, low-speed timer, terrain-bounce count, last reseed time, and maybe a temporary waypoint. Trigger only when several conditions agree, such as repeated `keepFishInWater` corrections, distance-to-target not improving for roughly 1-2 seconds, or heading flips in place while near terrain.

When triggered, reseed the fish's temporary home/waypoint to a nearby clear-water corridor and add a cooldown so it cannot flip every frame. This is important because avoidance alone can still fail in U-shaped pockets.

### Accept as fallback: local waypoint sampling around obstacle edges

Use local waypoint sampling only after the stuck detector fires or when the direct target feeler is blocked. Sample a small ring/arc around the fish or around the blocked direction and choose the clearest point that:

- Is in water and radius-clear.
- Improves distance toward home/target or opens lateral movement.
- Does not immediately intersect terrain feelers.

Do not build a persistent route. Treat this as a temporary "swim around the rock edge" target with expiry.

### Accept as tuning layer: per-behavior movement envelopes

Keep behavior-specific envelopes, but do not overbuild them. For this slice:

- Schools: wider corridor requirement, softer avoidance, more lateral bias so they flow around rocks instead of compressing into one point.
- Gliders: longer forward feeler, slower turn response, avoid sharp oscillation.
- Stalkers: pursuit target remains player-driven, but terrain feelers must override chase when blocked; no direct lunge through rock.
- Circle/sway: smaller local pocket acceptable, stronger home reseed if the oscillation crosses terrain.
- Benthic/anchored classes: keep their existing surface/tangent movement path; do not route them through swimmer feelers except for any first-slice class that falls back to open water.

This can live as a small table keyed by `FishPattern`/`FishBehaviorClass` rather than adding a new taxonomy.

### Reject for now: full grid pathfinding/navmesh

Do not implement A*, flow fields, or a global navmesh in the first pass. The symptom is local: direct steering plus collision bounce around nearby rock. Water9's world is destructible, terrain masks mutate during mining, and fauna counts are high enough that a global route system would add complexity, invalidation work, and new perf risk. A one-time reachable-component map for spawn validation is acceptable; per-fish global routing is not justified yet.

## First Implementation Slice

1. Add a small legacy-swimmer navigation helper, either in `src/scene-entities.ts` initially or a focused module such as `src/fauna-navigation.ts` if the edits get noisy.
2. Extend `Fish` with optional navigation state only for legacy swimmers: `navTargetX`, `navTargetY`, `navCooldown`, `stuckTimer`, `lastProgressDistance`, `terrainBounces` or equivalent. Keep fields optional so anchored fauna do not need migration churn.
3. Replace legacy `findOpenWaterInBand` usage in `makeSchool` with a validated open-water spawn for legacy swimmers. Keep the existing function as fallback, but report fallback counts in playtest proof.
4. In `steerFish`, compute the existing target exactly as today, then pass the target vector through a local avoidance function before applying acceleration.
5. Update `keepFishInWater` so a terrain correction records a bounce/stuck signal instead of silently reversing velocity and moving `homeX/homeY` every time. The current home lerp may be part of the jitter; either gate it behind cooldown or avoid moving home when a temporary waypoint is active.
6. Add a local reseed path: when stuck, sample nearby clear points and set a temporary waypoint for a short duration. Expire it once progress resumes.
7. Add proof metrics to playtest snapshots/review commands: behavior class, pattern, radius, velocity magnitude, terrain-bounce count, stuck/reseed count, current nav target, blocked-feeler count, screen-visible, and displacement over a fixed review interval.

## Risks

- The current home update in `keepFishInWater` is load-bearing for some old behavior feel. Removing it outright could strand fish around stale homes, so first slice should gate or soften it rather than delete it.
- Terrain-mask feelers must be cheap. Sample a small fixed number per nearby/visible fish and avoid per-frame flood fills.
- Radius-clear spawn validation may reduce valid spawn counts in dense biomes. The implementation needs fallback metrics and should avoid silently dropping too many fauna.
- Stalkers must still feel dangerous. Avoidance should bend chase paths around rock, not make hostile fauna passive.
- Anchored/benthic first-slice fauna should not regress. They already have their own terrain-surface update path; the implementation must keep `behaviorClass !== 'legacySwimmer'` out of the swimmer steering lane.
- Dirty state already exists in this worktree. The implementation worker must stage explicit paths only and preserve unrelated changes.

## Exact Verification Plan

Run static checks:

```sh
npx tsc --noEmit --pretty false
npm run build
```

Run focused metric smokes:

```sh
node tools/test_fish_visual_facing_smoke.mjs
node tools/test_aggro_cue_regression.mjs
node tools/test_fauna_pathfinding_smoke.mjs
```

The new `test_fauna_pathfinding_smoke.mjs` should launch Vite on a port in 5180-5199, use `window.__AQUA_PLAYTEST__`, and write JSON under `runs/water9-fauna-pathfinding-appraisal-2026-07-06/implementation-proof/`. It should exercise legacy swimmers near terrain over fixed windows and fail if any sample shows repeated terrain bounces, high heading flip rate, no progress for multiple seconds, or unsupported open-water fallback counts above an agreed threshold.

Normal-play visual proof must capture the live `#game canvas`, not sandbox previews. Required captures:

- Biome 1 surface/upper: schooling fry or minnow around starter rock, plus a glider such as Glass Ray.
- Biome 1 mid/deep near 760-1300 m: Nautilus/circle or Reef Squid/glide near terrain.
- Biome 2 mid/deep near 760-1540 m: Lanternfish or Glass Squid moving around brine/cave edges.
- Biome 3 near 820-1860 m: Bigfin Squid or Abyssal Thread Eel around tighter abyss terrain.
- Biome 4 near 900-2180 m: a neutral deep swimmer plus one hostile stalker/chaser near rock.
- One first-slice anchored/benthic sample to confirm the swimmer changes did not disturb `sessileAttached`, `verticalAnchored`, or `benthicWalker`.

For each visual point, save color and grayscale images plus a contact sheet. The proof JSON should include the exact playtest commands, depth, biome, target species, behavior class, pattern, velocity stats, bounce/reseed counts, blocked feeler counts, and whether the image came from `#game canvas`.

Acceptance rule:

- No visible neutral swimmer sits vibrating against rock or flipping back and forth in the accepted captures.
- Metric smoke shows no repeated terrain-bounce loops for sampled neutral swimmers.
- Hostile swimmers avoid terrain while still preserving chase behavior.
- Anchored and benthic first-slice behavior remains supported and visually attached.
- Build/typecheck pass.

## Ready-To-Dispatch Implementation Prompt

```text
# Water9 Fauna Local Pathfinding First Slice

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are a codex-dev worker for Water9 only. Repo pin: `/mnt/nxt-dev/water9`.

Goal: implement the first local-navigation slice so legacy swimming fauna do
not spawn in bad corridors, wedge between rocks, or jitter back and forth.

Context:
- Manager preflight HEAD for this appraisal was `166b689`.
- Read `runs/water9-fauna-pathfinding-appraisal-2026-07-06/proposal.md`.
- First-slice behavior classes already exist: `sessileAttached`,
  `verticalAnchored`, `benthicWalker`.
- Most swimming fauna still use legacy swimmer steering in `steerFish`.
- Preserve existing unrelated dirty state. Do not stage or commit unrelated
  files.

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
- Stuck detector: combine repeated terrain bounces, lack of progress, and
  heading flips; reseed temporary target/home only with cooldown.
- Local waypoint sampling: use only as fallback after blocked/stuck state;
  do not maintain global routes.
- Per-pattern envelopes: schools, gliders, stalkers, circle, and sway should
  have small tuning differences.

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
- Do not commit unless explicitly asked by the manager.
- Do not stage anything unless asked.
- If asked to stage later, use explicit paths only; never `git add -A`,
  `git add .`, or `git commit -a`.

Return:
- status
- changed files
- verification commands/results
- proof artifact paths
- caveats/blockers
```

## Caveats

- This proposal is read-only and did not run the future verification commands.
- The repo already has unrelated dirty state, including generated fauna assets, run ledgers, `src/content.ts`, and `src/helpers.ts`. Preserve it.
- A one-time reachable-water component for spawn validation is recommended, but per-fish global routing is intentionally out of scope.
