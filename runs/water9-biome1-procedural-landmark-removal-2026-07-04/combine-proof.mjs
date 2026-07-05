import { execFileSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const outDir = resolve('runs/water9-biome1-procedural-landmark-removal-2026-07-04');
const proofFiles = [
  'water9-biome1-procedural-landmark-removal-proof-b1-shallow-depth119-b1-upper-depth180.json',
  'water9-biome1-procedural-landmark-removal-proof-b2-preserve-mid-depth760.json',
  'water9-biome1-procedural-landmark-removal-proof-b3-preserve-lower-depth1260.json',
  'water9-biome1-procedural-landmark-removal-proof-b4-preserve-lower-depth1260.json',
];

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trimEnd();
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function dataUrl(path) {
  return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
}

async function fileBytes(path) {
  return (await stat(path)).size;
}

const proofs = [];
for (const file of proofFiles) {
  proofs.push(JSON.parse(await readFile(resolve(outDir, file), 'utf8')));
}

const rows = proofs.flatMap((proof) => proof.rows);
const combinedPath = resolve(outDir, 'water9-biome1-procedural-landmark-removal-proof-combined.json');
const contactHtmlPath = resolve(outDir, 'water9-biome1-procedural-landmark-removal-contact-sheet-combined.html');
const contactPngPath = resolve(outDir, 'water9-biome1-procedural-landmark-removal-contact-sheet-combined.png');

await writeFile(combinedPath, `${JSON.stringify({
  schema: 'water9-biome1-procedural-landmark-removal-proof-combined@1',
  timestamp: new Date().toISOString(),
  repoRoot: git(['rev-parse', '--show-toplevel']),
  head: git(['rev-parse', '--short', 'HEAD']),
  gitStatus: git(['status', '--short']),
  sourceProofFiles: proofFiles.map((file) => resolve(outDir, file)),
  rows,
  rejectedTextureKeyAbsentFromB1RenderedTextures: rows
    .filter((row) => row.biome === 1)
    .every((row) => !(row.snapshot?.environmentVisualProfile?.renderedBitmapAnchors ?? [])
      .some((anchor) => anchor.textureKey === 'water9-biome-landmark-shallows-shell-survey-terrace')),
}, null, 2)}\n`, 'utf8');

const cards = (await Promise.all(rows.map(async (row) => {
  const anchorIds = row.snapshot?.environmentVisualProfile?.anchors?.items
    ?.map((item) => item.assetId)
    .filter(Boolean)
    .join(', ') || 'none';
  const renderedKeys = row.snapshot?.environmentVisualProfile?.renderedBitmapAnchors
    ?.map((item) => item.textureKey)
    .filter(Boolean)
    .join(', ') || 'none';
  return `<section>
    <h2>Biome ${row.biome}: ${htmlEscape(row.name)} / ${htmlEscape(row.label)}</h2>
    <p>${row.depth} m requested; actual ${row.teleport?.depthMeters ?? row.snapshot?.state?.depth ?? 'unknown'} m; active ${htmlEscape(row.snapshot?.environmentVisualProfile?.activeProfile?.activeBand ?? 'unknown')}</p>
    <img src="${await dataUrl(row.colorPath)}" alt="${htmlEscape(row.label)} color">
    <img src="${await dataUrl(row.grayPath)}" alt="${htmlEscape(row.label)} grayscale">
    <p class="meta">anchors: ${htmlEscape(anchorIds)}</p>
    <p class="meta">rendered textures: ${htmlEscape(renderedKeys)}</p>
  </section>`;
}))).join('');

const html = `<!doctype html>
<meta charset="utf-8">
<style>
body { margin:0; padding:20px; background:#061114; color:#e8f6f7; font:15px/1.35 system-ui, sans-serif; }
main { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; }
section { break-inside:avoid; }
h1 { margin:0 0 16px; font-size:22px; }
h2 { margin:0 0 6px; font-size:17px; }
p { margin:0 0 7px; color:#adc9cd; }
img { display:block; width:100%; margin:0 0 8px; border:1px solid #31545d; background:#020708; }
.meta { font-size:12px; overflow-wrap:anywhere; color:#91aeb4; }
</style>
<h1>Water9 B1 Procedural Landmark Removal Combined Proof</h1>
<main>${cards}</main>`;

await writeFile(contactHtmlPath, html, 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1800, height: 2600 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: contactPngPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({
  ok: true,
  combinedPath,
  contactHtmlPath,
  contactPngPath,
  contactBytes: await fileBytes(contactPngPath),
  rows: rows.map((row) => ({
    label: row.label,
    colorPath: row.colorPath,
    grayPath: row.grayPath,
    activeBand: row.snapshot?.environmentVisualProfile?.activeProfile?.activeBand,
    renderedTextures: row.snapshot?.environmentVisualProfile?.renderedBitmapAnchors?.map((anchor) => anchor.textureKey).filter(Boolean),
  })),
}, null, 2));
