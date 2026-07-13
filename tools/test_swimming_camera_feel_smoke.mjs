import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const requestedPort = Number(process.env.WATER9_SWIM_FEEL_PORT ?? 5187);
const reportPath = process.env.WATER9_SWIM_FEEL_REPORT
  ?? 'runs/swimming-backgrounds-full-implementation-2026-07-13/slice3-motion-camera-smoke.json';

async function portAvailable(port) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, host);
  });
}

async function choosePort() {
  const candidates = Array.from({ length: 20 }, (_, index) => 5180 + index)
    .sort((a, b) => Math.abs(a - requestedPort) - Math.abs(b - requestedPort));
  for (const port of candidates) if (await portAvailable(port)) return port;
  throw new Error('no free swimming-feel smoke port in 5180-5199');
}

const port = await choosePort();
const baseUrl = `http://${host}:${port}/?playtest=1&biome=1&seed=303&renderer=canvas`;
const server = spawn(resolve('node_modules/.bin/vite'), ['--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLogs = [];
server.stdout.on('data', (chunk) => serverLogs.push(String(chunk)));
server.stderr.on('data', (chunk) => serverLogs.push(String(chunk)));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const errors = [];
const fail = (text) => errors.push({ type: 'assertion', text });

async function waitForServer() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await sleep(120);
  }
  throw new Error('swimming-feel smoke server did not become ready');
}

async function command(page, name, value) {
  return page.evaluate(([commandName, commandValue]) => window.__AQUA_PLAYTEST__?.command(commandName, commandValue) ?? null, [name, value]);
}

async function snapshot(page) {
  return page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.() ?? null);
}

async function swimTelemetry(page) {
  return command(page, 'swimTelemetry');
}

async function waitForWorld(page) {
  await page.waitForFunction(() => {
    const value = window.__AQUA_PLAYTEST__?.snapshot?.();
    return Boolean(value?.world?.ready !== false && !value?.ui?.biomeLoading?.active);
  }, null, { timeout: 25000 });
}

async function stageOpenWater(page) {
  await command(page, 'start');
  await command(page, 'clearProofOverlays');
  const staged = await command(page, 'teleportToSwimLane', { x: 1, y: 0, depthMeters: 400 });
  if (!staged?.ok) throw new Error(`open-water stage failed: ${JSON.stringify(staged)}`);
  await page.waitForTimeout(80);
  return staged;
}

async function measureUntil(page, predicate, timeoutMs = 1600, intervalMs = 8) {
  const startedAt = performance.now();
  const samples = [];
  while (performance.now() - startedAt <= timeoutMs) {
    const value = await swimTelemetry(page);
    const elapsedMs = performance.now() - startedAt;
    samples.push({
      elapsedMs: Number(elapsedMs.toFixed(1)),
      vx: value?.player?.vx ?? 0,
      vy: value?.player?.vy ?? 0,
      lead: value?.camera?.lead ?? null,
      intent: value?.player?.motionIntent ?? null,
      texture: value?.player?.renderedTextureKey ?? '',
    });
    if (predicate(value)) return { elapsedMs, value, samples };
    await page.waitForTimeout(intervalMs);
  }
  return { elapsedMs: null, value: await snapshot(page), samples };
}

let browser;
let report = {};
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('water9-swim-feel-smoke-initialized')) {
      localStorage.removeItem('water9.accessibility.v1');
      sessionStorage.setItem('water9-swim-feel-smoke-initialized', '1');
    }
    window.__WATER9_SUPPRESS_CONTROLLER_STATUS__ = true;
  });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
      errors.push({ type: 'console', text: message.text() });
    }
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot), null, { timeout: 20000 });
  await waitForWorld(page);
  const openWater = await stageOpenWater(page);
  await command(page, 'setCameraLead', true);

  const deterministic = await page.evaluate(async () => {
    const feel = await import('/src/swimming-feel.ts');
    const helpers = await import('/src/helpers.ts');
    const topSpeed = feel.SWIM_FEEL.baseTopSpeed;
    const dt = 0.001;
    const simulateUntil = (initialX, inputX, inputY, predicate, maxSeconds = 2) => {
      let vx = initialX;
      let vy = 0;
      for (let elapsed = dt; elapsed <= maxSeconds; elapsed += dt) {
        const step = feel.swimVelocityStep(vx, vy, inputX, inputY, dt, topSpeed, feel.SWIM_FEEL.baseThrust);
        vx = step.vx;
        vy = step.vy;
        if (predicate(vx, vy)) return elapsed * 1000;
      }
      return null;
    };
    const directions = [
      ['east', 1, 0], ['southeast', Math.SQRT1_2, Math.SQRT1_2], ['south', 0, 1],
      ['southwest', -Math.SQRT1_2, Math.SQRT1_2], ['west', -1, 0],
      ['northwest', -Math.SQRT1_2, -Math.SQRT1_2], ['north', 0, -1],
      ['northeast', Math.SQRT1_2, -Math.SQRT1_2],
    ];
    const terminal = directions.map(([direction, x, y]) => {
      let vx = 0;
      let vy = 0;
      for (let index = 0; index < 2000; index += 1) {
        const step = feel.swimVelocityStep(vx, vy, x, y, dt, topSpeed, feel.SWIM_FEEL.baseThrust);
        vx = step.vx;
        vy = step.vy;
      }
      return { direction, speed: Math.hypot(vx, vy) };
    });
    const intents = directions.map(([direction, x, y]) => {
      const acceleration = feel.classifySwimAnimationIntent(x, y, x * topSpeed * 0.35, y * topSpeed * 0.35, topSpeed);
      const cruise = feel.classifySwimAnimationIntent(x, y, x * topSpeed, y * topSpeed, topSpeed);
      const brake = feel.classifySwimAnimationIntent(x, y, -x * topSpeed, -y * topSpeed, topSpeed);
      return {
        direction,
        acceleration,
        cruise,
        brake,
        accelerationAnimation: helpers.diverAnimation(x, y, topSpeed * 0.35, 0, false, acceleration),
        cruiseAnimation: helpers.diverAnimation(x, y, topSpeed, 0, false, cruise),
        brakeAnimation: helpers.diverAnimation(x, y, topSpeed, 0, false, brake),
      };
    });
    const coastIntent = feel.classifySwimAnimationIntent(0, 0, topSpeed * 0.5, 0, topSpeed);
    let spring = feel.zeroCameraLeadSpring();
    const viewWidth = 1440 / 3.7;
    const viewHeight = 900 / 3.7;
    const fullTarget = feel.cameraLeadTarget(1, 0, topSpeed, topSpeed, viewWidth, viewHeight, true);
    spring = { ...spring, x: fullTarget.x, targetX: fullTarget.x };
    let settleMs = null;
    for (let index = 1; index <= 1000; index += 1) {
      spring = feel.cameraLeadSpringStep(spring, 0, 0, dt);
      if (settleMs === null && Math.hypot(spring.x, spring.y) * 3.7 <= 0.5) settleMs = index;
    }
    const maxSpeed = Math.max(...terminal.map((entry) => entry.speed));
    const minSpeed = Math.min(...terminal.map((entry) => entry.speed));
    return {
      parameters: { swim: feel.SWIM_FEEL, camera: feel.CAMERA_FEEL },
      t90Ms: simulateUntil(0, 1, 0, (vx) => vx >= topSpeed * 0.9),
      reversalZeroMs: simulateUntil(topSpeed, -1, 0, (vx) => vx <= 0),
      coastBelow10Ms: simulateUntil(topSpeed, 0, 0, (vx) => Math.abs(vx) <= topSpeed * 0.1),
      terminal,
      terminalSpreadPercent: (maxSpeed - minSpeed) / maxSpeed * 100,
      intents,
      coast: { intent: coastIntent, animation: helpers.diverAnimation(0, 0, topSpeed * 0.5, 0, false, coastIntent) },
      camera: {
        maxLeadFraction: feel.cameraLeadViewportFraction({ x: fullTarget.x, y: fullTarget.y }, viewWidth, viewHeight),
        settleMs,
        resting: spring,
        disabledTarget: feel.cameraLeadTarget(1, 0, topSpeed, topSpeed, viewWidth, viewHeight, false),
      },
    };
  });

  if (deterministic.t90Ms < 350 || deterministic.t90Ms > 500) fail(`deterministic 90% timing ${deterministic.t90Ms}ms outside 350-500ms`);
  if (deterministic.reversalZeroMs < 250 || deterministic.reversalZeroMs > 400) fail(`deterministic reversal ${deterministic.reversalZeroMs}ms outside 250-400ms`);
  if (deterministic.coastBelow10Ms < 700 || deterministic.coastBelow10Ms > 1000) fail(`deterministic coast ${deterministic.coastBelow10Ms}ms outside 700-1000ms`);
  if (deterministic.terminalSpreadPercent > 3) fail(`terminal speed spread ${deterministic.terminalSpreadPercent}% exceeds 3%`);
  if (deterministic.camera.maxLeadFraction < 0.03 || deterministic.camera.maxLeadFraction > 0.07) fail(`camera lead ${deterministic.camera.maxLeadFraction} outside 3-7%`);
  if (deterministic.camera.settleMs < 150 || deterministic.camera.settleMs > 250) fail(`camera settle ${deterministic.camera.settleMs}ms outside 150-250ms`);
  if (Object.values(deterministic.camera.resting).some((value) => value !== 0)) fail('camera spring did not snap to exact zero rest');
  if (deterministic.camera.disabledTarget.x !== 0 || deterministic.camera.disabledTarget.y !== 0) fail('disabled camera target was not zero');
  if (deterministic.coast.animation !== 'hover') fail(`coast did not map to legacy hover asset: ${deterministic.coast.animation}`);
  if (deterministic.intents.some((entry) => entry.direction !== 'north' && entry.direction !== 'south' && entry.brakeAnimation !== 'hover')) fail('level braking did not map to the legacy hover/brake pose');
  if (deterministic.intents.find((entry) => entry.direction === 'north')?.accelerationAnimation !== 'ascend') fail('north did not map to legacy ascend asset');
  if (deterministic.intents.find((entry) => entry.direction === 'south')?.accelerationAnimation !== 'descend') fail('south did not map to legacy descend asset');

  await stageOpenWater(page);
  await page.keyboard.down('KeyD');
  const liveAcceleration = await measureUntil(page, (value) => Math.hypot(value?.player?.vx ?? 0, value?.player?.vy ?? 0) >= 106 * 0.9);
  await page.waitForTimeout(350);
  const cruise = await swimTelemetry(page);
  const maxLiveLeadFraction = cruise?.camera?.lead?.viewportFraction ?? 0;
  await page.keyboard.up('KeyD');
  const releaseStartedAt = performance.now();
  const liveSettle = await measureUntil(page, (value) => {
    const lead = value?.camera?.lead;
    return Math.hypot(lead?.x ?? 0, lead?.y ?? 0) * (value?.camera?.zoom ?? 1) <= 0.5;
  }, 700, 5);
  const liveCoastAfterSettle = await measureUntil(page, (value) => Math.hypot(value?.player?.vx ?? 0, value?.player?.vy ?? 0) <= 106 * 0.1, 1400, 8);
  const liveCoast = {
    ...liveCoastAfterSettle,
    elapsedMs: liveCoastAfterSettle.elapsedMs === null ? null : performance.now() - releaseStartedAt,
  };
  await page.waitForTimeout(300);
  const restSamples = [];
  for (let index = 0; index < 12; index += 1) {
    const value = await swimTelemetry(page);
    restSamples.push({ x: value?.camera?.lead?.x, y: value?.camera?.lead?.y });
    await page.waitForTimeout(16);
  }

  await stageOpenWater(page);
  await page.keyboard.down('KeyD');
  await measureUntil(page, (value) => (value?.player?.vx ?? 0) >= 105, 1200, 8);
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyA');
  const liveReversal = await measureUntil(page, (value) => (value?.player?.vx ?? 1) <= 0, 800, 6);
  await page.keyboard.up('KeyA');

  const invariance = await command(page, 'cameraAimInvariantProbe');
  if (!invariance?.ok) fail('actual camera aim/collision/reach invariance probe failed');
  if (liveAcceleration.elapsedMs === null || liveAcceleration.elapsedMs < 350 || liveAcceleration.elapsedMs > 540) fail(`live 90% timing ${liveAcceleration.elapsedMs}ms outside 350-540ms sampled tolerance`);
  if (liveReversal.elapsedMs === null || liveReversal.elapsedMs < 250 || liveReversal.elapsedMs > 440) fail(`live reversal ${liveReversal.elapsedMs}ms outside 250-440ms sampled tolerance`);
  if (liveCoast.elapsedMs === null || liveCoast.elapsedMs < 650 || liveCoast.elapsedMs > 1050) fail(`live coast ${liveCoast.elapsedMs}ms outside sampled tolerance`);
  if (maxLiveLeadFraction < 0.03 || maxLiveLeadFraction > 0.07) fail(`live lead fraction ${maxLiveLeadFraction} outside 3-7%`);
  if (liveSettle.elapsedMs === null || liveSettle.elapsedMs < 140 || liveSettle.elapsedMs > 270) fail(`live settle ${liveSettle.elapsedMs}ms outside sampled tolerance`);
  if (restSamples.some((sample) => sample.x !== 0 || sample.y !== 0)) fail('live camera showed nonzero resting jitter');

  await stageOpenWater(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(650);
  await page.keyboard.up('KeyD');
  const leadBeforeDisable = (await swimTelemetry(page))?.camera?.lead;
  const disabled = await command(page, 'setCameraLead', false);
  const immediatelyDisabled = await swimTelemetry(page);
  if (!disabled?.ok || disabled.enabled !== false) fail('no-lead command did not disable the option');
  if ((leadBeforeDisable?.viewportFraction ?? 0) < 0.03) fail('no-lead immediate-disable probe lacked a meaningful starting lead');
  if (immediatelyDisabled?.camera?.lead?.x !== 0 || immediatelyDisabled?.camera?.lead?.y !== 0) fail('no-lead did not immediately clear camera offset');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForWorld(page);
  const persistedDisabled = await snapshot(page);
  if (persistedDisabled?.camera?.lead?.enabled !== false) fail('no-lead preference did not persist across reload');
  await command(page, 'setCameraLead', true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForWorld(page);
  const persistedEnabled = await snapshot(page);
  if (persistedEnabled?.camera?.lead?.enabled !== true) fail('camera-lead preference did not persist when re-enabled');

  report = {
    schema: 'water9/swimming-camera-feel-smoke@1',
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    port,
    openWater,
    deterministic,
    live: {
      acceleration90Ms: liveAcceleration.elapsedMs === null ? null : Number(liveAcceleration.elapsedMs.toFixed(1)),
      reversalZeroMs: liveReversal.elapsedMs === null ? null : Number(liveReversal.elapsedMs.toFixed(1)),
      coastBelow10Ms: liveCoast.elapsedMs === null ? null : Number(liveCoast.elapsedMs.toFixed(1)),
      maxLeadViewportFraction: maxLiveLeadFraction,
      settleBelowHalfPixelMs: liveSettle.elapsedMs === null ? null : Number(liveSettle.elapsedMs.toFixed(1)),
      restSamples,
      leadBeforeDisable,
      immediatelyDisabled: immediatelyDisabled?.camera?.lead,
      persistedDisabled: persistedDisabled?.camera?.lead?.enabled,
      persistedEnabled: persistedEnabled?.camera?.lead?.enabled,
    },
    invariance,
    errors,
    serverLogs: serverLogs.join('').slice(-3000),
  };
} catch (error) {
  errors.push({ type: 'exception', text: error?.stack ?? String(error) });
  report = { schema: 'water9/swimming-camera-feel-smoke@1', generatedAt: new Date().toISOString(), ok: false, port, errors };
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close().catch(() => {});
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((done) => {
      const timer = setTimeout(done, 3000);
      server.once('exit', () => { clearTimeout(timer); done(); });
    });
  }
}

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, reportPath, deterministic: report.deterministic, live: report.live }, null, 2));
