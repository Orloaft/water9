# Glasshook Skulk wall-fold fix — 2026-07-12

## Status

Code and deterministic live-scene regression: PASS. Canvas file capture: BLOCKED by
the workspace's headless Chromium renderer (both Playwright and CDP screenshot paths
hang/close after the live WebGL scenario). This report deliberately does not claim
the required visual proof is present.

## Preflight and dirty start

- Preflight HEAD: `e26a7e7`.
- Repository: `/mnt/nxt-dev/water9`.
- Dirty start: pre-existing tracked edits in older run reports and extensive untracked
  `runs/` evidence. These files are outside this task and will not be changed or staged.

## Deterministic reproduction

1. Serve the game on port 5198 and open `/?playtest=1&biome=1`.
2. Call `glasshookWallFoldReview` with `right-wall`, `left-wall`, or `corner`.
   The hook creates a real Biome 1 open-water pocket, a three-tile terrain wall (and,
   for `corner`, a three-tile top constraint), then runs the live diver-chase and
   articulated/terrain update paths.
3. Before the fix, the Glasshook was in `largeRippleTurnIds`. Its body/tail parts
   took the delayed history-pose branch rather than their parent-anchor path. With the
   first history sample, thorax through tail-fan were all placed at the same history
   point. Wall-side motion then retained reversed topology.

## Root cause and fix

- `src/scene-articulated.ts:33-38` included `abyssal-glasshook-skulk` in the
  large-threat ripple group. The history-pose branch in `updateArticulatedParts`
  bypasses parent-anchor placement for body/tail parts; that is suitable for the
  long, continuously sampled large threats but not Glasshook's short hard segmented
  chain.
- Removed only Glasshook from that group. It now uses the existing anchored spine/joint
  solver, preserving its manifest topology, damage/detachment, terrain correction, and
  all other large-threat behaviour.
- Added `glasshookWallFoldReview` and
  `tools/test_glasshook_wall_fold_regression.mjs`. The smoke requires both facing
  directions plus a corner to retain ordering, zero reversed bends, no non-neighbour
  overlap, <=0.75 px joint error, no ripple runtime, and at least one terrain contact.

## Before/after metrics

| Scenario | Before | After |
| --- | --- | --- |
| Right wall | 1 history sample; min chain dot `-1.000`; 1 reversed bend; overlap `0.779`; joint error `52.387 px` | 0 history samples; min chain dot `0.923`; 0 reversed bends; overlap `0`; joint error `0 px`; terrain contact recorded |
| Left wall | min chain dot `-0.930`; 2 reversed bends; overlap `0.780`; joint error `86.400 px` | min chain dot `0.927`; 0 reversed bends; overlap `0`; joint error `0 px`; terrain contact recorded |
| Corner | history-ripple route susceptible to the same collapsed startup/topology path | min chain dot `0.938`; 0 reversed bends; overlap `0`; joint error `0 px`; terrain contact recorded |

The full post-fix numeric samples are in
`runs/glasshook-wall-fold-fix-2026-07-12/glasshook-wall-fold-regression.json`.

## Changed files

- `src/scene-articulated.ts`
- `src/scene-playtest.ts`
- `src/types.ts`
- `tools/test_glasshook_wall_fold_regression.mjs`
- `package.json`
- this report and the regression JSON

## Visual evidence

The live canvas capture was attempted after each frozen, staged B1 scenario. The
browser renderer either timed out during WebGL screenshot capture or closed the target
page; no PNG/contact sheet/grayscale is retained, rather than substituting a mock or
mislabelled image. This remains the only acceptance gap.

## Commands and results

- `npm run build`: PASS (existing unresolved generated-asset and large-chunk warnings).
- `npm run water9:articulated-terrain-collision-smoke`: PASS.
- `PLAYTEST_URL=http://127.0.0.1:5198/?playtest=1&biome=1 npm run water9:glasshook-wall-fold-regression`: PASS.
- `npx tsc --noEmit --pretty false`: exit 2, baseline pre-existing errors in
  `helpers.ts`, `save-load.ts`, `scene-articulated.ts:858`, `scene-combat.ts:915`, and
  unrelated `scene-playtest.ts` typing; no new errors attributable to this change.
- `git diff --check`: PASS.

## Commit and final status

Commit hash: pending.

Final status: pending commit. Remaining risk: visual canvas proof needs a working
headless WebGL capture path or manual in-client capture; all deterministic live-scene
topology/contact checks pass.
