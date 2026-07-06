# Worker Prompt - Water9 Fauna Behavior First Slice Implementation

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Then:

1. `cd /mnt/nxt-dev/water9`.
2. Run `pwd` and `git rev-parse --show-toplevel`; both must be `/mnt/nxt-dev/water9` or STOP and ask.
3. Run `git status --short` and classify the dirty state before editing. The repo already has unrelated dirty fauna/content/helper/run artifacts; preserve unrelated changes.
4. Create an early report stub at `runs/water9-fauna-behavior-first-slice-2026-07-06/report.md` before long proof loops.

Goal: implement the first fauna behavior slice for `sessileAttached`, `verticalAnchored`, and `benthicWalker`.

Use these planning artifacts:

- `runs/water9-fauna-behavior-audit-2026-07-06/manager-synthesis.md`
- `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md`
- `runs/water9-fauna-behavior-audit-2026-07-06/roster-audit.md`
- `runs/water9-fauna-behavior-audit-2026-07-06/code-audit.md`

Scope:

- Keep all non-first-slice fauna on legacy fish movement.
- Fix the biome 1 urchin behavior: `Glimmer Spine Urchin` must be an attached defensive contact hazard, not a chasing fish.
- Implement terrain-surface spawn/update/render support for:
  - `sessileAttached`: Nacre Thorn Clam, Glimmer Spine Urchin, Cinder Vent Clingfish.
  - `verticalAnchored`: Shellback Garden Eel, Tripodfish, Goldcap Tripodfish, Ember Needle Pipefish, Basalt Lantern Seahorse, Copper Banded Seahorse.
  - `benthicWalker`: Snapping Shrimp, Mantis Shrimp, Opal Fan Shrimp, Silver Hinge Crab, Deep Sea Shrimp, Sea Spider, Chimney Ghost Shrimp, Brass Knuckle Prawn, Tin Plate Searobin, Hadopelagic Shrimp.
- Prefer a new `src/fauna-behavior.ts` resolver for the first-slice data so dirty `src/content.ts` does not need a mass edit. Only edit `src/content.ts` if you first confirm its existing dirt is in-scope and safe to preserve.
- Reuse the existing terrain-surface anchor system used by flora/hazards.
- Preserve scan/combat/logbook identity as `kind: 'fish'` for the first slice.
- Add `teleportToFauna`, `faunaBehaviorReview`, and a targeted proof script `tools/test_fauna_behavior_slice.mjs`.
- Use ports only in the 5180-5199 range for dev servers/proof. If a port is busy, pick another in range; never kill processes outside it.
- Nothing else.

Likely files:

- `src/types.ts`
- `src/fauna-behavior.ts`
- `src/scene-worldgen.ts`
- `src/scene-entities.ts`
- `src/scene-combat.ts`
- `src/helpers.ts`
- `src/scene-rendering.ts`
- `src/hud.ts`
- `src/scene-playtest.ts`
- `src/scene.ts`
- `tools/test_fauna_behavior_slice.mjs`
- `runs/water9-fauna-behavior-first-slice-2026-07-06/report.md`

Implementation guidance:

- Add `FishBehaviorClass = 'legacySwimmer' | 'sessileAttached' | 'verticalAnchored' | 'benthicWalker'`.
- Add `TerrainAffinity = 'openWater' | 'nearTerrain' | 'bottom' | 'wall' | 'surfaceAttached'`.
- Add optional behavior fields to `FishSpecies` and runtime fields to `Fish` for behavior class, terrain affinity, `surface?: TerrainSurfaceAnchor`, anchor offsets, refresh timer, retract/walk/lunge state, and support metrics.
- Keep current `steerFish` as the legacy/open-water path.
- Dispatch first-slice fauna around generic fish steering so sessile/vertical fauna cannot chase/flee through open water.
- `sessileAttached`: no translational steering; clamp to cached terrain surface; urchin is defensive contact only and must not lead/chase the player.
- `verticalAnchored`: fixed or near-fixed root; sway/retract/lean; no horizontal fish flee path.
- `benthicWalker`: stay near terrain, move mainly along tangent, pause/skitter/hop; hostile walkers use short local lunge plus recovery, not full water-column pursuit.
- Refresh fauna anchors when terrain under support is mined, mirroring flora refresh behavior. Do not validate every anchored fish every frame.
- Rendering must use behavior-aware pose/origin: legacy swimmers keep `swimPose`; first-slice surface classes use surface normal/tangent and do not pitch from raw `vx/vy`.
- HUD/catalog text for first-slice fauna should say attached/rooted/walks the bottom rather than open-water glide/chase language.
- Playtest snapshots must expose behavior/surface fields so proof is trustworthy.

Verification:

- `npx tsc --noEmit --pretty false`
- `npm run build`
- `node tools/build_small_life_manifest.mjs --check`
- `node tools/test_fish_visual_facing_smoke.mjs`
- `node tools/test_aggro_cue_regression.mjs`
- `node tools/test_fauna_behavior_slice.mjs`

Proof requirements:

- Write JSON metrics and normal-play `#game canvas` screenshots under `runs/water9-fauna-behavior-first-slice-2026-07-06/`.
- Include representative normal-play proof for:
  - Nacre Thorn Clam
  - Glimmer Spine Urchin
  - Cinder Vent Clingfish
  - Shellback Garden Eel
  - Tripodfish
  - Silver Hinge Crab
  - Mantis Shrimp
  - Sea Spider
  - Tin Plate Searobin
- JSON metrics must include behavior class, terrain affinity, surface support, distance from surface/root, velocity magnitude, aggro/chase state, screen visibility, and any fallback/no-anchor cases.
- The urchin proof must show player proximity for roughly 3 seconds without pursuit/chase displacement; anchor displacement should stay under about 10 px and fish-style pursuit aggro should not accumulate.
- For walkers, distance to surface should stay within configured clearance plus tolerance and movement should be mostly along tangent.
- For vertical anchored fauna, base/root should remain fixed while body/top sways/retracts.

Rejection criteria:

- Any first-slice class spawns in open water when a suitable anchor exists.
- Urchin, clam, clingfish, garden eel, or tripodfish uses generic fish chase/flee steering.
- Hostile urchin moves rapidly toward the player.
- Benthic walkers spend sustained time detached from terrain or swim through the water column.
- Surface support mining leaves visible living fauna floating unsupported after refresh.
- Scan, cutter, dynamite, stun, sonar/camera visibility, or HUD catalog behavior breaks for any target.
- Proof screenshots are not from `#game canvas` normal play.

Commit safety:

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Return:

- Status
- Commit hash
- Changed files
- Verification commands and results
- Proof artifact paths
- Any dirty-state caveats or blockers
