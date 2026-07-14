You are the sole commit-capable restoration lane for Water9. Restore the
rejected swimming-backgrounds runtime to the known-good pre-proposal behavior
while preserving all historical reports and evidence in git history.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Work only in `/mnt/nxt-dev/water9` on branch `swimming-backgrounds`. The clean
starting HEAD must be `1a909693748dfe2da2792ef85a933358943bdb6a`, equal to
`origin/swimming-backgrounds`; control is `04f9e4d`. Ports are restricted to
5180–5199 and processes not started by this lane must not be killed. Do not use
reset, checkout restoration, history rewrite, destructive filesystem commands,
blanket staging, or implicit commit staging.

Read the manager triage/report ledger and rejected Slice reports first. Make one
forward product-restoration commit that returns `package.json` and all runtime
source behavior exactly to `04f9e4d`: `src/articulated.ts`, `src/helpers.ts`,
`src/hud.ts`, `src/main.ts`, `src/scene-articulated.ts`,
`src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`,
`src/scene.ts`, `src/state.ts`, and `src/types.ts`; remove the post-control
additions `src/interaction-readability.ts` and `src/swimming-feel.ts`. Do not
alter historical proposal reports, evidence manifests, capture tools, or test
tools as product restoration. Before commit, require
`git diff 04f9e4d -- package.json src` to be empty.

Run build/typecheck and relevant control-valid playtest, save/load,
sonar/controller, terrain/collision, and performance checks without weakening
thresholds or repairing inherited fixture failures. Capture actual normal-play
`#game canvas` at gameplay scale for B1 surface, B2 mid, B3 deep, B4 deep, and
useful cutoff pairs in color and grayscale. Archive bulky proof outside git
under
`/home/orlovboros/artifacts/managers/water9/swimming-regression-recovery-2026-07-13/restored-control/`.
Inspect it without claiming manager or Alex acceptance. Confirm legacy diver
selection/scale, hard-centered camera, and old 300/1.45/2.65
thrust/propulsive-drag/coast-drag authority. Report baseline B4 cadence
honestly.

Write
`runs/swimming-regression-recovery-2026-07-13-restoration-report.md` and update
the existing proposal ledger to mark the integrated proposal and `1a90969`
recovery rejected/superseded by this user-directed restoration without
rewriting old evidence. Commit the product restoration, this prompt, report,
and ledger by explicit paths, push `swimming-backgrounds`, and finish clean
with local HEAD equal to the remote tracking ref.
