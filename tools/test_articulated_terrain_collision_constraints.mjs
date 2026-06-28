import { readFile } from 'node:fs/promises';

const articulated = await readFile('src/scene-articulated.ts', 'utf8');
const terrainMask = await readFile('src/terrain-mask.ts', 'utf8');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(articulated.includes('ARTICULATED_TERRAIN_CORRECTION_PASSES = 3'), 'articulated terrain correction should use three small passes');
assert(articulated.includes('const passes = Phaser.Math.Clamp(Math.floor(options.passes ?? ARTICULATED_TERRAIN_CORRECTION_PASSES)') && articulated.includes('for (let pass = 0; pass < passes; pass += 1)'), 'terrain correction pass loop is missing');
assert(articulated.includes('this.updateArticulatedParts(creature, 0, { preserveSmoothedPose: true });'), 'terrain correction should re-sample parts after each body correction');
assert(articulated.includes('pass === 0 ? 3.2 : 1.7'), 'terrain correction push clamp should stay low and split by pass');
assert(articulated.includes('creature.vx *= 0.82;'), 'terrain correction velocity damping should be smooth, not a hard stop');
assert(articulated.includes('maxSamples: 40'), 'articulated terrain contact should use denser capsule sampling');
assert(!articulated.includes('1.5 + strongest * 0.72'), 'old high-energy strongest-contact push formula is still present');
assert(!articulated.includes('creature.vx *= 0.68;'), 'old heavy velocity damping is still present');

assert(terrainMask.includes('terrainMaskContactForCapsule'), 'capsule terrain contact helper is missing');
assert(terrainMask.includes('const sideSteps = Math.max(2'), 'capsule contact should sample along body sides');
assert(terrainMask.includes('const capSteps = Math.max(4'), 'capsule contact should sample rounded ends');
assert(terrainMask.includes('radius * 0.55'), 'capsule contact should sample interior side rails for large bodies');
assert(terrainMask.includes('radius * 0.58'), 'capsule contact should sample interior rounded caps for large bodies');

if (failures.length) {
  console.error('Articulated terrain collision constraints smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Articulated terrain collision constraints smoke passed.');
console.log('Articulated terrain correction remains multi-pass, low-energy, and capsule-sampled.');
