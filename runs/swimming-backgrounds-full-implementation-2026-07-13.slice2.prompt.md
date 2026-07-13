You are the sole commit-capable implementation owner for Water9 Slice 2: composition and landmark grammar.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`
Required branch: `swimming-backgrounds`
Expected starting HEAD: `8aa7f4f`

Read first:
- `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md`
- `runs/swimming-backgrounds-full-implementation-2026-07-13.md`
- `runs/swimming-backgrounds-full-implementation-2026-07-13/slice1-report.md`
- the actual accepted Slice 1 color/grayscale frames listed in its manifest
- current landmark/scenic placement, seeded generation, parallax, and render paths

Goal: implement only Slice 2 of the approved proposal. Establish distinct, stable per-biome composition and landmark grammar using the existing art pool/crops before considering any new assets. Preserve Slice 1's band-blend descriptor as the sole transition authority.

Manager visual rejection evidence you must remove, not decorate:
- In B3 1030/1050 m, a screen-filling circular/structural form swallows the play field and diver; the old full-viewport cluttered read must be gone.
- In B4 1430/1450 m, block-like ruin planes plus the huge circular light field flatten the scene; B4 should read as monumental negative-space axes with controlled silhouettes.
- The B4 shark/actionable threat nearly disappears in grayscale; do not solve this by globally brightening the biome.

Required implementation:
1. Define data-driven per-biome composition budgets for maximum projected landmark area, scale, crop, opacity, dominant/supporting layer count, negative-space axis, and protected player/interact corridor. One non-event background landmark may occupy at most 45% of viewport; corridor overlap must occur in no more than 5% of seeded samples.
2. Make landmark identity and placement seed-sticky across chunks and band boundaries. Crossing a cutoff or revisiting the same seed/location must not reroll or pop the landmark family. Preserve Slice 1's >=120 m crossfade and continuity rules.
3. Curate two or three recognizable existing silhouettes/crops per biome where the existing asset pool permits it. Use existing runtime bitmap assets and prove texture residency/live loading; do not substitute procedural placeholder art. Do not commission/generate new art in this slice. If a biome genuinely lacks enough useful assets, document that exact gap rather than faking variety.
4. Encode the target biome grammar: B1 luminous organic shelves with broad negative space; B2 lateral brine shelves/vent plumes as a horizon; B3 sparse black-coral/structural ribs with long vertical voids; B4 monumental ruin axes and repeated alignment, cropped to guide travel rather than engulfing the diver.
5. Ensure composition budgets interact correctly with Slice 1 corridor attenuation and do not suppress threats, foreground terrain, objectives, or interaction prompts. Avoid additional full-screen passes and preserve the one-visible-sprite water-column budget.
6. Add focused deterministic tests for occupied area, corridor intersection frequency, seed stickiness/revisit identity, cutoff stability, asset residency metadata, and dominant/supporting slot limits.

Visual evidence (mandatory):
- Capture actual normal-play `#game canvas` frames with live HUD/runtime identity, plus grayscale companions, for all four biomes at representative surface/mid/deep bands as applicable and for at least three deterministic seeds/placements per biome. Include the B3 1030/1050 and B4 1430/1450 regression views.
- Produce a shuffled, HUD-free recognition index keyed separately from its answer sheet so the manager can grade biome identity without labels. Do not claim three-human-reviewer evidence if it was not obtained.
- Report per-frame landmark occupied area, corridor overlap, diver/threat edge contrast, texture keys/status, seed/location, and dominant/supporting slot identity.
- Hard visual gates: no non-event landmark >45% viewport; protected corridor overlap <=5% of seeded frames; each biome has a unique readable silhouette in at least two of three representative seeds; no reappearance of the rejected B3 full-viewport clutter; B4 negative space remains navigable in grayscale.

Verification:
- Run `npm run build`, Slice 1 depth continuity and lighting smokes, relevant biome-balance/save-load/playtest tests, and a short regression performance sample. Do not silently weaken existing gates.
- Preserve inherited TypeScript/UI smoke failures unless caused by your changes; report baseline versus after.
- Use only ports 5180-5199; never kill processes outside that range and terminate only servers you started.
- Create an early report stub at `runs/swimming-backgrounds-full-implementation-2026-07-13/slice2-report.md`.
- Put bulky proof under `/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice2/` and commit a durable manifest containing paths, hashes, sizes, roles, seeds, depths, and capture provenance.

Safety and scope:
- One commit-capable lane only; do not spawn other agents.
- Do not implement movement/camera/animation (Slice 3), interaction dimming/performance optimization (Slice 4), add new art, switch the default diver, or make unrelated refactors.
- Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.
- Commit and push the scoped product changes, tests, report/manifest, this prompt, and accurate ledger updates. No force push, rebase, reset, or destructive cleanup.

Return:
- status, commit hash, and push status
- exact changed files and composition design summary
- build/test results and numeric visual/seed-stickiness gates
- report, manifest, shuffled recognition index, and answer-key paths
- explicit visual misses/asset gaps and carry-forward items for Slice 4
- final `git status --short --branch`
