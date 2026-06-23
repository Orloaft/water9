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
  manifest: resolve(String(args.get('manifest') ?? 'public/review/sandbox/manifest.json')),
  quickstart: resolve(String(args.get('json') ?? 'public/review/sandbox/quickstart.json')),
  markdown: resolve(String(args.get('md') ?? 'public/review/sandbox/quickstart.md')),
  html: resolve(String(args.get('html') ?? 'public/review/sandbox/quickstart.html')),
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

async function fileOk(label, path, minSize) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size < minSize) failures.push(`${label}: missing or too small`);
  } catch {
    failures.push(`${label}: missing`);
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function includesHtml(text, value) {
  return text.includes(value) || text.includes(htmlEscape(value));
}

function withDiver(url) {
  if (!url) return null;
  if (url.includes('companion=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}companion=diver`;
}

const manifest = await readJson('sandbox manifest', paths.manifest);
const quickstart = await readJson('sandbox quickstart', paths.quickstart);
const markdown = await readText('sandbox quickstart markdown', paths.markdown);
const html = await readText('sandbox quickstart html', paths.html);
await fileOk('sandbox quickstart json', paths.quickstart, 1024);
await fileOk('sandbox quickstart markdown', paths.markdown, 1024);
await fileOk('sandbox quickstart html', paths.html, 2048);

if (manifest?.schema !== 'water9/sandbox-index@1') failures.push(`sandbox manifest schema is ${manifest?.schema ?? 'missing'}`);
if (quickstart?.schema !== 'water9/sandbox-quickstart@1') failures.push(`sandbox quickstart schema is ${quickstart?.schema ?? 'missing'}`);

const manifestEntries = Array.isArray(manifest?.entries) ? manifest.entries : [];
const entries = Array.isArray(quickstart?.entries) ? quickstart.entries : [];
const manifestById = new Map(manifestEntries.map((entry) => [entry.id, entry]));
const quickstartById = new Map(entries.map((entry) => [entry.id, entry]));
if (entries.length !== manifestEntries.length) failures.push('quickstart entry count does not match sandbox manifest');
if ((quickstart?.summary?.entries ?? -1) !== entries.length) failures.push('quickstart summary entries mismatch');
if ((quickstart?.summary?.articulated ?? -1) !== entries.filter((entry) => entry.kind === 'articulated').length) failures.push('quickstart summary articulated mismatch');
if ((quickstart?.summary?.source ?? -1) !== entries.filter((entry) => entry.kind === 'source').length) failures.push('quickstart summary source mismatch');
if ((quickstart?.summary?.acceptedForContentGate ?? -1) !== entries.filter((entry) => entry.acceptedForContentGate).length) failures.push('quickstart summary acceptedForContentGate mismatch');
if ((quickstart?.summary?.previewOnly ?? -1) !== entries.filter((entry) => entry.productionBoundary?.previewOnly === true).length) failures.push('quickstart summary previewOnly mismatch');

for (const manifestEntry of manifestEntries) {
  const entry = quickstartById.get(manifestEntry.id);
  if (!entry) {
    failures.push(`${manifestEntry.id}: missing quickstart entry`);
    continue;
  }
  if (entry.kind !== manifestEntry.kind) failures.push(`${entry.id}: quickstart kind mismatch`);
  if (entry.reviewStage !== (manifestEntry.reviewStage ?? 'reference')) failures.push(`${entry.id}: quickstart reviewStage mismatch`);
  if (entry.acceptedForContentGate !== Boolean(manifestEntry.acceptedForContentGate)) failures.push(`${entry.id}: quickstart acceptedForContentGate mismatch`);
  if (entry.url !== manifestEntry.url) failures.push(`${entry.id}: quickstart url mismatch`);
  if (entry.pairedUrl !== (manifestEntry.pairedUrl ?? withDiver(manifestEntry.url))) failures.push(`${entry.id}: quickstart pairedUrl mismatch`);
  if (!String(entry.previewCommand ?? '').includes(`--id ${entry.id}`)) failures.push(`${entry.id}: preview command is not target-aware`);
  if (!String(entry.pairedPreviewCommand ?? '').includes(`--id ${entry.id}`) || !String(entry.pairedPreviewCommand ?? '').includes('--with diver')) {
    failures.push(`${entry.id}: paired preview command must target entity with diver`);
  }
  if (!String(entry.pairedVisualCheckCommand ?? '').includes(`--ids ${entry.id}`) || !String(entry.pairedVisualCheckCommand ?? '').includes('--with diver')) {
    failures.push(`${entry.id}: paired visual command must target entity with diver`);
  }
  if (entry.kind === 'articulated' && !String(entry.pairedVisualCheckCommand ?? '').includes('--states idle,lunge,stunned')) {
    failures.push(`${entry.id}: articulated paired visual command must cover idle,lunge,stunned`);
  }
  if (!String(entry.acceptanceNotice ?? '').trim()) failures.push(`${entry.id}: missing acceptance notice`);
  if (entry.productionBoundary?.schema !== 'water9/sandbox-production-boundary@1') failures.push(`${entry.id}: missing production boundary schema`);
  if (entry.productionBoundary?.reviewStage !== entry.reviewStage) failures.push(`${entry.id}: production boundary reviewStage mismatch`);
  if (entry.productionBoundary?.acceptedForContentGate !== entry.acceptedForContentGate) failures.push(`${entry.id}: production boundary acceptedForContentGate mismatch`);
  if (entry.productionBoundary?.productionReady !== entry.acceptedForContentGate) failures.push(`${entry.id}: production boundary productionReady mismatch`);
  if (entry.acceptedForContentGate === false && entry.productionBoundary?.previewOnly !== true) failures.push(`${entry.id}: non-accepted entry must be explicitly preview-only`);
  if (['articulated', 'source'].includes(entry.kind) && entry.acceptedForContentGate === false && !String(entry.productionBoundary?.manualReviewRequired ?? '').trim()) {
    failures.push(`${entry.id}: non-accepted ${entry.kind} entry must state required human review`);
  }
  if (!String(entry.productionBoundary?.claim ?? '').trim()) failures.push(`${entry.id}: production boundary missing claim`);
  if (!includesHtml(html, `data-sandbox-quickstart-entry="${entry.id}"`)) failures.push(`${entry.id}: html missing row marker`);
  if (!markdown.includes(`\`${entry.id}\``)) failures.push(`${entry.id}: markdown missing entry`);
}

for (const expected of [
  'Water 9 Sandbox Quickstart',
  'Canonical launch commands for every registered Water 9 sandbox entity',
  'Previewable does not mean accepted',
  'Production Boundary',
  'Preview-only:',
  'npm run sandbox:index',
  'npm run sandbox:quickstart && npm run sandbox:quickstart-check',
  'npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --open --visual',
  'npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual',
  'data-sandbox-quickstart',
]) {
  if (!markdown.includes(expected) && !['data-sandbox-quickstart'].includes(expected)) failures.push(`markdown missing ${expected}`);
  if (!includesHtml(html, expected)) failures.push(`html missing ${expected}`);
}

for (const requiredId of ['diver', 'abyssal-gulper', 'gulper-eel-maw', 'source-gulper-eel-maw']) {
  if (!quickstartById.has(requiredId)) failures.push(`quickstart missing required preview id ${requiredId}`);
}
const gulper = quickstartById.get('abyssal-gulper');
if (gulper && !String(gulper.pairedPreviewCommand ?? '').includes('--with diver')) failures.push('abyssal-gulper paired quickstart command must include diver');
const sourceGulper = quickstartById.get('source-gulper-eel-maw');
if (sourceGulper && sourceGulper.reviewStage !== 'source-review') failures.push(`source-gulper-eel-maw reviewStage expected source-review, got ${sourceGulper.reviewStage}`);

const result = {
  schema: 'water9/sandbox-quickstart-check@1',
  entries: entries.length,
  kinds: Object.fromEntries(Object.entries(quickstart?.summary?.byKind ?? {}).sort(([left], [right]) => left.localeCompare(right))),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
}
