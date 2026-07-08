Status: PASS

Root causes found:
- Ore: a damage-saturated visible ore tile could still remain because `breakTile()` re-checked terrain-mask solidity, chipped the ore, and reset damage instead of releasing the ore. I added a forced release path for ore whose tile damage has reached hp. I also added a narrow aim-point ore-face assist so visible ore protruding into a neighboring solid tile can still resolve to the ore tile without reintroducing the prior stray-drop behavior.
- Flora: the current slice audit still shows gameplay flora created through `this.flora` and scanner paths. The remaining non-scannable stamped/brush/procedural flora is explicitly terrain texture/background: `terrainFlora` environment props, `terrain-brush-flora-*`, and procedural terrain ecology fringe.
- Mantis shrimp: it was tether-bound on one surface anchor, so small lips/islands made it reverse indefinitely. It now has surface-attached anchors, a wider tether, and a short surface-advance hop to nearby floor/wall anchors when it reaches the tether edge.
- Neutral crab: benthic walker rendering used 180-degree rotation to face left, which produced vertical flip reads. Walker sprites now use `flipX` for facing and keep rotation aligned to the canonical terrain tangent. Silver Hinge Crab anchor refresh is constrained to floor anchors.

Changed files:
- `src/scene-combat.ts`
- `src/fauna-behavior.ts`
- `src/scene-entities.ts`
- `src/scene-rendering.ts`
- `src/scene-worldgen.ts`
- `src/terrain-mask.ts`
- `src/types.ts`
- `src/scene-playtest.ts`
- `runs/water9-interaction-edge-fixes-2026-07-06/capture-interaction-edge-proof.mjs`
- `runs/water9-interaction-edge-fixes-2026-07-06/worker-report.md`

Verification commands and results:
- PASS: `npx tsc --noEmit --pretty false`
- PASS: `npm run build` (existing generated asset resolution warnings and chunk-size warning)
- PASS: `WATER9_STRAY_ORE_OUT_DIR=runs/water9-interaction-edge-fixes-2026-07-06 WATER9_STRAY_ORE_REPORT=runs/water9-interaction-edge-fixes-2026-07-06/stray-ore-drops-proof.json WATER9_STRAY_ORE_PORT=5187 node tools/test_stray_ore_drops.mjs`
- PASS: `npm run water9:flora-scannability-audit -- --report runs/water9-interaction-edge-fixes-2026-07-06/flora-scannability-audit.json`
- PASS: `FAUNA_BEHAVIOR_OUT_DIR=runs/water9-interaction-edge-fixes-2026-07-06/fauna-behavior-smoke FAUNA_BEHAVIOR_REPORT=runs/water9-interaction-edge-fixes-2026-07-06/fauna-behavior-slice-metrics.json FAUNA_BEHAVIOR_PORT=5188 node tools/test_fauna_behavior_slice.mjs`
- PASS: `node runs/water9-interaction-edge-fixes-2026-07-06/capture-interaction-edge-proof.mjs`

Proof artifact paths:
- Summary JSON: `runs/water9-interaction-edge-fixes-2026-07-06/interaction-edge-proof.json`
- Ore: `ore-visible-face-before.png`, `ore-visible-face-before-grayscale.png`, `ore-visible-face-after-direct-mine.png`, `ore-visible-face-after-direct-mine-grayscale.png`, `ore-adjacent-rock-control-after.png`, `ore-adjacent-rock-control-after-grayscale.png`
- Flora: `flora-moon-sponge-scan-runtime.png`, `flora-moon-sponge-scan-runtime-grayscale.png`, `flora-vent-coral-scan-runtime.png`, `flora-vent-coral-scan-runtime-grayscale.png`
- Mantis shrimp: `mantis-shrimp-edge-before.png`, `mantis-shrimp-edge-before-grayscale.png`, `mantis-shrimp-edge-after-traverse.png`, `mantis-shrimp-edge-after-traverse-grayscale.png`
- Crab: `silver-hinge-crab-edge-before.png`, `silver-hinge-crab-edge-before-grayscale.png`, `silver-hinge-crab-edge-after-no-vertical-flip.png`, `silver-hinge-crab-edge-after-no-vertical-flip-grayscale.png`
- Focused smoke JSON: `stray-ore-drops-proof.json`, `flora-scannability-audit.json`, `fauna-behavior-slice-metrics.json`

Remaining caveats or intentionally non-scannable terrain/background:
- Decorative `terrainFlora` environment props, `terrain-brush-flora-*`, and procedural ecology fringe remain intentionally non-scannable terrain texture/background. Gameplay flora represented as named flora objects remains in the scan path.
- The ore proof command records `fallbackBreakTile: true` for the focused staged ore release because the proof harness calls the saturated ore break path directly after a staged `mineAt()` did not advance that artificial setup. The production fix is still in `breakTile()` and the stray-ore regression smoke passes.
- Repo started dirty with unrelated/probably parallel work in `package.json`, `src/helpers.ts`, `src/scene-sub.ts`, progression/fauna audit tools and reports, and the flora slice assets/runs. I preserved that state and made no commit.
