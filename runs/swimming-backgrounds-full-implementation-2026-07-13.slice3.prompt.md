You are implementing Slice 3 of the approved Water9 swimming-backgrounds proposal.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repository and branch contract:
- Work only in `/mnt/nxt-dev/water9` on branch `swimming-backgrounds`.
- Expected starting product HEAD is `edfbe27f83ddf8b887d113d9560aba66ffd97f2b`; verify branch and HEAD before editing. The only permitted pre-existing dirt is the manager-prepared Slice 3 prompt plus its PREPARED ledger line in `runs/swimming-backgrounds-full-implementation-2026-07-13.md`; inspect and preserve those exact scoped changes, and stop if any other dirt exists.
- This is the only commit-capable lane. Preserve unrelated state.
- Ports are restricted to 5180–5199. If one is busy, choose another in range. Never kill a process you did not start.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Read first:
- `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md`, especially Slice 3 and game-feel gates.
- `runs/swimming-backgrounds-full-implementation-2026-07-13.md`.
- Slice 1 and Slice 2 reports and relevant movement/camera/animation/playtest code.

Goal:
Implement the complete Slice 3 swimming and camera feel pass while preserving the existing legacy diver as the default character family. Tune thrust, drag, reversal, coast, and direction normalization as one coherent curve; add explicit acceleration, cruise, coast/brake, and vertical animation intent using existing compatible legacy animation assets/state where possible; and introduce bounded velocity-weighted camera lead with a spring settle plus a durable no-lead accessibility path. Do not promote V3 implicitly and do not add or generate art in this slice.

Required behavior and numeric gates:
1. In open water with no upgrades, 90% top speed in 350–500 ms, reversal through zero in 250–400 ms, and coast below 10% top speed in 700–1000 ms.
2. Cardinal and diagonal terminal speeds stay within 3%.
3. Collision, mining aim, tool targeting, pointer/controller aiming, and interaction reach remain deterministic under camera lead and while the camera is settling. World/screen transforms must use the authoritative camera state and must not drift by direction.
4. Camera lead is velocity-weighted, bounded to 3–7% of viewport, settles in 150–250 ms after input release, and has zero one-pixel resting jitter. Avoid overshoot or oscillation that causes motion discomfort.
5. Implement a durable no-lead accessibility option/path, exposed through the project's existing settings/accessibility architecture if one exists. It must persist through save/reload or settings persistence as appropriate and immediately/cleanly disable lead without breaking aim.
6. Eight-direction runtime evidence must distinguish acceleration, cruise, coast/brake, and vertical intent without changing the legacy diver identity. If the existing legacy asset sheet cannot honestly provide all distinct visual intents, implement the strongest truthful state mapping available and document the asset limitation; do not fake a new family or claim nonexistent animation.
7. Preserve Slice 1 band/lighting behavior, Slice 2 landmark grammar and one-visible-sprite water budget. Do not touch broader interaction dimming or speculative B4 optimization; those belong to Slice 4.

Implementation expectations:
- Inspect/reproduce baseline timings first and record them in the report.
- Prefer centralized data-driven movement/camera parameters and explicit named states over scattered constants.
- Ensure keyboard and controller paths share the same normalized motion model.
- Camera lead must not change simulation coordinates or collision outcomes.
- Add deterministic focused smokes for the motion curve, eight directions, reversal/coast, camera bounds/settle/no-jitter, no-lead mode, persistence, and aim/collision invariance.
- Create the report stub early at `runs/swimming-backgrounds-full-implementation-2026-07-13/slice3-report.md` before long capture loops.

Runtime/visual proof:
- Capture the actual normal-play `#game canvas` with Water9 HUD/runtime identity, not a review harness.
- Provide eight-direction representative stills at gameplay scale for acceleration/cruise/coast or a clearly indexed sequence that proves the intent states, including vertical up/down and diagonals.
- Provide short normal-play recordings or frame sequences showing acceleration, reversal, release/coast, camera lead, settle, and no-lead behavior. Record camera/player telemetry synchronized to evidence so the 3–7% and 150–250 ms gates are auditable.
- Include color and grayscale representative frames at surface, mid, and deep bands to ensure movement/camera changes did not regress actual playfield readability. Do not claim visual acceptance yourself.
- Archive bulky captures outside git under `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice3/`; commit only the durable report, prompt, manifests, focused tests, and intended source changes.

Verification:
- `npm run build`.
- Focused new movement/camera smoke(s).
- Existing save/load, controller/sonar, biome balance, depth continuity, lighting visibility, and background composition checks relevant to touched paths.
- Run the sustained B4 presentation/performance measurement as a non-regression check. Do not weaken thresholds. Record internal and presentation timings honestly; full optimization remains Slice 4.
- Run `npx tsc --noEmit --pretty false`, compare with the inherited baseline, and do not widen diagnostics.

Completion:
- Update the run ledger Slice 3 item with exact measurements and evidence paths.
- Write a hashed artifact manifest with provenance, roles, and sizes.
- Commit all scoped product/test/report/ledger changes together with explicit-path staging and push `origin swimming-backgrounds`.
- Finish with a clean worktree matching the remote branch.

Return:
- Status and concise design summary.
- Commit hash and push result.
- Exact changed files.
- Baseline vs final motion/camera numbers and all verification results.
- Evidence/report/manifest paths.
- Honest caveats, inherited failures, asset limitations, and Slice 4 carry-forward.
