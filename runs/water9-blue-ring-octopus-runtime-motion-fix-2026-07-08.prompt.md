Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are the single commit-capable write lane for Water9 at `/mnt/nxt-dev/water9`, but DO NOT commit or push. Alex tested after commit `89121a1` and says the Blue Ring Octopus in Biome 1 still looks completely static. Treat this as a runtime visual bug, not a completed asset task.

Context:
- Repo: `/mnt/nxt-dev/water9`
- Current branch should be `ux-work`.
- Prior Blue Ring work claimed four frames with compact arm crawl/pulse, mantle breathing, and ring shimmer.
- Alex's real gameplay read is authoritative: if it looks static during normal play, the previous acceptance was insufficient.
- Relevant prior artifacts likely live in `runs/water9-blue-ring-octopus-animation-2026-07-08/`.
- Relevant runtime/generated files likely include:
  - `public/assets/generated/fauna-shallow-blue-ring-octopus*.png`
  - `src/scene-rendering.ts`
  - `src/scene-articulated.ts`
  - asset build scripts under `tools/`
  - existing `tools/test_blue_ring_octopus_animation_smoke.mjs`

Task:
1. Reproduce and diagnose why the Biome 1 Blue Ring Octopus still reads static in normal gameplay.
   - Check whether the runtime actually advances frames for this fauna.
   - Check whether frame timing, sprite frame selection, caching, scale, or tiny frame deltas make the animation invisible.
   - Capture evidence from the actual live `#game canvas`, not only source sheets or harness-only sprites.
2. Fix the root cause with the smallest scoped change.
   - If runtime frame cycling is broken or too slow, fix that path.
   - If frames technically differ but not enough at gameplay scale, strengthen the generated runtime frames.
   - Motion should be unmistakable but still tasteful: visible tentacle crawl/splay, mantle breathing, subtle body bob, and ring shimmer are acceptable. Avoid jitter, teleporting limbs, anchor drift, or losing the Blue Ring identity.
3. Update or add focused verification.
   - The smoke should prove frame advancement and visible pixel/silhouette deltas over time for the same octopus in normal Biome 1 play.
   - Reuse/update `tools/test_blue_ring_octopus_animation_smoke.mjs` if sensible.
4. Produce proof artifacts in:
   - `runs/water9-blue-ring-octopus-runtime-motion-fix-2026-07-08/`
   Required artifacts:
   - `worker-report.md`
   - live normal-play `#game canvas` screenshots or a contact sheet showing the same octopus across multiple timestamps
   - crop sequence if helpful, but gameplay-scale proof is mandatory
   - grayscale proof
   - smoke JSON with frame/diff metrics

Acceptance bar:
- Normal Biome 1 live `#game canvas` proof must show the octopus visibly changing over time.
- A grayscale viewer should still perceive motion/pose changes.
- The proof must make it clear the old static read is gone.
- Build must pass.

Verification:
- Run `npm run build`.
- Run the focused Blue Ring Octopus smoke, updating the command/report if you rename it.
- If you use a Vite dev server, stay within ports 5180-5199. If a port is busy, choose another in range; do not kill processes outside that range.

Safety:
- Preserve unrelated work. Do not revert user or other-worker edits.
- Stage nothing and commit nothing.
- No destructive git or filesystem commands.
- Keep changes scoped to the Blue Ring Octopus runtime animation and its focused proof/test artifacts.

Return block:
- Status: DONE / BLOCKED
- HEAD observed from preflight
- Root cause
- Changed files
- Proof artifacts
- Verification commands and results
- Caveats / remaining visual risks
