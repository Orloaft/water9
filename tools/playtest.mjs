import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://localhost:5175/';
const targetUrl = withPlaytestParam(baseUrl);
const outputPath = process.env.PLAYTEST_OUT ?? 'playtest-report.json';
const articulatedManifest = JSON.parse(await readFile(new URL('../public/assets/generated/articulated-creatures.parts.json', import.meta.url), 'utf8'));
const articulatedCreatureIds = process.env.PLAYTEST_ARTICULATED_ID
  ? [process.env.PLAYTEST_ARTICULATED_ID]
  : (articulatedManifest.creatures ?? []).map((creature) => creature.id);
const spineManifestsByCreature = new Map(
  (articulatedManifest.creatures ?? []).map((creature) => [
    creature.id,
    (creature.parts ?? [])
      .filter((part) => ['root', 'body', 'tail'].includes(part.motion?.kind))
      .sort((a, b) => b.offset[0] - a.offset[0]),
  ]),
);
const expectedJointsByCreature = new Map(
  (articulatedManifest.creatures ?? []).map((creature) => [
    creature.id,
    (creature.parts ?? []).filter((part) => part.parentId).length,
  ]),
);
const expectedSocketsByCreature = new Map(
  (articulatedManifest.creatures ?? []).map((creature) => [
    creature.id,
    (creature.socketOverlays ?? []).length,
  ]),
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const runtimeErrors = [];

page.on('pageerror', (error) => {
  runtimeErrors.push({ type: 'pageerror', text: error.message });
});
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push({ type: 'console', text: message.text() });
});
page.on('response', (response) => {
  const status = response.status();
  if (status >= 400) runtimeErrors.push({ type: 'response', status, url: response.url() });
});

async function waitForPlaytestApi() {
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__), null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
}

function withPlaytestParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('playtest', '1');
  return parsed.toString();
}

async function command(name, value) {
  const result = await page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command(commandName, commandValue);
  }, [name, value]);
  await page.waitForTimeout(result?.restarting ? 180 : 40);
  await page.waitForFunction(() => {
    const snap = window.__AQUA_PLAYTEST__?.snapshot();
    return Boolean(snap?.world && snap.world.ready !== false);
  }, null, { timeout: 10000 });
  return snapshot();
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

function summarizeBiome(snap) {
  return {
    biome: snap.state.biome,
    name: snap.state.biomeName,
    reachableDepth: snap.world.reachable.deepestMeters,
    reachableWater: snap.world.reachable.waterCoverage,
    fish: snap.world.entities.fish,
    hostileFish: snap.world.entities.hostileFish,
    vents: snap.world.entities.vents,
    bobbits: snap.world.entities.bobbits,
    bands: snap.world.bands.map((band) => ({
      name: band.name,
      water: band.waterRatio,
      oreBlocks: band.oreBlocks,
      oreValue: band.oreValue,
      unmineable: band.unmineableRatio,
    })),
  };
}

function articulatedSubject(snap, creatureId = null) {
  if (creatureId) return snap.articulatedCreatures?.find((creature) => !creature.dead && creature.id === creatureId) ?? null;
  return snap.articulatedCreatures?.find((creature) => !creature.dead) ?? null;
}

function partMap(creature) {
  return new Map((creature?.parts ?? []).map((part) => [part.id, part]));
}

function roundMetric(value) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spineMetricsForCreature(creature) {
  if (!creature?.id) return null;
  const manifests = spineManifestsByCreature.get(creature.id) ?? [];
  const parts = partMap(creature);
  const facing = creature.facingSign < 0 ? -1 : 1;
  const nodes = manifests
    .map((manifest) => {
      const part = parts.get(manifest.id);
      return part ? { id: manifest.id, x: part.x, y: part.y, rotation: part.rotation } : null;
    })
    .filter(Boolean);
  if (nodes.length < 2) return { count: nodes.length, ids: nodes.map((node) => node.id), maxKinkRad: 0, maxStep: 0, maxJump: 0, orderErrors: 0 };
  let maxStep = 0;
  let maxKink = 0;
  let orderErrors = 0;
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const current = nodes[i];
    const next = nodes[i + 1];
    const step = Math.hypot(next.x - current.x, next.y - current.y);
    maxStep = Math.max(maxStep, step);
    if (current.x * facing + 0.75 < next.x * facing) orderErrors += 1;
  }
  for (let i = 1; i < nodes.length - 1; i += 1) {
    const previous = nodes[i - 1];
    const current = nodes[i];
    const next = nodes[i + 1];
    const ax = current.x - previous.x;
    const ay = current.y - previous.y;
    const bx = next.x - current.x;
    const by = next.y - current.y;
    const al = Math.max(0.001, Math.hypot(ax, ay));
    const bl = Math.max(0.001, Math.hypot(bx, by));
    const dot = clamp((ax * bx + ay * by) / (al * bl), -1, 1);
    maxKink = Math.max(maxKink, Math.acos(dot));
  }
  return {
    count: nodes.length,
    ids: nodes.map((node) => node.id),
    maxKinkRad: roundMetric(maxKink),
    maxStep: roundMetric(maxStep),
    orderErrors,
  };
}

function reviewSummary(mode, snap, creatureId = null) {
  const creature = articulatedSubject(snap, creatureId);
  return {
    mode,
    id: creature?.id ?? null,
    species: creature?.species ?? null,
    state: creature?.state ?? null,
    facingSign: creature?.facingSign ?? null,
    vx: creature?.vx ?? null,
    vy: creature?.vy ?? null,
    phase: creature?.phase ?? null,
    posePitch: creature?.posePitch ?? null,
    swimEffort: creature?.swimEffort ?? null,
    spineMetrics: spineMetricsForCreature(creature),
    jointSummary: creature?.jointSummary ?? null,
    biteAnchor: creature?.biteAnchor ?? null,
    joints: creature?.joints ?? [],
    parts: creature?.parts ?? [],
    socketOverlays: creature?.socketOverlays ?? [],
  };
}

function verifyArticulatedReview(reviews) {
  const failures = [];
  for (const review of reviews) {
    if (!review.jointSummary) {
      failures.push(`${review.id ?? 'unknown'} ${review.mode}: no articulated creature in review snapshot`);
      continue;
    }
    const expectedJoints = expectedJointsByCreature.get(review.id) ?? 0;
    if (expectedJoints > 0 && review.jointSummary.count !== expectedJoints) {
      failures.push(`${review.id} ${review.mode}: expected ${expectedJoints} joints, saw ${review.jointSummary.count}`);
    }
    const expectedSockets = expectedSocketsByCreature.get(review.id) ?? 0;
    if (expectedSockets > 0 && review.socketOverlays.length !== expectedSockets) {
      failures.push(`${review.id} ${review.mode}: expected ${expectedSockets} socket overlays, saw ${review.socketOverlays.length}`);
    }
    const hiddenSocket = review.socketOverlays.find((overlay) => overlay.sprite?.visible !== true);
    if (hiddenSocket) failures.push(`${review.id} ${review.mode}: socket overlay ${hiddenSocket.id} is not visible in review`);
    if (review.jointSummary.missing !== 0) failures.push(`${review.id} ${review.mode}: missing ${review.jointSummary.missing} joints`);
    if (review.jointSummary.maxError > 0.75) failures.push(`${review.id} ${review.mode}: joint error ${review.jointSummary.maxError}px exceeds 0.75px`);
    if (review.jointSummary.maxStress > 0.08) failures.push(`${review.id} ${review.mode}: joint stress ${review.jointSummary.maxStress} exceeds 0.08`);
    if (!review.biteAnchor) failures.push(`${review.id} ${review.mode}: missing jaw bite anchor`);
  }

  const right = reviews.find((review) => review.mode === 'right');
  const left = reviews.find((review) => review.mode === 'left');
  const lunge = reviews.find((review) => review.mode === 'lunge');
  const rise = reviews.find((review) => review.mode === 'rise');
  const dive = reviews.find((review) => review.mode === 'dive');
  if (right && left) {
    const rightParts = partMap(right);
    const leftParts = partMap(left);
    const rightCenter = {
      x: (rightParts.get('body-1')?.x ?? 0),
      y: (rightParts.get('body-1')?.y ?? 0),
    };
    const leftCenter = {
      x: (leftParts.get('body-1')?.x ?? 0),
      y: (leftParts.get('body-1')?.y ?? 0),
    };
    let mirrorError = 0;
    let yError = 0;
    let rotationError = 0;
    for (const [id, rightPart] of rightParts) {
      const leftPart = leftParts.get(id);
      if (!leftPart) continue;
      mirrorError = Math.max(mirrorError, Math.abs((rightPart.x - rightCenter.x) + (leftPart.x - leftCenter.x)));
      yError = Math.max(yError, Math.abs((rightPart.y - rightCenter.y) - (leftPart.y - leftCenter.y)));
      rotationError = Math.max(rotationError, Math.abs(rightPart.rotation + leftPart.rotation));
    }
    if (mirrorError > 1.25) failures.push(`${right.id} left/right mirror x error ${mirrorError.toFixed(3)}px exceeds 1.25px`);
    if (yError > 1.25) failures.push(`${right.id} left/right mirror y error ${yError.toFixed(3)}px exceeds 1.25px`);
    if (rotationError > 0.05) failures.push(`${right.id} left/right rotation mirror error ${rotationError.toFixed(3)}rad exceeds 0.05rad`);
    const rightScale = rightParts.get('head')?.sprite?.scaleX ?? 0;
    const leftScale = leftParts.get('head')?.sprite?.scaleX ?? 0;
    if (rightScale <= 0) failures.push(`${right.id} right review head scaleX ${rightScale} is not positive`);
    if (leftScale >= 0) failures.push(`${left.id} left review head scaleX ${leftScale} is not negative`);
  }

  if (right && lunge) {
    if (lunge.state !== 'lunge') failures.push(`${lunge.id} lunge review state is ${lunge.state}`);
    const idleParts = partMap(right);
    const lungeParts = partMap(lunge);
    const idleJaw = idleParts.get('jaw');
    const idleHead = idleParts.get('head');
    const lungeJaw = lungeParts.get('jaw');
    const lungeHead = lungeParts.get('head');
    if (idleJaw && idleHead && lungeJaw && lungeHead) {
      const idleRelative = Math.abs(idleJaw.rotation - idleHead.rotation);
      const lungeRelative = Math.abs(lungeJaw.rotation - lungeHead.rotation);
      if (lungeRelative - idleRelative < 0.15) {
        failures.push(`${lunge.id} lunge jaw opened ${(lungeRelative - idleRelative).toFixed(3)}rad over idle; expected at least 0.15rad`);
      }
    }
  }

  if (rise && (rise.posePitch ?? 0) >= -0.2) failures.push(`${rise.id} rise review posePitch ${rise.posePitch} is not angled upward`);
  if (dive && (dive.posePitch ?? 0) <= 0.2) failures.push(`${dive.id} dive review posePitch ${dive.posePitch} is not angled downward`);

  return failures;
}

function verifyArticulatedMotion(samples) {
  const failures = [];
  if (samples.length < 5) {
    failures.push('articulated motion review: expected at least 5 samples');
    return failures;
  }
  const id = samples[0]?.id ?? 'unknown';
  const bodyOffsets = [];
  const tailRotations = [];
  const phases = [];
  const previousParts = new Map();
  let maxJump = 0;
  for (const sample of samples) {
    if (!sample.jointSummary) {
      failures.push(`${id} motion review: missing joint summary`);
      continue;
    }
    if (sample.jointSummary.missing !== 0) failures.push(`${id} motion review ${sample.mode}: missing ${sample.jointSummary.missing} joints`);
    if (sample.jointSummary.maxError > 0.75) failures.push(`${id} motion review ${sample.mode}: joint error ${sample.jointSummary.maxError}px exceeds 0.75px`);
    if (sample.jointSummary.maxStress > 0.08) failures.push(`${id} motion review ${sample.mode}: joint stress ${sample.jointSummary.maxStress} exceeds 0.08`);
    if (!sample.spineMetrics || sample.spineMetrics.count < 3) {
      failures.push(`${id} motion review ${sample.mode}: missing spine metrics`);
    } else {
      if (sample.spineMetrics.orderErrors > 0) failures.push(`${id} motion review ${sample.mode}: spine order inverted ${sample.spineMetrics.orderErrors} times`);
      if (sample.spineMetrics.maxKinkRad > 1.35) failures.push(`${id} motion review ${sample.mode}: spine kink ${sample.spineMetrics.maxKinkRad}rad exceeds 1.35rad`);
    }
    const parts = partMap(sample);
    const body = parts.get('body-1') ?? parts.get('body');
    const tail = parts.get('tail');
    if (body && tail) {
      bodyOffsets.push((tail.y ?? 0) - (body.y ?? 0));
      tailRotations.push(tail.rotation ?? 0);
    }
    for (const [partId, part] of parts) {
      if (!['head', 'body-1', 'body-2', 'body-3', 'tail'].includes(partId)) continue;
      const previous = previousParts.get(partId);
      if (previous) maxJump = Math.max(maxJump, Math.hypot((part.x ?? 0) - previous.x, (part.y ?? 0) - previous.y));
      previousParts.set(partId, { x: part.x ?? 0, y: part.y ?? 0 });
    }
    if (typeof sample.phase === 'number') phases.push(sample.phase);
  }
  const phaseSpan = phases.length ? Math.max(...phases) - Math.min(...phases) : 0;
  const offsetSpan = bodyOffsets.length ? Math.max(...bodyOffsets) - Math.min(...bodyOffsets) : 0;
  const rotationSpan = tailRotations.length ? Math.max(...tailRotations) - Math.min(...tailRotations) : 0;
  if (phaseSpan < 0.4) failures.push(`${id} motion review phase advanced only ${phaseSpan.toFixed(3)}rad`);
  if (offsetSpan < 1.2 && rotationSpan < 0.025) {
    failures.push(`${id} motion review tail motion too small: y span ${offsetSpan.toFixed(3)}px, rotation span ${rotationSpan.toFixed(3)}rad`);
  }
  if (maxJump > 46) failures.push(`${id} motion review part jump ${maxJump.toFixed(3)}px exceeds 46px`);
  return failures;
}

function verifyArticulatedDamage(review) {
  const failures = [];
  const parts = partMap(review);
  const jaw = parts.get('jaw');
  const jawJoint = review.joints?.find?.((joint) => joint.partId === 'jaw');
  if (!jaw) {
    failures.push(`${review.id ?? 'unknown'} damage review: missing jaw part`);
  } else {
    if (!jaw.detached) failures.push(`${review.id} damage review: jaw was not detached`);
    if (jaw.hp !== 0) failures.push(`${review.id} damage review: jaw hp is ${jaw.hp}, expected 0`);
    if (Math.abs(jaw.detachVx ?? 0) < 1 && Math.abs(jaw.detachVy ?? 0) < 1) failures.push(`${review.id} damage review: detached jaw has no drift velocity`);
  }
  if (review.biteAnchor) failures.push(`${review.id} damage review: bite anchor still exists after jaw detachment`);
  if (!jawJoint?.detached) failures.push(`${review.id} damage review: jaw joint is not marked detached`);
  return failures;
}

function verifyArticulatedCollision(review) {
  const failures = [];
  const head = partMap(review).get('head');
  if (!head) failures.push(`${review.id ?? 'unknown'} collision review: missing head part`);
  else {
    if ((head.terrainContact ?? 0) <= 0) failures.push(`${review.id} collision review: head did not report terrain contact`);
    if ((head.terrainNormalX ?? 0) >= -0.5) failures.push(`${review.id} collision review: expected head normal to push left, got ${head.terrainNormalX}`);
  }
  if ((review.vx ?? 0) >= 80) failures.push(`${review.id} collision review: creature vx ${review.vx} did not respond to terrain`);
  if (review.jointSummary?.maxError > 0.75) failures.push(`${review.id} collision review: seam error ${review.jointSummary.maxError}px after terrain response`);
  return failures;
}

try {
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await waitForPlaytestApi();
  await command('start');

  const biomes = [];
  for (const biome of [1, 2, 3, 4]) {
    await command('setBiome', biome);
    await page.waitForFunction((expectedBiome) => {
      return window.__AQUA_PLAYTEST__?.snapshot()?.state?.biome === expectedBiome;
    }, biome);
    biomes.push(summarizeBiome(await snapshot()));
  }

  await command('setBiome', 4);
  await command('start');
  const articulatedReview = [];
  const articulatedCollision = [];
  const articulatedDamage = [];
  const articulatedMotion = [];
  const articulatedFailures = [];
  const articulatedCollisionFailures = [];
  const articulatedDamageFailures = [];
  const articulatedMotionFailures = [];
  for (const creatureId of articulatedCreatureIds) {
    const creatureReview = [];
    for (const mode of ['right', 'left', 'rise', 'dive', 'lunge']) {
      await command('reviewArticulated', { mode, creatureId });
      await page.waitForTimeout(120);
      const summary = reviewSummary(mode, await snapshot(), creatureId);
      creatureReview.push(summary);
      articulatedReview.push(summary);
    }
    articulatedFailures.push(...verifyArticulatedReview(creatureReview));
    await command('reviewArticulated', { mode: 'right', creatureId });
    const creatureMotion = [];
    for (let step = 0; step < 6; step += 1) {
      const snap = await command('advanceArticulatedReview', { creatureId, seconds: 0.18, phaseRate: 1.55 });
      const summary = reviewSummary(`motion-${step}`, snap, creatureId);
      creatureMotion.push(summary);
      articulatedMotion.push(summary);
    }
    articulatedMotionFailures.push(...verifyArticulatedMotion(creatureMotion));
    await command('reviewArticulated', { mode: 'right', creatureId });
    const collision = reviewSummary(
      'head-terrain',
      await command('collideArticulated', { creatureId, partId: 'head' }),
      creatureId,
    );
    articulatedCollision.push(collision);
    articulatedCollisionFailures.push(...verifyArticulatedCollision(collision));
    await command('reviewArticulated', { mode: 'right', creatureId });
    const damage = reviewSummary(
      'jaw-detached',
      await command('damageArticulatedPart', { creatureId, partId: 'jaw', source: 'Playtest' }),
      creatureId,
    );
    articulatedDamage.push(damage);
    articulatedDamageFailures.push(...verifyArticulatedDamage(damage));
  }

  await command('setBiome', 1);
  await command('setCredits', 250000);
  await command('maxUpgrades');
  await command('buySub', 3);
  await command('dive');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(1800);
  await page.keyboard.up('ArrowDown');
  await command('teleportDepth', 1200);
  const subSmoke = await snapshot();

  const report = {
    url: targetUrl,
    generatedAt: new Date().toISOString(),
    biomes,
    runtimeErrors,
    articulatedPlaceholders: (await snapshot())?.articulatedPlaceholders ?? [],
    articulatedReview,
    articulatedFailures,
    articulatedCollision,
    articulatedCollisionFailures,
    articulatedDamage,
    articulatedDamageFailures,
    articulatedMotion,
    articulatedMotionFailures,
    subSmoke: {
      depth: subSmoke.state.depth,
      hull: subSmoke.state.activeSub?.hull ?? null,
      oxygen: subSmoke.state.activeSub?.oxygen ?? null,
      fuel: subSmoke.state.activeSub?.fuel ?? null,
      piloting: subSmoke.state.activeSub?.piloting ?? false,
      cargoCapacity: subSmoke.state.cargoCapacity,
    },
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Playtest report written to ${outputPath}`);
  console.table(biomes.map((biome) => ({
    biome: biome.biome,
    name: biome.name,
    reachableDepth: biome.reachableDepth,
    reachableWater: biome.reachableWater,
    fish: biome.fish,
    hostileFish: biome.hostileFish,
    vents: biome.vents,
    bobbits: biome.bobbits,
  })));
  const placeholderFailures = report.articulatedPlaceholders.map((key) => `placeholder articulated texture was generated: ${key}`);
  if (runtimeErrors.length || placeholderFailures.length || articulatedFailures.length || articulatedCollisionFailures.length || articulatedDamageFailures.length || articulatedMotionFailures.length) {
    for (const error of runtimeErrors) console.error('Runtime error:', error);
    for (const failure of placeholderFailures) console.error('Articulated asset failure:', failure);
    for (const failure of articulatedFailures) console.error('Articulated review failure:', failure);
    for (const failure of articulatedCollisionFailures) console.error('Articulated collision failure:', failure);
    for (const failure of articulatedDamageFailures) console.error('Articulated damage failure:', failure);
    for (const failure of articulatedMotionFailures) console.error('Articulated motion failure:', failure);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
