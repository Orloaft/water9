import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.PLAYTEST_URL;
if (!baseUrl) throw new Error('PLAYTEST_URL is required');

const outDir = new URL('./', import.meta.url);
const proofPath = new URL('current-barge-canvas.png', outDir).pathname;
const grayPath = new URL('current-barge-canvas-gray.png', outDir).pathname;
const metaPath = new URL('current-barge-capture.json', outDir).pathname;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Texture key already in use:')) {
    errors.push({ type: 'console', text: message.text() });
  }
});

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForFunction(() => Boolean(window.__AQUA_PLAYTEST__?.snapshot?.()?.world), null, { timeout: 25000 });
await page.evaluate(() => window.__AQUA_PLAYTEST__?.command?.('start'));
await page.waitForFunction(() => document.querySelector('.shell') && !document.querySelector('.shell')?.classList.contains('is-title'), null, { timeout: 10000 });

for (let i = 0; i < 12; i += 1) {
  const radioButton = page.locator('button[data-radio-next]').first();
  if (await radioButton.count() <= 0 || !(await radioButton.isVisible({ timeout: 250 }).catch(() => false))) break;
  await radioButton.click();
  await page.waitForTimeout(180);
}
await page.waitForFunction(() => !document.querySelector('.shell')?.classList.contains('is-radio-modal'), null, { timeout: 10000 });
await page.waitForFunction(() => {
  const loading = document.querySelector('.biome-loading');
  return !loading || !loading.classList.contains('is-active');
}, null, { timeout: 10000 });
await page.waitForTimeout(500);

const meta = await page.evaluate(async () => {
  const canvas = document.querySelector('#game canvas');
  const snap = window.__AQUA_PLAYTEST__?.snapshot?.();
  const texture = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = `/assets/generated/barge-platform.png?proof=${Date.now()}`;
  });
  return {
    canvas: canvas ? {
      width: canvas.width,
      height: canvas.height,
      cssWidth: Math.round(canvas.getBoundingClientRect().width),
      cssHeight: Math.round(canvas.getBoundingClientRect().height),
    } : null,
    texture,
    state: snap?.state ?? null,
    camera: snap?.camera ?? null,
    worldReady: snap?.world?.ready ?? null,
    shellClasses: document.querySelector('.shell')?.className ?? '',
  };
});

await page.screenshot({ path: proofPath, fullPage: false });
await page.evaluate(() => {
  document.documentElement.style.filter = 'grayscale(1)';
});
await page.screenshot({ path: grayPath, fullPage: false });
await writeFile(metaPath, `${JSON.stringify({ ok: errors.length === 0, errors, ...meta }, null, 2)}\n`);
await browser.close();

if (errors.length) {
  throw new Error(`capture had browser errors: ${JSON.stringify(errors)}`);
}

console.log(`proof=${proofPath}`);
console.log(`gray=${grayPath}`);
console.log(`meta=${metaPath}`);
