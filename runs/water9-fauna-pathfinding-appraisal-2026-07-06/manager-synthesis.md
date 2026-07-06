# Water9 Fauna Pathfinding Appraisal - Manager Synthesis

Date: 2026-07-06
HEAD: `166b689`

## Result

Appraisal complete. The neutral-fauna rock jitter is most likely caused by legacy swimmer steering, not by the new anchored/benthic behavior classes and not by a missing global navmesh.

The current legacy swimmer loop picks direct pattern/flee/home targets, accelerates toward them without terrain awareness, then reacts after collision through `keepFishInWater()`. That correction uses the center tile, reverses velocity, and can pull `homeX/homeY` toward the bad collision point. If the target remains across rock or inside a narrow pocket, a swimmer can visibly bounce back and forth.

## Evidence

- `code-audit.md`: found center-tile-only reactive collision, terrain-blind steering targets, and open-water spawn/home selection without radius or corridor clearance.
- `proposal.md`: recommends a first local-navigation slice: spawn/home validation, short terrain feelers, stuck detection, cooldown reseeding, and optional local waypoint sampling.
- `runtime-proof.md` and `fauna-pathfinding-runtime-metrics.json`: observed 12 neutral `legacySwimmer` fauna across biomes 1-4 with normal-play `#game canvas` color/grayscale captures. The exact stuck symptom was not reproduced in the proof window.

## Caveat

The runtime lane could not certify the absence of the bug because current playtest output lacks raw `vx/vy`, `facingSign`, center tile, direct terrain contact, home distance, bounce count, stuck timer, blocked feelers, and reseed count for legacy swimmers. The runtime probe derived these from positions and terrain/canvas proxies.

## Recommendation

Implement local navigation first:

1. Validate legacy swimmer spawn/home points against reachable, radius-clear water and local corridor size.
2. Add short-horizon terrain feelers around the desired movement vector so swimmers turn before `keepFishInWater()` has to bounce them.
3. Replace hard velocity reversal with radius-aware contact resolution that preserves tangential motion where possible.
4. Track a conservative stuck signal from repeated terrain bounces, low progress, and heading flips, then reseed a temporary local target with cooldown.
5. Add direct playtest metrics and a focused `tools/test_fauna_pathfinding_smoke.mjs` so the fix is proven with JSON metrics plus live `#game canvas` screenshots.

Do not build A*, flow fields, or a global navmesh yet. The symptom and code evidence point to a local avoidance/home-selection problem, and Water9's destructible terrain would make global routing expensive to keep valid.

## Next Step

Dispatch one commit-capable implementation worker using the prompt embedded in `proposal.md`, with proof artifacts written under:

`runs/water9-fauna-pathfinding-appraisal-2026-07-06/implementation-proof/`
