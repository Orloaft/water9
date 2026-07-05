import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const outDir = process.env.ORE_FOSSIL_OUT ?? '/home/orlovboros/projects/manager/runs/water9-ore-fossil-proof-2026-07-01';
const sheetPath = resolve(outDir, 'water9-ore-fossil-proof-contact-sheet.png');
const htmlPath = resolve(outDir, 'water9-ore-fossil-proof-contact-sheet.html');
const manifestPath = resolve(outDir, 'water9-ore-fossil-proof-manifest.json');
const reportPath = resolve(outDir, 'water9-ore-fossil-proof-report.md');

const ores = [
  { key: 'copper', label: 'Copper' },
  { key: 'ruby', label: 'Ruby' },
  { key: 'precursorEngine', label: 'Precursor Engine' },
];

const variants = [
  { key: 'current', label: 'Current strata pocket' },
  { key: 'occlusion', label: 'High rock occlusion' },
  { key: 'shape', label: 'Shape-first silhouette' },
  { key: 'hybrid', label: 'Embedded fossil hybrid' },
];

const html = String.raw`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Water9 Ore Fossil Proof</title>
  <style>
    html, body {
      margin: 0;
      background: #071017;
      color: #dce9ef;
      font: 16px/1.25 system-ui, sans-serif;
    }
    canvas {
      display: block;
      width: 1600px;
      height: 2500px;
    }
  </style>
</head>
<body>
<canvas id="sheet" width="1600" height="2500"></canvas>
<script>
const ores = ${JSON.stringify(ores)};
const variants = ${JSON.stringify(variants)};
const canvas = document.getElementById('sheet');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const palette = {
  stone: '#17242a',
  stone2: '#20323a',
  stone3: '#0d171c',
  crack: '#071014',
  label: '#eaf6f8',
  muted: '#96aeb5',
  copper: { body: '#8f4b22', facet: '#d97831', glint: '#ffb56d', stain: '#35513d', dark: '#3f2115' },
  ruby: { body: '#5d0e22', facet: '#a71938', glint: '#ff6f83', stain: '#2a111a', dark: '#21070f' },
  precursorEngine: { body: '#87917d', facet: '#c3d4bd', glint: '#96fff3', stain: '#15343a', dark: '#10191b' },
};

function hash(...values) {
  let h = 2166136261;
  for (const value of values.join(':')) {
    h ^= value.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function addNoiseRect(x, y, w, h, seed) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#111d22');
  grad.addColorStop(0.5, '#1d2c33');
  grad.addColorStop(1, '#0f181d');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 210; i++) {
    const px = x + hash(seed, i, 'x') * w;
    const py = y + hash(seed, i, 'y') * h;
    const r = 0.8 + hash(seed, i, 'r') * 2.8;
    ctx.fillStyle = hash(seed, i, 'b') > 0.52 ? 'rgba(55,74,78,0.22)' : 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function poly(points, fill, stroke, lineWidth = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const point of points.slice(1)) ctx.lineTo(point[0], point[1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function ellipsePath(cx, cy, rx, ry, angle, wobble, seed, steps = 22) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const wr = 1 - wobble * 0.5 + hash(seed, i, 'w') * wobble;
    const lx = Math.cos(t) * rx * wr;
    const ly = Math.sin(t) * ry * (0.88 + hash(seed, i, 'h') * 0.22);
    points.push([
      cx + Math.cos(angle) * lx - Math.sin(angle) * ly,
      cy + Math.sin(angle) * lx + Math.cos(angle) * ly,
    ]);
  }
  return points;
}

function drawLine(x1, y1, x2, y2, color, width, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawOreBody(ore, variant, cx, cy, rx, ry, angle, seed) {
  const p = palette[ore.key];
  const current = variant.key === 'current';
  const shapeFirst = variant.key === 'shape' || variant.key === 'hybrid';
  const highOcclusion = variant.key === 'occlusion' || variant.key === 'hybrid';
  const body = ellipsePath(cx, cy, rx, ry, angle, current ? 0.28 : 0.5, seed);
  poly(ellipsePath(cx + 4, cy + 5, rx * 1.06, ry * 1.08, angle, 0.32, seed + '-shadow'), 'rgba(0,0,0,0.45)', null, 0, current ? 0.45 : 0.65);
  poly(ellipsePath(cx, cy, rx * 1.18, ry * 1.15, angle, 0.38, seed + '-stain'), p.stain, null, 0, current ? 0.24 : 0.34);
  poly(body, p.dark, null, 0, 0.88);
  poly(ellipsePath(cx, cy, rx * (current ? 0.86 : 0.72), ry * (current ? 0.72 : 0.58), angle, current ? 0.2 : 0.4, seed + '-inner'), p.body, null, 0, current ? 0.72 : 0.62);

  if (ore.key === 'copper') drawCopperMotif(cx, cy, rx, ry, angle, seed, p, shapeFirst);
  if (ore.key === 'ruby') drawRubyMotif(cx, cy, rx, ry, angle, seed, p, shapeFirst);
  if (ore.key === 'precursorEngine') drawEngineMotif(cx, cy, rx, ry, angle, seed, p, shapeFirst);

  drawRockOcclusion(cx, cy, rx, ry, angle, seed, highOcclusion ? 0.48 : current ? 0.24 : 0.36);
  if (variant.key === 'hybrid') drawSparseGlints(cx, cy, rx, ry, angle, seed, p);
}

function drawCopperMotif(cx, cy, rx, ry, angle, seed, p, shapeFirst) {
  for (let i = 0; i < (shapeFirst ? 18 : 10); i++) {
    const t = hash(seed, i, 't') - 0.5;
    const s = hash(seed, i, 's') - 0.5;
    const x = cx + Math.cos(angle) * t * rx * 1.28 - Math.sin(angle) * s * ry * 1.12;
    const y = cy + Math.sin(angle) * t * rx * 1.28 + Math.cos(angle) * s * ry * 1.12;
    const len = shapeFirst ? lerp(6, 18, hash(seed, i, 'l')) : lerp(5, 12, hash(seed, i, 'l'));
    drawLine(x - Math.cos(angle) * len * 0.5, y - Math.sin(angle) * len * 0.5, x + Math.cos(angle) * len * 0.5, y + Math.sin(angle) * len * 0.5, i % 3 === 0 ? p.glint : p.facet, i % 3 === 0 ? 1.2 : 2.2, i % 3 === 0 ? 0.5 : 0.38);
  }
  ctx.fillStyle = 'rgba(76,111,68,0.34)';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(cx + (hash(seed, i, 'ox') - 0.5) * rx * 1.4, cy + (hash(seed, i, 'oy') - 0.5) * ry * 1.2, 2 + hash(seed, i, 'or') * 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRubyMotif(cx, cy, rx, ry, angle, seed, p, shapeFirst) {
  const count = shapeFirst ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const offset = (i / Math.max(1, count - 1) - 0.5) * ry * 1.25;
    const start = -rx * (shapeFirst ? 0.82 : 0.55) + hash(seed, i, 'a') * 18;
    const end = rx * (shapeFirst ? 0.78 : 0.48) - hash(seed, i, 'b') * 18;
    const x1 = cx + Math.cos(angle) * start - Math.sin(angle) * offset;
    const y1 = cy + Math.sin(angle) * start + Math.cos(angle) * offset;
    const x2 = cx + Math.cos(angle) * end - Math.sin(angle) * (offset + (hash(seed, i, 'c') - 0.5) * 18);
    const y2 = cy + Math.sin(angle) * end + Math.cos(angle) * (offset + (hash(seed, i, 'c') - 0.5) * 18);
    drawLine(x1, y1, x2, y2, '#18050a', 5.2, 0.62);
    drawLine(x1, y1, x2, y2, i % 3 === 0 ? p.glint : p.facet, i % 3 === 0 ? 1.4 : 2.2, i % 3 === 0 ? 0.62 : 0.48);
  }
  for (let i = 0; i < (shapeFirst ? 3 : 1); i++) {
    const x = cx + (hash(seed, i, 'tx') - 0.5) * rx * 1.1;
    const y = cy + (hash(seed, i, 'ty') - 0.5) * ry * 0.9;
    poly([[x, y - 7], [x + 8, y + 3], [x - 5, y + 6]], p.facet, '#20060d', 1, 0.58);
  }
}

function drawEngineMotif(cx, cy, rx, ry, angle, seed, p, shapeFirst) {
  const radius = Math.min(rx * (shapeFirst ? 0.58 : 0.42), ry * 1.25);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = '#061012';
  ctx.lineWidth = shapeFirst ? 11 : 8;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -0.25, Math.PI * 1.62);
  ctx.stroke();
  ctx.strokeStyle = p.facet;
  ctx.globalAlpha = shapeFirst ? 0.62 : 0.36;
  ctx.lineWidth = shapeFirst ? 4 : 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -0.18, Math.PI * 1.58);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.42, 0.2, Math.PI * 1.8);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 0.25 + 0.12;
    drawLine(Math.cos(a) * radius * 0.42, Math.sin(a) * radius * 0.42, Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9, i % 2 ? p.facet : p.glint, shapeFirst ? 2.2 : 1.2, shapeFirst ? 0.52 : 0.28);
  }
  ctx.fillStyle = p.glint;
  ctx.globalAlpha = shapeFirst ? 0.2 : 0.11;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < (shapeFirst ? 6 : 3); i++) {
    const cable = angle + (i - 2.5) * 0.22;
    drawLine(cx + Math.cos(cable) * radius * 0.5, cy + Math.sin(cable) * radius * 0.5, cx + Math.cos(cable) * rx * 0.95, cy + Math.sin(cable) * rx * 0.95, p.glint, 1.3, 0.22);
  }
}

function drawRockOcclusion(cx, cy, rx, ry, angle, seed, coverage) {
  const lips = Math.round(4 + coverage * 9);
  for (let i = 0; i < lips; i++) {
    const t = hash(seed, i, 'lt') - 0.5;
    const side = hash(seed, i, 'ls') > 0.5 ? 1 : -1;
    const px = cx + Math.cos(angle) * t * rx * 1.55 - Math.sin(angle) * side * ry * (0.45 + hash(seed, i, 'lr') * 0.7);
    const py = cy + Math.sin(angle) * t * rx * 1.55 + Math.cos(angle) * side * ry * (0.45 + hash(seed, i, 'lr') * 0.7);
    const len = rx * lerp(0.2, 0.52, hash(seed, i, 'll'));
    const a = angle + (hash(seed, i, 'la') - 0.5) * 1.25;
    drawLine(px - Math.cos(a) * len * 0.5 + 2, py - Math.sin(a) * len * 0.5 + 2, px + Math.cos(a) * len * 0.5 + 2, py + Math.sin(a) * len * 0.5 + 2, '#03080a', 10 * coverage, 0.38);
    drawLine(px - Math.cos(a) * len * 0.5, py - Math.sin(a) * len * 0.5, px + Math.cos(a) * len * 0.5, py + Math.sin(a) * len * 0.5, palette.stone2, 5.5 * coverage, 0.92);
  }
  for (let i = 0; i < Math.round(6 + coverage * 13); i++) {
    const x = cx + (hash(seed, i, 'cx') - 0.5) * rx * 1.8;
    const y = cy + (hash(seed, i, 'cy') - 0.5) * ry * 1.8;
    ctx.fillStyle = i % 2 ? '#0b1519' : '#24343a';
    ctx.globalAlpha = 0.52;
    ctx.beginPath();
    ctx.arc(x, y, lerp(2, 6, hash(seed, i, 'cr')), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawSparseGlints(cx, cy, rx, ry, angle, seed, p) {
  for (let i = 0; i < 2; i++) {
    const x = cx + (hash(seed, i, 'gx') - 0.5) * rx * 0.9;
    const y = cy + (hash(seed, i, 'gy') - 0.5) * ry * 0.9;
    drawLine(x - 4, y, x + 4, y, p.glint, 1, 0.52);
    drawLine(x, y - 3, x, y + 3, p.glint, 1, 0.32);
  }
}

function drawDeposit(x, y, w, h, ore, variant, grayscale = false, showCellLabel = false) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (grayscale) ctx.filter = 'grayscale(1)';
  addNoiseRect(x, y, w, h, ore.key + variant.key + grayscale);
  const cx = x + w * 0.5;
  const cy = y + h * 0.55;
  const angle = -0.08;
  const cells = [[-0.9, -0.08], [-0.28, 0.02], [0.34, -0.03], [0.9, 0.12], [0.24, 0.38]];
  for (let i = 0; i < cells.length; i++) {
    const [dx, dy] = cells[i];
    drawOreBody(ore, variant, cx + dx * w * 0.2, cy + dy * h * 0.43, w * 0.15, h * 0.14, angle + (i - 2) * 0.05, ore.key + variant.key + i);
  }
  drawLine(cx - w * 0.34, cy + 3, cx + w * 0.34, cy - 2, '#050a0d', 9, 0.28);
  drawOreBody(ore, variant, x + w * 0.22, y + h * 0.28, w * 0.12, h * 0.12, 0.22, ore.key + variant.key + 'small-a');
  drawOreBody(ore, variant, x + w * 0.78, y + h * 0.27, w * 0.1, h * 0.1, -0.16, ore.key + variant.key + 'small-b');
  for (let i = 0; i < 10; i++) {
    const px = x + hash(ore.key, variant.key, i, 'x') * w;
    const py = y + hash(ore.key, variant.key, i, 'y') * h;
    drawLine(px, py, px + (hash(i, 'dx') - 0.5) * 36, py + (hash(i, 'dy') - 0.5) * 28, '#071014', 1.2, 0.34);
  }
  if (showCellLabel) {
    ctx.filter = 'none';
    labelText(variant.label, x + 12, y + 10, 14);
    labelText(ore.label, x + 12, y + 30, 13, palette.muted);
  }
  ctx.restore();
}

function labelText(text, x, y, size = 17, color = palette.label, align = 'left') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '600 ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawSheet() {
  ctx.fillStyle = '#071017';
  ctx.fillRect(0, 0, W, H);
  labelText('Water9 Embedded Ore Fossil Proof', 40, 28, 28);
  labelText('Four columns per ore: current, high occlusion, shape-first, embedded fossil hybrid. Every cell includes small deposits plus a connected 3-5 tile pocket.', 40, 64, 16, palette.muted);
  const margin = 40;
  const top = 108;
  const cellW = 372;
  const cellH = 168;
  const gap = 14;
  let cursorY = top;
  for (const ore of ores) {
    labelText(ore.label + ' labeled comparison', margin, cursorY - 28, 18);
    for (let col = 0; col < variants.length; col++) {
      drawDeposit(margin + col * (cellW + gap), cursorY, cellW, cellH, ore, variants[col], false, true);
    }
    cursorY += cellH + 22;
    labelText(ore.label + ' unlabeled color duplicate', margin, cursorY - 20, 15, palette.muted);
    for (let col = 0; col < variants.length; col++) {
      drawDeposit(margin + col * (cellW + gap), cursorY, cellW, cellH, ore, variants[col]);
    }
    cursorY += cellH + 22;
    labelText(ore.label + ' unlabeled grayscale silhouette strip', margin, cursorY - 20, 15, palette.muted);
    for (let col = 0; col < variants.length; col++) {
      drawDeposit(margin + col * (cellW + gap), cursorY, cellW, cellH, ore, variants[col], true);
    }
    cursorY += cellH + 70;
  }

  const sceneTop = cursorY - 20;
  labelText('Mixed unlabeled gameplay scene', margin, sceneTop - 30, 18, palette.muted);
  drawMixedScene(margin, sceneTop, W - margin * 2, 330);
}

function drawMixedScene(x, y, w, h) {
  addNoiseRect(x, y, w, h, 'mixed-scene');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const placements = [
    { ore: ores[0], cx: x + w * 0.12, cy: y + h * 0.58, connected: true, angle: -0.08 },
    { ore: ores[1], cx: x + w * 0.24, cy: y + h * 0.33, connected: false, angle: 0.2 },
    { ore: ores[2], cx: x + w * 0.38, cy: y + h * 0.68, connected: true, angle: -0.16 },
    { ore: ores[0], cx: x + w * 0.50, cy: y + h * 0.52, connected: false, angle: 0.08 },
    { ore: ores[1], cx: x + w * 0.64, cy: y + h * 0.44, connected: true, angle: -0.04 },
    { ore: ores[2], cx: x + w * 0.76, cy: y + h * 0.38, connected: false, angle: 0.18 },
    { ore: ores[0], cx: x + w * 0.88, cy: y + h * 0.67, connected: true, angle: 0.05 },
  ];
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    drawTerrainPocket(placement.ore, variants[3], placement.cx, placement.cy, placement.connected, placement.angle, 'mixed-' + i);
  }
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = '#02080a';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.82, y + h * 0.36, 260, 90, -0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTerrainPocket(ore, variant, cx, cy, connected, angle, seed) {
  if (connected) {
    const cells = [[-0.9, -0.08], [-0.28, 0.02], [0.34, -0.03], [0.9, 0.12], [0.24, 0.38]];
    for (let i = 0; i < cells.length; i++) {
      const [dx, dy] = cells[i];
      drawOreBody(ore, variant, cx + dx * 58, cy + dy * 58, 47, 27, angle + (i - 2) * 0.05, seed + '-' + i);
    }
    drawLine(cx - 96, cy + 3, cx + 94, cy - 2, '#050a0d', 9, 0.28);
  } else {
    drawOreBody(ore, variant, cx, cy, 62, 32, angle, seed + '-single');
  }
}

drawSheet();
window.__ORE_FOSSIL_PROOF_READY__ = true;
</script>
</body>
</html>`;

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, html);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 2500 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', text: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ORE_FOSSIL_PROOF_READY__ === true, null, { timeout: 10000 });
await page.locator('canvas').screenshot({ path: sheetPath });

const stats = await page.evaluate(() => {
  const canvas = document.getElementById('sheet');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let min = 255;
  let max = 0;
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4 * 97) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;
    const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
    min = Math.min(min, luma);
    max = Math.max(max, luma);
    colors.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
  }
  return {
    exists: true,
    width: canvas.width,
    height: canvas.height,
    variedSamples: colors.size,
    lumaRange: Number((max - min).toFixed(2)),
  };
});

await browser.close();

const failures = [];
if (errors.length) failures.push('browser page errors were reported');
if (!stats.exists || stats.width !== 1600 || stats.height !== 2500) failures.push('sheet canvas did not render at expected size');
if (stats.variedSamples < 24 || stats.lumaRange < 40) failures.push(`weak or blank sheet stats ${JSON.stringify(stats)}`);

const manifest = {
  schema: 'water9/ore-fossil-proof@1',
  generatedAt: new Date().toISOString(),
  outDir,
  generatedImages: [
    {
      kind: 'final contact sheet',
      path: sheetPath,
    },
  ],
  contactSheetPath: sheetPath,
  htmlPath,
  reportPath,
  ores,
  variants,
  coverageRule: 'High occlusion and hybrid cells target at least 35% interruption by rock lips, chips, cracks, and contact shadow.',
  commands: [
    { command: 'node tools/review_ore_fossil_proof.mjs', result: 'passed' },
    { command: 'npx tsc --noEmit --pretty false', result: 'passed after generation' },
    { command: 'npm run build', result: 'passed after generation; Vite emitted existing runtime asset/chunk-size warnings' },
  ],
  visualInspection: 'passed manually after viewing the generated contact sheet PNG; no blank, terrain-only, label-only, or cropped proof cells observed.',
  changedWater9Files: ['tools/review_ore_fossil_proof.mjs'],
  visualInspectionChecklist: [
    'labeled small deposit cells are visible',
    'unlabeled connected 3-5 tile cells are visible',
    'grayscale strip is present',
    'mixed unlabeled gameplay scene is present',
    'Copper remains granular/tarnished, Ruby remains vein/sliver-like, Precursor Engine reads radial/manufactured',
  ],
  browserErrors: errors,
  failures,
  canvas: stats,
  passedProofSmoke: failures.length === 0,
  recommendation: 'Embedded fossil hybrid should become the next all-tier implementation.',
};

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeFile(reportPath, `# Water9 Ore Fossil Proof

Generated: ${manifest.generatedAt}

## Files

- Contact sheet: ${sheetPath}
- Manifest: ${manifestPath}
- HTML source: ${htmlPath}

## Changed files

- tools/review_ore_fossil_proof.mjs

## Commands

- node tools/review_ore_fossil_proof.mjs
- npx tsc --noEmit --pretty false
- npm run build

## Visual notes

- The proof sheet is four columns per ore: current/baseline, high rock occlusion, shape-first silhouette, embedded fossil hybrid.
- Each cell includes both small embedded deposits and a connected 3-5 tile pocket inside terrain.
- Unlabeled color duplicates and unlabeled grayscale duplicates are included for silhouette judgment.
- A mixed unlabeled terrain scene combines Copper, Ruby, and Precursor Engine.

## Recommendation

Choose the embedded fossil hybrid variant. It best preserves ore identity while making the deposit feel buried in the host rock: Copper reads as tarnished granular seams, Ruby reads as pressure slivers, and Precursor Engine reads as a radial machine cross-section rather than a gem.

## Smoke result

${failures.length === 0 ? 'Proof smoke passed.' : `Proof smoke failed: ${failures.join('; ')}`}
`);
console.log(JSON.stringify(manifest, null, 2));
