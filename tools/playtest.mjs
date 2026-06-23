import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL ?? 'http://localhost:5175/';
const outputPath = process.env.PLAYTEST_OUT ?? 'playtest-report.json';
const screenshotDir = process.env.PLAYTEST_SCREENSHOT_DIR ?? 'tools/scratch/articulated-runtime';
const phaseStripPath = 'tools/scratch/articulated-phase-strip.png';
const articulatedManifest = JSON.parse(await readFile(new URL('../public/assets/generated/articulated-creatures.parts.json', import.meta.url), 'utf8'));
const articulatedCreatureIds = (process.env.PLAYTEST_ARTICULATED_IDS ?? process.env.PLAYTEST_ARTICULATED_ID)
  ? (process.env.PLAYTEST_ARTICULATED_IDS ?? process.env.PLAYTEST_ARTICULATED_ID)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  : (articulatedManifest.creatures ?? []).map((creature) => creature.id);
const filteredArticulatedIds = Boolean(process.env.PLAYTEST_ARTICULATED_IDS ?? process.env.PLAYTEST_ARTICULATED_ID);
const skipNaturalSpawnSweep = process.env.PLAYTEST_SKIP_NATURAL_SWEEP === '1' || filteredArticulatedIds;
const targetUrl = withPlaytestParam(baseUrl);
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
const partManifestsByCreature = new Map(
  (articulatedManifest.creatures ?? []).map((creature) => [
    creature.id,
    new Map((creature.parts ?? []).map((part) => [part.id, part])),
  ]),
);
const damageTargetsByCreature = new Map(
  (articulatedManifest.creatures ?? []).map((creature) => [creature.id, damageTargetsForCreature(creature)]),
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const runtimeErrors = [];
const runtimeScreenshots = [];
const visualEvidenceFailures = [];

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

function canDetachPartManifest(part) {
  return part.anatomy?.severable === true;
}

function damageTargetsForCreature(creature) {
  const parts = creature.parts ?? [];
  const targets = [];
  const add = (part, expected) => {
    if (!part || targets.some((target) => target.partId === part.id)) return;
    targets.push({
      partId: part.id,
      expected,
      role: part.anatomy?.role ?? part.motion?.kind ?? 'unknown',
      severable: canDetachPartManifest(part),
    });
  };
  add(parts.find((part) => part.anatomy?.role === 'jaw'), 'detached');
  add(parts.find((part) => part.id === 'tail' && canDetachPartManifest(part)) ?? parts.find((part) => part.anatomy?.role === 'tail' && canDetachPartManifest(part)), 'detached');
  add(parts.find((part) => part.anatomy?.role === 'fin' && canDetachPartManifest(part)), 'detached');
  add(
    parts.find((part) => part.id === 'body-2') ??
      parts.find((part) => part.anatomy?.role === 'torso' && part.parentId) ??
      parts.find((part) => part.anatomy?.role === 'torso'),
    'crippled',
  );
  return targets;
}

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
  if (filteredArticulatedIds) parsed.searchParams.set('prototypeThreats', '1');
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

async function commandNow(name, value) {
  return page.evaluate(([commandName, commandValue]) => {
    return window.__AQUA_PLAYTEST__?.command(commandName, commandValue);
  }, [name, value]);
}

async function snapshot() {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot());
}

const uiBlockerSelectors = [
  '#radio-dialogue.is-open',
  '.pause-menu.is-open',
  '.logbook.is-open',
  '.cargo-manifest.is-open',
  '#game-over',
];

async function uiBlockers() {
  return page.evaluate((selectors) => selectors.filter((selector) => document.querySelector(selector)), uiBlockerSelectors);
}

function visibleMajorParts(creature, viewport = { width: 1280, height: 800 }) {
  const manifestParts = partManifestsByCreature.get(creature?.id) ?? new Map();
  const majorIds = new Set(
    [...manifestParts.values()]
      .filter((part) => ['head', 'jaw', 'torso', 'tail'].includes(part.anatomy?.role ?? ''))
      .map((part) => part.id),
  );
  return (creature?.parts ?? [])
    .filter((part) => majorIds.has(part.id) && !part.detached && part.sprite?.visible === true && (part.sprite?.alpha ?? 0) > 0.05)
    .filter((part) => {
      const x = part.sprite.screenX;
      const y = part.sprite.screenY;
      return x >= 0 && x <= viewport.width && y >= 0 && y <= viewport.height;
    });
}

async function sampleCanvasParts(parts) {
  const points = parts.map((part) => ({ id: part.id, x: part.sprite.screenX, y: part.sprite.screenY }));
  if (!points.length) return [];
  return page.evaluate((samplePoints) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return [];
    const context = canvas.getContext('2d');
    if (!context) return [];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return samplePoints.map((point) => {
      const cx = Math.round(point.x * scaleX);
      const cy = Math.round(point.y * scaleY);
      const radius = 10;
      const left = Math.max(0, cx - radius);
      const top = Math.max(0, cy - radius);
      const width = Math.min(canvas.width - left, radius * 2 + 1);
      const height = Math.min(canvas.height - top, radius * 2 + 1);
      if (width <= 0 || height <= 0) return { id: point.id, lumaRange: 0, colorRange: 0, samples: 0 };
      const data = context.getImageData(left, top, width, height).data;
      let minLuma = 255;
      let maxLuma = 0;
      let minR = 255;
      let minG = 255;
      let minB = 255;
      let maxR = 0;
      let maxG = 0;
      let maxB = 0;
      let samples = 0;
      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha <= 0) continue;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        minR = Math.min(minR, r);
        minG = Math.min(minG, g);
        minB = Math.min(minB, b);
        maxR = Math.max(maxR, r);
        maxG = Math.max(maxG, g);
        maxB = Math.max(maxB, b);
        samples += 1;
      }
      return {
        id: point.id,
        lumaRange: Number((maxLuma - minLuma).toFixed(3)),
        colorRange: Math.max(maxR - minR, maxG - minG, maxB - minB),
        samples,
      };
    });
  }, points);
}

async function sampleCanvasSeams(creature, camera) {
  const overlays = (creature?.socketOverlays ?? [])
    .filter((overlay) => overlay.sprite?.visible === true && (overlay.bridgeWidth ?? 0) > 0)
    .map((overlay) => {
      const zoom = camera?.zoom ?? 1;
      const worldX = camera?.x ?? 0;
      const worldY = camera?.y ?? 0;
      const viewWidth = camera?.width ?? 1280;
      const viewHeight = camera?.height ?? 720;
      const parentScreenX = overlay.parentAnchorScreenX ?? ((overlay.parentAnchorX ?? overlay.x) - worldX) * zoom;
      const parentScreenY = overlay.parentAnchorScreenY ?? ((overlay.parentAnchorY ?? overlay.y) - worldY) * zoom;
      const childScreenX = overlay.childAnchorScreenX ?? ((overlay.childAnchorX ?? overlay.x) - worldX) * zoom;
      const childScreenY = overlay.childAnchorScreenY ?? ((overlay.childAnchorY ?? overlay.y) - worldY) * zoom;
      const centerX = overlay.sprite?.screenX ?? ((overlay.x - worldX) * zoom);
      const centerY = overlay.sprite?.screenY ?? ((overlay.y - worldY) * zoom);
      const bridgeWidth = Math.max(2, overlay.bridgeWidthScreen ?? ((overlay.bridgeWidth ?? 1) * zoom));
      const spriteWidth = Math.max(2, overlay.sprite?.displayWidth ?? ((overlay.width ?? 1) * zoom));
      const spriteHeight = Math.max(2, overlay.sprite?.displayHeight ?? ((overlay.height ?? 1) * zoom));
      const visibilityMargin = Math.max(24, bridgeWidth * 1.35, spriteWidth * 0.35, spriteHeight * 0.35);
      const minX = Math.min(parentScreenX, childScreenX, centerX);
      const maxX = Math.max(parentScreenX, childScreenX, centerX);
      const minY = Math.min(parentScreenY, childScreenY, centerY);
      const maxY = Math.max(parentScreenY, childScreenY, centerY);
      const parent = {
        x: parentScreenX,
        y: parentScreenY,
      };
      const child = {
        x: childScreenX,
        y: childScreenY,
      };
      return {
        id: overlay.id,
        parentId: overlay.parentId,
        childId: overlay.childId,
        parent,
        child,
        center: {
          x: centerX,
          y: centerY,
        },
        rotation: overlay.rotation ?? Math.atan2(child.y - parent.y, child.x - parent.x),
        bridgeWidth,
        spriteWidth,
        spriteHeight,
        socketStyle: overlay.socketStyle,
        inFrame: maxX >= -visibilityMargin &&
          minX <= viewWidth + visibilityMargin &&
          maxY >= -visibilityMargin &&
          minY <= viewHeight + visibilityMargin,
      };
    })
    .filter((overlay) => overlay.inFrame);
  if (!overlays.length) return [];
  return page.evaluate((sampleOverlays) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return [];
    const context = canvas.getContext('2d');
    if (!context) return [];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    const meanColor = (x, y, radius) => {
      const cx = Math.round(x * scaleX);
      const cy = Math.round(y * scaleY);
      const r = Math.max(1, Math.round(radius));
      const left = Math.max(0, cx - r);
      const top = Math.max(0, cy - r);
      const width = Math.min(canvas.width - left, r * 2 + 1);
      const height = Math.min(canvas.height - top, r * 2 + 1);
      if (width <= 0 || height <= 0) return null;
      const data = context.getImageData(left, top, width, height).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let luma = 0;
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3] / 255;
        if (alpha <= 0) continue;
        const r8 = data[index];
        const g8 = data[index + 1];
        const b8 = data[index + 2];
        red += r8 * alpha;
        green += g8 * alpha;
        blue += b8 * alpha;
        luma += (r8 * 0.2126 + g8 * 0.7152 + b8 * 0.0722) * alpha;
        count += alpha;
      }
      if (count <= 0) return null;
      return {
        r: red / count,
        g: green / count,
        b: blue / count,
        luma: luma / count,
        samples: count,
      };
    };
    const colorDistance = (a, b) => {
      if (!a || !b) return 0;
      return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
    };
    const lumaDelta = (a, b) => {
      if (!a || !b) return 0;
      return Math.abs(a.luma - b.luma);
    };
    return sampleOverlays.map((overlay) => {
      const dx = overlay.child.x - overlay.parent.x;
      const dy = overlay.child.y - overlay.parent.y;
      const rawSpan = Math.hypot(dx, dy);
      const compactPatch = rawSpan < 1.5;
      const tangent = compactPatch
        ? { x: Math.cos(overlay.rotation), y: Math.sin(overlay.rotation) }
        : { x: dx / Math.max(1, rawSpan), y: dy / Math.max(1, rawSpan) };
      const normal = { x: -tangent.y, y: tangent.x };
      const sampleSpan = compactPatch
        ? Math.max(overlay.bridgeWidth * 1.2, Math.min(overlay.spriteWidth, overlay.spriteHeight) * 0.62, 10)
        : rawSpan;
      const radius = Math.max(1.5, Math.min(5, overlay.bridgeWidth * 0.14));
      const backgroundOffset = Math.max(12, overlay.bridgeWidth * 1.28);
      const foregroundThreshold = 6;
      const lengthFractions = compactPatch ? [0.16, 0.33, 0.5, 0.67, 0.84] : [0.1, 0.24, 0.38, 0.5, 0.62, 0.76, 0.9];
      const crossFractions = [-0.42, -0.2, 0, 0.2, 0.42];
      let foregroundSamples = 0;
      let totalSamples = 0;
      let backgroundRun = 0;
      let maxBackgroundRun = 0;
      let centerDistanceTotal = 0;
      let centerDistanceSamples = 0;
      let centerLumaDeltaTotal = 0;
      const points = lengthFractions.map((t) => {
        const baseX = compactPatch
          ? overlay.center.x + tangent.x * (t - 0.5) * sampleSpan
          : overlay.parent.x + dx * t;
        const baseY = compactPatch
          ? overlay.center.y + tangent.y * (t - 0.5) * sampleSpan
          : overlay.parent.y + dy * t;
        const sideLeft = meanColor(baseX + normal.x * backgroundOffset, baseY + normal.y * backgroundOffset, radius);
        const sideRight = meanColor(baseX - normal.x * backgroundOffset, baseY - normal.y * backgroundOffset, radius);
        let sliceForeground = 0;
        let sliceSamples = 0;
        const cross = crossFractions.map((fraction) => {
          const x = baseX + normal.x * overlay.bridgeWidth * fraction;
          const y = baseY + normal.y * overlay.bridgeWidth * fraction;
          const center = meanColor(x, y, radius);
          const distance = Math.max(colorDistance(center, sideLeft), colorDistance(center, sideRight));
          const delta = Math.max(lumaDelta(center, sideLeft), lumaDelta(center, sideRight));
          const foreground = Boolean(center && (distance >= foregroundThreshold || delta >= foregroundThreshold * 0.72));
          if (center) {
            totalSamples += 1;
            sliceSamples += 1;
            if (foreground) {
              foregroundSamples += 1;
              sliceForeground += 1;
            }
            if (fraction === 0) {
              centerDistanceTotal += distance;
              centerLumaDeltaTotal += delta;
              centerDistanceSamples += 1;
            }
          }
          return {
            offset: fraction,
            foreground,
            backgroundDistance: Number(distance.toFixed(3)),
            lumaDelta: Number(delta.toFixed(3)),
          };
        });
        const sliceCoverage = sliceSamples > 0 ? sliceForeground / sliceSamples : 0;
        if (sliceCoverage < 0.25) {
          backgroundRun += 1;
          maxBackgroundRun = Math.max(maxBackgroundRun, backgroundRun);
        } else {
          backgroundRun = 0;
        }
        return {
          t,
          sliceCoverage: Number(sliceCoverage.toFixed(3)),
          cross,
        };
      });
      const legacyCenterPoints = points.map((point) => point.cross[Math.floor(point.cross.length / 2)]);
      const foregroundCoverage = totalSamples > 0 ? foregroundSamples / totalSamples : 0;
      const stepSpan = sampleSpan / Math.max(1, lengthFractions.length - 1);
      const maxBackgroundLikeRunPx = maxBackgroundRun * stepSpan;
      const centerVsBackgroundDistance = centerDistanceSamples > 0 ? centerDistanceTotal / centerDistanceSamples : 0;
      const centerVsSideLumaDelta = centerDistanceSamples > 0 ? centerLumaDeltaTotal / centerDistanceSamples : 0;
      return {
        id: overlay.id,
        parentId: overlay.parentId,
        childId: overlay.childId,
        compactPatch,
        sampleSpan: Number(sampleSpan.toFixed(3)),
        bridgeWidth: Number(overlay.bridgeWidth.toFixed(3)),
        foregroundCoverage: Number(foregroundCoverage.toFixed(3)),
        maxBackgroundLikeRunPx: Number(maxBackgroundLikeRunPx.toFixed(3)),
        centerVsBackgroundDistance: Number(centerVsBackgroundDistance.toFixed(3)),
        centerVsSideLumaDelta: Number(centerVsSideLumaDelta.toFixed(3)),
        activeSamples: legacyCenterPoints.filter((point) => point?.foreground).length,
        maxBackgroundDistance: Number(Math.max(0, ...legacyCenterPoints.map((point) => point?.backgroundDistance ?? 0)).toFixed(3)),
        points,
      };
    });
  }, overlays);
}

async function screenshotEvidence(label, creatureId = null) {
  const blockers = await uiBlockers();
  if (blockers.length) visualEvidenceFailures.push(`${label}: screenshot has blocking UI ${blockers.join(', ')}`);
  const snap = await snapshot();
  const creature = articulatedSubject(snap, creatureId);
  if (!creature) {
    visualEvidenceFailures.push(`${label}: no articulated creature available for screenshot evidence`);
    return { blockers, visibleMajorParts: [], canvasSamples: [], canvasSeamSamples: [] };
  }
  const visible = visibleMajorParts(creature);
  if (visible.length < 3) {
    visualEvidenceFailures.push(`${label}: only ${visible.length} major articulated parts are visible in-frame`);
  }
  const canvasSamples = await sampleCanvasParts(visible.slice(0, 5));
  const activeSamples = canvasSamples.filter((sample) => sample.samples > 0 && (sample.lumaRange >= 8 || sample.colorRange >= 8));
  if (canvasSamples.length && activeSamples.length < Math.min(3, canvasSamples.length)) {
    visualEvidenceFailures.push(`${label}: canvas samples are too flat around major parts (${activeSamples.length}/${canvasSamples.length})`);
  }
  const canvasSeamSamples = await sampleCanvasSeams(creature, snap.camera);
  const weakSeams = canvasSeamSamples.filter((sample) => {
    const runLimit = Math.max(sample.compactPatch ? 18 : 24, sample.sampleSpan * (sample.compactPatch ? 0.72 : 0.58));
    return sample.foregroundCoverage < 0.34 ||
      sample.maxBackgroundLikeRunPx > runLimit ||
      (sample.centerVsBackgroundDistance < 5 && sample.centerVsSideLumaDelta < 3.5);
  });
  if (weakSeams.length) {
    visualEvidenceFailures.push(`${label}: weak canvas seam coverage ${weakSeams.map((sample) => `${sample.id} coverage ${sample.foregroundCoverage}, run ${sample.maxBackgroundLikeRunPx}px`).join('; ')}`);
  }
  return {
    blockers,
    visibleMajorParts: visible.map((part) => ({
      id: part.id,
      screenX: part.sprite.screenX,
      screenY: part.sprite.screenY,
      depth: part.sprite.depth,
    })),
    canvasSamples,
    canvasSeamSamples,
  };
}

async function captureRuntimeScreenshot(label, waitMs = 80, creatureId = null) {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const path = `${screenshotDir}/${safeLabel}.png`;
  if (waitMs > 0) await page.waitForTimeout(waitMs);
  const evidence = await screenshotEvidence(label, creatureId);
  await page.screenshot({
    path,
  });
  runtimeScreenshots.push({ label, path, ...evidence });
}

function summarizeBiome(snap) {
  return {
    seed: snap.seed,
    biome: snap.state.biome,
    name: snap.state.biomeName,
    reachableDepth: snap.world.reachable.deepestMeters,
    reachableWater: snap.world.reachable.waterCoverage,
    fish: snap.world.entities.fish,
    hostileFish: snap.world.entities.hostileFish,
    articulated: snap.world.entities.articulated,
    vents: snap.world.entities.vents,
    bobbits: snap.world.entities.bobbits,
    articulatedSpawns: (snap.articulatedCreatures ?? []).map((creature) => ({
      id: creature.id,
      species: creature.species,
      depthMeters: creature.naturalSpawn?.depthMeters ?? null,
      centerTile: creature.naturalSpawn?.centerTile ?? null,
      maxPartContact: Math.max(0, ...(creature.naturalSpawn?.partContacts ?? []).map((part) => part.contact ?? 0)),
    })),
    bands: snap.world.bands.map((band) => ({
      name: band.name,
      water: band.waterRatio,
      oreBlocks: band.oreBlocks,
      oreValue: band.oreValue,
      unmineable: band.unmineableRatio,
    })),
  };
}

function verifyNaturalArticulatedSpawn(snap) {
  const failures = [];
  const biome = snap?.state?.biome ?? 'unknown';
  const creatures = snap?.articulatedCreatures ?? [];
  if ((snap?.world?.entities?.articulated ?? 0) !== creatures.length) {
    failures.push(`biome ${biome}: world articulated count ${snap?.world?.entities?.articulated ?? 'n/a'} disagrees with snapshot ${creatures.length}`);
  }
  for (const creature of creatures) {
    const spawn = creature.naturalSpawn?.spawn;
    const depth = creature.naturalSpawn?.depthMeters;
    if (!spawn || !Number.isFinite(depth)) {
      failures.push(`biome ${biome} ${creature.id}: missing natural spawn evidence`);
      continue;
    }
    const runtimeBand = creature.naturalSpawn?.runtimeBand ?? spawn;
    const minDepth = runtimeBand.minDepthMeters ?? runtimeBand.minDepth;
    const maxDepth = runtimeBand.maxDepthMeters ?? runtimeBand.maxDepth;
    if (!Number.isFinite(minDepth) || !Number.isFinite(maxDepth)) {
      failures.push(`biome ${biome} ${creature.id}: missing runtime-scaled spawn band`);
    } else if (depth < minDepth - 12 || depth > maxDepth + 12) {
      failures.push(`biome ${biome} ${creature.id}: depth ${depth}m outside runtime spawn band ${minDepth}-${maxDepth}`);
    }
    const tile = creature.naturalSpawn?.centerTile?.tile;
    if (tile !== 'water') failures.push(`biome ${biome} ${creature.id}: center tile is ${tile}, expected water`);
    const contacts = creature.naturalSpawn?.partContacts ?? [];
    const colliding = contacts.filter((part) => (part.contact ?? 0) > 0);
    if (colliding.length) {
      failures.push(`biome ${biome} ${creature.id}: spawned with terrain contact on ${colliding.map((part) => `${part.id}:${part.contact}`).join(', ')}`);
    }
  }
  return failures;
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
    hp: creature?.hp ?? null,
    dead: creature?.dead ?? null,
    aggro: creature?.aggro ?? null,
    x: creature?.x ?? null,
    y: creature?.y ?? null,
    facingSign: creature?.facingSign ?? null,
    vx: creature?.vx ?? null,
    vy: creature?.vy ?? null,
    phase: creature?.phase ?? null,
    posePitch: creature?.posePitch ?? null,
    attackBlend: creature?.attackBlend ?? null,
    swimEffort: creature?.swimEffort ?? null,
    stunned: creature?.stunned ?? null,
    mobilityScale: creature?.mobilityScale ?? null,
    maxHp: creature?.maxHp ?? null,
    hull: snap?.state?.hull ?? null,
    oxygen: snap?.state?.oxygen ?? null,
    fuel: snap?.state?.fuel ?? null,
    cargo: snap?.state?.cargo ?? null,
    player: snap?.player ?? null,
    ui: snap?.ui ?? null,
    camera: snap?.camera ?? null,
    sceneDepths: snap?.sceneDepths ?? null,
    collisionDebug: creature?.collisionDebug ?? null,
    spineMetrics: spineMetricsForCreature(creature),
    jointSummary: creature?.jointSummary ?? null,
    biteAnchor: creature?.biteAnchor ?? null,
    joints: creature?.joints ?? [],
    spine: creature?.spine ?? [],
    parts: creature?.parts ?? [],
    socketOverlays: creature?.socketOverlays ?? [],
  };
}

function verifySocketOverlays(review, context = review.mode) {
  const failures = [];
  for (const overlay of review.socketOverlays ?? []) {
    if (overlay.sprite?.visible !== true) {
      failures.push(`${review.id ?? 'unknown'} ${context}: socket overlay ${overlay.id} is not visible`);
      continue;
    }
    if ((overlay.span ?? 0) <= 0.5) failures.push(`${review.id} ${context}: socket ${overlay.id} has no live anchor span`);
    if ((overlay.width ?? 0) <= 0 || (overlay.height ?? 0) <= 0) {
      failures.push(`${review.id} ${context}: socket ${overlay.id} has invalid size ${overlay.width}x${overlay.height}`);
    }
    if ((overlay.bridgeWidth ?? 0) <= 0 || (overlay.bridgeCoverage ?? 0) < 1) {
      failures.push(
        `${review.id} ${context}: socket ${overlay.id} bridge is not covering the live anchors ` +
        `(width ${overlay.bridgeWidth ?? 'n/a'}, coverage ${overlay.bridgeCoverage ?? 'n/a'})`,
      );
    }
    if ((overlay.parentCoverage ?? 0) < 1 || (overlay.childCoverage ?? 0) < 1) {
      failures.push(
        `${review.id} ${context}: socket ${overlay.id} does not cover both anchors ` +
        `(parent ${overlay.parentCoverage ?? 'n/a'}, child ${overlay.childCoverage ?? 'n/a'})`,
      );
    }
    const endpointDistance = Math.hypot(
      (overlay.childAnchorX ?? overlay.x ?? 0) - (overlay.parentAnchorX ?? overlay.x ?? 0),
      (overlay.childAnchorY ?? overlay.y ?? 0) - (overlay.parentAnchorY ?? overlay.y ?? 0),
    );
    if (Math.abs(endpointDistance - (overlay.span ?? 0)) > 1.5) {
      failures.push(`${review.id} ${context}: socket ${overlay.id} endpoint span ${endpointDistance.toFixed(3)} disagrees with ${overlay.span}`);
    }
  }
  return failures;
}

function verifyHitGeometry(review, context = review.mode) {
  const failures = [];
  const activeParts = (review.parts ?? []).filter((part) => !part.detached);
  if (!activeParts.length) return failures;
  let elongatedParts = 0;
  let maxGeometryGain = 0;
  for (const part of activeParts) {
    const shape = part.hitShape;
    if (!shape) {
      failures.push(`${review.id ?? 'unknown'} ${context}: part ${part.id} has no oriented hit shape`);
      continue;
    }
    if ((shape.radius ?? 0) <= 0 || (shape.halfLength ?? -1) < 0) {
      failures.push(`${review.id} ${context}: part ${part.id} has invalid hit shape radius=${shape.radius}, halfLength=${shape.halfLength}`);
    }
    if (typeof shape.centerX !== 'number' || typeof shape.centerY !== 'number' || typeof shape.rotation !== 'number') {
      failures.push(`${review.id} ${context}: part ${part.id} has nonnumeric hit shape placement`);
    }
    if ((shape.halfLength ?? 0) > (shape.radius ?? 0) * 0.18) elongatedParts += 1;
    const centerDistance = part.playerCenterDistance ?? 0;
    const hitDistance = part.playerHitDistance ?? centerDistance;
    if (Number.isFinite(centerDistance) && Number.isFinite(hitDistance)) {
      maxGeometryGain = Math.max(maxGeometryGain, centerDistance - hitDistance);
    }
  }
  if (elongatedParts < 2) failures.push(`${review.id ?? 'unknown'} ${context}: expected at least two elongated part hit capsules, saw ${elongatedParts}`);
  if (maxGeometryGain < 6) {
    failures.push(`${review.id ?? 'unknown'} ${context}: oriented hit geometry only improved center distance by ${maxGeometryGain.toFixed(3)}px`);
  }
  return failures;
}

function verifyFrameEvidence(review, context = review.mode) {
  const failures = [];
  const ui = review.ui ?? {};
  for (const key of ['radioOpen', 'logbookOpen', 'cargoOpen']) {
    if (ui[key]) failures.push(`${review.id ?? 'unknown'} ${context}: UI flag ${key} is still open during review evidence`);
  }
  if ((ui.floatingTextCount ?? 0) > 0) {
    failures.push(`${review.id ?? 'unknown'} ${context}: floating text is still visible during review evidence`);
  }
  if (!review.camera || !Number.isFinite(review.camera.zoom) || review.camera.zoom <= 0) {
    failures.push(`${review.id ?? 'unknown'} ${context}: invalid camera evidence`);
  }
  const activeParts = (review.parts ?? []).filter((part) => !part.detached && part.hp > 0);
  const visibleParts = activeParts.filter((part) => part.sprite?.visible === true);
  if (visibleParts.length < Math.min(3, activeParts.length)) {
    failures.push(`${review.id ?? 'unknown'} ${context}: only ${visibleParts.length}/${activeParts.length} active parts have visible sprites`);
  }
  const partDepths = visibleParts.map((part) => part.sprite?.depth).filter(Number.isFinite);
  if (partDepths.length !== visibleParts.length) {
    failures.push(`${review.id ?? 'unknown'} ${context}: at least one visible part has non-finite depth`);
  }
  for (const part of visibleParts) {
    const sprite = part.sprite ?? {};
    if ((sprite.alpha ?? 0) <= 0.05) failures.push(`${review.id} ${context}: part ${part.id} has near-zero alpha`);
    if ((sprite.displayWidth ?? 0) <= 0 || (sprite.displayHeight ?? 0) <= 0) failures.push(`${review.id} ${context}: part ${part.id} has invalid display size`);
    if (!Number.isFinite(sprite.screenX) || !Number.isFinite(sprite.screenY)) failures.push(`${review.id} ${context}: part ${part.id} has invalid screen coordinates`);
  }
  if (partDepths.length) {
    const minPartDepth = Math.min(...partDepths);
    const maxPartDepth = Math.max(...partDepths);
    if ((review.sceneDepths?.articulatedBridges ?? Number.POSITIVE_INFINITY) >= minPartDepth) {
      failures.push(`${review.id ?? 'unknown'} ${context}: articulated bridge layer is not behind body parts`);
    }
    if ((review.sceneDepths?.actors ?? Number.NEGATIVE_INFINITY) <= maxPartDepth) {
      failures.push(`${review.id ?? 'unknown'} ${context}: actors graphics layer is not above body parts`);
    }
  }
  const parts = partMap(review);
  const spine = (spineManifestsByCreature.get(review.id) ?? [])
    .map((manifest) => parts.get(manifest.id))
    .filter((part) => part?.sprite?.visible === true && !part.detached);
  for (let index = 0; index < spine.length - 1; index += 1) {
    const front = spine[index];
    const rear = spine[index + 1];
    if ((front.sprite?.depth ?? 0) <= (rear.sprite?.depth ?? 0)) {
      failures.push(`${review.id} ${context}: spine depth order ${front.id} (${front.sprite?.depth}) is not above ${rear.id} (${rear.sprite?.depth})`);
    }
  }
  return failures;
}

function verifyAnatomyMetadata(review, context = review.mode) {
  const failures = [];
  const manifests = partManifestsByCreature.get(review.id) ?? new Map();
  for (const part of review.parts ?? []) {
    const manifest = manifests.get(part.id);
    if (!manifest?.anatomy) {
      failures.push(`${review.id ?? 'unknown'} ${context}: manifest part ${part.id} has no anatomy metadata`);
      continue;
    }
    if (!part.anatomy || part.anatomy.role !== manifest.anatomy.role) {
      failures.push(`${review.id ?? 'unknown'} ${context}: snapshot anatomy for ${part.id} does not match manifest`);
    }
    if (manifest.anatomy.severable && !['jaw', 'tail', 'fin'].includes(manifest.anatomy.role)) {
      failures.push(`${review.id} ${context}: severable part ${part.id} has unexpected role ${manifest.anatomy.role}`);
    }
    if (!manifest.anatomy.severable && ['jaw', 'fin'].includes(manifest.anatomy.role)) {
      failures.push(`${review.id} ${context}: ${manifest.anatomy.role} part ${part.id} should be severable`);
    }
  }
  return failures;
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
    failures.push(...verifySocketOverlays(review));
    failures.push(...verifyHitGeometry(review));
    failures.push(...verifyFrameEvidence(review));
    failures.push(...verifyAnatomyMetadata(review));
    if (review.jointSummary.missing !== 0) failures.push(`${review.id} ${review.mode}: missing ${review.jointSummary.missing} joints`);
    if (review.jointSummary.maxError > 0.75) failures.push(`${review.id} ${review.mode}: joint error ${review.jointSummary.maxError}px exceeds 0.75px`);
    if (review.jointSummary.maxStress > 0.08) failures.push(`${review.id} ${review.mode}: joint stress ${review.jointSummary.maxStress} exceeds 0.08`);
    if (!review.biteAnchor) failures.push(`${review.id} ${review.mode}: missing jaw bite anchor`);
  }

  const right = reviews.find((review) => review.mode === 'right');
  const left = reviews.find((review) => review.mode === 'left');
  const lunge = reviews.find((review) => review.mode === 'lunge');
  const stunned = reviews.find((review) => review.mode === 'stunned');
  const rise = reviews.find((review) => review.mode === 'rise');
  const dive = reviews.find((review) => review.mode === 'dive');
  if (stunned && (stunned.stunned ?? 0) <= 0) {
    failures.push(`${stunned.id} stunned review did not expose a positive stunned timer`);
  }
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
      if ((idleJaw.sprite?.depth ?? 0) >= (idleHead.sprite?.depth ?? 0)) {
        failures.push(`${right.id} idle jaw depth ${idleJaw.sprite?.depth} should sit below head ${idleHead.sprite?.depth}`);
      }
      if ((lungeJaw.sprite?.depth ?? 0) <= (lungeHead.sprite?.depth ?? 0) + 0.015) {
        failures.push(`${lunge.id} lunge jaw depth ${lungeJaw.sprite?.depth} should pass in front of head ${lungeHead.sprite?.depth}`);
      }
      if (((lungeJaw.sprite?.depth ?? 0) - (idleJaw.sprite?.depth ?? 0)) < 0.03) {
        failures.push(`${lunge.id} lunge jaw depth did not increase enough over idle`);
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
    const uninitialized = (sample.spine ?? []).find((node) => node.initialized !== true);
    if (uninitialized) failures.push(`${id} motion review ${sample.mode}: spine node ${uninitialized.partId} was not initialized`);
    const maxConstraintError = Math.max(0, ...(sample.spine ?? []).map((node) => node.constraintError ?? 0));
    if (maxConstraintError > 0.35) failures.push(`${id} motion review ${sample.mode}: spine constraint error ${maxConstraintError.toFixed(3)} exceeds 0.35`);
    failures.push(...verifySocketOverlays(sample, `motion review ${sample.mode}`));
    failures.push(...verifyHitGeometry(sample, `motion review ${sample.mode}`));
    failures.push(...verifyFrameEvidence(sample, `motion review ${sample.mode}`));
    const parts = partMap(sample);
    const body = parts.get('body-1') ?? parts.get('body');
    const tail = parts.get('tail');
    if (body && tail) {
      bodyOffsets.push((tail.y ?? 0) - (body.y ?? 0));
      tailRotations.push(tail.rotation ?? 0);
    }
    for (const [partId, part] of parts) {
      if (!['head', 'body-1', 'body-2', 'body-3', 'tail'].includes(partId)) continue;
      const relativeX = (part.x ?? 0) - (sample.x ?? 0);
      const relativeY = (part.y ?? 0) - (sample.y ?? 0);
      const previous = previousParts.get(partId);
      if (previous) maxJump = Math.max(maxJump, Math.hypot(relativeX - previous.x, relativeY - previous.y));
      previousParts.set(partId, { x: relativeX, y: relativeY });
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
  if (maxJump > 56) failures.push(`${id} motion review part jump ${maxJump.toFixed(3)}px exceeds 56px`);
  return failures;
}

function verifyLiveArticulatedMotion(samples) {
  const failures = verifyArticulatedMotion(samples);
  if (samples.length < 5) return failures;
  const id = samples[0]?.id ?? 'unknown';
  const first = samples[0];
  const last = samples[samples.length - 1];
  const rootDisplacement = Math.hypot((last?.x ?? 0) - (first?.x ?? 0), (last?.y ?? 0) - (first?.y ?? 0));
  const bodySamples = samples.map((sample) => partMap(sample).get('body-1')).filter(Boolean);
  const bodyDrift = bodySamples.length > 1
    ? Math.hypot((bodySamples.at(-1)?.x ?? 0) - (bodySamples[0]?.x ?? 0), (bodySamples.at(-1)?.y ?? 0) - (bodySamples[0]?.y ?? 0))
    : 0;
  const spineOffsetSpans = new Map();
  for (const sample of samples) {
    for (const node of sample.spine ?? []) {
      const current = spineOffsetSpans.get(node.partId) ?? { min: node.offset, max: node.offset };
      current.min = Math.min(current.min, node.offset);
      current.max = Math.max(current.max, node.offset);
      spineOffsetSpans.set(node.partId, current);
    }
  }
  const maxSpineOffsetSpan = Math.max(0, ...[...spineOffsetSpans.values()].map((range) => range.max - range.min));
  const speedSamples = samples.map((sample) => Math.hypot(sample.vx ?? 0, sample.vy ?? 0));
  const maxSpeed = Math.max(0, ...speedSamples);
  if (bodyDrift < 10 && rootDisplacement < 10) failures.push(`${id} live motion body drift too small: ${bodyDrift.toFixed(3)}px`);
  if (maxSpeed < 18 && rootDisplacement < 5) failures.push(`${id} live motion never built meaningful velocity`);
  if (maxSpineOffsetSpan < 0.8) failures.push(`${id} live motion spine wake too small: max offset span ${maxSpineOffsetSpan.toFixed(3)}px`);
  if (samples.some((sample) => sample.state === 'grab')) failures.push(`${id} live motion unexpectedly entered grab state`);
  return failures;
}

function verifyLiveStunnedArticulatedMotion(samples) {
  const failures = [];
  if (samples.length < 5) {
    failures.push('articulated stunned live review: expected at least 5 samples');
    return failures;
  }
  const id = samples[0]?.id ?? 'unknown';
  const first = samples[0];
  const last = samples.at(-1);
  const firstSpeed = Math.hypot(first?.vx ?? 0, first?.vy ?? 0);
  const lastSpeed = Math.hypot(last?.vx ?? 0, last?.vy ?? 0);
  if ((first?.stunned ?? 0) <= 0) failures.push(`${id} stunned live review never exposed a positive stun timer`);
  if ((last?.stunned ?? 0) >= (first?.stunned ?? 0)) failures.push(`${id} stunned live timer did not decay`);
  if (lastSpeed > firstSpeed * 0.72) failures.push(`${id} stunned live velocity damped too little: ${firstSpeed.toFixed(3)} -> ${lastSpeed.toFixed(3)}`);
  if (samples.some((sample) => (sample.aggro ?? 0) > 0.05)) failures.push(`${id} stunned live aggro was not cleared`);
  if (samples.some((sample) => sample.state === 'grab' || sample.state === 'lunge')) failures.push(`${id} stunned live entered attack state`);
  const visiblePartAlpha = samples
    .flatMap((sample) => sample.parts ?? [])
    .filter((part) => part.sprite?.visible === true && !part.detached)
    .map((part) => part.sprite?.alpha ?? 1);
  const maxAlpha = Math.max(0, ...visiblePartAlpha);
  if (maxAlpha > 0.76) failures.push(`${id} stunned live part alpha ${maxAlpha.toFixed(3)} is not visibly damped`);
  for (const sample of samples) {
    failures.push(...verifyFrameEvidence(sample, `stunned live ${sample.mode}`));
    failures.push(...verifyAnatomyMetadata(sample, `stunned live ${sample.mode}`));
  }
  return failures;
}

function verifyLiveAttackArticulatedMotion(samples, baseline) {
  const failures = [];
  if (samples.length < 4) {
    failures.push('articulated attack live review: expected at least 4 samples');
    return failures;
  }
  const id = samples[0]?.id ?? 'unknown';
  for (const sample of samples) {
    failures.push(...verifyAnatomyMetadata(sample, `attack live ${sample.mode}`));
    failures.push(...verifyHitGeometry(sample, `attack live ${sample.mode}`));
  }
  const states = new Set(samples.map((sample) => sample.state));
  if (!states.has('grab')) {
    failures.push(`${id} attack live never reached grab state; states were ${[...states].join(',') || 'none'}`);
  }
  const maxAttackBlend = Math.max(0, ...samples.map((sample) => sample.attackBlend ?? 0));
  if (maxAttackBlend < 0.72) failures.push(`${id} attack live attackBlend only reached ${maxAttackBlend.toFixed(3)}`);
  const minHull = Math.min(...samples.map((sample) => sample.hull).filter(Number.isFinite));
  const minOxygen = Math.min(...samples.map((sample) => sample.oxygen).filter(Number.isFinite));
  if (!Number.isFinite(minHull) || !Number.isFinite(baseline?.hull) || minHull >= baseline.hull) {
    failures.push(`${id} attack live did not reduce hull (${baseline?.hull ?? 'n/a'} -> ${Number.isFinite(minHull) ? minHull : 'n/a'})`);
  }
  if (!Number.isFinite(minOxygen) || !Number.isFinite(baseline?.oxygen) || minOxygen >= baseline.oxygen) {
    failures.push(`${id} attack live did not reduce oxygen (${baseline?.oxygen ?? 'n/a'} -> ${Number.isFinite(minOxygen) ? minOxygen : 'n/a'})`);
  }
  const closestBite = Math.min(
    ...samples
      .filter((sample) => sample.biteAnchor && sample.player)
      .map((sample) => Math.hypot((sample.biteAnchor.x ?? 0) - (sample.player.x ?? 0), (sample.biteAnchor.y ?? 0) - (sample.player.y ?? 0))),
  );
  if (!Number.isFinite(closestBite) || closestBite > 110) {
    failures.push(`${id} attack live bite anchor never stayed near player (${Number.isFinite(closestBite) ? closestBite.toFixed(3) : 'n/a'}px)`);
  }
  if (samples.some((sample) => !sample.biteAnchor)) failures.push(`${id} attack live lost bite anchor before damage proof completed`);
  return failures;
}

function toolDamageTargetForCreature(creatureId) {
  const manifests = [...(partManifestsByCreature.get(creatureId)?.values?.() ?? [])];
  return manifests.find((part) => part.id === 'body-2') ??
    manifests.find((part) => part.id === 'body2') ??
    manifests.find((part) => part.anatomy?.role === 'torso' && part.parentId) ??
    manifests.find((part) => part.anatomy?.role === 'torso') ??
    manifests.find((part) => part.id === 'head') ??
    manifests[0];
}

function verifyArticulatedToolDamage(review, baseline, tool, targetPartId) {
  const failures = [...verifyFrameEvidence(review, `tool damage ${tool}`)];
  failures.push(...verifyAnatomyMetadata(review, `tool damage ${tool}`));
  const before = partMap(baseline).get(targetPartId);
  const after = partMap(review).get(targetPartId);
  if (!before || !after) {
    failures.push(`${review.id ?? 'unknown'} tool damage ${tool}: missing target part ${targetPartId}`);
    return failures;
  }
  if (!(after.hp < before.hp)) {
    failures.push(`${review.id} tool damage ${tool}: ${targetPartId} hp did not decrease (${before.hp} -> ${after.hp})`);
  }
  if (review.dead) failures.push(`${review.id} tool damage ${tool}: creature died during proof hit`);
  if ((review.jointSummary?.maxError ?? 0) > 0.85) {
    failures.push(`${review.id} tool damage ${tool}: joint error ${review.jointSummary.maxError}px after player-facing hit`);
  }
  if (tool === 'cutter') {
    if (!String(review.ui?.status ?? '').includes('Cutter hit')) failures.push(`${review.id} tool damage cutter: status did not confirm cutter hit`);
    if (!(review.fuel < baseline.fuel)) failures.push(`${review.id} tool damage cutter: fuel did not decrease (${baseline.fuel} -> ${review.fuel})`);
  } else if (tool === 'knife') {
    if (!String(review.ui?.status ?? '').includes('Injector knife hit')) failures.push(`${review.id} tool damage knife: status did not confirm injector knife hit`);
    if ((review.cargo ?? 0) < 1) failures.push(`${review.id} tool damage knife: injector knife tool was consumed or missing from cargo`);
  } else if (tool === 'dynamite') {
    const status = String(review.ui?.status ?? '');
    if (!status.includes('Dynamite') || !status.includes('lifeform')) {
      failures.push(`${review.id} tool damage dynamite: status did not confirm dynamite lifeform hit`);
    }
  }
  return failures;
}

function damageAmountForTarget(review, target) {
  const manifest = partManifestsByCreature.get(review.id)?.get(target.partId);
  const part = partMap(review).get(target.partId);
  const maxHp = Math.max(1, part?.maxHp ?? part?.hp ?? 1);
  const multiplier = Math.max(0.1, manifest?.damageMultiplier ?? 1);
  return Math.ceil((maxHp + 2) / multiplier);
}

function socketsForPart(review, partId) {
  return (review.socketOverlays ?? []).filter((overlay) => {
    const manifest = (articulatedManifest.creatures ?? [])
      .find((creature) => creature.id === review.id)
      ?.socketOverlays
      ?.find((candidate) => candidate.id === overlay.id);
    return manifest?.parentId === partId || manifest?.childId === partId;
  });
}

function socketManifestFor(review, overlayId) {
  return (articulatedManifest.creatures ?? [])
    .find((creature) => creature.id === review.id)
    ?.socketOverlays
    ?.find((candidate) => candidate.id === overlayId);
}

function verifyDetachedSocketState(review, socket, detachedPartId) {
  const failures = [];
  const manifest = socketManifestFor(review, socket.id);
  const detachedPart = partMap(review).get(detachedPartId);
  const hasSeveredStump = Boolean(manifest?.severedTextureKey);
  if (hasSeveredStump) {
    if (socket.sprite?.visible !== true) {
      failures.push(`${review.id} damage review: severed socket ${socket.id} is hidden after ${detachedPartId} detached`);
    }
    if (socket.sprite?.textureKey !== manifest.severedTextureKey) {
      failures.push(
        `${review.id} damage review: severed socket ${socket.id} is using ${socket.sprite?.textureKey ?? 'no texture'}, ` +
        `expected ${manifest.severedTextureKey}`,
      );
    }
    if ((socket.span ?? 0) > 0.5 || (socket.bridgeWidth ?? 0) > 0) {
      failures.push(`${review.id} damage review: severed socket ${socket.id} still has a live bridge after ${detachedPartId} detached`);
    }
    if ((socket.childCoverage ?? 0) > 0 || (socket.bridgeCoverage ?? 0) > 0) {
      failures.push(`${review.id} damage review: severed socket ${socket.id} still covers the detached child after ${detachedPartId} detached`);
    }
    if ((socket.width ?? 0) <= 0 || (socket.height ?? 0) <= 0) {
      failures.push(`${review.id} damage review: severed socket ${socket.id} has invalid stump size ${socket.width}x${socket.height}`);
    }
    if (detachedPart?.sprite?.visible === true) {
      const separation = Math.hypot((detachedPart.x ?? 0) - (socket.x ?? 0), (detachedPart.y ?? 0) - (socket.y ?? 0));
      if (separation < 22) {
        failures.push(`${review.id} damage review: detached ${detachedPartId} is too close to severed stump ${socket.id}: ${separation.toFixed(3)}px`);
      }
    }
    return failures;
  }
  if (socket.sprite?.visible === true || (socket.span ?? 0) > 0 || (socket.bridgeWidth ?? 0) > 0) {
    failures.push(`${review.id} damage review: socket ${socket.id} is still active after ${detachedPartId} detached`);
  }
  return failures;
}

function verifyArticulatedDamage(review, target, baseline) {
  const failures = [...verifyFrameEvidence(review, 'damage review')];
  failures.push(...verifyAnatomyMetadata(review, 'damage review'));
  const parts = partMap(review);
  const part = parts.get(target.partId);
  const joint = review.joints?.find?.((candidate) => candidate.partId === target.partId);
  const expectedDetached = target.expected === 'detached';
  if (!part) {
    failures.push(`${review.id ?? 'unknown'} damage review: missing target part ${target.partId}`);
    return failures;
  }
  if (part.hp !== 0) failures.push(`${review.id} damage review: ${target.partId} hp is ${part.hp}, expected 0`);
  if (expectedDetached) {
    if (!part.detached) failures.push(`${review.id} damage review: ${target.partId} was not detached`);
    if (joint && !joint.detached) failures.push(`${review.id} damage review: ${target.partId} joint is not marked detached`);
    const manifest = partManifestsByCreature.get(review.id)?.get(target.partId);
    if (manifest?.detachedTextureKey && part.sprite?.textureKey !== manifest.detachedTextureKey) {
      failures.push(
        `${review.id} damage review: detached ${target.partId} is using ${part.sprite?.textureKey ?? 'no texture'}, ` +
        `expected ${manifest.detachedTextureKey}`,
      );
    }
    if (Math.abs(part.detachVx ?? 0) < 1 && Math.abs(part.detachVy ?? 0) < 1) {
      failures.push(`${review.id} damage review: detached ${target.partId} has no drift velocity`);
    }
    for (const socket of socketsForPart(review, target.partId)) failures.push(...verifyDetachedSocketState(review, socket, target.partId));
    if (Number.isFinite(baseline?.mobilityScale) && Number.isFinite(review.mobilityScale) && review.mobilityScale >= baseline.mobilityScale) {
      failures.push(
        `${review.id} damage review: mobility scale did not fall after ${target.partId} detach ` +
        `(${baseline.mobilityScale} -> ${review.mobilityScale})`,
      );
    }
  } else {
    if (part.detached) failures.push(`${review.id} damage review: ${target.partId} detached even though it should only be crippled`);
    if (joint?.detached) failures.push(`${review.id} damage review: ${target.partId} joint detached during cripple-only damage`);
    if (review.dead) failures.push(`${review.id} damage review: body cripple killed the whole creature`);
    const manifest = partManifestsByCreature.get(review.id)?.get(target.partId);
    if (manifest?.damagedTextureKey && part.sprite?.textureKey !== manifest.damagedTextureKey) {
      failures.push(
        `${review.id} damage review: crippled ${target.partId} is using ${part.sprite?.textureKey ?? 'no texture'}, ` +
        `expected ${manifest.damagedTextureKey}`,
      );
    }
  }
  const targetManifest = partManifestsByCreature.get(review.id)?.get(target.partId);
  const biteTarget = target.partId === 'jaw'
    || targetManifest?.anatomy?.role === 'jaw'
    || targetManifest?.motion?.kind === 'jaw'
    || Boolean(targetManifest?.anchors?.bite);
  if (biteTarget && review.biteAnchor) failures.push(`${review.id} damage review: bite anchor still exists after bite-part detachment`);
  if (!biteTarget && !review.biteAnchor) failures.push(`${review.id} damage review: bite anchor disappeared after non-bite damage to ${target.partId}`);
  return failures;
}

function verifyArticulatedDamageMotion(initial, samples, target) {
  const failures = [];
  if (samples.length < 3) {
    failures.push(`${initial.id ?? 'unknown'} damage motion ${target.partId}: expected at least 3 samples`);
    return failures;
  }
  const startPart = partMap(initial).get(target.partId);
  const end = samples.at(-1);
  const endPart = partMap(end).get(target.partId);
  if (!startPart || !endPart) {
    failures.push(`${initial.id ?? 'unknown'} damage motion ${target.partId}: missing target part`);
    return failures;
  }
  for (const sample of samples) {
    failures.push(...verifyFrameEvidence(sample, `damage motion ${target.partId}`));
    failures.push(...verifyAnatomyMetadata(sample, `damage motion ${target.partId}`));
  }
  const partDisplacement = Math.hypot((endPart.x ?? 0) - (startPart.x ?? 0), (endPart.y ?? 0) - (startPart.y ?? 0));
  const partRotation = Math.abs((endPart.rotation ?? 0) - (startPart.rotation ?? 0));
  const rootDisplacement = Math.hypot((end?.x ?? 0) - (initial.x ?? 0), (end?.y ?? 0) - (initial.y ?? 0));
  if (target.expected === 'detached') {
    if (partDisplacement < 4.5) failures.push(`${initial.id} damage motion ${target.partId}: detached part moved only ${partDisplacement.toFixed(3)}px`);
    if (partRotation < 0.015) failures.push(`${initial.id} damage motion ${target.partId}: detached part rotated only ${partRotation.toFixed(3)}rad`);
  } else {
    if (partDisplacement < 2.5 && rootDisplacement < 2.5) {
      failures.push(`${initial.id} damage motion ${target.partId}: crippled body/root recoil too small (${partDisplacement.toFixed(3)}px part, ${rootDisplacement.toFixed(3)}px root)`);
    }
    if (endPart.detached) failures.push(`${initial.id} damage motion ${target.partId}: crippled part detached during motion review`);
  }
  if (samples.some((sample) => sample.jointSummary?.maxError > 0.85)) {
    failures.push(`${initial.id} damage motion ${target.partId}: joint error exceeded 0.85px during post-damage motion`);
  }
  return failures;
}

function verifyArticulatedCollision(review) {
  const failures = [...verifyFrameEvidence(review, 'collision review')];
  const mappedParts = partMap(review);
  const parts = [...mappedParts.values()];
  const contacts = parts.filter((part) => (part.terrainContact ?? 0) > 0);
  const target = mappedParts.get(review.collisionDebug?.partId ?? 'head');
  if (!mappedParts.get('head')) failures.push(`${review.id ?? 'unknown'} collision review: missing head part`);
  if (!contacts.length) failures.push(`${review.id} collision review: no articulated part reported terrain contact`);
  if (!contacts.some((part) => Math.abs(part.terrainNormalX ?? 0) >= 0.5)) {
    failures.push(`${review.id} collision review: expected a strong horizontal terrain normal`);
  }
  if (!review.collisionDebug) {
    failures.push(`${review.id} collision review: missing collision debug metadata`);
  } else {
    if ((review.collisionDebug.writtenTiles ?? []).some((tile) => tile.tile !== 'stone')) {
      failures.push(`${review.id} collision review: expected all collision debug tiles to remain stone`);
    }
    if (!target) {
      failures.push(`${review.id} collision review: missing collision target ${review.collisionDebug.partId}`);
    } else {
      if ((target.terrainProbeContact ?? 0) <= 0) failures.push(`${review.id} collision review: target ${target.id} has no fresh terrain probe contact`);
      if (Math.abs(target.terrainProbeNormalX ?? 0) < 0.8) failures.push(`${review.id} collision review: target ${target.id} has weak fresh terrain probe normal ${target.terrainProbeNormalX}`);
      if (Math.sign(target.terrainProbeNormalX ?? 0) !== -review.collisionDebug.frontSign) {
        failures.push(`${review.id} collision review: target ${target.id} terrain probe normal ${target.terrainProbeNormalX} does not oppose front sign ${review.collisionDebug.frontSign}`);
      }
    }
    if ((review.vx ?? 0) * review.collisionDebug.frontSign >= -8) {
      failures.push(`${review.id} collision review: creature vx ${review.vx} did not rebound away from front sign ${review.collisionDebug.frontSign}`);
    }
  }
  if (review.jointSummary?.maxError > 0.75) failures.push(`${review.id} collision review: seam error ${review.jointSummary.maxError}px after terrain response`);
  return failures;
}

try {
  await rm(screenshotDir, { recursive: true, force: true });
  await mkdir(screenshotDir, { recursive: true });
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await waitForPlaytestApi();
  await command('start');

  const biomes = [];
  const naturalSpawnSnapshots = [];
  const naturalSpawnFailures = [];
  if (!skipNaturalSpawnSweep) {
    for (const biome of [1, 2, 3, 4]) {
      await command('setBiome', biome);
      await page.waitForFunction((expectedBiome) => {
        return window.__AQUA_PLAYTEST__?.snapshot()?.state?.biome === expectedBiome;
      }, biome);
      const naturalSnapshot = await snapshot();
      naturalSpawnSnapshots.push({
        biome,
        seed: naturalSnapshot.seed,
        summary: summarizeBiome(naturalSnapshot),
        articulatedCreatures: naturalSnapshot.articulatedCreatures ?? [],
      });
      biomes.push(summarizeBiome(naturalSnapshot));
      naturalSpawnFailures.push(...verifyNaturalArticulatedSpawn(naturalSnapshot));
    }
  }

  await command('setBiome', 4);
  await command('start');
  const articulatedReview = [];
  const articulatedCollision = [];
  const articulatedDamage = [];
  const articulatedDamageMotion = [];
  const articulatedToolDamage = [];
  const articulatedMotion = [];
  const articulatedLive = [];
  const articulatedAttackLive = [];
  const articulatedStunnedLive = [];
  const articulatedFailures = [];
  const articulatedCollisionFailures = [];
  const articulatedDamageFailures = [];
  const articulatedDamageMotionFailures = [];
  const articulatedToolDamageFailures = [];
  const articulatedMotionFailures = [];
  const articulatedLiveFailures = [];
  const articulatedAttackLiveFailures = [];
  const articulatedStunnedLiveFailures = [];
  for (const creatureId of articulatedCreatureIds) {
    const creatureReview = [];
    for (const mode of ['right', 'left', 'rise', 'dive', 'lunge', 'stunned']) {
      await command('reviewArticulated', { mode, creatureId });
      await page.waitForTimeout(120);
      const summary = reviewSummary(mode, await snapshot(), creatureId);
      creatureReview.push(summary);
      articulatedReview.push(summary);
      await captureRuntimeScreenshot(`${creatureId}-${mode}`, 80, creatureId);
    }
    articulatedFailures.push(...verifyArticulatedReview(creatureReview));
    await command('reviewArticulated', { mode: 'right', creatureId });
    const creatureMotion = [];
    for (let step = 0; step < 6; step += 1) {
      const snap = await command('advanceArticulatedReview', { creatureId, seconds: 0.18, phaseRate: 1.55 });
      const summary = reviewSummary(`motion-${step}`, snap, creatureId);
      creatureMotion.push(summary);
      articulatedMotion.push(summary);
      await captureRuntimeScreenshot(`${creatureId}-motion-${step}`, 35, creatureId);
    }
    articulatedMotionFailures.push(...verifyArticulatedMotion(creatureMotion));
    await command('liveArticulatedReview', { creatureId, mode: 'turn' });
    const creatureLive = [];
    for (let step = 0; step < 8; step += 1) {
      const summary = reviewSummary(
        `live-${step}`,
        await command('advanceLiveArticulatedReview', { creatureId, seconds: 0.1 }),
        creatureId,
      );
      creatureLive.push(summary);
      articulatedLive.push(summary);
    }
    await commandNow('focusArticulatedCamera', { creatureId });
    await captureRuntimeScreenshot(`${creatureId}-live-turn`, 80, creatureId);
    articulatedLiveFailures.push(...verifyLiveArticulatedMotion(creatureLive));
    await command('liveArticulatedReview', { creatureId, mode: 'attack' });
    const attackBaseline = reviewSummary('attack-live-baseline', await snapshot(), creatureId);
    const creatureAttackLive = [];
    for (let step = 0; step < 6; step += 1) {
      const summary = reviewSummary(
        `attack-live-${step}`,
        await command('advanceLiveArticulatedReview', { creatureId, seconds: 0.12, attack: true }),
        creatureId,
      );
      creatureAttackLive.push(summary);
      articulatedAttackLive.push(summary);
    }
    await command('focusArticulatedCamera', { creatureId, preserveVitals: true, freeze: true, maxZoom: 0.28, includePlayer: true });
    await captureRuntimeScreenshot(`${creatureId}-live-attack`, 80, creatureId);
    articulatedAttackLiveFailures.push(...verifyLiveAttackArticulatedMotion(creatureAttackLive, attackBaseline));
    await command('liveArticulatedReview', { creatureId, mode: 'stunned' });
    const creatureStunnedLive = [];
    for (let step = 0; step < 8; step += 1) {
      const summary = reviewSummary(
        `stunned-live-${step}`,
        await command('advanceLiveArticulatedReview', { creatureId, seconds: 0.1 }),
        creatureId,
      );
      creatureStunnedLive.push(summary);
      articulatedStunnedLive.push(summary);
    }
    await commandNow('focusArticulatedCamera', { creatureId });
    await captureRuntimeScreenshot(`${creatureId}-live-stunned`, 80, creatureId);
    articulatedStunnedLiveFailures.push(...verifyLiveStunnedArticulatedMotion(creatureStunnedLive));
    await command('reviewArticulated', { mode: 'right', creatureId });
    const toolTarget = toolDamageTargetForCreature(creatureId);
    for (const tool of ['cutter', 'knife', 'dynamite']) {
      if (!toolTarget?.id) continue;
      await command('reviewArticulated', { mode: 'right', creatureId });
      const baseline = reviewSummary(`tool-${tool}-baseline`, await snapshot(), creatureId);
      const result = {
        ...reviewSummary(
          `tool-${tool}-${toolTarget.id}`,
          await command('exerciseArticulatedToolDamage', { creatureId, partId: toolTarget.id, tool }),
          creatureId,
        ),
        tool,
        toolTarget: { partId: toolTarget.id },
      };
      articulatedToolDamage.push(result);
      articulatedToolDamageFailures.push(...verifyArticulatedToolDamage(result, baseline, tool, toolTarget.id));
    }
    await command('reviewArticulated', { mode: 'right', creatureId });
    const collision = reviewSummary(
      'head-terrain',
      await command('collideArticulated', { creatureId, partId: 'head' }),
      creatureId,
    );
    articulatedCollision.push(collision);
    await captureRuntimeScreenshot(`${creatureId}-collision-head-terrain`, 80, creatureId);
    articulatedCollisionFailures.push(...verifyArticulatedCollision(collision));
    for (const target of damageTargetsByCreature.get(creatureId) ?? []) {
      await command('reviewArticulated', { mode: 'right', creatureId });
      const baseline = reviewSummary(`damage-${target.partId}-baseline`, await snapshot(), creatureId);
      const amount = damageAmountForTarget(baseline, target);
      const damage = {
        ...reviewSummary(
          `damage-${target.partId}-${target.expected}`,
          await command('damageArticulatedPart', {
            creatureId,
            partId: target.partId,
            amount,
            source: 'Playtest',
            quietReview: true,
          }),
          creatureId,
        ),
        damageTarget: { ...target, amount },
      };
      articulatedDamage.push(damage);
      await captureRuntimeScreenshot(`${creatureId}-damage-${target.partId}-${target.expected}`, 80, creatureId);
      articulatedDamageFailures.push(...verifyArticulatedDamage(damage, target, baseline));
      const damageMotionSamples = [];
      for (let step = 0; step < 4; step += 1) {
        const sample = {
          ...reviewSummary(
            `damage-${target.partId}-motion-${step}`,
            await command('advanceArticulatedDamageReview', { creatureId, seconds: 0.16 }),
            creatureId,
          ),
          damageTarget: target,
        };
        damageMotionSamples.push(sample);
        articulatedDamageMotion.push(sample);
      }
      articulatedDamageMotionFailures.push(...verifyArticulatedDamageMotion(damage, damageMotionSamples, target));
      await captureRuntimeScreenshot(`${creatureId}-damage-${target.partId}-${target.expected}-clean`, 80, creatureId);
    }
  }

  const finalSnapshot = await snapshot();
  let subSmoke = null;
  let subSmokeFailure = null;
  try {
    await command('setBiome', 1);
    await command('setCredits', 250000);
    await command('maxUpgrades');
    await command('buySub', 3);
    await command('dive');
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(1800);
    await page.keyboard.up('ArrowDown');
    await command('teleportDepth', 1200);
    subSmoke = await snapshot();
  } catch (error) {
    subSmokeFailure = error.message;
  }
  const phaseStrip = await stat(phaseStripPath)
    .then((entry) => ({ path: phaseStripPath, size: entry.size, mtimeMs: Math.round(entry.mtimeMs), exists: true }))
    .catch(() => ({ path: phaseStripPath, size: 0, mtimeMs: 0, exists: false }));
  if (!phaseStrip.exists || phaseStrip.size < 1000) {
    visualEvidenceFailures.push(`phase strip artifact is missing or too small at ${phaseStripPath}`);
  }
  const runtimeManifest = finalSnapshot?.articulatedManifest ?? {};
  const expectedManifestIds = [...articulatedCreatureIds].sort();
  const runtimeManifestIds = [...(runtimeManifest.ids ?? [])].sort();
  if (runtimeManifest.source !== 'generated') {
    visualEvidenceFailures.push(`articulated manifest source is ${runtimeManifest.source ?? 'missing'}, expected generated`);
  }
  if (runtimeManifest.schema !== 'asset-forge/sprite-parts@1') {
    visualEvidenceFailures.push(`articulated manifest schema is ${runtimeManifest.schema ?? 'missing'}, expected asset-forge/sprite-parts@1`);
  }
  const missingExpectedManifestIds = expectedManifestIds.filter((id) => !runtimeManifestIds.includes(id));
  if (missingExpectedManifestIds.length) {
    visualEvidenceFailures.push(
      `runtime articulated manifest ids ${runtimeManifestIds.join(',') || 'none'} are missing selected ids ${missingExpectedManifestIds.join(',')}`,
    );
  }
  if (!filteredArticulatedIds && JSON.stringify(runtimeManifestIds) !== JSON.stringify(expectedManifestIds)) {
    visualEvidenceFailures.push(
      `runtime articulated manifest ids ${runtimeManifestIds.join(',') || 'none'} do not match generated ids ${expectedManifestIds.join(',')}`,
    );
  }
  const expectedScreenshotCount = articulatedCreatureIds.reduce(
    (count, creatureId) => count + 16 + (damageTargetsByCreature.get(creatureId)?.length ?? 0) * 2,
    0,
  );
  if (runtimeScreenshots.length !== expectedScreenshotCount) {
    visualEvidenceFailures.push(`expected ${expectedScreenshotCount} articulated screenshots, captured ${runtimeScreenshots.length}`);
  }
  for (const creatureId of articulatedCreatureIds) {
    for (let step = 0; step < 6; step += 1) {
      const label = `${creatureId}-motion-${step}`;
      if (!runtimeScreenshots.some((shot) => shot.label === label)) visualEvidenceFailures.push(`missing runtime motion screenshot ${label}`);
    }
    if (!runtimeScreenshots.some((shot) => shot.label === `${creatureId}-live-attack`)) {
      visualEvidenceFailures.push(`missing runtime attack screenshot ${creatureId}-live-attack`);
    }
    for (const target of damageTargetsByCreature.get(creatureId) ?? []) {
      const label = `${creatureId}-damage-${target.partId}-${target.expected}`;
      if (!runtimeScreenshots.some((shot) => shot.label === label)) visualEvidenceFailures.push(`missing runtime damage screenshot ${label}`);
      const cleanLabel = `${creatureId}-damage-${target.partId}-${target.expected}-clean`;
      if (!runtimeScreenshots.some((shot) => shot.label === cleanLabel)) visualEvidenceFailures.push(`missing clean runtime damage screenshot ${cleanLabel}`);
    }
  }

  const report = {
    url: targetUrl,
    generatedAt: new Date().toISOString(),
    articulatedCreatureIds,
    filteredArticulatedIds,
    skipNaturalSpawnSweep,
    biomes,
    naturalSpawnSnapshots,
    naturalSpawnFailures,
    runtimeErrors,
    runtimeScreenshots,
    visualEvidenceFailures,
    phaseStrip,
    articulatedManifest: runtimeManifest,
    articulatedPlaceholders: finalSnapshot?.articulatedPlaceholders ?? [],
    articulatedReview,
    articulatedFailures,
    articulatedCollision,
    articulatedCollisionFailures,
    articulatedDamage,
    articulatedDamageFailures,
    articulatedDamageMotion,
    articulatedDamageMotionFailures,
    articulatedToolDamage,
    articulatedToolDamageFailures,
    articulatedMotion,
    articulatedMotionFailures,
    articulatedLive,
    articulatedLiveFailures,
    articulatedAttackLive,
    articulatedAttackLiveFailures,
    articulatedStunnedLive,
    articulatedStunnedLiveFailures,
    subSmokeFailure,
    subSmoke: subSmoke ? {
      depth: subSmoke.state.depth,
      hull: subSmoke.state.activeSub?.hull ?? null,
      oxygen: subSmoke.state.activeSub?.oxygen ?? null,
      fuel: subSmoke.state.activeSub?.fuel ?? null,
      piloting: subSmoke.state.activeSub?.piloting ?? false,
      cargoCapacity: subSmoke.state.cargoCapacity,
    } : null,
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
  if (runtimeErrors.length || placeholderFailures.length || visualEvidenceFailures.length || naturalSpawnFailures.length || articulatedFailures.length || articulatedCollisionFailures.length || articulatedDamageFailures.length || articulatedDamageMotionFailures.length || articulatedToolDamageFailures.length || articulatedMotionFailures.length || articulatedLiveFailures.length || articulatedAttackLiveFailures.length || articulatedStunnedLiveFailures.length) {
    for (const error of runtimeErrors) console.error('Runtime error:', error);
    for (const failure of placeholderFailures) console.error('Articulated asset failure:', failure);
    for (const failure of visualEvidenceFailures) console.error('Visual evidence failure:', failure);
    for (const failure of naturalSpawnFailures) console.error('Natural spawn failure:', failure);
    for (const failure of articulatedFailures) console.error('Articulated review failure:', failure);
    for (const failure of articulatedCollisionFailures) console.error('Articulated collision failure:', failure);
    for (const failure of articulatedDamageFailures) console.error('Articulated damage failure:', failure);
    for (const failure of articulatedDamageMotionFailures) console.error('Articulated damage motion failure:', failure);
    for (const failure of articulatedToolDamageFailures) console.error('Articulated tool damage failure:', failure);
    for (const failure of articulatedMotionFailures) console.error('Articulated motion failure:', failure);
    for (const failure of articulatedLiveFailures) console.error('Articulated live failure:', failure);
    for (const failure of articulatedAttackLiveFailures) console.error('Articulated attack live failure:', failure);
    for (const failure of articulatedStunnedLiveFailures) console.error('Articulated stunned live failure:', failure);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
