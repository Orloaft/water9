# Threat/Combat Tightening Audit

Preflight HEAD: `8a04ef5`

Date: 2026-07-07

Scope: read-only audit of drill/cutter damage, stun grenades, dynamite, fauna threat classes, and relevant tests/smokes. The working tree was dirty before this report; caveats are listed at the end.

## Executive Recommendation

Make large articulated fauna immune to the mining drill/cutter as a direct damage source. Keep stun grenades as the normal defensive answer. If Alex wants a kill route, make it an explicit, expensive, multi-dynamite route with special large-threat rules and clear feedback; do not let the existing generic cutter damage continue to chip them down.

The current implementation already makes big threats tough, but not sacred: the cutter can damage any articulated part it can reach, dynamite damages articulated creatures through the same generic lifeform radius path, and the injector knife can also damage them. That means biome 3+ large fauna can be defeated by persistence and fuel, which undercuts the desired "stun, escape, route around" tension.

## Current Truth Table

| Target class | Drill/cutter | Stun grenade | Dynamite/explosive | Collision/ram |
| --- | --- | --- | --- | --- |
| Small passive fish/flora | Cutter can hit nearest fish/flora within `radius + scaledEntity(20)` and kill via `damageLifeTarget`; passive fish do not aggro but can die. Stun does not affect non-hostile fish. | No effect on passive fish because `triggerStunPulse` skips non-hostile fish. | Damages fish/flora in blast radius; one dynamite is often lethal to small fish because `DYNAMITE_LIFE_DAMAGE = 85`. | Passive fish bump/push the player, no hull damage. |
| Normal hostile fish | Cutter damages and can kill; hit aggroes hostile fish. Typical biome 3 hostile fish HP is about 76-98 from `fishMaxHp`. | Stuns hostile fish for `STUN_GRENADE_DURATION = 5s`, clears aggro, heavily damps velocity. | Damages and often kills in one blast, depending falloff. | Contact deals hull damage based on radius, biome, impact; venom applies only to Blue-ring Octopus. |
| Large/articulated fauna | Cutter currently damages the closest articulated part before normal fish/flora. It can cripple/sever parts and kill the creature when aggregate HP reaches zero. Big B3 examples: Abyssal Gulper `hp330`, Serpent `hp450`, Chainmaw `hp245`. | Stuns every non-dead articulated creature in `STUN_GRENADE_RADIUS + creature.radius` for `5 * 0.72 = 3.6s`, clears aggro, damps velocity, releases bobbit drag. It does not check `hostile`. | Dynamite calls `damageLifeInRadius`, which also calls `damageArticulatedInRadius`; nearest part takes up to `85` damage with falloff. Multiple blasts can already kill large articulated creatures. | Dangerous articulated parts deal substantial hull damage; lunge/grab states amplify contact. Bobbit drag can be broken by stun, knife, struggle, or kill. |

## Evidence

- Mining drill path:
  - `src/scene-combat.ts:59` `mineAt` first checks `cutNestTarget`, then `cutLifeTarget`, before terrain mining.
  - `src/scene-combat.ts:245` `cutLifeTarget` checks `nearestArticulatedDamageTarget(worldX, worldY, scaledEntity(26))` first.
  - `src/scene-combat.ts:260` applies `damageArticulatedPart(..., LIFE_CUTTER_DAMAGE + miningUpgradeBonus() * 2.8, 'Cutter')`.
  - `src/constants.ts:61` and `:62`: `LIFE_CUTTER_FUEL_COST = 1.15`, `LIFE_CUTTER_DAMAGE = 18`.
  - `src/scene-articulated.ts:1817` `damageArticulatedPart` reduces part HP and creature HP, aggroes the creature, can sever parts, and sets `dead = true` when HP reaches zero.

- Normal fish/flora damage:
  - `src/scene-combat.ts:288` `nearestLifeDamageTarget` finds fish and flora in range.
  - `src/scene-combat.ts:305` `damageLifeTarget` applies generic HP damage, aggroes hostile fish, and kills when HP reaches zero.
  - `src/helpers.ts:2690` `fishMaxHp` computes fish HP from radius, hostility, and current biome.

- Stun grenade:
  - `src/constants.ts:38-40`: cost `850`, radius `310`, duration `5`.
  - `src/content.ts:73-81`: shop entry sells "Stun Grenade" and describes predator disorientation.
  - `src/scene-combat.ts:661` `triggerStunPulse` stuns hostile fish only, but stuns all non-dead articulated creatures within range.
  - `src/scene-combat.ts:673-681`: articulated stun duration is `STUN_GRENADE_DURATION * 0.72`, velocity is damped, bobbit drag releases.
  - `src/scene-combat.ts:850-879`: selected consumables are removed from cargo, then stun/dynamite/flare effects fire.
  - `src/scene-economy.ts:71-89`: shop purchases consume credits and one cargo slot; tools are single-owned, consumables can stack by cargo slot.

- Dynamite:
  - `src/constants.ts:41-43` and `:63`: cost `200`, terrain radius `2` tiles, land fuse `0.42s`, life damage `85`.
  - `src/content.ts:82-89`: shop entry sells "Dynamite" as a compact mining blast.
  - `src/scene-combat.ts:624` `detonateDynamite` breaks mineable terrain and calls `damageLifeInRadius(..., TILE * (DYNAMITE_RADIUS_TILES + 1.2), 85, 'Dynamite')`.
  - `src/scene-combat.ts:340-351`: `damageLifeInRadius` damages fish/flora and then articulated creatures.
  - `src/scene-articulated.ts:1864-1875`: `damageArticulatedInRadius` hits the closest articulated part with falloff clamped to `0.3..1`.
  - `src/scene-entities.ts:1031-1043`: thrown dynamite detonates after landing/fuse or when item life expires.

- Collision/ram:
  - `src/scene-entities.ts:596-635`: fish contact pushes the player and hostile fish damage hull.
  - `src/scene-articulated.ts:848-860`: articulated collision only proceeds when not stunned and dangerous part is in contact.
  - `src/scene-articulated.ts:1750-1787`: articulated contact damage scales with biome, radius, lunge/grab strike, and combat multiplier; lunge can enter grab.
  - `src/scene-articulated.ts:981-1001` and `:1726-1747`: bobbit drag releases on stun/knife/kill/struggle and drains hull/oxygen while held.

- Large threat roster:
  - `public/assets/generated/articulated-creatures.parts.json` contains B3+ large articulated threats: Abyssal Serpent `hp450/r82/legendary`, Abyssal Gulper `hp330/r82/legendary`, Chainmaw Eel `hp245/r68/epic`, Hookjaw Isopod `hp260/r62/epic`, plus B4 Crownmaw/Riftmaw/Reliquary Wyrm.
  - `src/articulated.ts:251-258` infers articulated behavior from IDs; serpent/gulper/maw are serpent-like, rays/boxers/mantis are chargers, coral/shelf/anemone/harp are territorial, fallback is ambusher.
  - `src/articulated.ts:319-335` controls spawn budget and whether prototype articulated creatures spawn.
  - `src/articulated.ts:400-435` creates runtime creatures with `radius = manifest.radius * ENTITY_SCALE`, `hp = manifest.hp`, and `hostile` inferred unless explicitly overridden.
  - `src/scene-articulated.ts:41-65` defines combat defaults by behavior.
  - `src/scene-articulated.ts:1173-1249` chases/lunges when hostile and within detection/leash/attack ranges.

## Economy and Anti-Cheese Observations

- Stun grenades are expensive relative to dynamite: `850c` vs `200c`, and both take one cargo slot. That supports "stun as premium defense," but also makes dynamite a suspiciously cheap kill tool if large threats remain blast-killable.
- Stun has no cooldown or diminishing returns beyond cargo/credits. Chain stunning is possible if the player stocks enough grenades. That is probably fine as an expensive escape plan, but it should be intentional.
- Stun range is centered on the player and can catch articulated creatures at `radius + 310`, so the biggest creatures are easier to tag than small fish. It also appears to ignore line of sight/terrain.
- Stun status copy says predators are stunned for `5` seconds even though articulated threats get `3.6` seconds.
- Dynamite is terrain-triggered, not creature-proximity-triggered, so using it as a large-threat kill route would be awkward unless the creature is near terrain or the player waits for sink/fuse timing.
- Cutter damage has no target class gate. Because `cutLifeTarget` checks articulated first, large fauna near the drill aim point can be intentionally chipped.

## Recommended Rule Set

Preferred:

1. Large articulated threats are not killable by cutter/drill.
2. Stun grenades remain the normal answer: reliable disable, escape window, bobbit release, no kill.
3. Dynamite is optional as a deliberate high-cost exception, but only if tuned separately from mining dynamite:
   - Require a "largeThreatExplosiveHits" counter or armor gate rather than raw generic HP.
   - Require 3+ close blasts for B3 epic/legendary and 4-5 for B4 legendary.
   - Increase effective cost if this becomes a combat option, because current `200c` dynamite is too cheap next to `850c` stun.
   - Add explicit feedback like "armor cracked" / "shell ruptured" / "threat killed by blast" so players learn this is exceptional.

Alternative if we want maximum tension: large articulated threats are never killable by player tools; only stunned, driven off, severed/disarmed, or escaped. This has the cleanest fantasy and least farming risk, but can feel unfair if a threat camps a mission route.

Compromise I recommend implementing first: "drill cannot reduce large articulated HP; drill can only cause a brief recoil/hurt flash or nothing. Stun is the normal answer. Dynamite can damage large threats only after a follow-up slice decides economy and feedback." This removes the current unwanted drill solution without committing to a kill meta.

## Implementation Slices

1. Classification slice:
   - Add a helper such as `isLargeArticulatedThreat(creatureOrManifest)` based on `kind === 'articulated'`, `manifest.minBiome >= 3` or `radius >= 60`, and `hostile/behavior !== passive`.
   - Consider manifest data over inferred ID strings so accepted/prototype content can opt in/out.

2. Cutter immunity slice:
   - Gate `cutLifeTarget` or `damageArticulatedPart` so source `'Cutter'` cannot reduce HP for large articulated threats.
   - Preserve special bobbit/knife escape behavior; do not accidentally block `Injector knife` if it remains intended for close-grab escape.
   - Add player feedback: "The cutter skates off the armored hide. Use stun to escape."

3. Stun polish slice:
   - Keep articulated stun, bobbit release, and velocity damping.
   - Fix status duration copy for articulated vs fish, or report "predators stunned" without a specific second count.
   - Decide if stun should require line-of-sight or if the fantasy is a sonar-like pulse through terrain.

4. Dynamite decision slice:
   - If killable-by-TNT is approved, do not rely on current generic `85` HP damage alone. Add explosive armor counters or per-class multipliers.
   - Raise combat TNT cost or introduce a separate depth charge if large-threat killing is meant to be rare.
   - Add stateful feedback and prevent credit/scan farming loops from threat kills.

5. Tests/smokes:
   - Unit/static smoke: cutter does not call HP-reducing path for `isLargeArticulatedThreat`.
   - Playtest command: spawn B3 gulper/serpent, record HP, apply cutter/knife/stun/dynamite commands, assert cutter no HP loss, stun sets timer and clears aggro, TNT changes only approved kill counter/HP.
   - Economy smoke: stun and TNT purchase/use consume credits/cargo correctly; no free repeated use.
   - Regression smoke: normal hostile fish remain cutter-killable; small B2/B3 non-large articulated behavior follows the chosen rule.
   - Bobbit smoke: stun and knife still release drag after the large-threat gate.

## Current Test Coverage Related to This Area

- `package.json` exposes `water9:biome-creature-balance-smoke`, `water9:articulated-spawn-budget-smoke`, `water9:articulated-terrain-collision-smoke`, `water9:articulated-sim-budget-smoke`, `water9:submarine-articulated-smoke`, and many content/articulated validation scripts.
- `tools/test_biome_creature_balance.mjs` checks B3/B4 articulated spawn/buff values and that playtest snapshots expose combat damage fields, but it does not assert drill/stun/TNT rules.
- `tools/test_fauna_pathfinding_smoke.mjs` covers legacy fish movement/hostile pathfinding, not combat lethality.
- `tools/test_large_threat_ripple_turning_smoke.mjs` covers large-threat turning presentation, not combat outcomes.
- I found no current smoke that asserts "large threat is not drill-killable" or "multi-TNT only."

## Caveats / Dirty Repo State

This audit reflects the checked-out working tree at HEAD `8a04ef5` plus uncommitted changes already present before the report. Dirty tracked files include key audited files: `package.json`, `src/fauna-behavior.ts`, `src/helpers.ts`, `src/scene-combat.ts`, `src/scene-entities.ts`, `src/scene-playtest.ts`, `src/scene-rendering.ts`, `src/scene-sandbox.ts`, `src/scene-sub.ts`, `src/scene-worldgen.ts`, `src/scene.ts`, `src/terrain-mask.ts`, `src/types.ts`, and several generated assets/reports/tools. There are also many untracked run directories/tools. I did not run build or smokes because this was a read-only research lane and the dirty tree makes pass/fail attribution ambiguous.
