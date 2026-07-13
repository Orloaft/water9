Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are the sole commit-capable implementation owner for `/mnt/nxt-dev/water9`.

Goal: reproduce and fix this player-reported lifecycle regression: after saving and loading a dive, all fauna and flora disappear from the current biome; after proceeding into the next biome, entities exist visually only as green and black squares instead of their real sprites.

Current context:
- Starting HEAD observed by manager: `0a8c44f`.
- The repo already contains unrelated tracked and untracked work, mainly under `runs/`. Preserve it. Inspect `git status --short` before editing and distinguish pre-existing dirt from your files.
- Existing save/load logic is in `src/save-load.ts`; biome generation/restart, entity creation/destruction, texture loading, and render visibility may also be involved. Do not assume serialization is the only cause.
- Existing save/load smokes currently validate player/state round-tripping but apparently miss fauna/flora presence and texture validity.
- Dev servers must use ports 5180–5199. If one is busy, choose another in that range; do not kill unrelated processes.

Work in this order:
1. Create an early report stub at `/mnt/nxt-dev/water9/runs/save-load-entity-sprite-corruption-2026-07-13/report.md` before long browser/proof loops.
2. Reproduce the exact normal-play sequence in a real browser/runtime: enter a biome with visible fauna and flora, save, load that save, then proceed to the next biome. Capture state at three checkpoints: immediately before save, after load has fully completed/settled in the saved biome, and after the next-biome transition has fully completed/settled.
3. Instrument only as needed to establish root cause. At each checkpoint record at minimum:
   - biome and world readiness/loading state;
   - total and visible fauna/fish, flora, articulated creature, and other relevant entity counts;
   - each visible entity sprite's active/visible state, texture key, texture-manager residency, source dimensions, frame/crop dimensions, tint, alpha, and whether the GameObject is still attached to the active scene/display list;
   - texture load/file errors, Phaser warnings, console errors, page errors, and failed HTTP responses.
   Distinguish "entity arrays were cleared/not repopulated" from "entities exist but stale/destroyed sprites are hidden" and from "texture/frame resources became invalid after restart".
4. Identify and fix the root cause. Inspect the full save/load → biome generation/restart → scene cleanup/repopulation → texture creation/loading path. Avoid timing sleeps as the fix. Do not reduce content density, switch to procedural/solid-color substitutes, or paper over invalid sprites with generic fallback squares. Preserve generated/bitmap asset loading through the intended runtime path.
5. Extend or add focused automated regression coverage that fails on the original bug. The test must execute save → load → next-biome transition and assert meaningful nonzero fauna/flora populations plus valid, resident, non-placeholder texture/frame data at both post-load checkpoints. Keep current state round-trip and corrupt-save assertions intact. Make the harness fail on browser/asset errors relevant to this regression.
6. Verify with normal-play actual `#game canvas` captures, not a review harness or DOM screenshot. Save color and grayscale images under `/mnt/nxt-dev/water9/runs/save-load-entity-sprite-corruption-2026-07-13/artifacts/` for before-save, after-load same-biome, and next-biome checkpoints. The images must visibly include representative fauna and flora at gameplay scale, HUD/project identity, and demonstrate that the green/black square rendering is gone. Also retain JSON diagnostics mapping visible sprites to actual loaded texture keys/source dimensions. If WebGL/headless capture fails, try safe in-range browser/runtime alternatives, but do not claim visual acceptance without inspectable canvas PNGs.
7. Run the focused regression, existing `water9:save-load-smoke` and relevant biome-transition/playtest checks, `npm run build`, and `git diff --check`. Run the repo's TypeScript check if separate; classify any baseline-only errors precisely. Do not broadly rewrite tests or unrelated systems.
8. Update the report with root cause, exact changed files, before/after evidence, commands/results, proof paths, remaining risks, dirty-state classification, and commit hash.
9. Commit only the intended source/test/report changes. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Acceptance requirements:
- Exact reported sequence is reproducible before the fix or the report gives equally strong evidence that pinpoints the fault.
- After the fix, fauna and flora remain populated and visibly render actual sprite assets after loading in the saved biome.
- After entering the next biome, fauna and flora remain populated and visibly render actual sprite assets; no green/black squares or invalid texture frames remain.
- Regression coverage proves counts and texture/frame validity, not merely `loadResult.ok` or player-state round-trip.
- Actual live `#game canvas` color and grayscale PNGs exist for all three checkpoints and are suitable for manager visual inspection.
- Build/focused checks and `git diff --check` pass, or a clearly isolated pre-existing failure is documented.
- No unrelated user work is overwritten or staged.

Return:
- status (`FIXED`, `PARTIAL`, or `BLOCKED`);
- root cause and fix summary;
- commit hash and changed files;
- focused and existing verification results;
- exact report and proof artifact paths;
- visual/runtime caveats, remaining risks, and blockers.
