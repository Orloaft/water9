import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = 'runs/water9-adversarial-performance-framerate-review-2026-07-10';
const out = `${root}/artifacts/focused-b4-25s`;
await mkdir(out, { recursive: true });
const port = 5188;
const url = `http://127.0.0.1:${port}/?playtest=1&biome=4&perf=1&perfHud=1`;
const server = spawn('node_modules/.bin/vite', ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (let i = 0; i < 160; i += 1) {
  try { if ((await fetch(url, { method: 'HEAD' })).status < 500) break; } catch {}
  await sleep(100);
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  window.__probe = { deltas: [], longTasks: [], active: false, last: 0 };
  new PerformanceObserver((list) => {
    if (window.__probe.active) for (const e of list.getEntries()) window.__probe.longTasks.push({ startTime: e.startTime, duration: e.duration });
  }).observe({ type: 'longtask', buffered: true });
  const tick = (now) => {
    if (window.__probe.active && window.__probe.last) window.__probe.deltas.push(now - window.__probe.last);
    window.__probe.last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const command = (name, value) => page.evaluate(([n, v]) => window.__AQUA_PLAYTEST__?.command(n, v), [name, value]);
const snap = () => page.evaluate(() => window.__AQUA_PLAYTEST__?.snapshot?.());
const shotPair = async (name) => {
  const color = `${out}/${name}.png`;
  const gray = `${out}/${name}-gray.png`;
  await page.locator('#game canvas').screenshot({ path: color });
  const data = await page.evaluate(() => {
    const source = document.querySelector('#game canvas');
    const copy = document.createElement('canvas');
    copy.width = source.width; copy.height = source.height;
    const ctx = copy.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, copy.width, copy.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const g = Math.round(image.data[i] * .2126 + image.data[i + 1] * .7152 + image.data[i + 2] * .0722);
      image.data[i] = g; image.data[i + 1] = g; image.data[i + 2] = g;
    }
    ctx.putImageData(image, 0, 0);
    return copy.toDataURL('image/png').split(',')[1];
  });
  await writeFile(gray, Buffer.from(data, 'base64'));
  return { color, gray };
};
const summarize = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  const count = (n) => values.filter((v) => v > n).length;
  const round = (n) => Math.round(n * 100) / 100;
  return {
    samples: values.length,
    avg: round(values.reduce((a, b) => a + b, 0) / values.length),
    p50: round(q(.5)), p95: round(q(.95)), p99: round(q(.99)), max: round(q(1)),
    over20: count(20), over33_34: count(33.34), over50: count(50),
  };
};
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.());
  await page.locator('[data-start-game]').click();
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.state?.started);
  await page.waitForFunction(() => window.__AQUA_PLAYTEST__?.snapshot?.()?.world?.ready !== false && !window.__AQUA_PLAYTEST__?.snapshot?.()?.ui?.biomeLoading?.active);
  for (let i = 0; i < 8 && (await snap())?.ui?.radioOpen; i += 1) { await page.keyboard.press('Enter'); await sleep(60); }
  await command('dive'); await command('maxUpgrades'); await command('refill');
  await command('teleportToReachableDepth', 1650); await command('teleportToArticulated'); await command('refill');
  await sleep(800);
  const before = await snap();
  const startShot = await shotPair('focused-b4-start-canvas');
  await command('resetPerfFrameBuffer');
  await page.evaluate(() => { window.__probe.deltas = []; window.__probe.longTasks = []; window.__probe.last = 0; window.__probe.active = true; });
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowDown');
  await sleep(25000);
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
  await page.evaluate(() => { window.__probe.active = false; });
  const raw = await page.evaluate(() => window.__probe);
  const perf = (await command('exportPerfFrameBuffer'))?.perf ?? null;
  const after = await snap();
  const endShot = await shotPair('focused-b4-end-canvas');
  const report = {
    ok: true, url, durationMs: 25000, raf: summarize(raw.deltas),
    longTasks: { count: raw.longTasks.length, max: Math.max(0, ...raw.longTasks.map((x) => x.duration)), total: raw.longTasks.reduce((s, x) => s + x.duration, 0), entries: raw.longTasks },
    rawRafDeltas: raw.deltas, before, after, perf, screenshots: { startShot, endShot },
  };
  await writeFile(`${out}/focused-b4-25s.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ raf: report.raf, longTasks: report.longTasks }, null, 2));
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
