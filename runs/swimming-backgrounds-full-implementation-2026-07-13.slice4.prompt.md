You are implementing Slice 4, the final integration slice of the approved Water9 swimming-backgrounds proposal.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repository and branch contract:
- Work only in `/mnt/nxt-dev/water9` on branch `swimming-backgrounds`.
- Expected starting product HEAD is `cd0447c79559dcdffbc15dfa9ce6a7a8f10650f5`; verify branch and HEAD before editing. The only permitted pre-existing dirt is the manager-prepared Slice 4 prompt plus its PREPARED ledger line and the manager's Slice 3 visual-acceptance/REPORTED ledger edits in `runs/swimming-backgrounds-full-implementation-2026-07-13.md`. Inspect and preserve those exact scoped changes; stop if any other dirt exists.
- This is the only commit-capable lane. Preserve unrelated state.
- Ports are restricted to 5180–5199. If one is busy, choose another in range. Never kill a process you did not start.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Read first:
- `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md`, including all acceptance gates and Slice 4.
- `runs/swimming-backgrounds-full-implementation-2026-07-13.md`.
- Slice 1, Slice 2, and Slice 3 reports, manifests, focused smoke outputs, and relevant lighting/composition/creature/interaction/performance code.

Goal:
Finish the approved proposal end to end. Add interaction-aware local background/landmark dimming, protect actionable threat and prompt separation, enforce landmark focal-point exclusions around interaction corridors, diagnose and optimize the sustained B4 presentation failure using trace evidence rather than guesses, make deep B4 staging reliable, run a seeded traversal/accessibility matrix, and perform final integrated regression. Preserve the dark/horror direction, B1 surface as the internal benchmark, the legacy diver default, the no-lead option, smooth band continuity, seed-sticky landmark grammar, and the one-visible-sprite water-column budget.

Known carry-forwards that must be attacked, not merely restated:
1. A deep B4 gulper can consume most of the viewport while the diver nearly disappears in grayscale. The rejected read is a screen-swallowing threat/structure with no usable value hierarchy. It must be visibly gone in representative normal traversal and adversarial interaction captures. Keep giant-threat drama through controlled crop, distance, silhouette, and negative space without altering collision/reach dishonestly.
2. Deep B3/B4 threats and the diver inconsistently separate from immediate background. Meet at least 25 luma points of edge contrast for diver and actionable threats in at least 95% of sampled frames, color-derived grayscale included. Do not solve this with a blanket exposure lift.
3. Interaction prompts must remain readable at WCAG 4.5:1 against their actual composited backing. Locally dim background/landmark contribution behind threats, actionable objects, and prompts with bounded, smooth falloff. Do not add another full-screen veil or erase biome identity.
4. Landmark focal points and dominant forms must respect player and interaction corridors. Validate exclusion across seeds, chunks, cutoff blends, and revisit determinism. Non-event background landmarks remain under 45% viewport occupancy and corridor overlap must stay under the proposal's 5% seeded-frame limit; preserve the tighter Slice 2 budgets where already achieved.
5. The B4 sustained test requests 1650 m but repeatedly resolves to 552 m. Fix the playtest/capture staging so the run provably executes settled B4 deep normal play without carving terrain or silently falling back to another biome/depth. Record requested and actual biome/depth plus enclosure classification.
6. The strict 5 s warmup + 25 s B4 Canvas run currently fails at rAF p95/p99 33.4/33.4 ms and 9.43% over 33.34 ms, even though `outer.frameTotal` p95 is 4.8 ms and background composite p95 is 0.7 ms. Capture a browser performance trace because presentation and internal timings diverge. Attribute costs from trace evidence, make only bounded changes supported by that evidence, and rerun the unweakened gate: rAF p95 <=17.5 ms, p99 <=25 ms, under 1% frames over 33.34 ms, no post-warmup long task over 50 ms, `outer.frameTotal` p95 <=8 ms, and combined background/water/landmark/darkness p95 <=1 ms. If the host/browser imposes a proven cadence floor outside product code, document the trace evidence and still remove any product bottleneck the trace proves; never relabel a miss as PASS.
7. Slice 2's blind-recognition cards were invalid because HUD/quest/depth labels revealed biome identity and the deeper silhouette pools remained too dark/generic. Produce truly HUD-free, label-free, randomized, depth-matched cards for at least three representative seeds per biome. Improve existing composition/asset use if needed so each biome has a unique silhouette visible in at least two of three seeds. Do not claim the three-reviewer/80% human gate without three actual independent blind reviews; deliver an auditable anonymous deck and record only reviews actually performed.

Implementation expectations:
- Create the report stub early at `runs/swimming-backgrounds-full-implementation-2026-07-13/slice4-report.md` before long traces/capture loops.
- Centralize local separation/dimming policy and make it deterministic, bounded, and composited in the correct layer order. It must not reveal hidden threats or change gameplay state.
- Protect prompts, actionable entities, and the diver without masking navigation terrain. Define exact measurement ROIs and edge-contrast sampling so the gate cannot pass on HUD pixels or unrelated bright areas.
- Keep world/simulation/collision coordinates unchanged. Any render-scale/crop/alpha changes for giant threats must preserve authoritative hit geometry and telegraph fairness, or explicitly adjust both with focused regression proof.
- Preserve Slice 1 cutoff rules: adjacent pairs <=8 mean-luma points and <=10 percentage points below-luma-24, alpha jump <=0.20, position pop <=4 screen pixels, blend span >=120 m.
- Preserve Slice 2 composition/revisit/chunk determinism and Slice 3 motion/camera/no-lead/aim invariance. Do not promote V3 and do not generate new art unless existing assets demonstrably cannot meet identity after composition changes; if art becomes necessary, stop and report the exact gap rather than silently commissioning it.
- Performance fixes must be trace-backed. Do not weaken thresholds, reduce the 25-second observation, hide tabs, discard slow samples, or remove intended gameplay load simply to force a pass.
- Add focused deterministic tests for local dimming/separation, prompt contrast, interaction-corridor exclusions, giant-threat framing/telegraph integrity, reliable B4 staging, and any optimized hot path.

Runtime and visual proof:
- Use the actual normal-play `#game canvas` with Water9 HUD/runtime identity, Canvas renderer, gameplay zoom, and no review harness for acceptance captures.
- Produce a seeded traversal matrix covering all four biomes, at least three seeds, surface/mid/deep representative bands, every cutoff straddled, and representative calm/threat/interaction states. Include color and grayscale.
- Include adversarial B3/B4 threat and prompt compositions proving the old screen-swallowing/near-invisible read is gone, plus close before/after or baseline-reference comparisons.
- Produce HUD-free, label-free randomized recognition cards separately; these cards are for blind identity review only, not a substitute for normal-play evidence.
- Archive bulky PNG/video/trace/browser artifacts outside git under `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice4/`. Commit only durable reports, prompts, manifests, focused measurements/tests, and intended source changes.
- Write a SHA-256 manifest with provenance, roles, sizes, capture conditions, actual seed/biome/depth, and explicit accepted/rejected-evidence status. Worker captures are evidence, not manager visual acceptance.

Verification:
- `npm run build`.
- New focused Slice 4 smokes.
- Existing save/load, playtest, controller/sonar, biome balance, depth continuity, lighting visibility, background composition, swimming/camera feel, and relevant progression/interactions smokes.
- `npx tsc --noEmit --pretty false`; compare error families to the inherited 25 diagnostics and do not widen them.
- Strict settled B4 5 s warmup + 25 s Canvas performance gate at actual deep B4, with trace and unweakened thresholds.
- Verify generated/bitmap runtime residency only if any existing bitmap integration path changes; no procedural stand-in may be credited as a loaded asset.

Completion:
- Update the run ledger Slice 4 item and final manager-acceptance item with exact measurements, artifact/report/trace paths, honest pass/fail states, and any genuinely external human-review gate left open. Do not mark manager visual acceptance yourself.
- Commit all scoped product/test/report/ledger changes together using explicit-path staging and push `origin swimming-backgrounds`.
- Finish with a clean worktree matching the remote branch. Do not merge to another branch.

Return:
- Status and concise design/performance diagnosis.
- Commit hash and push result.
- Exact changed files.
- Before/after visual, contrast, occupancy, continuity, and cadence measurements.
- All verification results and actual deep-B4 staging proof.
- Evidence/report/manifest/trace paths.
- Honest remaining misses, human-review limitations, inherited failures, and any follow-up decision required.
