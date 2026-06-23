import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [key, inlineValue] = arg.slice(2).split('=');
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith('--') ? 'true' : process.argv[++index] ?? 'true');
  args.set(key, value);
}

const paths = {
  manifest: resolve(String(args.get('manifest') ?? 'public/review/content-review-cockpit/manifest.json')),
  indexHtml: resolve(String(args.get('index-html') ?? 'public/review/content-review-cockpit/index.html')),
  indexMarkdown: resolve(String(args.get('index-md') ?? 'public/review/content-review-cockpit/index.md')),
  matrix: resolve(String(args.get('matrix') ?? 'public/review/content-review-evidence-matrix.json')),
  sandboxManifest: resolve(String(args.get('sandbox') ?? 'public/review/sandbox/manifest.json')),
};

const failures = [];

async function readJson(label, path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    failures.push(`${label}: could not read JSON: ${error.message}`);
    return null;
  }
}

async function readText(label, path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    failures.push(`${label}: could not read file: ${error.message}`);
    return '';
  }
}

async function fileOk(label, path, minSize = 128) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
    return info.isFile() && info.size >= minSize;
  } catch {
    failures.push(`${label}: missing`);
    return false;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function includesText(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function assertDryRunDecisionCommands(owner, commands) {
  for (const command of asArray(commands)) {
    const text = String(command ?? '');
    if ((text.includes('npm run source:accept') || text.includes('npm run content:accept')) && !text.includes('--dry-run')) {
      failures.push(`${owner}: cockpit decision command must be dry-run only: ${text}`);
    }
  }
}

function assertRenderedDryRunDecisionCommands(owner, html) {
  for (const line of String(html ?? '').split(/\n/)) {
    if ((line.includes('npm run source:accept') || line.includes('npm run content:accept')) && !line.includes('--dry-run')) {
      failures.push(`${owner}: rendered cockpit decision command must be dry-run only`);
    }
  }
}

function publicPathForUrl(url) {
  if (!url) return null;
  if (url.startsWith('/review/')) return resolve('public', url.slice(1));
  if (url.startsWith('/assets/')) return resolve('public', url.slice(1));
  return null;
}

const manifest = await readJson('content review cockpit manifest', paths.manifest);
const matrix = await readJson('content review evidence matrix', paths.matrix);
const sandboxManifest = await readJson('sandbox manifest', paths.sandboxManifest);
const indexHtml = await readText('content review cockpit index html', paths.indexHtml);
const indexMarkdown = await readText('content review cockpit index markdown', paths.indexMarkdown);

await fileOk('content review cockpit index html', paths.indexHtml, 4096);
await fileOk('content review cockpit index markdown', paths.indexMarkdown, 512);

if (manifest?.schema !== 'water9/content-review-cockpit@1') failures.push(`unexpected cockpit schema ${manifest?.schema ?? 'missing'}`);
if (matrix?.schema !== 'water9/content-review-evidence-matrix@1') failures.push(`unexpected matrix schema ${matrix?.schema ?? 'missing'}`);
if (sandboxManifest?.schema !== 'water9/sandbox-index@1') failures.push(`unexpected sandbox schema ${sandboxManifest?.schema ?? 'missing'}`);

const pages = asArray(manifest?.pages);
const rows = asArray(matrix?.rows);
const pageById = new Map(pages.map((page) => [page.id, page]));
const rowById = new Map(rows.map((row) => [row.id, row]));
const sandboxById = new Map(asArray(sandboxManifest?.entries).map((entry) => [entry.id, entry]));

if (pages.length !== rows.length) failures.push(`cockpit pages ${pages.length} does not match matrix rows ${rows.length}`);
const pageIds = pages.map((page) => page.id).filter(Boolean);
if (pageIds.length !== uniqueValues(pageIds).length) failures.push('cockpit manifest has duplicate page ids');
if ((manifest?.summary?.candidates ?? -1) !== rows.length) failures.push('cockpit summary candidates mismatch');
if ((manifest?.summary?.runtimeMappedCandidates ?? -1) !== (matrix?.summary?.runtimeMappedCandidates ?? -2)) failures.push('cockpit runtimeMappedCandidates mismatch');
if ((manifest?.summary?.unmappedPrototypeThreats ?? -1) !== (matrix?.summary?.unmappedPrototypeThreats ?? -2)) failures.push('cockpit unmappedPrototypeThreats mismatch');
if ((manifest?.summary?.acceptedThreats ?? -1) !== (matrix?.summary?.acceptedThreats ?? -2)) failures.push('cockpit acceptedThreats mismatch');
if (manifest?.summary?.nextHumanGate !== (matrix?.summary?.nextHumanGate ?? 'unknown')) failures.push('cockpit nextHumanGate mismatch');

for (const expected of [
  'Water 9 Review Cockpit',
  'Prototype evidence is not acceptance',
  'Human Approval Boundary',
  'next human gate',
]) {
  if (!includesText(indexHtml, expected)) failures.push(`cockpit index html missing ${expected}`);
}

for (const row of rows) {
  const page = pageById.get(row.id);
  if (!page) {
    failures.push(`${row.id}: missing cockpit page`);
    continue;
  }
  if (page.species !== row.species) failures.push(`${row.id}: cockpit species mismatch`);
  if (page.sourceReviewStatus !== row.sourceReviewStatus) failures.push(`${row.id}: cockpit sourceReviewStatus mismatch`);
  if (page.rigReviewStatus !== row.rigReviewStatus) failures.push(`${row.id}: cockpit rigReviewStatus mismatch`);
  if (page.nextHumanGate !== row.nextHumanGate) failures.push(`${row.id}: cockpit nextHumanGate mismatch`);
  if (!Array.isArray(page.blockers)) failures.push(`${row.id}: cockpit blockers must be an array`);
  if (!Array.isArray(page.mediaLabels)) failures.push(`${row.id}: cockpit mediaLabels must be an array`);
  if (!Array.isArray(page.media)) failures.push(`${row.id}: cockpit media must be an array`);
  if (!Array.isArray(page.commands)) failures.push(`${row.id}: cockpit commands must be an array`);
  assertDryRunDecisionCommands(`${row.id} manifest`, page.commands);
  const mediaByLabel = new Map(asArray(page.media).map((item) => [item.label, item]));
  const expectedSourceSandbox = `/?entity=source-${row.id}&companion=diver`;
  if (page.links?.sourceSandbox !== expectedSourceSandbox) {
    failures.push(`${row.id}: source sandbox link ${page.links?.sourceSandbox ?? 'missing'} does not match ${expectedSourceSandbox}`);
  }
  const expectedQuickReview = `/review/source-candidates/quick-reviews/${row.id}.html`;
  const expectedSourcePacket = `/review/source-candidates/source-review-packets/${row.id}.md`;
  const expectedAcceptancePacket = `/review/acceptance-packets/${row.id}.md`;
  if (page.links?.quickReview !== expectedQuickReview) failures.push(`${row.id}: quick review link ${page.links?.quickReview ?? 'missing'} does not match ${expectedQuickReview}`);
  if (page.links?.sourcePacket !== expectedSourcePacket) failures.push(`${row.id}: source packet link ${page.links?.sourcePacket ?? 'missing'} does not match ${expectedSourcePacket}`);
  if (page.links?.acceptancePacket !== expectedAcceptancePacket) failures.push(`${row.id}: acceptance packet link ${page.links?.acceptancePacket ?? 'missing'} does not match ${expectedAcceptancePacket}`);
  const minMedia = row.runtimeRegistered ? 8 : 4;
  if ((page.mediaCount ?? 0) < minMedia) {
    failures.push(`${row.id}: cockpit mediaCount ${page.mediaCount ?? 'missing'} below expected ${minMedia}`);
  }
  for (const requiredLabel of ['source art', 'magenta key preview', 'source sandbox preview', 'articulation plan preview']) {
    if (!page.mediaLabels.includes(requiredLabel)) failures.push(`${row.id}: cockpit missing media label ${requiredLabel}`);
    const media = mediaByLabel.get(requiredLabel);
    if (media?.present !== true || !media?.url) failures.push(`${row.id}: cockpit media ${requiredLabel} must be present with URL`);
    const mediaPath = publicPathForUrl(media?.url);
    if (mediaPath) await fileOk(`${row.id} manifest media ${requiredLabel}`, mediaPath, 256);
  }
  if (row.runtimeRegistered) {
    for (const requiredLabel of ['source parity overlay', 'sandbox idle', 'sandbox lunge', 'sandbox stunned']) {
      if (!page.mediaLabels.includes(requiredLabel)) failures.push(`${row.id}: cockpit missing runtime media label ${requiredLabel}`);
      const media = mediaByLabel.get(requiredLabel);
      if (media?.present !== true || !media?.url) failures.push(`${row.id}: cockpit runtime media ${requiredLabel} must be present with URL`);
      const mediaPath = publicPathForUrl(media?.url);
      if (mediaPath) await fileOk(`${row.id} manifest runtime media ${requiredLabel}`, mediaPath, 256);
    }
    const expectedSideBySide = sandboxById.get(row.runtimeId)?.pairedUrl ?? `/?sandbox=${row.runtimeId}&companion=diver`;
    if (page.links?.sideBySideSandbox !== expectedSideBySide) {
      failures.push(`${row.id}: side-by-side sandbox link ${page.links?.sideBySideSandbox ?? 'missing'} does not match ${expectedSideBySide}`);
    }
  }
  const pagePath = resolve('public/review/content-review-cockpit', page.href);
  const pageText = await readText(`${row.id} cockpit page`, pagePath);
  await fileOk(`${row.id} cockpit page`, pagePath, 2048);
  for (const expected of [
    row.id,
    row.species,
    'Prototype evidence is not acceptance',
    'Human Approval Boundary',
    row.nextHumanGate,
  ]) {
    if (!includesText(pageText, expected)) failures.push(`${row.id}: cockpit page missing ${expected}`);
  }
  assertRenderedDryRunDecisionCommands(`${row.id} page`, pageText);
  if (!indexMarkdown.includes(row.id)) failures.push(`cockpit markdown missing ${row.id}`);
  if (!includesText(indexHtml, row.id)) failures.push(`cockpit index html missing ${row.id}`);
  if (!includesText(pageText, expectedSourceSandbox)) failures.push(`${row.id}: cockpit page missing source sandbox link ${expectedSourceSandbox}`);
  for (const expectedLink of [expectedQuickReview, expectedSourcePacket, expectedAcceptancePacket]) {
    if (!includesText(pageText, expectedLink)) failures.push(`${row.id}: cockpit page missing exact link ${expectedLink}`);
  }
  if (!includesText(pageText, `npm run sandbox:preview -- --id source-${row.id} --with diver`)) {
    failures.push(`${row.id}: cockpit page missing source sandbox preview command`);
  }
  if (row.runtimeRegistered) {
    const expectedSideBySide = sandboxById.get(row.runtimeId)?.pairedUrl ?? `/?sandbox=${row.runtimeId}&companion=diver`;
    if (!includesText(pageText, expectedSideBySide)) failures.push(`${row.id}: cockpit page missing side-by-side sandbox link ${expectedSideBySide}`);
    if (!includesText(pageText, `npm run sandbox:preview -- --id ${row.runtimeId} --with diver`)) failures.push(`${row.id}: cockpit page missing paired sandbox preview command`);
    if (!includesText(pageText, `npm run sandbox:visual -- --ids ${row.runtimeId}`) || !includesText(pageText, '--with diver')) {
      failures.push(`${row.id}: cockpit page missing paired sandbox visual command`);
    }
  }

  const urls = [...pageText.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const url of urls) {
    const publicPath = publicPathForUrl(url);
    if (publicPath) await fileOk(`${row.id} linked evidence ${url}`, publicPath, 128);
  }
}

if (failures.length) {
  console.error(JSON.stringify({
    schema: 'water9/content-review-cockpit-validation@1',
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  schema: 'water9/content-review-cockpit-validation@1',
  pages: pages.length,
  runtimeMappedCandidates: manifest?.summary?.runtimeMappedCandidates ?? 0,
  acceptedThreats: manifest?.summary?.acceptedThreats ?? 0,
  failures: [],
}, null, 2));
