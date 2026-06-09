import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://localhost:5175/';
const targetUrl = withPlaytestParam(baseUrl);
const outputPath = process.env.PLAYTEST_OUT ?? 'playtest-report.json';

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

function articulatedSubject(snap) {
  return snap.articulatedCreatures?.find((creature) => !creature.dead) ?? null;
}

function partMap(creature) {
  return new Map((creature?.parts ?? []).map((part) => [part.id, part]));
}

function reviewSummary(mode, snap) {
  const creature = articulatedSubject(snap);
  return {
    mode,
    state: creature?.state ?? null,
    facingSign: creature?.facingSign ?? null,
    jointSummary: creature?.jointSummary ?? null,
    biteAnchor: creature?.biteAnchor ?? null,
    joints: creature?.joints ?? [],
    parts: creature?.parts ?? [],
  };
}

function verifyArticulatedReview(reviews) {
  const failures = [];
  for (const review of reviews) {
    if (!review.jointSummary) {
      failures.push(`${review.mode}: no articulated creature in review snapshot`);
      continue;
    }
    if (review.jointSummary.count !== 7) failures.push(`${review.mode}: expected 7 joints, saw ${review.jointSummary.count}`);
    if (review.jointSummary.missing !== 0) failures.push(`${review.mode}: missing ${review.jointSummary.missing} joints`);
    if (review.jointSummary.maxError > 0.75) failures.push(`${review.mode}: joint error ${review.jointSummary.maxError}px exceeds 0.75px`);
    if (review.jointSummary.maxStress > 0.08) failures.push(`${review.mode}: joint stress ${review.jointSummary.maxStress} exceeds 0.08`);
    if (!review.biteAnchor) failures.push(`${review.mode}: missing jaw bite anchor`);
  }

  const right = reviews.find((review) => review.mode === 'right');
  const left = reviews.find((review) => review.mode === 'left');
  const lunge = reviews.find((review) => review.mode === 'lunge');
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
    if (mirrorError > 1.25) failures.push(`left/right mirror x error ${mirrorError.toFixed(3)}px exceeds 1.25px`);
    if (yError > 1.25) failures.push(`left/right mirror y error ${yError.toFixed(3)}px exceeds 1.25px`);
    if (rotationError > 0.05) failures.push(`left/right rotation mirror error ${rotationError.toFixed(3)}rad exceeds 0.05rad`);
    const rightScale = rightParts.get('head')?.sprite?.scaleX ?? 0;
    const leftScale = leftParts.get('head')?.sprite?.scaleX ?? 0;
    if (rightScale <= 0) failures.push(`right review head scaleX ${rightScale} is not positive`);
    if (leftScale >= 0) failures.push(`left review head scaleX ${leftScale} is not negative`);
  }

  if (right && lunge) {
    if (lunge.state !== 'lunge') failures.push(`lunge review state is ${lunge.state}`);
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
        failures.push(`lunge jaw opened ${(lungeRelative - idleRelative).toFixed(3)}rad over idle; expected at least 0.15rad`);
      }
    }
  }

  return failures;
}

function verifyArticulatedDamage(review) {
  const failures = [];
  const parts = partMap(review);
  const jaw = parts.get('jaw');
  const jawJoint = review.joints?.find?.((joint) => joint.partId === 'jaw');
  if (!jaw) {
    failures.push('damage review: missing jaw part');
  } else {
    if (!jaw.detached) failures.push('damage review: jaw was not detached');
    if (jaw.hp !== 0) failures.push(`damage review: jaw hp is ${jaw.hp}, expected 0`);
    if (Math.abs(jaw.detachVx ?? 0) < 1 && Math.abs(jaw.detachVy ?? 0) < 1) failures.push('damage review: detached jaw has no drift velocity');
  }
  if (review.biteAnchor) failures.push('damage review: bite anchor still exists after jaw detachment');
  if (!jawJoint?.detached) failures.push('damage review: jaw joint is not marked detached');
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
  for (const mode of ['right', 'left', 'lunge']) {
    await command('reviewArticulated', mode);
    await page.waitForTimeout(120);
    articulatedReview.push(reviewSummary(mode, await snapshot()));
  }
  const articulatedFailures = verifyArticulatedReview(articulatedReview);
  await command('reviewArticulated', 'right');
  const articulatedDamage = reviewSummary('jaw-detached', await command('damageArticulatedPart', { partId: 'jaw', source: 'Playtest' }));
  const articulatedDamageFailures = verifyArticulatedDamage(articulatedDamage);

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
    articulatedReview,
    articulatedFailures,
    articulatedDamage,
    articulatedDamageFailures,
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
  if (runtimeErrors.length || articulatedFailures.length || articulatedDamageFailures.length) {
    for (const error of runtimeErrors) console.error('Runtime error:', error);
    for (const failure of articulatedFailures) console.error('Articulated review failure:', failure);
    for (const failure of articulatedDamageFailures) console.error('Articulated damage failure:', failure);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
