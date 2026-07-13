You own one bounded commit-capable Water9 lane: refine the existing Diver V3 Concept A seven-frame motion-test slice into a fluid, registration-locked review slice. Do not expand into the full action set or ungate the replacement.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`. Expected starting HEAD is `283794a`; report the actual value. Read the prior gate report at `runs/diver-v3-a-motion-test-2026-07-11/report.md`, its frame plan/metadata/lineage, and inspect the accepted canonical/motion/runtime evidence before editing. Preserve all unrelated dirty state. If any assigned runtime or asset path has pre-existing uncommitted changes, stop and report the collision.

Create `runs/diver-v3-a-refinement-2026-07-11/report.md` as an early stub before lengthy generation, repaint, or screenshot loops, and keep it current.

Implementation target:

1. Use the approved Concept A canonical master and accepted seven motion poses as authority. Apply a shared-material/onion-skin repaint workflow so brass, copper, black bellows, cyan faceplate, gloves, fins, and highlights remain coherent frame to frame.
2. Add the minimum useful locomotion in-betweens needed to make hover and swim read fluidly at normal gameplay timing. Do not bulk-create unrelated clips. Document the final frame/timing plan.
3. Lock helmet, cuirass, backpack, and common pivot registration across adjacent frames. Reduce visible shoulder/helmet breathing and material shimmer while preserving purposeful limb/fin motion.
4. Correct the scanner hand/socket and modular cone alignment through deploy/hold/recover. The scanner must remain visibly operated with both hands and driven by live scan-target state.
5. Produce authored left-facing frames with intentional lighting/asymmetry correction; a raw horizontal mirror is forbidden as final authority. Preserve identical gameplay registration between directions.
6. Integrate behind a clearly named query gate (you may extend the existing `diverMotionTest=v3a` gate or introduce a refinement-specific value, but document it). Default gameplay must remain unchanged. The live path must load the new bitmap assets, not old sprites, procedural stand-ins, or stale cached images.
7. Keep high-resolution masters, transparent runtime exports, metadata, generation/edit lineage, and a SHA-256 manifest under `runs/diver-v3-a-refinement-2026-07-11/`; runtime assets may go under the established public generated-assets path. Binary alpha/transparent RGB hygiene and fixed pivots must be validated.

Visual proof is mandatory and manager acceptance remains authoritative. Run a focused Playwright normal-play smoke on an available port in 5180–5199 (never kill processes outside that range). Capture the actual `#game canvas`, not only a harness/contact sheet, at gameplay scale for surface, mid, and deep bands straddling representative biome cutoffs. Capture hover/swim progression, scanner deploy/hold/recover against a live target, and both right- and left-facing authored lighting. Include HUD/project identity, color and grayscale boards, native-size/enlarged inspection, adjacent-frame onion-skin/registration overlays, and side-by-side comparison against the accepted prior motion prototype. Prove at least one newly added in-between and one authored left-facing bitmap were fetched by the browser and their response SHA-256 exactly matches the local files.

Judge bluntly. Reject/repaint if motion still reads as two-key alternation, if helmet/pack registration breathes, materials flash/shimmer, scanner cone misses its sensor socket, left-facing frames read as raw mirrors, silhouette/anatomy degrades, or grayscale gameplay readability regresses. Do not claim PASS from metrics alone.

Verification:
- `npm run build`
- `npx tsc --noEmit --pretty false` with baseline-vs-new diagnostic assessment if baseline remains red
- focused Playwright normal-play smoke and console/page-error audit
- export dimensions/alpha/pivot/bounds/palette or color-coherence checks
- `git diff --check`
- exact browser/local hash proof for new runtime bitmaps
- final `git status --short` and explicit classification of unrelated dirt

Commit the bounded implementation and durable run documentation/evidence manifest if acceptance passes. Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Return: status (PASS/FAIL/PARTIAL), commit hash if any, report path, changed files, frame/timing count, runtime gate, verification results, exact canvas/review artifact paths, bitmap residency hashes, visual caveats, unrelated dirty-state classification, and blockers. Be explicit that this is a refinement review gate and not the full action-set replacement.
