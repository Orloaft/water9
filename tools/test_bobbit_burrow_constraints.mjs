import { readFile } from 'node:fs/promises';

const [manifestText, worldgen, articulated] = await Promise.all([
  readFile('public/assets/generated/articulated-creatures.parts.json', 'utf8'),
  readFile('src/scene-worldgen.ts', 'utf8'),
  readFile('src/scene-articulated.ts', 'utf8'),
]);

const manifest = JSON.parse(manifestText);
const bobbit = (manifest.creatures ?? []).find((creature) => creature.id === 'abyssal-mandible-bobbit');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(Boolean(bobbit), 'abyssal-mandible-bobbit runtime manifest is missing');
if (bobbit) {
  assert(bobbit.radius <= 60, `bobbit radius should stay compact for burrow pockets, got ${bobbit.radius}`);
  assert(bobbit.speed?.[1] <= 60, `bobbit max speed should be constrained, got ${bobbit.speed?.[1]}`);
  assert(bobbit.combat?.attackRange <= 165, `bobbit attack range should be shaft-limited, got ${bobbit.combat?.attackRange}`);
  assert(bobbit.combat?.contactPadding <= 26, `bobbit contact padding should match reduced size, got ${bobbit.combat?.contactPadding}`);
  const head = bobbit.parts?.find((part) => part.id === 'head');
  const upperMandible = bobbit.parts?.find((part) => part.id === 'upper-mandible');
  assert(head?.size?.[1] <= 128, `bobbit head height should be reduced, got ${head?.size?.[1]}`);
  assert(upperMandible?.size?.[0] <= 140, `bobbit mandible length should be reduced, got ${upperMandible?.size?.[0]}`);
}

assert(worldgen.includes('const shaftDepth = state.biome >= 4 ? 18 : 16;'), 'bobbit shaft depth was not deepened');
assert(worldgen.includes('const shaftHalf = 1;'), 'bobbit shaft was not narrowed to keep surrounding rock constraint');
assert(worldgen.includes('if (approachRatio < 0.72) return 0;'), 'bobbit site scoring does not require a clean upper approach lane');
assert(worldgen.includes('if (laneWater < 4 || lateralWater < 5) return 0;'), 'bobbit site scoring does not reject cramped or top-only lanes');
assert(worldgen.includes('if (shaftSolid / shaftCells < 0.68) return 0;'), 'bobbit site scoring does not require dense shaft rock');
assert(worldgen.includes('if (lowerPlugSolid < 0.68) return 0;'), 'bobbit site scoring does not require a deep lower plug');
assert(worldgen.includes('y: anchorY,'), 'bobbit burrow active point is not anchored at the deep bottom');
assert(worldgen.includes('approachY: (site.y - 3) * TILE,'), 'bobbit approach lane should remain above the deep anchor');

assert(articulated.includes('BOBBIT_BURROW_LATERAL_LIMIT = TILE * 1.2'), 'bobbit lateral rail limit is missing');
assert(articulated.includes('target.y >= burrow.shaftTopY - TILE * 4'), 'bobbit trigger should be based on shaft top approach lane');
assert(articulated.includes('target.y <= burrow.y - TILE * 1.25'), 'bobbit trigger should require the target above the deep burrow anchor');
assert(articulated.includes('creature.facingSign = 1;'), 'burrow bobbit facing should remain locked to its vertical burrow pose');
assert(articulated.includes('constrainBurrowBobbitToShaft(creature, burrow);'), 'burrow bobbit should be re-clamped to the vertical shaft after movement and collision correction');
assert(articulated.includes('creature.speed * 0.42'), 'burrow bobbit horizontal velocity should be tightly clamped');
assert(articulated.includes('BOBBIT_BURROW_VERTICAL_LEAN_LIMIT = 0.14'), 'burrow bobbit vertical lean limit is missing');
assert(articulated.includes('const burrowPose = isBurrowBobbit(creature);'), 'articulated pose does not branch for burrow bobbits');
assert(articulated.includes('Math.atan2(forward.y, forward.x)'), 'burrow bobbit root rotation should follow the vertical burrow vector');

if (failures.length) {
  console.error('Bobbit burrow constraints smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Bobbit burrow constraints smoke passed.');
console.log('Mandible bobbit is compact, bottom-anchored, shaft-limited, and uses a vertical burrow pose.');
