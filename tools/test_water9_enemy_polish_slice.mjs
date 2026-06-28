import { readFile } from 'node:fs/promises';

const [manifestText, articulated, skulkBuilder] = await Promise.all([
  readFile('public/assets/generated/articulated-creatures.parts.json', 'utf8'),
  readFile('src/scene-articulated.ts', 'utf8'),
  readFile('tools/build_abyssal_glasshook_skulk_articulated.py', 'utf8'),
]);

const manifest = JSON.parse(manifestText);
const skulk = (manifest.creatures ?? []).find((creature) => creature.id === 'abyssal-glasshook-skulk');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function closeTo(actual, expected, label) {
  assert(Math.abs(actual - expected) < 0.001, `${label} expected ${expected}, got ${actual}`);
}

assert(Boolean(skulk), 'abyssal-glasshook-skulk manifest is missing');
if (skulk) {
  closeTo(skulk.radius, 27, 'skulk radius');
  const head = skulk.parts?.find((part) => part.id === 'head');
  const upperClaw = skulk.parts?.find((part) => part.id === 'upper-claw');
  const tailFan = skulk.parts?.find((part) => part.id === 'tail-fan');
  closeTo(head?.size?.[0] ?? NaN, 72.5, 'skulk head width');
  closeTo(head?.size?.[1] ?? NaN, 62.5, 'skulk head height');
  closeTo(upperClaw?.size?.[0] ?? NaN, 165, 'skulk upper claw width');
  closeTo(tailFan?.offset?.[0] ?? NaN, -158, 'skulk tail fan offset x');
  const tailFanSocket = skulk.socketOverlays?.find((overlay) => overlay.id === 'tail-fan-socket');
  closeTo(tailFanSocket?.size?.[0] ?? NaN, 39, 'skulk tail fan socket width');
  closeTo(tailFanSocket?.size?.[1] ?? NaN, 31, 'skulk tail fan socket height');
}

assert(skulkBuilder.includes('RUNTIME_GEOMETRY_SCALE = 0.5'), 'skulk builder does not preserve the runtime half-scale');
assert(skulkBuilder.includes('scale_runtime_geometry(parts, overlays)'), 'skulk builder does not apply runtime geometry scaling');

assert(articulated.includes('mouthLatchOffsetX'), 'bobbit runtime does not store the mouth latch X offset');
assert(articulated.includes('mouthLatchOffsetY'), 'bobbit runtime does not store the mouth latch Y offset');
assert(articulated.includes('target.x - runtime.mouthLatchOffsetX'), 'bobbit drag is not planning from the latched mouth point');
assert(articulated.includes('finalBite.x + runtime.mouthLatchOffsetX'), 'bobbit drag does not keep the target attached to the live bite anchor');
assert(!articulated.includes('const desiredX = Phaser.Math.Linear(target.x, burrow.x'), 'bobbit drag still pulls the target directly to the burrow center line');

if (failures.length) {
  console.error('Water9 enemy polish slice smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Water9 enemy polish slice smoke passed.');
console.log('Hook skulk is half-sized and bobbit drag remains anchored to the mouth bite point.');
