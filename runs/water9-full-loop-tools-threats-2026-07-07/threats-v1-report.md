# Threats V1 Report

## Preflight

- HEAD: `8a04ef5`
- `pwd`: `/mnt/nxt-dev/water9`
- repo root: `/mnt/nxt-dev/water9`

## Dirty Start Summary

The repo was dirty before this slice began. Pre-existing modified files included `package.json`, generated fauna assets, `public/review/water9-progression-measurement.json`, multiple run artifacts, and source files including `src/fauna-behavior.ts`, `src/helpers.ts`, `src/hud.ts`, `src/save-load.ts`, `src/scene-audio.ts`, `src/scene-combat.ts`, `src/scene-economy.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene-sandbox.ts`, `src/scene-sonar.ts`, `src/scene-sub.ts`, `src/scene-worldgen.ts`, `src/scene.ts`, `src/state.ts`, `src/styles.css`, `src/terrain-mask.ts`, `src/types.ts`, and several tools. There were also many untracked run/artifact directories, including the full-loop ledger directory.

## Implementation Summary

- Added reusable large-threat helpers in `src/helpers.ts`:
  - `isLargeArticulatedThreatManifest()`
  - `isLargeArticulatedThreat()`
  - `largeThreatDynamiteDamageMultiplier()`
- Gated mining cutter/drill contact against large articulated threats in `cutLifeTarget()`. The contact still consumes cutter fuel/cooldown and produces feedback, but exits before `damageArticulatedPart()`, so creature HP and part HP do not drop.
- Left normal fish/flora, nest matter, ore, and terrain mining on their existing paths.
- Left stun grenade behavior intact against articulated creatures. The smoke confirms it still sets a positive stun timer on Crownmaw.
- Made dynamite/large-threat blast behavior explicit with `LARGE_THREAT_DYNAMITE_DAMAGE_MULTIPLIER = 1` and routed articulated radius damage through that helper when `source === 'Dynamite'`.
- Added deterministic Playwright smoke coverage through `largeThreatDrillImmunityReview`.

## Large-Threat Classification Rule

Only articulated creatures can classify as large threats. Normal fish/fry are never passed to this classifier.

An articulated creature is a large threat if either:

- its manifest ID is one of the signature apex IDs: `abyssal-serpent`, `abyssal-gulper`, `abyssal-crownmaw`, `abyssal-riftmaw`, `abyssal-reliquary-wyrm`; or
- its manifest is B3+ (`minBiome >= 3`), `epic` or `legendary`, manifest radius `>= 58`, and non-passive by `articulatedBehaviorFor()`.

This targets the B3/B4 giant articulated fauna, including Abyssal Serpent and Crownmaw-class creatures, without catching normal small fish.

## TNT / Dynamite Rule

Dynamite remains a blast route against large articulated threats in this slice. It is not treated as drill/cutter DPS: articulated blast damage goes through `damageArticulatedInRadius()` and the explicit `largeThreatDynamiteDamageMultiplier()` hook.

Current rule left in place: `LARGE_THREAT_DYNAMITE_DAMAGE_MULTIPLIER = 1`. In the smoke, one Crownmaw-centered dynamite blast reduced Crownmaw HP from `490` to `436.246` and part HP from `539` to `452.3`. This is intentionally documented for Slice 7 tuning rather than rebalanced here.

## Changed Files

- `src/helpers.ts`
- `src/scene-combat.ts`
- `src/scene-articulated.ts`
- `src/scene-playtest.ts`
- `src/types.ts`
- `tools/test_large_threat_drill_immunity_smoke.mjs`
- `runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-smoke.json`
- `runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-report.md`

## Verification

- `node tools/test_large_threat_drill_immunity_smoke.mjs` - passed.
  - Report: `runs/water9-full-loop-tools-threats-2026-07-07/threats-v1-smoke.json`
  - Crownmaw cutter: HP `490 -> 490`, part HP `539 -> 539`, status: `The cutter skates off Abyssal Crownmaw's armored hide. Stun it and run the route.`
  - Crownmaw stun: stun timer `3.6`.
  - Crownmaw dynamite: HP `490 -> 436.246`, multiplier `1`.
  - Normal hostile fauna control: Anglerfish HP `81 -> 63`.
- `npm run build` - passed. Existing Vite warnings remain for unresolved generated asset URLs and large chunk size.
- `npm run water9:biome-creature-balance-smoke` - passed.
- `npm run water9:large-threat-ripple-turning-smoke` - passed.
  - Report: `/home/orlovboros/projects/manager/runs/water9-large-threat-ripple-turning-smoke-2026-06-29.json`

## Commit

No commit.

Reason: commit safety was not possible because required slice files overlapped pre-existing dirty work from the dirty-start state (`src/helpers.ts`, `src/scene-combat.ts`, `src/scene-playtest.ts`, `src/types.ts`). Staging those paths would include unrelated pre-existing changes from other lanes. I did not run `git add`.

## Follow-Up For Slice 3

- Slice 3 can build selected-tool state and quickbar UX on top of the existing `mineAt()` dispatch. The large-threat cutter immunity is already below that future selected-tool layer.
- Keep the direct shortcuts during Slice 3 verification so this smoke can continue proving cutter behavior independent of the selected-tool UI.
- Slice 7 should revisit `LARGE_THREAT_DYNAMITE_DAMAGE_MULTIPLIER` and decide whether TNT remains a normal blast damage route or becomes a tuned multi-charge/special-weak-point rule.
