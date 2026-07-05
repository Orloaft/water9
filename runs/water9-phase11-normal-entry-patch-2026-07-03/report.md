# Water9 Phase 11 Normal Entry Patch Recovery Report

Status: PASS

## Preflight

- `pwd`: `/mnt/nxt-dev/water9`
- `git rev-parse --show-toplevel`: `/mnt/nxt-dev/water9`
- `git rev-parse --short HEAD`: `64835d4`

## Changed Files

Tracked dirty files present during recovery:

- `package.json`
- `src/helpers.ts`
- `src/scene-playtest.ts`
- `src/scene-rendering.ts`
- `src/scene.ts`
- `src/types.ts`

Files that appear to carry the Phase 11 normal-entry behavior:

- `src/helpers.ts`: normal biome 1/2 Phase 11 asset selection, depth-band gating, fade ramp from depth 120 to 232, and screen-space bounds/framing clamps for reused transition landmarks.
- `src/scene-rendering.ts`: rendering support for painterly background layers, anchor sprites, and background presentation.
- `src/scene-playtest.ts`: `backgroundReview` proof command/snapshot support used by the run artifacts.
- `src/scene.ts`: additional parallax/background sprite bookkeeping plus small defensive tile access changes needed by the recovered tree.
- `src/types.ts`: background/depth-band types and playtest commands.

`package.json` contains background-review script additions, but I cannot prove from the recovered state that it belongs specifically to this normal-entry patch rather than earlier background-review work. I did not modify it during recovery.

Untracked proof files for this recovery/patch are under:

- `runs/water9-phase11-normal-entry-patch-2026-07-03/`

There are also many unrelated-looking pre-existing untracked generated assets/tools in the dirty tree (`public/assets/generated/background-phase3/`, multiple `tools/build_*`, `tools/review_*`, and `tools/source-inbox/*`). I left them untouched.

## Verification

- Command: `npx tsc --noEmit --pretty false`
- Result: PASS, exit code 0, no output.

## Screenshot Artifacts

The existing proof report states these are actual `#game` canvas captures. `file` also confirms each is a 1280 x 800 PNG.

- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth119-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth120-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth160-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome1-depth220-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth119-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth120-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth160-canvas.png`: actual `#game` canvas.
- `/mnt/nxt-dev/water9/runs/water9-phase11-normal-entry-patch-2026-07-03/biome2-depth220-canvas.png`: actual `#game` canvas.

The requested missing biome2 depth220 proof was already present when recovery began.

## Visual / Metric Verdict

- No anchor at depth 119: PASS. Metrics show biome 1 and biome 2 at depth 119 remain in `surface` with `phase11AnchorCount: 0`.
- Gradual fade after depth 120: PASS. At depth 120, anchors exist but alpha is still 0. By depth 160, alpha rises to biome 1 `0.062-0.121` and biome 2 `0.061-0.14`. By depth 220, alpha rises further to biome 1 `0.207-0.401` and biome 2 `0.202-0.464`.
- Improved bounds/framing: PASS. Metrics show top offscreen fraction is 0 for all normal-entry anchor cases. Max left offscreen fraction is limited to 0.086 for biome 1 and 0.077 for biome 2. Minimum visible area fraction remains 0.832 for biome 1 and 0.776 for biome 2.

## Caveats

- I recovered from an already dirty working tree, so patch-vs-pre-existing ownership is inferred from the current diff and run artifacts, not from an isolated branch or commit.
- I did not regenerate screenshots because the full requested 119/120/160/220 set for both biomes already exists, including biome2 depth220.
- I did not commit, stage, or touch external/system configuration.
