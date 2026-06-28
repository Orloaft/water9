function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateFishVisualFacing(fish, delta) {
  const speed = Math.hypot(fish.vx, fish.vy);
  const fallbackAngle = fish.facingSign < 0 ? Math.PI : 0;
  if (fish.visualFacingSign !== -1 && fish.visualFacingSign !== 1) fish.visualFacingSign = fish.facingSign;
  if (!Number.isFinite(fish.visualAngle)) fish.visualAngle = speed > 0.01 ? Math.atan2(fish.vy, fish.vx) : fallbackAngle;

  if (speed >= 6) {
    const targetAngle = Math.atan2(fish.vy, fish.vx);
    const turnRate = fish.radius <= 12 * 0.72 ? 4.6 : 5.4;
    const angleDelta = wrapAngle(targetAngle - fish.visualAngle);
    const maxStep = turnRate * delta;
    fish.visualAngle = wrapAngle(fish.visualAngle + clamp(angleDelta, -maxStep, maxStep));
  }

  const intentThreshold = Math.max(8, fish.speed * 0.18);
  const desiredSign = fish.vx < -intentThreshold ? -1 : fish.vx > intentThreshold ? 1 : 0;
  if (desiredSign === 0 || desiredSign === fish.visualFacingSign) {
    fish.visualTurnIntentSign = undefined;
    fish.visualTurnIntentTime = 0;
    return;
  }

  if (fish.visualTurnIntentSign !== desiredSign) {
    fish.visualTurnIntentSign = desiredSign;
    fish.visualTurnIntentTime = 0;
  }
  fish.visualTurnIntentTime = (fish.visualTurnIntentTime ?? 0) + delta;
  const commitDelay = fish.hostile && fish.aggro > 0 ? 0.08 : 0.13;
  if (fish.visualTurnIntentTime >= commitDelay) {
    fish.visualFacingSign = desiredSign;
    fish.visualTurnIntentSign = undefined;
    fish.visualTurnIntentTime = 0;
  }
}

function makeFish(overrides = {}) {
  return {
    vx: 36,
    vy: 0,
    speed: 60,
    radius: 12 * 0.72,
    hostile: true,
    aggro: 0,
    facingSign: 1,
    visualFacingSign: 1,
    visualAngle: 0,
    ...overrides,
  };
}

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const jitterFish = makeFish();
let jitterVisualFlips = 0;
let lastVisualSign = jitterFish.visualFacingSign;
let rawSignFlips = 0;
let lastRawSign = 1;
for (let i = 0; i < 18; i += 1) {
  jitterFish.vx = i % 2 === 0 ? -11 : 11;
  jitterFish.vy = 5;
  const rawSign = jitterFish.vx < 0 ? -1 : 1;
  if (rawSign !== lastRawSign) rawSignFlips += 1;
  lastRawSign = rawSign;
  updateFishVisualFacing(jitterFish, 1 / 60);
  if (jitterFish.visualFacingSign !== lastVisualSign) jitterVisualFlips += 1;
  lastVisualSign = jitterFish.visualFacingSign;
}
assert(rawSignFlips >= 17, `expected raw sign to flip every frame, got ${rawSignFlips}`);
assert(jitterVisualFlips === 0, `expected hysteresis to suppress visual flip jitter, got ${jitterVisualFlips} flips`);

const turnFish = makeFish({ hostile: true, aggro: 1.5 });
let maxDelta = 0;
let commitFrame = -1;
for (let i = 0; i < 20; i += 1) {
  turnFish.vx = -72;
  turnFish.vy = i < 7 ? 16 : 0;
  const before = turnFish.visualAngle;
  updateFishVisualFacing(turnFish, 1 / 60);
  maxDelta = Math.max(maxDelta, Math.abs(wrapAngle(turnFish.visualAngle - before)));
  if (turnFish.visualFacingSign === -1 && commitFrame < 0) commitFrame = i;
}
assert(maxDelta <= 4.6 / 60 + 1e-9, `small fish visual heading delta exceeded rate cap: ${maxDelta.toFixed(4)}`);
assert(commitFrame >= 4 && commitFrame <= 6, `hostile turn should commit after about 80ms, frame ${commitFrame}`);

if (failures.length) {
  console.error('Fish visual facing smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Fish visual facing smoke passed.');
console.log(`Raw jitter sign flips: ${rawSignFlips}; visual jitter flips: ${jitterVisualFlips}.`);
console.log(`Max visual heading delta/frame: ${maxDelta.toFixed(4)} rad; turn commit frame: ${commitFrame}.`);
