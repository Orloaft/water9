import { readFile } from 'node:fs/promises';

const [
  manifestText,
  submarineParts,
  scene,
  rendering,
  helpers,
] = await Promise.all([
  readFile('public/assets/generated/submarines.parts.json', 'utf8'),
  readFile('src/submarine-parts.ts', 'utf8'),
  readFile('src/scene.ts', 'utf8'),
  readFile('src/scene-rendering.ts', 'utf8'),
  readFile('src/helpers.ts', 'utf8'),
]);

const manifest = JSON.parse(manifestText);
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function partIds(tier) {
  return new Set((tier.parts ?? []).map((part) => part.id));
}

function roles(tier) {
  return new Set((tier.parts ?? []).map((part) => part.role));
}

function requireTier(tierNumber, expectedDesignWidth) {
  const tier = (manifest.tiers ?? []).find((candidate) => candidate.tier === tierNumber);
  assert(Boolean(tier), `tier ${tierNumber} submarine part manifest is missing`);
  if (!tier) return null;
  assert(tier.designWidth === expectedDesignWidth, `tier ${tierNumber} designWidth expected ${expectedDesignWidth}, got ${tier.designWidth}`);
  assert((tier.parts ?? []).length >= 8, `tier ${tierNumber} expected at least 8 parts, got ${(tier.parts ?? []).length}`);
  return tier;
}

const tier1 = requireTier(1, 72);
const tier2 = requireTier(2, 92);
const tier3 = requireTier(3, 118);

for (const tier of [tier1, tier2, tier3].filter(Boolean)) {
  const ids = partIds(tier);
  const tierRoles = roles(tier);
  assert(ids.has('hull-core') || ids.has('hull-rear'), `tier ${tier.tier} has no rigid hull part`);
  assert(tierRoles.has('thruster') && tierRoles.has('thrusterGlow'), `tier ${tier.tier} thruster assembly is incomplete`);
  assert(tierRoles.has('fin') || tierRoles.has('ballast'), `tier ${tier.tier} lacks a visible control/stability surface`);
  assert(tierRoles.has('hatch'), `tier ${tier.tier} hatch part is missing`);
  assert(tierRoles.has('lamp'), `tier ${tier.tier} lamp part is missing`);
  assert(tierRoles.has('damage'), `tier ${tier.tier} damage overlay part is missing`);
}

if (tier2) {
  const tierRoles = roles(tier2);
  assert(tierRoles.has('drillUpper'), 'tier 2 drill upper arm is missing');
  assert(tierRoles.has('drillLower'), 'tier 2 drill lower arm is missing');
  assert(tierRoles.has('drillHead'), 'tier 2 drill head is missing');
}

if (tier3) {
  const tierRoles = roles(tier3);
  assert(tierRoles.has('turretYoke'), 'tier 3 turret yoke is missing');
  assert(tierRoles.has('turretBarrel'), 'tier 3 turret barrel is missing');
  assert(tierRoles.has('bayDoor'), 'tier 3 auxiliary bay door is missing');
  assert(tierRoles.has('dockedScout'), 'tier 3 docked scout visual is missing');
  assert(tierRoles.has('drillHead'), 'tier 3 drill head is missing');
}

assert(submarineParts.includes('export function renderSubmarineParts'), 'renderSubmarineParts export is missing');
assert(submarineParts.includes("part.role === 'thrusterGlow'"), 'thruster glow motion is missing');
assert(submarineParts.includes("part.role === 'fin'"), 'fin articulation motion is missing');
assert(submarineParts.includes("part.role === 'hatch'"), 'hatch boarding pulse is missing');
assert(submarineParts.includes("part.role === 'drillUpper'"), 'drill upper arm motion is missing');
assert(submarineParts.includes("part.role === 'drillLower'"), 'drill lower arm motion is missing');
assert(submarineParts.includes("part.role === 'drillHead'"), 'drill head motion is missing');
assert(submarineParts.includes("part.role === 'turretYoke'"), 'turret yoke recoil/aim motion is missing');
assert(submarineParts.includes("part.role === 'turretBarrel'"), 'turret barrel recoil/aim motion is missing');
assert(submarineParts.includes("part.role === 'bayDoor'"), 'bay door articulation is missing');
assert(submarineParts.includes("part.role === 'dockedScout'"), 'docked scout visibility motion is missing');

assert(scene.includes('ensureSubmarinePartTextures(this);'), 'scene does not create submarine part textures');
assert(scene.includes("createSubmarinePartSprites(this, 'active'"), 'scene does not create active submarine part sprites');
assert(scene.includes("createSubmarinePartSprites(this, 'carrier'"), 'scene does not create carrier submarine part sprites');
assert(scene.includes('setSubmarineDrillingFrameProvider(() => this.drillingThisFrame);'), 'scene does not expose drilling state to submarine parts');
assert(rendering.includes('renderSubmarineParts(this, this.subPartSprites, sub)'), 'active submarine render path is not wired');
assert(rendering.includes('renderSubmarineParts(this, this.carrierSubPartSprites, carrier, { carrier: true })'), 'carrier submarine render path is not wired');
assert(rendering.includes('hideSubmarinePartSprites(this.subPartSprites)'), 'active submarine parts are not hidden when the sub is absent');
assert(rendering.includes('hideSubmarinePartSprites(this.carrierSubPartSprites)'), 'carrier submarine parts are not hidden when absent');
assert(rendering.includes('.setVisible(!renderedSubParts)'), 'fallback active sprite is not hidden after part rendering succeeds');
assert(rendering.includes('.setVisible(!renderedCarrierParts)'), 'fallback carrier sprite is not hidden after part rendering succeeds');

assert(helpers.includes('const width = sub.tier === 3 ? 118 : sub.tier === 2 ? 92 : 72;'), 'sub collision width contract changed or is missing');
assert(helpers.includes('halfH: scaledEntity(sub.tier === 3 ? 41 : sub.tier === 2 ? 35 : 30)'), 'sub collision height contract changed or is missing');
assert(helpers.includes('return Math.hypot(halfW, halfH) + 50 + miningUpgradeBonus() * 5;'), 'sub mining range contract changed or is missing');

if (failures.length) {
  console.error('Submarine articulated rendering smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Submarine articulated rendering smoke passed.');
console.log('Tier 1: rigid hull, thruster glow/nozzle, fins, hatch, scanner, lamp, damage overlay.');
console.log('Tier 2: tier 1 basics plus ballast/cargo pods and animated mining drill arms/head.');
console.log('Tier 3: heavy hull/ballast, bay door/docked scout, turret yoke/barrel, drill head, lamp, damage overlay.');
